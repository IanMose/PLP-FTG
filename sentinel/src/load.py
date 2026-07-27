"""
Sentinel — Load Module

Responsible for:
- Writing trusted and corrected output to data/warehouse/ as Parquet and DuckDB
- Loading dim_site reference table into the warehouse
- Splitting decided records into fact_incidents and fact_audits tables
- Only records with decision = 'trusted' or 'corrected' reach the warehouse
- Rejected records are written to data/quarantine/ as inspectable CSVs
- Maintains the warehouse as the single source of truth for downstream systems
"""

import argparse
import os

import duckdb
import pandas as pd


def load_to_parquet(df: pd.DataFrame, output_dir: str, table_name: str) -> str:
    """Write a DataFrame to Parquet in the warehouse directory."""
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, f"{table_name}.parquet")
    df.to_parquet(output_path, index=False)
    return output_path


def load_to_duckdb(df: pd.DataFrame, db_path: str, table_name: str) -> str:
    """Write a DataFrame to a DuckDB table in the warehouse (replace existing)."""
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    con = duckdb.connect(db_path)
    con.execute(f"DROP TABLE IF EXISTS {table_name}")
    con.execute(f"CREATE TABLE {table_name} AS SELECT * FROM df")
    con.close()
    return db_path


def load_dim_site(output_dir: str, raw_dir: str = "data/raw") -> int:
    """
    Load the dim_site reference table directly into the warehouse.
    No validation needed — it's a controlled 6-row lookup table.

    Returns:
        Number of sites loaded.
    """
    dim_site_path = os.path.join(raw_dir, "dim_site.csv")
    if not os.path.exists(dim_site_path):
        print(f"  WARNING: dim_site.csv not found at {dim_site_path}, skipping.")
        return 0

    df = pd.read_csv(dim_site_path)

    # Write as Parquet
    load_to_parquet(df, output_dir, "dim_site")

    # Write to DuckDB
    db_path = os.path.join(output_dir, "sentinel.duckdb")
    load_to_duckdb(df, db_path, "dim_site")

    return len(df)


