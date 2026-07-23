"""
Sentinel — Ingestion Module

Responsible for:
- Assigning a unique batch_id (UUID) per ingestion run
- Recording source filename, row count, and SHA-256 checksum for EACH file
- Producing an ingest_log for downstream audit and traceability
- Combining all ingested data into a single raw batch for downstream processing

Usage:
    python3 -m src.ingest                     # ingest all CSVs in data/raw/
    python3 -m src.ingest --input data/raw/incidents_raw.csv  # single file
    python3 -m src.ingest --input data/raw/   # all CSVs in directory
"""

import argparse
import hashlib
import os
import uuid
from datetime import datetime, timezone

import pandas as pd


class IngestionManager:
    """Manages a single ingestion batch: reads sources, computes metadata, writes ingest_log."""

    def __init__(self):
        self.batch_id = str(uuid.uuid4())
        self.ingestion_timestamp = datetime.now(timezone.utc).isoformat()
        self.ingest_log_entries = []

    def compute_checksum(self, filepath: str) -> str:
        """Compute SHA-256 checksum of a file."""
        sha256 = hashlib.sha256()
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest()

    def ingest_file(self, filepath: str) -> pd.DataFrame:
        """
        Ingest a single file and record its metadata.

        Returns:
            DataFrame of the file contents with an added 'source_file' column.
        """
        if not os.path.isfile(filepath):
            raise FileNotFoundError(f"File not found: {filepath}")

        # Read based on file extension
        if filepath.endswith(".csv"):
            df = pd.read_csv(filepath)
        elif filepath.endswith(".parquet"):
            df = pd.read_parquet(filepath)
        elif filepath.endswith(".json"):
            df = pd.read_json(filepath)
        else:
            raise ValueError(f"Unsupported file format: {filepath}")

        checksum = self.compute_checksum(filepath)
        filename = os.path.basename(filepath)

        log_entry = {
            "batch_id": self.batch_id,
            "source_filename": filename,
            "row_count": len(df),
            "sha256_checksum": checksum,
            "ingestion_timestamp": self.ingestion_timestamp,
        }
        self.ingest_log_entries.append(log_entry)

        # Tag each row with its source for traceability
        df["_source_file"] = filename
        df["_batch_id"] = self.batch_id

        print(f"  {filename}: {len(df)} rows | SHA-256: {checksum[:16]}...")
        return df

    def ingest_directory(self, dir_path: str, pattern: str = "*.csv") -> pd.DataFrame:
        """
        Ingest all supported files from a directory (excluding ground_truth and dim_site).

        Returns:
            Combined DataFrame of all ingested files.
        """
        if not os.path.isdir(dir_path):
            raise FileNotFoundError(f"Directory not found: {dir_path}")

        supported_extensions = (".csv", ".parquet", ".json")
        skip_prefixes = ("ground_truth", "dim_")  # reference/meta files, not raw data

        files = sorted([
            f for f in os.listdir(dir_path)
            if f.endswith(supported_extensions) and not f.startswith(skip_prefixes)
        ])

        if not files:
            raise FileNotFoundError(f"No data files found in: {dir_path}")

        frames = []
        for fname in files:
            filepath = os.path.join(dir_path, fname)
            df = self.ingest_file(filepath)
            frames.append(df)

        return pd.concat(frames, ignore_index=True)

    def ingest(self, input_path: str) -> pd.DataFrame:
        """
        Ingest from a file or directory.

        Returns:
            Combined DataFrame of all ingested data.
        """
        if os.path.isfile(input_path):
            return self.ingest_file(input_path)
        elif os.path.isdir(input_path):
            return self.ingest_directory(input_path)
        else:
            raise FileNotFoundError(f"Input path does not exist: {input_path}")


def main():
    parser = argparse.ArgumentParser(description="Sentinel Ingestion")
    parser.add_argument(
        "--input",
        default=os.path.join("data", "raw"),
        help="Path to source file or directory (default: data/raw/)",
    )
    args = parser.parse_args()

    manager = IngestionManager()
    print(f"Ingesting from: {args.input}")
    print(f"Batch ID: {manager.batch_id}")
    print("-" * 50)

    df = manager.ingest(args.input)

    # Persist ingest_log as JSON in data/warehouse/
    log_df = pd.DataFrame(manager.ingest_log_entries)
    log_path = os.path.join("data", "warehouse", "ingest_log.json")
    os.makedirs(os.path.dirname(log_path), exist_ok=True)

    # Append to existing log if present
    if os.path.exists(log_path):
        existing = pd.read_json(log_path)
        log_df = pd.concat([existing, log_df], ignore_index=True)
    log_df.to_json(log_path, orient="records", indent=2)

    # Persist combined raw data as parquet for downstream stages
    raw_parquet_path = os.path.join("data", "warehouse", "raw_batch.parquet")
    df.to_parquet(raw_parquet_path, index=False)

    total_rows = sum(e["row_count"] for e in manager.ingest_log_entries)
    print("-" * 50)
    print(f"Total: {total_rows} rows from {len(manager.ingest_log_entries)} file(s)")
    print(f"Ingest log: {log_path}")
    print(f"Raw batch:  {raw_parquet_path}")


if __name__ == "__main__":
    main()
