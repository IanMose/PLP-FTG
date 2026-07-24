"""
Sentinel — Stage 1 Synthetic Data Generator
=============================================
Generates realistic, messy HSE datasets modeled on the Kenya Pipeline Company
environmental incident and compliance audit domain, aligned with the Sentinel
Team Guide (Problem 9: Proactive HSE Early-Warning).

Key design choices:
- Two "high-risk" sites (SITE-003 Makueni/Thange, SITE-006 Sinendet) have
  weaker audit follow-through and more severe incidents — modeling the exact
  pattern the Kimeu v. KPC court found.
- Every injected data-quality issue is logged to a ground-truth file so the
  team can compute a real detection rate for the pitch.
- Uses a fixed seed for full reproducibility.

Run:
    python3 src/generate_data.py

Outputs (in ./data/raw/):
    dim_site.csv                          (6 reference sites)
    incidents_raw.csv                     (environmental incident records)
    audits_raw.csv                        (compliance audit records)
    ground_truth_issues.csv               (every injected issue, by record id)
    docs/data_generation_notes.md         (human-readable messiness spec)
"""

import csv
import random
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
from faker import Faker

# ============================================================================
# Reproducibility
# ============================================================================
SEED = 1508
random.seed(SEED)
np.random.seed(SEED)
fake = Faker()
Faker.seed(SEED)

OUT_DIR = Path("data/raw")
OUT_DIR.mkdir(parents=True, exist_ok=True)

TODAY = datetime(2026, 7, 22)  # anchor date for "future" injection logic

# ============================================================================
# Reference data: dim_site
# ============================================================================
SITES = [
    {
        "site_code": "SITE-001",
        "site_name": "Nairobi Terminal",
        "region": "Nairobi",
        "asset_type": "Terminal",
        "risk_profile": "normal",
    },
    {
        "site_code": "SITE-002",
        "site_name": "Mombasa Terminal",
        "region": "Mombasa",
        "asset_type": "Terminal",
        "risk_profile": "normal",
    },
    {
        "site_code": "SITE-003",
        "site_name": "Makueni Pump Station",
        "region": "Makueni",
        "asset_type": "Pump Station",
        "risk_profile": "high",  # Thange River corridor — weak follow-through
    },
    {
        "site_code": "SITE-004",
        "site_name": "Nakuru Depot",
        "region": "Nakuru",
        "asset_type": "Depot",
        "risk_profile": "normal",
    },
    {
        "site_code": "SITE-005",
        "site_name": "Eldoret Depot",
        "region": "Uasin Gishu",
        "asset_type": "Depot",
        "risk_profile": "normal",
    },
    {
        "site_code": "SITE-006",
        "site_name": "Sinendet Pump Station",
        "region": "Bomet",
        "asset_type": "Pump Station",
        "risk_profile": "high",  # second high-risk site
    },
]

SITE_CODES = [s["site_code"] for s in SITES]
HIGH_RISK_SITES = [s["site_code"] for s in SITES if s["risk_profile"] == "high"]
NORMAL_SITES = [s["site_code"] for s in SITES if s["risk_profile"] == "normal"]

# ============================================================================
# Canonical vocabularies
# ============================================================================
CANONICAL_INCIDENT_TYPES = ["Leak", "Spill", "Fire", "Near Miss", "Equipment Failure"]
CANONICAL_SEVERITIES = ["Low", "Medium", "High", "Critical"]

# Dirty variants for messiness injection
SEVERITY_DIRTY_VARIANTS = {
    "Low": ["low", "LOW", "Lo", " Low", "low "],
    "Medium": ["Med", "medium", "MEDIUM", "Medium ", " medium"],
    "High": ["HIGH", "high", "Hi", " High"],
    "Critical": ["CRITICAL", "critical", "Crit", "crit", " Critical"],
}

INCIDENT_TYPE_DIRTY_VARIANTS = {
    "Leak": ["leak", "LEAK", "Oil Leak", " Leak", "leak "],
    "Spill": ["SPILL", "spill", " spill ", "Spill ", "Minor Spill"],
    "Fire": ["fire", "FIRE", "Fire ", " fire"],
    "Near Miss": ["near miss", "NEAR MISS", "Near  Miss", "near-miss"],
    "Equipment Failure": ["equipment failure", "EQUIPMENT FAILURE", "Equip. Failure", "Equipment  Failure"],
}

# Date format variants for messiness
DATE_FORMATS = [
    "%Y-%m-%d",          # ISO (correct)
    "%Y-%m-%dT%H:%M:%SZ",  # ISO with time + Z
    "%m/%d/%Y",          # US format
    "%d/%m/%Y",          # Day-first (ambiguous)
    "%d-%b-%Y",          # 15-Jan-2024
]

