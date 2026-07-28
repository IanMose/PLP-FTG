"""
Sentinel — Transform Module

Responsible for:
- Normalizing categorical text via lookup table (severity, status, etc.)
- Converting timestamps to ISO 8601 UTC
- Deduplicating on natural key (keep latest by ingestion batch)
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



# ─── Compliance feature engineering ───────────────────────────────────────────
#
# These mappings are used to tag each record with the KPI indicator(s) it
# affects. Tags feed the ComplianceService proxy scoring logic in the backend.
#
# Format: keyword list → indicator_id (from compliance_indicators table)
#
COMPLIANCE_KEYWORD_MAP = [
    (["ppe", "personal protective", "hard hat", "gloves"],                  "PCI"),
    (["training", "certification", "certificate", "expired", "competency"], "TCI"),
    (["permit", "ptw", "hot work", "confined space", "without valid"],       "PTWCI"),
    (["water", "nema", "discharge", "effluent", "tph"],                      "WQCI"),
    (["air quality", "emission", "voc", "nox", "so2"],                       "AQCI"),
    (["waste", "manifest", "disposal", "hazardous waste"],                   "WMCI"),
    (["spill", "containment", "release", "berth"],                           "SRCI"),
    (["maintenance overdue", "pm overdue", "preventive", "scheduled maint"], "PMCI"),
    (["corrosion", "monitoring point", "cathodic", "thickness"],             "CMCI"),
    (["leak detection", "scada", "cpm", "system offline"],                   "LDCI"),
    (["regulatory", "epra", "nema report", "late report", "submitted late"], "RRI"),
    (["sop", "procedure", "deviation", "sop-"],                              "SOPCI"),
    (["inspection overdue", "overdue inspection", "pressure vessel"],        "ICI"),
    (["corrective action", "car overdue", "finding"],                        "CACI"),
]

# Severity → compliance impact weight (used for compliance_impact_score)
SEVERITY_IMPACT = {
    "Critical": 1.0,
    "High":     0.7,
    "Medium":   0.4,
    "Low":      0.1,
}


def tag_compliance_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Add a 'compliance_indicators' column tagging each record with the
    KPI indicator IDs it affects (pipe-separated, e.g. 'PCI|PTWCI').
    Also adds 'compliance_impact_score' — a 0-1 weight based on severity.
    """
    if "description" not in df.columns:
        return df

    def _tag(row) -> str:
        text = str(row.get("description", "")).lower()
        findings = str(row.get("findings", "")).lower()
        combined = text + " " + findings
        matched = []
        for keywords, indicator_id in COMPLIANCE_KEYWORD_MAP:
            if any(kw in combined for kw in keywords):
                matched.append(indicator_id)
        return "|".join(matched) if matched else ""

    def _impact(row) -> float:
        severity = str(row.get("severity", "")).strip()
        return SEVERITY_IMPACT.get(severity, 0.1)

    df = df.copy()
    df["compliance_indicators"] = df.apply(_tag, axis=1)
    df["compliance_impact_score"] = df.apply(_impact, axis=1)
    return df


def compute_reporting_timeliness(df: pd.DataFrame) -> pd.DataFrame:
    """
    For incident records: compute hours_to_report from incident_date to
    ingestion_timestamp. Adds 'reported_on_time' boolean column used by
    IRCI (Incident Reporting Compliance) scoring.

    On-time rules (from design doc):
      - LTI / Dangerous Occurrence: ≤ 4 hours
      - Near-miss / First Aid / others: ≤ 24 hours
    """
    if "incident_date" not in df.columns or "ingestion_timestamp" not in df.columns:
        return df

    df = df.copy()
    incident_dt = pd.to_datetime(df["incident_date"], errors="coerce", utc=True)
    ingest_dt   = pd.to_datetime(df["ingestion_timestamp"], errors="coerce", utc=True)

    hours_delta = (ingest_dt - incident_dt).dt.total_seconds() / 3600
    df["hours_to_report"] = hours_delta.round(2)

    severity = df.get("severity", pd.Series([""] * len(df), index=df.index))
    lti_mask = severity.isin(["Critical", "High"])

    threshold = lti_mask.map(lambda is_lti: 4.0 if is_lti else 24.0)
    df["reported_on_time"] = (hours_delta >= 0) & (hours_delta <= threshold)

    return df


def transform(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply all transformations:
    1. Normalize categorical text (severity, status, incident_type)
    2. Convert date columns to ISO 8601 UTC
    3. Deduplicate on natural key
    4. Compliance feature engineering (indicator tagging + reporting timeliness)
    """
    df = df.copy()

    # 1. Normalize categorical columns if present
    if "severity" in df.columns:
        df["severity"] = df["severity"].apply(normalize_severity)

    if "incident_type" in df.columns:
        df["incident_type"] = df["incident_type"].apply(normalize_incident_type)

    if "status" in df.columns:
        df["status"] = df["status"].apply(normalize_status)

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
    if "incident_id" in df.columns and "audit_id" in df.columns:
        # Combined dataset — split, dedup each, recombine
        incidents = df[df["incident_id"].notna() & (df["incident_id"] != "")].copy()
        audits = df[df["audit_id"].notna() & (df["audit_id"] != "")].copy()

        if len(incidents) > 0:
            incidents = deduplicate(incidents, natural_key=["incident_id"])
        if len(audits) > 0:
            audits = deduplicate(audits, natural_key=["audit_id"])

        df = pd.concat([incidents, audits], ignore_index=True)
    elif "incident_id" in df.columns:
        df = deduplicate(df, natural_key=["incident_id"])
    elif "audit_id" in df.columns:
        df = deduplicate(df, natural_key=["audit_id"])

    # 4. Compliance feature engineering
    df = tag_compliance_indicators(df)
    if "incident_id" in df.columns:
        df = compute_reporting_timeliness(df)

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
