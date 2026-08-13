"""
Sentinel — Feature Engineering Pipeline
========================================
Produces fact_site_features.parquet: one row per (site_id, as_of_date).

Each row is a daily snapshot of lagging operational indicators for a site.
This is the single input to both the predictive model (Stage B) and the
statistical diagnostics (Stage C).

Output schema:
  site_id                     TEXT    e.g. "SITE-003"
  as_of_date                  DATE    the snapshot date
  days_since_last_audit       INT     NULL if no audit ever before this date
  rejection_rate_7d           FLOAT   fraction of incidents rejected in last 7d
  rejection_rate_30d          FLOAT   fraction of incidents rejected in last 30d
  incident_count_30d          INT     total incidents in last 30d
  incident_severity_score_30d FLOAT   weighted severity (Crit=4,High=3,Med=2,Low=1)
  pressure_anomaly_count_14d  INT     readings > 1000 PSI in last 14d
  audit_finding_open_count    INT     open audit findings as of this date

Usage:
    python -m src.features                          # default 180-day window
    python -m src.features --days-back 90           # shorter window
    python -m src.features --raw-dir data/raw       # custom raw CSV path
"""

import argparse
import re
from datetime import date, timedelta
from pathlib import Path
from typing import Optional

import numpy as np
import pandas as pd

# ── Constants ────────────────────────────────────────────────────────────────
SEVERITY_WEIGHTS = {"Critical": 4, "High": 3, "Medium": 2, "Low": 1}
PRESSURE_ANOMALY_THRESHOLD = 1000.0  # PSI

RAW_DIR_DEFAULT = Path("data/raw")
WAREHOUSE_DIR_DEFAULT = Path("data/warehouse")


# ── Site name normalisation ───────────────────────────────────────────────────

def _normalise_site(raw: str) -> Optional[str]:
    """
    Map any site identifier to the canonical SITE-XXX format.

    Handles:
    - Already canonical: "SITE-003" → "SITE-003"
    - Lowercase: "site-003"   → "SITE-003"
    - Mixed-case name strings are NOT handled here — those come from telemetry
      and are normalised separately before ingestion.

    Returns None for unrecognised patterns so callers can filter them out.
    """
    if not isinstance(raw, str):
        return None
    cleaned = raw.strip().upper()
    if re.match(r"^SITE-\d{3}$", cleaned):
        return cleaned
    return None


# ── Data loading ──────────────────────────────────────────────────────────────