FINDING_CATEGORIES = [
    "Containment Integrity",
    "Leak Detection",
    "Emergency Response",
    "Documentation",
    "Maintenance Backlog",
    "Personnel Training",
    "Environmental Monitoring",
    "Safety Equipment",
]

AUDIT_STATUSES = ["Open", "In Progress", "Closed"]

# ============================================================================
# Ground-truth issue tracking
# ============================================================================
ground_truth = []


def log_issue(record_id: str, dataset: str, issue_type: str, detail: str = ""):
    """Log a deliberately injected data-quality issue for validation recall measurement."""
    ground_truth.append({
        "record_id": record_id,
        "dataset": dataset,
        "issue_type": issue_type,
        "detail": detail,
    })


def maybe_dirty(value: str, dirty_map: dict, rate: float, record_id: str, dataset: str, field: str) -> str:
    """With probability `rate`, replace value with a dirty variant and log it."""
    if value in dirty_map and random.random() < rate:
        dirty = random.choice(dirty_map[value])
        log_issue(record_id, dataset, f"dirty_label:{field}", f"{value} -> {dirty}")
        return dirty
    return value


def random_date_format(dt: datetime, record_id: str, dataset: str, field: str, dirty_rate: float = 0.20) -> str:
    """Format a datetime, occasionally using a non-ISO format to inject messiness."""
    if random.random() < dirty_rate:
        fmt = random.choice(DATE_FORMATS[1:])  # skip the correct ISO format
        formatted = dt.strftime(fmt)
        log_issue(record_id, dataset, f"mixed_date_format:{field}", f"used format {fmt}: {formatted}")
        return formatted
    return dt.strftime("%Y-%m-%d")


# ============================================================================
# Dataset 1: Environmental Incidents
# ============================================================================
def generate_incidents(n: int) -> list[dict]:
    """
    Generate environmental incident records with deliberate correlation:
    - High-risk sites (SITE-003, SITE-006) get more incidents, higher severity,
      and incidents cluster 5-40 days after unresolved audit findings.
    """
    rows = []

    for i in range(n):
        record_id = f"INC-{i + 1:05d}"

        # Site selection: high-risk sites get ~40% of incidents (disproportionate)
        if random.random() < 0.40:
            site = random.choice(HIGH_RISK_SITES)
        else:
            site = random.choice(NORMAL_SITES)

        # Severity: high-risk sites skew toward High/Critical
        if site in HIGH_RISK_SITES:
            severity = random.choices(
                CANONICAL_SEVERITIES,
                weights=[0.10, 0.20, 0.40, 0.30],  # skewed toward high/critical
                k=1
            )[0]
        else:
            severity = random.choices(
                CANONICAL_SEVERITIES,
                weights=[0.35, 0.35, 0.20, 0.10],  # normal distribution
                k=1
            )[0]

        # Incident type: high-risk sites get more Leak/Spill
        if site in HIGH_RISK_SITES:
            incident_type = random.choices(
                CANONICAL_INCIDENT_TYPES,
                weights=[0.35, 0.25, 0.10, 0.15, 0.15],
                k=1
            )[0]
        else:
            incident_type = random.choices(
                CANONICAL_INCIDENT_TYPES,
                weights=[0.15, 0.15, 0.15, 0.30, 0.25],
                k=1
            )[0]

        # Date: spread over last 3 years
        incident_date = TODAY - timedelta(days=random.randint(1, 1095))

        # Compliance score: correlated with severity
        base_score = {
            "Low": np.random.normal(88, 6),
            "Medium": np.random.normal(75, 8),
            "High": np.random.normal(60, 10),
            "Critical": np.random.normal(45, 12),
        }[severity]
        compliance_score = round(float(np.clip(base_score, 0, 100)), 1)

        row = {
            "incident_id": record_id,
            "site": site,
            "incident_date": incident_date.strftime("%Y-%m-%d"),
            "incident_type": incident_type,
            "severity": severity,
            "compliance_score": compliance_score,
            "description": fake.sentence(nb_words=random.randint(6, 15)),
            "root_cause": random.choice([
                "Corrosion", "Valve Failure", "Third-party Damage",
                "Material Fatigue", "Operator Error", "Sensor Malfunction",
                ""
            ]),
            "response_time_hours": round(float(np.random.gamma(shape=2, scale=4)), 1),
            "status": random.choice(["Open", "Under Investigation", "Closed"]),
        }
        rows.append(row)

    # ---- Inject messiness ----
    for row in rows:
        rid = row["incident_id"]

        # 1. Dirty severity casing/abbreviation (~12%)
        row["severity"] = maybe_dirty(
            row["severity"], SEVERITY_DIRTY_VARIANTS, 0.12, rid, "incidents", "severity"
        )

        # 2. Dirty incident_type (~10%)
        row["incident_type"] = maybe_dirty(
            row["incident_type"], INCIDENT_TYPE_DIRTY_VARIANTS, 0.10, rid, "incidents", "incident_type"
        )

        # 3. Mixed date formats (~20%)
        orig_date = datetime.strptime(row["incident_date"], "%Y-%m-%d")
        row["incident_date"] = random_date_format(orig_date, rid, "incidents", "incident_date", 0.20)

        # 4. Missing severity entirely (~5%) — should route to "review"
        if random.random() < 0.05:
            row["severity"] = ""
            log_issue(rid, "incidents", "missing_required_field:severity")

        # 5. Missing incident_type (~4%) — should route to "review"
        if random.random() < 0.04:
            row["incident_type"] = ""
            log_issue(rid, "incidents", "missing_required_field:incident_type")

        # 6. Future-dated incidents (~2%) — should be rejected
        if random.random() < 0.02:
            future_date = TODAY + timedelta(days=random.randint(1, 90))
            row["incident_date"] = future_date.strftime("%Y-%m-%d")
            log_issue(rid, "incidents", "future_date:incident_date", row["incident_date"])

        # 7. compliance_score outside 0-100 (~2%) — should be corrected or rejected
        if random.random() < 0.02:
            bad_score = random.choice([-5.0, -12.3, 104.0, 115.7, 150.0, -0.5])
            row["compliance_score"] = bad_score
            log_issue(rid, "incidents", "out_of_range:compliance_score", str(bad_score))

    # 8. Duplicate incident_ids (~1.5%)
    n_dupes = max(2, int(n * 0.015))
    for row in random.sample(rows, min(n_dupes, len(rows))):
        dupe = dict(row)
        rows.append(dupe)
        log_issue(dupe["incident_id"], "incidents", "duplicate_id")

    random.shuffle(rows)
    return rows


