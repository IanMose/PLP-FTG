"""
Sentinel — Validation Module

Responsible for:
- Row-level validation rules (pandera schemas + assertions)
- CLI gate: --fail-below threshold enforcement

Validation Rules:
| Rule                  | Field            | Condition                                        |
|-----------------------|------------------|--------------------------------------------------|
| No future incidents   | incident_date    | Cannot be later than ingestion date              |
| Valid severity        | severity         | One of Low / Medium / High / Critical            |
| Score bounds          | compliance_score | Between 0 and 100                                |
| Date order            | closed_date      | Cannot precede inspection_date, if present       |
| Uniqueness            | incident_id/audit_id | Unique within a batch                        |
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

import pandas as pd


VALID_SEVERITIES = {"Low", "Medium", "High", "Critical"}


def validate_no_future_incidents(df: pd.DataFrame) -> pd.Series:
    """Date fields (incident_date, inspection_date) cannot be later than today."""
    result = pd.Series([True] * len(df), index=df.index)
    current = pd.Timestamp.now(tz=timezone.utc)

    # Check incident_date
    if "incident_date" in df.columns:
        dates = pd.to_datetime(df["incident_date"], errors="coerce", utc=True)
        result = result & (dates.isna() | (dates <= current))

    # Check inspection_date (for audit records)
    if "inspection_date" in df.columns:
        dates = pd.to_datetime(df["inspection_date"], errors="coerce", utc=True)
        result = result & (dates.isna() | (dates <= current))

    return result


def validate_severity(df: pd.DataFrame) -> pd.Series:
    """severity must be one of Low / Medium / High / Critical (post-normalization)."""
    if "severity" not in df.columns:
        return pd.Series([True] * len(df), index=df.index)

    return df["severity"].isin(VALID_SEVERITIES) | df["severity"].isna()


def validate_score_bounds(df: pd.DataFrame) -> pd.Series:
    """compliance_score must be between 0 and 100."""
    if "compliance_score" not in df.columns:
        return pd.Series([True] * len(df), index=df.index)

    score = pd.to_numeric(df["compliance_score"], errors="coerce")
    return score.isna() | ((score >= 0) & (score <= 100))


def validate_date_order(df: pd.DataFrame) -> pd.Series:
    """closed_date cannot precede inspection_date, if both are present."""
    if "closed_date" not in df.columns or "inspection_date" not in df.columns:
        return pd.Series([True] * len(df), index=df.index)

    closed = pd.to_datetime(df["closed_date"], errors="coerce", utc=True)
    inspection = pd.to_datetime(df["inspection_date"], errors="coerce", utc=True)

    # Valid if either date is missing, or closed >= inspection
    return closed.isna() | inspection.isna() | (closed >= inspection)


def validate_uniqueness(df: pd.DataFrame) -> pd.Series:
    """incident_id or audit_id must be unique within the batch (checked per-type)."""
    result = pd.Series([True] * len(df), index=df.index)

    if "incident_id" in df.columns:
        # Only check rows that actually have an incident_id
        has_inc_id = df["incident_id"].notna() & (df["incident_id"].astype(str) != "")
        if has_inc_id.any():
            inc_subset = df.loc[has_inc_id]
            inc_dupes = inc_subset.duplicated(subset=["incident_id"], keep=False)
            result.loc[inc_dupes[inc_dupes].index] = False

    if "audit_id" in df.columns:
        # Only check rows that actually have an audit_id
        has_aud_id = df["audit_id"].notna() & (df["audit_id"].astype(str) != "")
        if has_aud_id.any():
            aud_subset = df.loc[has_aud_id]
            aud_dupes = aud_subset.duplicated(subset=["audit_id"], keep=False)
            result.loc[aud_dupes[aud_dupes].index] = False

    return result


# Registry of all validation rules
VALIDATION_RULES = {
    "no_future_incidents": validate_no_future_incidents,
    "valid_severity": validate_severity,
    "score_bounds": validate_score_bounds,
    "date_order": validate_date_order,
    "uniqueness": validate_uniqueness,
}


def validate_all(df: pd.DataFrame) -> pd.DataFrame:
    """
    Run all validation rules against a DataFrame.

    Returns a DataFrame with the same index and a boolean column per rule,
    plus a 'valid' column (True only if all rules pass for that row).
    """
    results = pd.DataFrame(index=df.index)
    for rule_name, rule_fn in VALIDATION_RULES.items():
        results[rule_name] = rule_fn(df)

    results["valid"] = results.all(axis=1)
    return results


def get_failed_rules(validation_results: pd.DataFrame, row_idx: int) -> list[str]:
    """Get list of rule names that failed for a given row."""
    failed = []
    for col in validation_results.columns:
        if col == "valid":
            continue
        if not validation_results.loc[row_idx, col]:
            failed.append(col)
    return failed


# --- CLI Gate ---

def load_decision_counts() -> dict:
    """Load decision counts from the decided output in data/warehouse/."""
    decided_path = os.path.join("data", "warehouse", "decided_batch.parquet")
    if not os.path.exists(decided_path):
        # Try JSON fallback
        decided_json = os.path.join("data", "warehouse", "decision_summary.json")
        if os.path.exists(decided_json):
            with open(decided_json) as f:
                return json.load(f)
        return {}

    df = pd.read_parquet(decided_path)
    if "decision" not in df.columns:
        return {}
    return df["decision"].value_counts().to_dict()


def compute_pass_rate(counts: dict) -> float:
    """Compute the trusted+corrected rate from decision counts."""
    total = sum(counts.values())
    if total == 0:
        return 0.0
    return (counts.get("trusted", 0) + counts.get("corrected", 0)) / total


def main():
    parser = argparse.ArgumentParser(description="Sentinel Data-Quality Gate")
    parser.add_argument(
        "--fail-below",
        type=float,
        default=0.90,
        help="Minimum trusted+corrected rate to pass the gate (default: 0.90)",
    )
    args = parser.parse_args()

    counts = load_decision_counts()

    if not counts:
        print("WARNING: No decision counts found. Ensure the pipeline has been run.")
        print("GATE FAILED: no data to evaluate.")
        sys.exit(1)

    rate = compute_pass_rate(counts)
    print(f"Decision counts: {counts}")
    print(f"Trusted+corrected rate: {rate:.2%} (threshold {args.fail_below:.0%})")

    if rate < args.fail_below:
        print("GATE FAILED: data-quality threshold not met.")
        sys.exit(1)

    print("GATE PASSED.")


if __name__ == "__main__":
    main()
