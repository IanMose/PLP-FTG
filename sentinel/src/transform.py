"""
Sentinel — Transform Module

Responsible for:
- Normalizing categorical text via lookup table (severity, status, site, etc.)
- Converting timestamps to ISO 8601 UTC
- Deduplicating on natural key (keep latest by ingestion batch)
- Handling incidents, audits, AND telemetry datasets
"""

import argparse
import os
from datetime import timezone

import pandas as pd


# --- Lookup tables for categorical normalization ---

SEVERITY_LOOKUP = {
    # Variants -> canonical form
    "low": "Low",
    "l": "Low",
    "lo": "Low",
    "minor": "Low",
    "medium": "Medium",
    "med": "Medium",
    "moderate": "Medium",
    "high": "High",
    "h": "High",
    "hi": "High",
    "major": "High",
    "critical": "Critical",
    "crit": "Critical",
    "severe": "Critical",
}

INCIDENT_TYPE_LOOKUP = {
    "leak": "Leak",
    "oil leak": "Leak",
    "oil leakage": "Leak",
    "spill": "Spill",
    "minor spill": "Spill",
    "fire": "Fire",
    "near miss": "Near Miss",
    "near-miss": "Near Miss",
    "equipment failure": "Equipment Failure",
    "equip. failure": "Equipment Failure",
    "equipment fault": "Equipment Failure",
}

STATUS_LOOKUP = {
    "open": "Open",
    "opened": "Open",
    "closed": "Closed",
    "close": "Closed",
    "resolved": "Closed",
    "in progress": "In Progress",
    "in_progress": "In Progress",
    "pending": "Pending",
}

# Site name normalization — maps dirty variants back to canonical site codes
SITE_LOOKUP = {
    # Canonical forms (both cases) → lowercase DB key
    "site-001": "site-001",
    "site-002": "site-002",
    "site-003": "site-003",
    "site-004": "site-004",
    "site-005": "site-005",
    "site-006": "site-006",
    "site-007": "site-007",
    "SITE-001": "site-001",
    "SITE-002": "site-002",
    "SITE-003": "site-003",
    "SITE-004": "site-004",
    "SITE-005": "site-005",
    "SITE-006": "site-006",
    "SITE-007": "site-007",
    # Dirty variants for site-001 (Nairobi Terminal)
    "nairobi term": "site-001",
    "nairobi terminal": "site-001",
    "nrb terminal": "site-001",
    "nairobi": "site-001",
    "nairobi  terminal": "site-001",
    # Dirty variants for site-002 (Mombasa Terminal / Kipevu / PS14)
    "mombasa term": "site-002",
    "mombasa terminal": "site-002",
    "kipevu terminal": "site-002",
    "msa terminal": "site-002",
    "mombasa": "site-002",
    "mombasa  terminal": "site-002",
    # Dirty variants for site-003 (Makueni Pipeline Section / Thange)
    "makueni ps": "site-003",
    "makueni pump": "site-003",
    "makueni pipeline": "site-003",
    "makueni": "site-003",
    "thange section": "site-003",
    "kibwezi": "site-003",
    "makueni  pump station": "site-003",
    "makueni pump station": "site-003",
    "makueni section": "site-003",
    # Dirty variants for site-004 (Nakuru Depot)
    "nakuru dep": "site-004",
    "nakuru depot": "site-004",
    "nkr depot": "site-004",
    "nakuru": "site-004",
    "nakuru  depot": "site-004",
    # Dirty variants for site-005 (Eldoret Terminal)
    "eldoret term": "site-005",
    "eldoret terminal": "site-005",
    "eldoret dep": "site-005",
    "eldoret depot": "site-005",
    "eld terminal": "site-005",
    "eld depot": "site-005",
    "eldoret": "site-005",
    "eldoret  terminal": "site-005",
    "eldoret  depot": "site-005",
    # Dirty variants for site-006 (Sinendet Pump Station)
    "sinendet ps": "site-006",
    "sinendet pump": "site-006",
    "sinendet": "site-006",
    "sinendet  pump station": "site-006",
    "sinendet pump station": "site-006",
    # Dirty variants for site-007 (Kisumu Terminal / PS28)
    "kisumu term": "site-007",
    "kisumu terminal": "site-007",
    "ksm terminal": "site-007",
    "kisumu": "site-007",
    "kisumu  terminal": "site-007",
}


def normalize_incident_type(value: str) -> str:
    """Normalize incident_type text via lookup table."""
    if pd.isna(value) or str(value).strip() == "":
        return value
    normalized = INCIDENT_TYPE_LOOKUP.get(str(value).strip().lower())
    if normalized is None:
        return str(value).strip()
    return normalized


def normalize_severity(value: str) -> str:
    """Normalize severity text to one of: Low, Medium, High, Critical."""
    if pd.isna(value):
        return value
    normalized = SEVERITY_LOOKUP.get(str(value).strip().lower())
    if normalized is None:
        return str(value).strip()  # Return as-is if not in lookup; validation catches it
    return normalized


def normalize_status(value: str) -> str:
    """Normalize status text via lookup table."""
    if pd.isna(value):
        return value
    normalized = STATUS_LOOKUP.get(str(value).strip().lower())
    if normalized is None:
        return str(value).strip()
    return normalized