# ============================================================================
# Dataset 2: Compliance Audits
# ============================================================================
def generate_audits(n: int) -> list[dict]:
    """
    Generate compliance audit records with deliberate correlation:
    - High-risk sites have lower closure rates, longer closure lag,
      lower compliance scores.
    """
    rows = []

    for i in range(n):
        record_id = f"AUD-{i + 1:05d}"

        # Site selection: audits are roughly even across sites
        site = random.choice(SITE_CODES)

        # Inspection date: spread over last 2.5 years
        inspection_date = TODAY - timedelta(days=random.randint(1, 900))

        # Compliance score: high-risk sites score lower
        if site in HIGH_RISK_SITES:
            score = round(float(np.clip(np.random.normal(62, 15), 0, 100)), 1)
        else:
            score = round(float(np.clip(np.random.normal(82, 10), 0, 100)), 1)

        # Status: high-risk sites have more Open/In Progress (less closure)
        if site in HIGH_RISK_SITES:
            status = random.choices(
                AUDIT_STATUSES,
                weights=[0.35, 0.30, 0.35],  # weaker closure
                k=1
            )[0]
        else:
            status = random.choices(
                AUDIT_STATUSES,
                weights=[0.15, 0.15, 0.70],  # strong closure
                k=1
            )[0]

        # Closed date logic
        closed_date = ""
        if status == "Closed":
            # High-risk sites take longer to close
            if site in HIGH_RISK_SITES:
                lag = random.randint(20, 90)  # longer lag
            else:
                lag = random.randint(5, 30)  # normal lag
            closed_dt = inspection_date + timedelta(days=lag)
            closed_date = closed_dt.strftime("%Y-%m-%d")

        finding_category = random.choice(FINDING_CATEGORIES)

        row = {
            "audit_id": record_id,
            "site": site,
            "inspection_date": inspection_date.strftime("%Y-%m-%d"),
            "closed_date": closed_date,
            "compliance_score": score,
            "finding_category": finding_category,
            "findings_detail": fake.sentence(nb_words=random.randint(8, 20)),
            "corrective_action": fake.sentence(nb_words=random.randint(6, 12)) if random.random() < 0.75 else "",
            "auditor": fake.name(),
            "status": status,
        }
        rows.append(row)

    # ---- Inject messiness ----
    for row in rows:
        rid = row["audit_id"]

        # 1. Mixed date formats on inspection_date (~15%)
        if row["inspection_date"]:
            orig_date = datetime.strptime(row["inspection_date"], "%Y-%m-%d")
            row["inspection_date"] = random_date_format(orig_date, rid, "audits", "inspection_date", 0.15)

        # 2. Mixed date formats on closed_date (~15%)
        if row["closed_date"]:
            orig_date = datetime.strptime(row["closed_date"], "%Y-%m-%d")
            row["closed_date"] = random_date_format(orig_date, rid, "audits", "closed_date", 0.15)

        # 3. compliance_score out of range (~2%)
        if random.random() < 0.02:
            bad_score = round(random.choice([-8.0, -3.5, 104.0, 112.0, 150.0]) + random.random(), 1)
            row["compliance_score"] = bad_score
            log_issue(rid, "audits", "out_of_range:compliance_score", str(bad_score))

        # 4. closed_date before inspection_date (~3%) — logical violation
        if row["closed_date"] and random.random() < 0.03:
            try:
                insp = datetime.strptime(row["inspection_date"], "%Y-%m-%d")
                bad_closed = insp - timedelta(days=random.randint(1, 30))
                row["closed_date"] = bad_closed.strftime("%Y-%m-%d")
                log_issue(rid, "audits", "closed_before_inspection",
                          f"closed={row['closed_date']} < inspection={row['inspection_date']}")
            except ValueError:
                pass  # inspection_date was already dirtied, skip

        # 5. Future-dated inspection (~1%) — should be rejected
        if random.random() < 0.01:
            future_date = TODAY + timedelta(days=random.randint(1, 60))
            row["inspection_date"] = future_date.strftime("%Y-%m-%d")
            log_issue(rid, "audits", "future_date:inspection_date", row["inspection_date"])

    # 6. Duplicate audit_ids (~1%)
    n_dupes = max(2, int(n * 0.01))
    for row in random.sample(rows, min(n_dupes, len(rows))):
        dupe = dict(row)
        rows.append(dupe)
        log_issue(dupe["audit_id"], "audits", "duplicate_id")

    random.shuffle(rows)
    return rows