def load_trusted_output(decided_df: pd.DataFrame, output_dir: str) -> dict:
    """
    Filter to trusted + corrected records and write to warehouse,
    split into fact_incidents, fact_audits, and fact_telemetry.

    Also writes ALL decided records (including review/rejected with reasons)
    to the warehouse for full auditability, and quarantines rejected as CSV.

    Returns:
        dict with counts and output paths
    """
    db_path = os.path.join(output_dir, "sentinel.duckdb")

    # --- Write full decided output (all outcomes, with reasons) ---
    load_to_parquet(decided_df, output_dir, "decided_all")
    load_to_duckdb(decided_df, db_path, "decided_all")

    # --- Filter to trusted + corrected only for the clean warehouse tables ---
    warehouse_df = decided_df[
        decided_df["decision"].isin(["trusted", "corrected"])
    ].copy()

    # Drop internal/meta columns before loading to warehouse
    columns_to_drop = ["decision", "decision_reason", "_source_file", "_batch_id"]
    warehouse_df = warehouse_df.drop(
        columns=[c for c in columns_to_drop if c in warehouse_df.columns],
        errors="ignore",
    )

    # Split into incidents, audits, and telemetry based on which ID column is populated
    incidents_df = pd.DataFrame()
    audits_df = pd.DataFrame()
    telemetry_df = pd.DataFrame()

    if "reading_id" in warehouse_df.columns:
        # Telemetry dataset
        telemetry_df = warehouse_df[
            warehouse_df["reading_id"].notna() & (warehouse_df["reading_id"] != "")
        ].copy()
        # Remove non-telemetry rows from telemetry
        warehouse_df = warehouse_df[
            ~(warehouse_df["reading_id"].notna() & (warehouse_df["reading_id"] != ""))
        ]

    if "incident_id" in warehouse_df.columns and "audit_id" in warehouse_df.columns:
        # Combined dataset — split by ID presence
        incidents_df = warehouse_df[
            warehouse_df["incident_id"].notna() & (warehouse_df["incident_id"] != "")
        ].copy()
        audits_df = warehouse_df[
            warehouse_df["audit_id"].notna() & (warehouse_df["audit_id"] != "")
        ].copy()

        # Drop columns that don't belong to each table
        incident_cols = [c for c in incidents_df.columns if c not in (
            "audit_id", "inspection_date", "closed_date", "finding_category",
            "findings_detail", "corrective_action", "auditor"
        )]
        audit_cols = [c for c in audits_df.columns if c not in (
            "incident_id", "incident_type", "description", "root_cause",
            "response_time_hours", "severity", "latitude", "longitude"
        )]

        incidents_df = incidents_df[incident_cols].dropna(axis=1, how="all")
        audits_df = audits_df[audit_cols].dropna(axis=1, how="all")

    elif "incident_id" in warehouse_df.columns:
        incidents_df = warehouse_df
    elif "audit_id" in warehouse_df.columns:
        audits_df = warehouse_df

    # Write incidents
    if len(incidents_df) > 0:
        load_to_parquet(incidents_df, output_dir, "fact_incidents")
        load_to_duckdb(incidents_df, db_path, "fact_incidents")

    # Write audits
    if len(audits_df) > 0:
        load_to_parquet(audits_df, output_dir, "fact_audits")
        load_to_duckdb(audits_df, db_path, "fact_audits")

    # Write telemetry
    if len(telemetry_df) > 0:
        load_to_parquet(telemetry_df, output_dir, "fact_telemetry")
        load_to_duckdb(telemetry_df, db_path, "fact_telemetry")

    # If no recognized ID columns, write as generic fact_records
    if len(incidents_df) == 0 and len(audits_df) == 0 and len(telemetry_df) == 0 and len(warehouse_df) > 0:
        load_to_parquet(warehouse_df, output_dir, "fact_records")
        load_to_duckdb(warehouse_df, db_path, "fact_records")

    # --- Quarantine rejected records as inspectable CSV ---
    rejected_df = decided_df[decided_df["decision"] == "rejected"]
    quarantine_dir = os.path.join("data", "quarantine")
    os.makedirs(quarantine_dir, exist_ok=True)

    if len(rejected_df) > 0:
        rejected_path = os.path.join(quarantine_dir, "rejected_records.csv")
        rejected_df.to_csv(rejected_path, index=False)
        print(f"  Quarantined {len(rejected_df)} rejected records -> {rejected_path}")

    return {
        "incidents_loaded": len(incidents_df),
        "audits_loaded": len(audits_df),
        "telemetry_loaded": len(telemetry_df),
        "total_loaded": len(incidents_df) + len(audits_df) + len(telemetry_df),
        "rejected": len(rejected_df),
        "db_path": db_path,
    }


def main():
    parser = argparse.ArgumentParser(description="Sentinel Load")
    parser.add_argument(
        "--input",
        default=os.path.join("data", "warehouse", "decided_batch.parquet"),
        help="Path to decided batch parquet",
    )
    parser.add_argument(
        "--output-dir",
        default=os.path.join("data", "warehouse"),
        help="Warehouse output directory",
    )
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        raise SystemExit(1)

    decided_df = pd.read_parquet(args.input)
    print(f"Loading from {len(decided_df)} decided records...")

    # Load dim_site reference table
    print("\n  Loading dim_site reference table...")
    n_sites = load_dim_site(args.output_dir)
    if n_sites > 0:
        print(f"  Loaded {n_sites} sites -> dim_site")

    # Load decided records
    print("\n  Loading decided records to warehouse...")
    result = load_trusted_output(decided_df, args.output_dir)

    print(f"\n{'=' * 50}")
    print(f"Warehouse Summary:")
    print(f"  dim_site:       {n_sites} rows")
    print(f"  fact_incidents: {result['incidents_loaded']} rows")
    print(f"  fact_audits:    {result['audits_loaded']} rows")
    print(f"  fact_telemetry: {result['telemetry_loaded']} rows")
    print(f"  rejected:       {result['rejected']} rows (quarantined)")
    print(f"  DuckDB:         {result['db_path']}")


if __name__ == "__main__":
    main()