def normalize_site(value: str) -> str:
    """Normalize site labels back to canonical site-XXX codes (lowercase, matching DB PKs)."""
    if pd.isna(value) or str(value).strip() == "":
        return value
    raw = str(value).strip()
    # Already canonical lowercase format?
    if raw.lower().startswith("site-") and len(raw) == 8:
        return raw.lower()
    # Lookup by lowercased stripped value — returns SITE-XXX uppercase from the table,
    # then lowercase it to match dim_site PKs.
    normalized = SITE_LOOKUP.get(raw.lower())
    if normalized is not None:
        return normalized.lower()
    return raw  # Return as-is if not in lookup; validation can flag it


def normalize_text_column(series: pd.Series, lookup: dict) -> pd.Series:
    """Apply a lookup-based normalization to a text Series."""
    return series.apply(
        lambda v: lookup.get(str(v).strip().lower(), str(v).strip()) if pd.notna(v) else v
    )


def to_iso8601_utc(series: pd.Series) -> pd.Series:
    """Convert a datetime Series to ISO 8601 UTC strings.

    Handles mixed date formats including ISO, US (mm/dd/yyyy), day-first,
    and timestamps with/without timezone info.
    """
    # Use format='mixed' with utc=True to handle all variants
    parsed = pd.to_datetime(series, errors="coerce", format="mixed", utc=True)
    return parsed.dt.strftime("%Y-%m-%dT%H:%M:%SZ").where(parsed.notna(), other=None)


def deduplicate(df: pd.DataFrame, natural_key: list[str], sort_col: str = "ingestion_timestamp") -> pd.DataFrame:
    """
    Deduplicate on natural key, keeping the latest record by sort_col.

    Tie-break: keep the record from the most recent ingestion batch.
    """
    if sort_col not in df.columns:
        # If no sort column, keep first occurrence
        return df.drop_duplicates(subset=natural_key, keep="first")

    df_sorted = df.sort_values(sort_col, ascending=False)
    return df_sorted.drop_duplicates(subset=natural_key, keep="first").reset_index(drop=True)


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all transformations:
    1. Normalize categorical text (severity, status, incident_type, site)
    2. Convert date columns to ISO 8601 UTC
    3. Deduplicate on natural key
    """
    df = df.copy()

    # 1. Normalize categorical columns if present
    if "severity" in df.columns:
        df["severity"] = df["severity"].apply(normalize_severity)

    if "incident_type" in df.columns:
        df["incident_type"] = df["incident_type"].apply(normalize_incident_type)

    if "status" in df.columns:
        df["status"] = df["status"].apply(normalize_status)

    # Normalize site labels across all dataset types
    if "site" in df.columns:
        df["site"] = df["site"].apply(normalize_site)

    # 2. Convert date/time columns to ISO 8601 UTC
    #    Skip internal columns (prefixed with _) added during ingestion
    date_columns = [
        col for col in df.columns
        if ("date" in col.lower() or "timestamp" in col.lower())
        and not col.startswith("_")
    ]
    for col in date_columns:
        if col in df.columns:
            df[col] = to_iso8601_utc(df[col])

    # 3. Deduplicate on natural key
    #    Handle combined datasets: split by ID type, dedup each, recombine
    has_incident_col = "incident_id" in df.columns
    has_audit_col = "audit_id" in df.columns
    has_reading_col = "reading_id" in df.columns

    if has_incident_col or has_audit_col or has_reading_col:
        frames = []

        if has_reading_col:
            telemetry = df[df["reading_id"].notna() & (df["reading_id"].astype(str) != "")].copy()
            if len(telemetry) > 0:
                telemetry = deduplicate(telemetry, natural_key=["reading_id"])
                frames.append(telemetry)
            # Remove telemetry rows from further processing
            df = df[~(df["reading_id"].notna() & (df["reading_id"].astype(str) != ""))].copy()

        if has_incident_col:
            incidents = df[df["incident_id"].notna() & (df["incident_id"].astype(str) != "")].copy()
            if len(incidents) > 0:
                incidents = deduplicate(incidents, natural_key=["incident_id"])
                frames.append(incidents)
            # Remove incident rows from further processing
            df = df[~(df["incident_id"].notna() & (df["incident_id"].astype(str) != ""))].copy()

        if has_audit_col:
            audits = df[df["audit_id"].notna() & (df["audit_id"].astype(str) != "")].copy()
            if len(audits) > 0:
                audits = deduplicate(audits, natural_key=["audit_id"])
                frames.append(audits)

        if frames:
            df = pd.concat(frames, ignore_index=True)

    return df


def main():
    parser = argparse.ArgumentParser(description="Sentinel Transform")
    parser.add_argument(
        "--input",
        default=os.path.join("data", "warehouse", "raw_batch.parquet"),
        help="Path to raw batch parquet file",
    )
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        raise SystemExit(1)

    df = pd.read_parquet(args.input)
    print(f"Transforming {len(df)} rows...")

    df_transformed = transform(df)

    output_path = os.path.join("data", "warehouse", "transformed_batch.parquet")
    df_transformed.to_parquet(output_path, index=False)
    print(f"Transformed output: {len(df_transformed)} rows -> {output_path}")


if __name__ == "__main__":
    main()