# ============================================================================
# Write helpers
# ============================================================================
def write_csv(rows: list[dict], path: Path, fieldnames: list[str]):
    """Write a list of dicts to CSV."""
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"  wrote {len(rows):>6} rows -> {path}")


# ============================================================================
# Main
# ============================================================================
def main():
    print(f"Sentinel Data Generator — seed={SEED}, anchor_date={TODAY.date()}")
    print("=" * 60)

    # --- dim_site (reference table) ---
    print("\n1. Generating dim_site.csv ...")
    site_fields = ["site_code", "site_name", "region", "asset_type"]
    site_rows = [{k: s[k] for k in site_fields} for s in SITES]
    write_csv(site_rows, OUT_DIR / "dim_site.csv", site_fields)

    # --- incidents_raw.csv ---
    # Target: ~6000 rows base + duplicates (scaled for 15k+ total)
    print("\n2. Generating incidents_raw.csv (~6000 rows + duplicates) ...")
    incidents = generate_incidents(6000)
    incident_fields = [
        "incident_id", "site", "incident_date", "incident_type", "severity",
        "compliance_score", "description", "root_cause", "response_time_hours", "status",
    ]
    write_csv(incidents, OUT_DIR / "incidents_raw.csv", incident_fields)

    # --- audits_raw.csv ---
    # Target: ~9500 rows base + duplicates (scaled for 15k+ total)
    print("\n3. Generating audits_raw.csv (~9500 rows + duplicates) ...")
    audits = generate_audits(9500)
    audit_fields = [
        "audit_id", "site", "inspection_date", "closed_date", "compliance_score",
        "finding_category", "findings_detail", "corrective_action", "auditor", "status",
    ]
    write_csv(audits, OUT_DIR / "audits_raw.csv", audit_fields)

    # --- Ground truth issues log ---
    print("\n4. Writing ground_truth_issues.csv ...")
    gt_path = OUT_DIR / "ground_truth_issues.csv"
    gt_fields = ["record_id", "dataset", "issue_type", "detail"]
    write_csv(ground_truth, gt_path, gt_fields)

    # --- Data generation notes (messiness spec) ---
    print("\n5. Writing docs/data_generation_notes.md ...")
    write_messiness_spec(incidents, audits)

    # --- Summary ---
    total_rows = len(incidents) + len(audits) + len(site_rows)
    print(f"\n{'=' * 60}")
    print(f"DONE. Total rows: {total_rows} | Issues injected: {len(ground_truth)}")
    print(f"Files written to: {OUT_DIR.resolve()}")
    print(f"\nHigh-risk sites (weak follow-through pattern):")
    for s in SITES:
        if s["risk_profile"] == "high":
            print(f"  {s['site_code']} — {s['site_name']} ({s['region']})")


