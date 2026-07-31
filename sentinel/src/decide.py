"""
Sentinel — Decision Module

Responsible for:
- Routing every record to exactly one of four outcomes:
  - trusted:   passes every rule as-is
  - corrected: failed a recoverable rule, auto-corrected, reason logged
  - review:    ambiguous, held for human sign-off
  - rejected:  fails a hard rule, quarantined with reason

Every decision is persisted with a reason for full traceability.
"""

import argparse
import json
import os

import pandas as pd

from src.validate import VALID_SEVERITIES, validate_all, get_failed_rules
from src.transform import normalize_severity, SEVERITY_LOOKUP


# Rules that can be auto-corrected
RECOVERABLE_RULES = {"valid_severity", "score_bounds"}

# Rules that are ambiguous and need human review
REVIEW_RULES = {"date_order", "valid_pressure", "sensor_readings"}

# Rules that are hard failures — record must be rejected
HARD_FAIL_RULES = {"no_future_incidents", "uniqueness", "valid_coordinates"}


def attempt_correction(row: pd.Series, failed_rules: list[str]) -> tuple[pd.Series, list[str]]:
    """
    Attempt to auto-correct recoverable rule failures.

    Returns:
        tuple: (corrected_row, list_of_corrections_applied)
    """
    row = row.copy()
    corrections = []

    if "valid_severity" in failed_rules:
        # Attempt to normalize severity via fuzzy matching
        raw_severity = str(row.get("severity", "")).strip().lower()
        if raw_severity in SEVERITY_LOOKUP:
            corrected_val = SEVERITY_LOOKUP[raw_severity]
            corrections.append(f"severity corrected: '{row.get('severity')}' -> '{corrected_val}'")
            row["severity"] = corrected_val

    if "score_bounds" in failed_rules:
        # Clamp compliance_score to [0, 100]
        try:
            score = float(row.get("compliance_score", 0))
            if score < 0:
                row["compliance_score"] = 0.0
                corrections.append(f"compliance_score clamped: {score} -> 0")
            elif score > 100:
                row["compliance_score"] = 100.0
                corrections.append(f"compliance_score clamped: {score} -> 100")
        except (ValueError, TypeError):
            pass  # Can't correct non-numeric — will fall through to review

    return row, corrections


def decide_record(row: pd.Series, failed_rules: list[str]) -> tuple[str, str, pd.Series]:
    """
    Route a single record to its decision outcome.

    Returns:
        tuple: (decision, reason, possibly_corrected_row)
    """
    if not failed_rules:
        return "trusted", "all rules passed", row

    # Check for missing required fields — route to review
    has_missing_severity = (
        "valid_severity" in failed_rules
        and "severity" in row.index
        and (pd.isna(row.get("severity")) or str(row.get("severity", "")).strip() == "")
    )
    if has_missing_severity:
        other_rules = [r for r in failed_rules if r != "valid_severity"]
        # If only missing severity, route to review
        hard_failures = [r for r in other_rules if r in HARD_FAIL_RULES]
        if hard_failures:
            reason = f"hard rule failure: {', '.join(hard_failures)}"
            return "rejected", reason, row
        if not other_rules:
            return "review", "missing required field: severity", row
        # Has other issues too — continue to normal routing with remaining rules
        failed_rules = other_rules

    # Check if any hard-fail rules were violated
    hard_failures = [r for r in failed_rules if r in HARD_FAIL_RULES]
    if hard_failures:
        reason = f"hard rule failure: {', '.join(hard_failures)}"
        return "rejected", reason, row

    # Check if all failures are recoverable
    recoverable_failures = [r for r in failed_rules if r in RECOVERABLE_RULES]
    review_failures = [r for r in failed_rules if r in REVIEW_RULES]
    other_failures = [r for r in failed_rules if r not in RECOVERABLE_RULES and r not in REVIEW_RULES]

    # If there are unknown/other failures, reject
    if other_failures:
        reason = f"unclassified rule failure: {', '.join(other_failures)}"
        return "rejected", reason, row

    # Attempt auto-correction for recoverable failures
    if recoverable_failures:
        corrected_row, corrections = attempt_correction(row, recoverable_failures)
        if corrections:
            reason = f"auto-corrected: {'; '.join(corrections)}"
            return "corrected", reason, corrected_row
        # Could not correct — send to review
        reason = f"correction attempted but failed: {', '.join(recoverable_failures)}"
        return "review", reason, row

    # Remaining are review-level issues
    if review_failures:
        reason = f"ambiguous, needs human review: {', '.join(review_failures)}"
        return "review", reason, row

    return "review", "unclassified failure", row


def decide_batch(df: pd.DataFrame) -> pd.DataFrame:
    """
    Apply validation and decision logic to an entire batch.

    Returns the original DataFrame with added columns:
    - decision: trusted/corrected/review/rejected
    - decision_reason: human-readable explanation
    """
    validation_results = validate_all(df)

    decisions = []
    reasons = []
    corrected_rows = []

    for idx in df.index:
        failed_rules = get_failed_rules(validation_results, idx)
        decision, reason, final_row = decide_record(df.loc[idx], failed_rules)
        decisions.append(decision)
        reasons.append(reason)
        corrected_rows.append(final_row)

    result_df = pd.DataFrame(corrected_rows, index=df.index)
    result_df["decision"] = decisions
    result_df["decision_reason"] = reasons

    return result_df


def main():
    parser = argparse.ArgumentParser(description="Sentinel Decision Layer")
    parser.add_argument(
        "--input",
        default=os.path.join("data", "warehouse", "transformed_batch.parquet"),
        help="Path to transformed batch parquet",
    )
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file not found: {args.input}")
        raise SystemExit(1)

    df = pd.read_parquet(args.input)
    print(f"Deciding {len(df)} records...")

    decided_df = decide_batch(df)

    # Persist decided output
    output_path = os.path.join("data", "warehouse", "decided_batch.parquet")
    decided_df.to_parquet(output_path, index=False)

    # Persist decision summary as JSON for the validate gate
    counts = decided_df["decision"].value_counts().to_dict()
    summary_path = os.path.join("data", "warehouse", "decision_summary.json")
    with open(summary_path, "w") as f:
        json.dump(counts, f, indent=2)

    # Quarantine rejected records
    rejected = decided_df[decided_df["decision"] == "rejected"]
    if len(rejected) > 0:
        quarantine_path = os.path.join("data", "quarantine", "rejected_batch.parquet")
        os.makedirs(os.path.dirname(quarantine_path), exist_ok=True)
        rejected.to_parquet(quarantine_path, index=False)
        print(f"Quarantined {len(rejected)} rejected records -> {quarantine_path}")

    # Print summary
    print(f"\nDecision Summary:")
    for decision, count in sorted(counts.items()):
        print(f"  {decision}: {count}")
    print(f"  total: {len(decided_df)}")


if __name__ == "__main__":
    main()