def load_raw_tables(
    raw_dir: str = str(RAW_DIR_DEFAULT),
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """
    Load the four source tables from raw CSVs and the warehouse parquet.

    Returns (incidents_df, audits_df, telemetry_df, dim_site_df).

    Why raw CSVs, not warehouse parquet?
    The warehouse fact tables only contain the latest live batch (~50–200 rows).
    The raw CSVs contain the full synthetic history (6 000+ incidents, 3 000+
    audits, 10 000+ telemetry readings) needed to build a meaningful 180-day
    feature window.
    """
    raw = Path(raw_dir)

    # ── Incidents ─────────────────────────────────────────────────────────────
    inc_df = pd.read_csv(raw / "incidents_raw.csv", low_memory=False)
    inc_df["site"] = inc_df["site"].apply(_normalise_site)
    inc_df = inc_df[inc_df["site"].notna()].copy()
    inc_df["incident_date"] = pd.to_datetime(
        inc_df["incident_date"], format="mixed", utc=True, errors="coerce"
    )

    # Normalise severity to canonical form
    sev_map = {
        "hi": "High", "high": "High",
        "med": "Medium", "medium": "Medium",
        "lo": "Low", "low": "Low",
        "crit": "Critical", "critical": "Critical",
    }
    inc_df["severity"] = (
        inc_df["severity"]
        .fillna("")
        .str.strip()
        .str.lower()
        .map(lambda s: sev_map.get(s, s.capitalize()) if s else None)
    )

    # ── Audits ────────────────────────────────────────────────────────────────
    aud_df = pd.read_csv(raw / "audits_raw.csv", low_memory=False)
    aud_df["site"] = aud_df["site"].apply(_normalise_site)
    aud_df = aud_df[aud_df["site"].notna()].copy()
    aud_df["inspection_date"] = pd.to_datetime(
        aud_df["inspection_date"], format="mixed", utc=True, errors="coerce"
    )
    aud_df["closed_date"] = pd.to_datetime(
        aud_df["closed_date"], format="mixed", utc=True, errors="coerce"
    )

    # ── Telemetry (batches 1 and 2) ───────────────────────────────────────────
    tel_frames = []
    for batch_file in ["pipeline_telemetry_batch1.csv", "pipeline_telemetry_batch2.csv"]:
        fpath = raw / batch_file
        if fpath.exists():
            df = pd.read_csv(fpath, low_memory=False)
            # Telemetry batch files use SITE-XXX format already
            df["site"] = df["site"].apply(_normalise_site)
            df = df[df["site"].notna()].copy()
            tel_frames.append(df)
    if tel_frames:
        tel_df = pd.concat(tel_frames, ignore_index=True)
    else:
        tel_df = pd.DataFrame(
            columns=["reading_id", "timestamp", "site", "pipeline_section",
                     "pressure_psi", "flow_rate_bph"]
        )
    tel_df["timestamp"] = pd.to_datetime(
        tel_df["timestamp"], utc=True, errors="coerce"
    )
    tel_df = tel_df.sort_values("timestamp")  # B5: EWMA requires ordered series

    # ── dim_site ──────────────────────────────────────────────────────────────
    dim_site_df = pd.read_csv(raw / "dim_site.csv")
    # site_code is the canonical identifier in dim_site
    valid_sites = set(dim_site_df["site_code"].str.upper().tolist())

    # Filter all tables to only known sites (drops SITE-007)
    inc_df = inc_df[inc_df["site"].isin(valid_sites)].copy()
    aud_df = aud_df[aud_df["site"].isin(valid_sites)].copy()
    tel_df = tel_df[tel_df["site"].isin(valid_sites)].copy()

    return inc_df, aud_df, tel_df, dim_site_df


# ── Feature computation functions ─────────────────────────────────────────────

def compute_days_since_last_audit(
    audits_df: pd.DataFrame, site_id: str, as_of: date
) -> Optional[int]:
    """
    Return the number of days between the most recent audit inspection date
    (up to and including as_of) and as_of.

    Returns None if no audit exists for this site on or before as_of.
    """
    as_of_ts = pd.Timestamp(as_of, tz="UTC")
    site_audits = audits_df[
        (audits_df["site"] == site_id) &
        (audits_df["inspection_date"].notna()) &
        (audits_df["inspection_date"] <= as_of_ts)
    ]
    if site_audits.empty:
        return None
    latest = site_audits["inspection_date"].max()
    return (as_of_ts - latest).days


def compute_rejection_rates(
    incidents_df: pd.DataFrame,
    site_id: str,
    as_of: date,
) -> dict:
    """
    Return rejection_rate_7d and rejection_rate_30d for a site as of a date.

    "Rejection rate" = fraction of incidents that have a severity of None or
    empty string (i.e., failed normalisation — a proxy for data quality problems
    that would be flagged as 'review' or 'rejected' in the pipeline).

    Returns dict with keys: rejection_rate_7d, rejection_rate_30d.
    """
    as_of_ts = pd.Timestamp(as_of, tz="UTC")

    def _rate(days: int) -> float:
        window_start = as_of_ts - pd.Timedelta(days=days)
        window = incidents_df[
            (incidents_df["site"] == site_id) &
            (incidents_df["incident_date"].notna()) &
            (incidents_df["incident_date"] > window_start) &
            (incidents_df["incident_date"] <= as_of_ts)
        ]
        if window.empty:
            return 0.0
        missing_sev = window["severity"].isna() | (window["severity"].str.strip() == "")
        return float(missing_sev.sum()) / len(window)

    return {
        "rejection_rate_7d": round(_rate(7), 4),
        "rejection_rate_30d": round(_rate(30), 4),
    }


def compute_incident_features(
    incidents_df: pd.DataFrame, site_id: str, as_of: date
) -> dict:
    """
    Return incident_count_30d and incident_severity_score_30d for a site.

    Severity score is the sum of per-incident weights:
        Critical=4, High=3, Medium=2, Low=1
    Rows with unrecognised severity contribute 0 to the score.
    """
    as_of_ts = pd.Timestamp(as_of, tz="UTC")
    window_start = as_of_ts - pd.Timedelta(days=30)

    window = incidents_df[
        (incidents_df["site"] == site_id) &
        (incidents_df["incident_date"].notna()) &
        (incidents_df["incident_date"] > window_start) &
        (incidents_df["incident_date"] <= as_of_ts)
    ]

    count = len(window)
    score = float(
        window["severity"]
        .map(SEVERITY_WEIGHTS)
        .fillna(0)
        .sum()
    )

    return {
        "incident_count_30d": count,
        "incident_severity_score_30d": round(score, 2),
    }


def compute_pressure_anomalies(
    telemetry_df: pd.DataFrame, site_id: str, as_of: date
) -> int:
    """
    Count pressure readings above PRESSURE_ANOMALY_THRESHOLD (1000 PSI)
    in the 14-day window ending on as_of (inclusive) for a site.
    """
    as_of_ts = pd.Timestamp(as_of, tz="UTC")
    window_start = as_of_ts - pd.Timedelta(days=14)

    window = telemetry_df[
        (telemetry_df["site"] == site_id) &
        (telemetry_df["timestamp"].notna()) &
        (telemetry_df["timestamp"] > window_start) &
        (telemetry_df["timestamp"] <= as_of_ts) &
        (telemetry_df["pressure_psi"] > PRESSURE_ANOMALY_THRESHOLD)
    ]
    return int(len(window))


def compute_open_findings(
    audits_df: pd.DataFrame, site_id: str, as_of: date
) -> int:
    """
    Count audit findings for a site that are NOT closed as of as_of.

    A finding is "open" if:
    - Its inspection_date is on or before as_of (the audit has started), AND
    - Its status is not 'Closed' (status is 'Open', 'In Progress', or missing).

    This avoids counting future audits not yet started.
    """
    as_of_ts = pd.Timestamp(as_of, tz="UTC")
    site_audits = audits_df[
        (audits_df["site"] == site_id) &
        (audits_df["inspection_date"].notna()) &
        (audits_df["inspection_date"] <= as_of_ts)
    ]
    if site_audits.empty:
        return 0
    open_mask = (
        site_audits["status"].isna() |
        (site_audits["status"].str.strip().str.lower() != "closed")
    )
    return int(open_mask.sum())


# ── Main feature table builder ────────────────────────────────────────────────

def build_date_range(start_date: date, end_date: date) -> list:
    """Return a list of daily dates from start_date to end_date inclusive."""
    n_days = (end_date - start_date).days
    return [start_date + timedelta(days=i) for i in range(n_days + 1)]


def build_feature_table(
    raw_dir: str = str(RAW_DIR_DEFAULT),
    days_back: int = 180,
) -> pd.DataFrame:
    """
    Build the full (site_id, as_of_date) feature table.

    Iterates over the last `days_back` days × number of known sites.
    For 180 days × 6 sites = 1 080 rows.

    Performance: all three source tables are loaded once and held in memory.
    Per-date filtering uses boolean masks on pre-loaded DataFrames rather than
    re-reading files or querying DuckDB, keeping the build time under 60 seconds.
    """
    today = date.today()
    end_date = today
    start_date = today - timedelta(days=days_back - 1)
    date_range = build_date_range(start_date, end_date)

    inc_df, aud_df, tel_df, dim_site_df = load_raw_tables(raw_dir)
    site_ids = sorted(dim_site_df["site_code"].str.upper().tolist())

    rows = []
    for as_of in date_range:
        for site_id in site_ids:
            days_since = compute_days_since_last_audit(aud_df, site_id, as_of)
            rej_rates = compute_rejection_rates(inc_df, site_id, as_of)
            inc_feats = compute_incident_features(inc_df, site_id, as_of)
            pressure_count = compute_pressure_anomalies(tel_df, site_id, as_of)
            open_findings = compute_open_findings(aud_df, site_id, as_of)

            rows.append({
                "site_id": site_id,
                "as_of_date": as_of,
                "days_since_last_audit": days_since,
                "rejection_rate_7d": rej_rates["rejection_rate_7d"],
                "rejection_rate_30d": rej_rates["rejection_rate_30d"],
                "incident_count_30d": inc_feats["incident_count_30d"],
                "incident_severity_score_30d": inc_feats["incident_severity_score_30d"],
                "pressure_anomaly_count_14d": pressure_count,
                "audit_finding_open_count": open_findings,
            })

    df = pd.DataFrame(rows)
    df["as_of_date"] = pd.to_datetime(df["as_of_date"]).dt.date
    return df


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sentinel Feature Engineering — build fact_site_features.parquet"
    )
    parser.add_argument(
        "--days-back", type=int, default=180,
        help="Number of days back from today to compute features (default: 180)"
    )
    parser.add_argument(
        "--raw-dir", type=str, default=str(RAW_DIR_DEFAULT),
        help="Path to raw CSV directory (default: data/raw)"
    )
    parser.add_argument(
        "--output-dir", type=str, default=str(WAREHOUSE_DIR_DEFAULT),
        help="Path to warehouse output directory (default: data/warehouse)"
    )
    args = parser.parse_args()

    print(f"Building feature table — last {args.days_back} days...")
    df = build_feature_table(raw_dir=args.raw_dir, days_back=args.days_back)

    output_path = Path(args.output_dir) / "fact_site_features.parquet"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output_path, index=False)

    n_sites = df["site_id"].nunique()
    n_dates = df["as_of_date"].nunique()
    null_audit = df["days_since_last_audit"].isna().sum()

    print(f"  {len(df)} rows  ({n_sites} sites × {n_dates} days)")
    print(f"  Rows with no prior audit (days_since_last_audit=NULL): {null_audit}")
    print(f"  Output: {output_path}")
    print(f"\nFeature summary:")
    print(df.describe(include="all").to_string())


if __name__ == "__main__":
    main()