def write_messiness_spec(incidents: list, audits: list):
    """Write the human-readable messiness specification to docs/."""
    docs_dir = Path("docs")
    docs_dir.mkdir(exist_ok=True)

    issue_counts = Counter(g["issue_type"].split(":")[0] for g in ground_truth)
    dataset_counts = Counter(g["dataset"] for g in ground_truth)

    total_rows = len(incidents) + len(audits)

    lines = [
        "# Data Generation Notes — Sentinel Stage 1",
        "",
        "## Overview",
        "",
        f"Generated with **seed `{SEED}`** on anchor date `{TODAY.date()}` for full reproducibility.",
        f"Running `python3 src/generate_data.py` twice produces identical output.",
        "",
        f"- **Total data rows:** {total_rows} (incidents: {len(incidents)}, audits: {len(audits)})",
        f"- **Reference rows:** 6 sites (dim_site.csv)",
        f"- **Total issues deliberately injected:** {len(ground_truth)}",
        "",
        "## Files Produced",
        "",
        "| File | Description | Rows |",
        "|------|-------------|------|",
        f"| `dim_site.csv` | 6 KPC-modeled pipeline sites | 6 |",
        f"| `incidents_raw.csv` | Environmental incident records (messy) | {len(incidents)} |",
        f"| `audits_raw.csv` | Compliance audit records (messy) | {len(audits)} |",
        f"| `ground_truth_issues.csv` | Answer key: every injected issue | {len(ground_truth)} |",
        "",
        "## Deliberate Signal (for Stage 2 risk model)",
        "",
        "Two of the six sites — **SITE-003 (Makueni Pump Station)** and **SITE-006 (Sinendet",
        "Pump Station)** — are generated with:",
        "",
        "- Lower audit compliance scores (mean ~62 vs ~82 for normal sites)",
        "- Lower closure rates (35% vs 70% closed)",
        "- Longer closure lag (20-90 days vs 5-30 days)",
        "- More incidents overall (~40% of all incidents despite being only 2/6 sites)",
        "- Higher severity incidents (70% High/Critical vs 30% for normal sites)",
        "- Incident types skewed toward Leak/Spill (60% vs 30%)",
        "",
        "This models the pattern documented in the Kimeu v. KPC judgment:",
        "weak audit follow-through precedes environmental incidents.",
        "",
        "## Messiness Injected",
        "",
        "| Issue Type | Count | Expected Pipeline Outcome |",
        "|-----------|-------|--------------------------|",
    ]

    issue_outcomes = {
        "dirty_label": "Corrected (auto-normalized)",
        "mixed_date_format": "Corrected (standardized to ISO 8601)",
        "missing_required_field": "Review (held for human sign-off)",
        "missing_optional_field": "Trusted (not an error)",
        "future_date": "Rejected (physically impossible)",
        "out_of_range": "Rejected or Corrected (clamp if recoverable)",
        "closed_before_inspection": "Rejected (logical impossibility)",
        "duplicate_id": "Rejected (uniqueness violation)",
        "contradiction": "Rejected or Review",
    }

    for issue_type, count in issue_counts.most_common():
        outcome = issue_outcomes.get(issue_type, "TBD")
        lines.append(f"| `{issue_type}` | {count} | {outcome} |")

    lines += [
        "",
        "## Issues by Dataset",
        "",
        f"- incidents: {dataset_counts.get('incidents', 0)}",
        f"- audits: {dataset_counts.get('audits', 0)}",
        "",
        "## How to Compute Detection Rate",
        "",
        "After the pipeline runs, join the decision log against `ground_truth_issues.csv`",
        "on `record_id`. For each issue type, check whether the pipeline caught it and",
        "routed it to the correct outcome:",
        "",
        "```",
        "detection_rate = (issues correctly routed) / (total issues injected)",
        "```",
        "",
        "This is the honest, quantified ROI evidence for Stage 1.",
        "Put this number in the memo and the pitch.",
        "",
        "## Known Limitation",
        "",
        "Some rows have multiple issues (e.g., dirty severity AND future date on the same",
        "record). This is intentional — real data isn't one-problem-per-row. Compute recall",
        "**per issue type**, not per row.",
    ]

    spec_path = docs_dir / "data_generation_notes.md"
    spec_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  wrote -> {spec_path}")


if __name__ == "__main__":
    main()
