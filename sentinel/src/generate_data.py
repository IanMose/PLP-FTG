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
    pipeline_telemetry_batch1.csv         (telemetry sensor readings — batch 1)
    pipeline_telemetry_batch2.csv         (telemetry sensor readings — batch 2)
    dim_asset.csv                         (Mombasa-Nairobi + western spur corridor geo layer)
    corridor_telemetry.csv                (48h/30min geo-tagged sensor readings incl. rainfall)
    ground_truth_issues.csv               (every injected issue, by record id)
    docs/data_generation_notes.md         (human-readable messiness spec)
"""

import csv
import math
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
# NOTE: Sites now align with real KPC operational facilities plus the Thange
# corridor segment for the Kimeu v. KPC framing. See data_generation_notes.md
# for the full KPC pump station reference and PS numbering rationale.
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
        "site_name": "Mombasa Terminal (Kipevu / PS14)",
        "region": "Mombasa",
        "asset_type": "Terminal",
        "risk_profile": "normal",
    },
    {
        "site_code": "SITE-003",
        "site_name": "Makueni Pipeline Section (Thange)",
        "region": "Makueni",
        "asset_type": "Pipeline Section",
        "risk_profile": "high",  # Thange River corridor — weak audit follow-through
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
        "site_name": "Eldoret Terminal",
        "region": "Uasin Gishu",
        "asset_type": "Terminal",
        "risk_profile": "normal",
    },
    {
        "site_code": "SITE-006",
        "site_name": "Sinendet Pump Station",
        "region": "Bomet",
        "asset_type": "Pump Station",
        "risk_profile": "high",  # second high-risk site — branch junction
    },
    {
        "site_code": "SITE-007",
        "site_name": "Kisumu Terminal",
        "region": "Kisumu",
        "asset_type": "Terminal",
        "risk_profile": "normal",  # confirmed KPC operational depot (PS28)
    },
]

SITE_CODES = [s["site_code"] for s in SITES]
HIGH_RISK_SITES = [s["site_code"] for s in SITES if s["risk_profile"] == "high"]
NORMAL_SITES = [s["site_code"] for s in SITES if s["risk_profile"] == "normal"]

# ============================================================================
# Canonical Site Coordinates
# ============================================================================
# All 7 KPC operational sites. Coordinates are public town-centre references
# jittered ±0.01–0.03° for synthetic incident placement.
# PS numbering: PS10=Nairobi, PS14=Mombasa(Kipevu), PS25=Nakuru,
# PS26=Sinendet, PS27=Eldoret, PS28=Kisumu. Site-003 is not a KPC depot —
# it represents the high-risk Thange River pipeline corridor segment.
CANONICAL_SITE_COORDS = {
    "Nairobi Terminal":                       {"latitude": -1.292, "longitude": 36.822},
    "Mombasa Terminal (Kipevu / PS14)":       {"latitude": -4.049, "longitude": 39.674},
    "Makueni Pipeline Section (Thange)":      {"latitude": -2.290, "longitude": 37.847},
    "Nakuru Depot":                           {"latitude": -0.303, "longitude": 36.080},
    "Eldoret Terminal":                       {"latitude":  0.517, "longitude": 35.268},
    "Sinendet Pump Station":                  {"latitude":  0.043, "longitude": 35.451},
    "Kisumu Terminal":                        {"latitude": -0.102, "longitude": 34.762},
}

# Map site_code -> site_name for coordinate lookup
SITE_CODE_TO_NAME = {s["site_code"]: s["site_name"] for s in SITES}

# ============================================================================
# Canonical vocabularies
# ============================================================================
CANONICAL_INCIDENT_TYPES = ["Leak", "Spill", "Fire", "Near Miss", "Equipment Failure"]
CANONICAL_SEVERITIES = ["Low", "Medium", "High", "Critical"]

# Dirty variants for messiness injection
SEVERITY_DIRTY_VARIANTS = {
    "Low":      ["low", "LOW", "Lo", " Low", "low "],
    "Medium":   ["Med", "medium", "MEDIUM", "Medium ", " medium"],
    "High":     ["HIGH", "high", "Hi", " High"],
    "Critical": ["CRITICAL", "critical", "Crit", "crit", " Critical"],
}

INCIDENT_TYPE_DIRTY_VARIANTS = {
    "Leak":              ["leak", "LEAK", "Oil Leak", " Leak", "leak "],
    "Spill":             ["SPILL", "spill", " spill ", "Spill ", "Minor Spill"],
    "Fire":              ["fire", "FIRE", "Fire ", " fire"],
    "Near Miss":         ["near miss", "NEAR MISS", "Near  Miss", "near-miss"],
    "Equipment Failure": ["equipment failure", "EQUIPMENT FAILURE", "Equip. Failure", "Equipment  Failure"],
}

# Site name dirty variants — shared across all datasets
SITE_DIRTY_VARIANTS = {
    "SITE-001": ["Nairobi term", "nairobi terminal", "NRB Terminal", "NAIROBI", "Nairobi  Terminal"],
    "SITE-002": ["Mombasa term", "mombasa terminal", "Kipevu terminal", "MSA Terminal", "MOMBASA", "Mombasa  Terminal"],
    "SITE-003": ["Makueni PS", "makueni pipeline", "MAKUENI", "Thange section", "Kibwezi", "makueni section"],
    "SITE-004": ["Nakuru dep", "nakuru depot", "NKR Depot", "NAKURU", "Nakuru  Depot"],
    "SITE-005": ["Eldoret term", "eldoret terminal", "ELD Terminal", "ELDORET", "Eldoret  Terminal"],
    "SITE-006": ["Sinendet PS", "sinendet pump", "SINENDET", "Sinendet  Pump Station", "sinendet pump station"],
    "SITE-007": ["Kisumu term", "kisumu terminal", "KSM Terminal", "KISUMU", "Kisumu  Terminal"],
}

# Pipeline sections for telemetry
PIPELINE_SECTIONS = [
    "Section A — Mombasa-Nairobi Main",
    "Section B — Nairobi-Nakuru Spur",
    "Section C — Nakuru-Eldoret Extension",
    "Section D — Sinendet Lateral",
    "Section E — Makueni Branch",
    "Section F — Kisumu Terminal Link",
]

# Date format variants for messiness
DATE_FORMATS = [
    "%Y-%m-%d",           # ISO (correct)
    "%Y-%m-%dT%H:%M:%SZ", # ISO with time + Z
    "%m/%d/%Y",           # US format
    "%d/%m/%Y",           # Day-first (ambiguous)
    "%d-%b-%Y",           # 15-Jan-2024
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


def maybe_dirty_site(site_code: str, rate: float, record_id: str, dataset: str) -> str:
    """With probability `rate`, replace site_code with a dirty variant and log it."""
    if site_code in SITE_DIRTY_VARIANTS and random.random() < rate:
        dirty = random.choice(SITE_DIRTY_VARIANTS[site_code])
        log_issue(record_id, dataset, "dirty_label:site", f"{site_code} -> {dirty}")
        return dirty
    return site_code


def random_date_format(dt: datetime, record_id: str, dataset: str, field: str, dirty_rate: float = 0.20) -> str:
    """Format a datetime, occasionally using a non-ISO format to inject messiness."""
    if random.random() < dirty_rate:
        fmt = random.choice(DATE_FORMATS[1:])  # skip the correct ISO format
        formatted = dt.strftime(fmt)
        log_issue(record_id, dataset, f"mixed_date_format:{field}", f"used format {fmt}: {formatted}")
        return formatted
    return dt.strftime("%Y-%m-%d")


# ============================================================================
# Coordinate helpers
# ============================================================================
def get_site_coords(site_code: str) -> tuple[float, float]:
    """Get canonical coordinates for a site, applying random jitter ±0.01 to ±0.03 degrees."""
    site_name = SITE_CODE_TO_NAME.get(site_code, "")
    coords = CANONICAL_SITE_COORDS.get(site_name)
    if coords is None:
        # Fallback for sites whose name isn't in the coord map
        coords = {"latitude": -1.30, "longitude": 36.85}

    jitter_lat = random.uniform(0.01, 0.03) * random.choice([-1, 1])
    jitter_lon = random.uniform(0.01, 0.03) * random.choice([-1, 1])

    return (
        round(coords["latitude"] + jitter_lat, 6),
        round(coords["longitude"] + jitter_lon, 6),
    )


def inject_invalid_coordinates(row: dict, record_id: str, dataset: str) -> dict:
    """With ~1% probability, inject invalid coordinates and log the issue."""
    if random.random() < 0.01:
        invalid_type = random.choice(["lat_gt_90", "lon_invalid", "zero_zero"])
        if invalid_type == "lat_gt_90":
            row["latitude"] = round(random.uniform(91.0, 180.0), 6)
            log_issue(record_id, dataset, "invalid_coordinates", f"latitude={row['latitude']} > 90")
        elif invalid_type == "lon_invalid":
            row["longitude"] = round(random.uniform(181.0, 360.0), 6)
            log_issue(record_id, dataset, "invalid_coordinates", f"longitude={row['longitude']} outside valid range")
        else:  # zero_zero
            row["latitude"] = 0.0
            row["longitude"] = 0.0
            log_issue(record_id, dataset, "invalid_coordinates", "coordinates (0,0)")
    return row

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

        # Assign coordinates BEFORE dirty label injection
        lat, lon = get_site_coords(site)

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
            "Low":      np.random.normal(88, 6),
            "Medium":   np.random.normal(75, 8),
            "High":     np.random.normal(60, 10),
            "Critical": np.random.normal(45, 12),
        }[severity]
        compliance_score = round(float(np.clip(base_score, 0, 100)), 1)

        row = {
            "incident_id": record_id,
            "site": site,
            "latitude": lat,
            "longitude": lon,
            "incident_date": incident_date.strftime("%Y-%m-%d"),
            "incident_type": incident_type,
            "severity": severity,
            "compliance_score": compliance_score,
            "description": fake.sentence(nb_words=random.randint(6, 15)),
            "root_cause": random.choice([
                "Corrosion", "Valve Failure", "Third-party Damage",
                "Material Fatigue", "Operator Error", "Sensor Malfunction", ""
            ]),
            "response_time_hours": round(float(np.random.gamma(shape=2, scale=4)), 1),
            "status": random.choice(["Open", "Under Investigation", "Closed"]),
        }
        rows.append(row)

    # ---- Inject messiness ----
    for row in rows:
        rid = row["incident_id"]

        # 0. Invalid coordinates (~1%) — should be rejected
        inject_invalid_coordinates(row, rid, "incidents")

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
            status = random.choices(AUDIT_STATUSES, weights=[0.35, 0.30, 0.35], k=1)[0]
        else:
            status = random.choices(AUDIT_STATUSES, weights=[0.15, 0.15, 0.70], k=1)[0]

        # Closed date logic
        closed_date = ""
        if status == "Closed":
            lag = random.randint(20, 90) if site in HIGH_RISK_SITES else random.randint(5, 30)
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
# Dataset 3: Pipeline Telemetry
# ============================================================================
def generate_telemetry(n: int) -> list[dict]:
    """
    Generate continuous pipeline sensor readings over the previous 90 days.
    Independent of incidents — represents the leading indicator layer.

    Messiness:
    - ~15% dirty site labels (reuses SITE_DIRTY_VARIANTS)
    - ~3% sensor dropout (null reading on one numeric field)
    - ~1% pressure spikes (clustered, gradual build-up over 3-5 readings)
    - ~1% duplicate reading IDs
    """
    rows = []
    sensor_ids = [f"SNS-{j:03d}" for j in range(1, 15)]  # SNS-001 to SNS-014

    start_date = TODAY - timedelta(days=90)
    timestamps = sorted([
        start_date + timedelta(seconds=random.randint(0, 90 * 24 * 3600))
        for _ in range(n)
    ])

    spike_cluster_count = max(2, int(n * 0.01 // 4))
    spike_cluster_starts = sorted(random.sample(range(100, n - 10), min(spike_cluster_count, n - 110)))
    spike_indices = set()
    for start_idx in spike_cluster_starts:
        cluster_len = random.randint(3, 5)
        for offset in range(cluster_len):
            if start_idx + offset < n:
                spike_indices.add(start_idx + offset)

    for i in range(n):
        record_id = f"TEL-{i + 1:06d}"
        site = random.choice(SITE_CODES)
        section = random.choice(PIPELINE_SECTIONS)
        timestamp = timestamps[i]

        pressure = round(float(np.random.normal(400, 80)), 1)
        pressure = max(200.0, min(600.0, pressure))
        flow_rate = round(float(np.random.normal(3000, 800)), 1)
        flow_rate = max(1000.0, min(5000.0, flow_rate))
        temperature = round(float(np.random.normal(30, 6)), 1)
        temperature = max(15.0, min(45.0, temperature))

        valve_status = random.choices(
            ["Open", "Closed", "Partially Open"],
            weights=[0.50, 0.30, 0.20],
            k=1
        )[0]

        if i in spike_indices:
            cluster_start = max(s for s in spike_cluster_starts if s <= i)
            position_in_cluster = i - cluster_start
            cluster_len = sum(1 for idx in spike_indices if idx >= cluster_start and idx < cluster_start + 6)
            if position_in_cluster < cluster_len - 1:
                escalation = 100 + (position_in_cluster * 150)
                pressure = round(600 + escalation, 1)
            else:
                if random.random() < 0.5:
                    pressure = round(random.uniform(1050, 1500), 1)
                else:
                    pressure = round(random.uniform(-50, -10), 1)
            log_issue(record_id, "telemetry", "pressure_spike",
                      f"pressure={pressure} at {timestamp.isoformat()} site={site}")

        row = {
            "reading_id": record_id,
            "timestamp": timestamp.strftime("%Y-%m-%dT%H:%M:%S"),
            "site": site,
            "pipeline_section": section,
            "pressure_psi": pressure,
            "flow_rate_bph": flow_rate,
            "temperature_celsius": temperature,
            "valve_status": valve_status,
            "sensor_id": random.choice(sensor_ids),
        }
        rows.append(row)

    # ---- Inject messiness ----
    for row in rows:
        rid = row["reading_id"]

        # 1. Dirty site label (~15%)
        row["site"] = maybe_dirty_site(row["site"], 0.15, rid, "telemetry")

        # 2. Sensor dropout (~3%) — null one numeric field
        if random.random() < 0.03:
            dropout_field = random.choice(["pressure_psi", "flow_rate_bph", "temperature_celsius"])
            row[dropout_field] = ""
            log_issue(rid, "telemetry", "sensor_dropout", f"{dropout_field} set to null")

    # 3. Duplicate reading_ids (~1%)
    n_dupes = max(2, int(n * 0.01))
    for row in random.sample(rows, min(n_dupes, len(rows))):
        dupe = dict(row)
        rows.append(dupe)
        log_issue(dupe["reading_id"], "telemetry", "duplicate_id")

    random.shuffle(rows)
    return rows

# ============================================================================
# Dataset 4: Corridor Geo Assets — Mombasa-Nairobi main line + western spur
# ============================================================================
# ADDITIVE layer — not a replacement for dim_site.
# dim_site (6 rows) stays the frozen join key for incidents/audits/telemetry.
# dim_asset gives the map/heatmap view meter-scale granularity along the
# physical corridors, and links back to dim_site via `nearest_site_code`.
#
# FIX (Issue 1): Western spur added — Nairobi Terminal → Nakuru → Sinendet
# → Eldoret, plus Sinendet → Kisumu branch. This gives SITE-004 (Nakuru),
# SITE-005 (Eldoret), and SITE-006 (Sinendet — high-risk) corridor coverage.
#
# FIX (Issue 2): Kibwezi renamed/corrected. SITE-003 (Makueni Pump Station)
# maps to PS6 Makindu (nearest real KPC station on this corridor section).
# Coordinates updated to Makindu town centre (~-2.2833, 37.8333).
#
# All coordinates are SIMULATED (jittered from public town-centre reference
# points). See docs/data_generation_notes.md for the real/synthetic split.
# ============================================================================

# Main line: Mombasa → Nairobi
# Format: (town_name, lat, lon, nearest_site_code | None)
# Waypoints now include all KPC operational PS towns (Option B numbering).
# Station mapping: PS-01=Mombasa, PS-02=Mariakani, PS-03=Maji ya Chumvi,
# PS-04=Samburu, PS-05=Mackinnon Road, PS-06=Maungu, PS-07=Manyani,
# PS-08=Mtito Andei, PS-09=Makindu, PS-10=Sultan Hamud, PS-11=Konza,
# PS-12=Athi River, PS-13=Nairobi Terminal.
CORRIDOR_WAYPOINTS_MAIN = [
    ("Mombasa",          -4.0435,  39.6682, "SITE-002"),   # PS-01 — Mombasa Terminal
    ("Mariakani",        -3.8730,  39.4510,  None),         # PS-02 — first booster ~40km
    ("Maji ya Chumvi",   -3.7990,  39.3110,  None),         # PS-03 — ~65km
    ("Samburu",          -3.9600,  39.1700,  None),         # PS-04 — ~80km
    ("Mackinnon Road",   -3.7400,  39.0550,  None),         # PS-05 — ~130km
    ("Maungu",           -3.5450,  38.7550,  None),         # PS-06 — ~165km
    ("Voi",              -3.3960,  38.5567,  None),         # intermediate — no PS here
    ("Manyani",          -3.1900,  38.4500,  None),         # PS-07 — ~240km (Tsavo)
    ("Mtito Andei",      -2.6903,  38.1671,  None),         # PS-08 — ~305km
    ("Makindu",          -2.2833,  37.8333, "SITE-003"),   # PS-09 — ~360km (Makueni PS)
    ("Sultan Hamud",     -1.9333,  37.3167,  None),         # PS-10 — ~435km
    ("Konza",            -1.7500,  37.1500,  None),         # PS-11 — ~460km
    ("Athi River",       -1.4560,  36.9770,  None),         # PS-12 — ~480km (Mlolongo)
    ("Nairobi Terminal", -1.2921,  36.8219, "SITE-001"),   # PS-13 — Embakasi terminal
]

# Western spur: Nairobi Terminal → Nakuru → Sinendet → Eldoret
# KPC operational numbering: PS-21=Naivasha, PS-22/23=Nakuru, PS-24=Sinendet,
# PS-25=Nakuru (branch station), PS-26=Eldoret.
CORRIDOR_WAYPOINTS_WESTERN = [
    ("Nairobi Terminal", -1.2921,  36.8219, "SITE-001"),   # PS-13 — shared origin
    ("Naivasha",         -0.7167,  36.4333,  None),         # PS-21 — Morendat booster
    ("Nakuru",           -0.3031,  36.0800, "SITE-004"),   # PS-23 — Nakuru Depot
    ("Sinendet",          0.0500,  35.4500, "SITE-006"),   # PS-24 — high-risk site
    ("Eldoret",           0.5167,  35.2833, "SITE-005"),   # PS-26 — Eldoret terminal
]

# Sinendet → Kisumu branch (Line 5)
# KPC operational numbering: PS-27=Kisumu terminal.
CORRIDOR_WAYPOINTS_KISUMU = [
    ("Sinendet",          0.0500,  35.4500, "SITE-006"),   # PS-24 — branch origin
    ("Muhoroni",         -0.1500,  35.2000,  None),
    ("Kisumu",           -0.1022,  34.7617,  None),         # PS-27 — Kisumu terminal
]

# All three chains combined for asset generation
ALL_CORRIDOR_CHAINS = [
    ("main",    CORRIDOR_WAYPOINTS_MAIN),
    ("western", CORRIDOR_WAYPOINTS_WESTERN),
    ("kisumu",  CORRIDOR_WAYPOINTS_KISUMU),
]

# Flood/landslide risk zones — keyed to "segment" label (town1-town2)
FLOOD_RISK_SEGMENTS = {
    # Main line flood risk (Tsavo corridor)
    "Maungu-Voi":              "high_flood",
    "Voi-Manyani":             "high_flood",
    "Manyani-Mtito Andei":     "high_flood",
    "Mtito Andei-Makindu":     "high_flood",
    "Makindu-Sultan Hamud":    "moderate_flood",
    "Sultan Hamud-Konza":      "moderate_flood",
    # Western spur — Rift Valley escarpment landslide risk
    "Nairobi Terminal-Naivasha": "moderate_flood",
    "Naivasha-Nakuru":           "high_flood",    # escarpment descent, landslide risk
    "Sinendet-Muhoroni":         "moderate_flood",
}

# Named pump stations along the corridor (for asset generation)
# Each tuple: (asset_id, town_name) — town must exist in one of the waypoint chains
PUMP_STATION_TOWNS = [
    # ── Mombasa–Nairobi main line ─────────────────────────────────────────────
    # KPC operational numbering (Option B).
    # PS-01 through PS-14 follow the main line from Kipevu to Embakasi.
    # PS-09 = Makindu (Kibwezi area); matches what the system called PS-06 before
    # renumbering. PS-06 was the old construction-era Makindu number — retired.
    ("PS-01", "Mombasa"),           # Kipevu / Changamwe terminal — SITE-002
    ("PS-02", "Mariakani"),         # First booster, ~40km from Mombasa
    ("PS-03", "Maji ya Chumvi"),    # ~65km
    ("PS-04", "Samburu"),           # ~80km
    ("PS-05", "Mackinnon Road"),    # ~130km
    ("PS-06", "Maungu"),            # ~165km
    ("PS-07", "Manyani"),           # ~240km (Tsavo area, near Tsavo West gate)
    ("PS-08", "Mtito Andei"),       # ~305km
    ("PS-09", "Makindu"),           # ~360km — nearest to SITE-003 (Makueni PS)
    ("PS-10", "Sultan Hamud"),      # ~435km
    ("PS-11", "Konza"),             # ~460km
    ("PS-12", "Athi River"),        # ~480km (Mlolongo / Athi River area)
    ("PS-13", "Nairobi Terminal"),  # ~490km — Embakasi terminal, SITE-001
    # ── Western spur: Nairobi → Nakuru → Sinendet → Eldoret ─────────────────
    # KPC operational numbering continues into the 20s for the western spur.
    ("PS-21", "Naivasha"),          # Morendat / Naivasha booster
    ("PS-22", "Nakuru"),            # Nakuru booster pump
    ("PS-23", "Nakuru"),            # Nakuru depot/receiving — SITE-004
    ("PS-24", "Sinendet"),          # Sinendet pump station — SITE-006 (high-risk)
    ("PS-25", "Nakuru"),            # PS-25 Nakuru confirmed in KPC attachment report
    ("PS-26", "Eldoret"),           # Eldoret depot terminal — SITE-005
    # ── Kisumu branch (Line 5) ────────────────────────────────────────────────
    ("PS-27", "Kisumu"),            # Kisumu terminal — branch end
]

# Depots — (asset_id, town_name)
# FIX Issue 4: removed unused cap/tanks tuple values — not in dim_asset schema
DEPOT_TOWNS = [
    ("DEP-01", "Mombasa"),          # Kipevu / PS14
    ("DEP-02", "Nairobi Terminal"), # Embakasi / PS10
]

def _haversine_km(p1: tuple, p2: tuple) -> float:
    """Haversine distance in km between two (lat, lon) points."""
    lat1, lon1 = p1
    lat2, lon2 = p2
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def _jitter_km(lat: float, lon: float, km: float) -> tuple[float, float]:
    """Apply uniform random jitter of up to `km` kilometres."""
    d_lat = (km / 111.0) * random.uniform(-1, 1)
    d_lon = (km / (111.0 * math.cos(math.radians(lat)))) * random.uniform(-1, 1)
    return lat + d_lat, lon + d_lon


def _build_wp_lookup() -> dict[str, tuple[float, float]]:
    """
    Build a town-name → (lat, lon) lookup from all corridor chains.
    Later chains overwrite duplicates (all three chains share Nairobi Terminal
    and Sinendet, which have identical coords, so this is safe).
    """
    lookup: dict[str, tuple[float, float]] = {}
    for _, chain in ALL_CORRIDOR_CHAINS:
        for name, lat, lon, _ in chain:
            lookup[name] = (lat, lon)
    return lookup


def generate_corridor_assets() -> list[dict]:
    """
    Generate the fine-grained corridor geo layer across all three chains:
      - Monitoring points every ~5km along each segment
      - Named pump stations at publicly-listed KPC towns
      - Depots at Mombasa (Kipevu) and Nairobi Terminal

    ~1% of monitoring points get corrupted coordinates injected (same
    convention as other datasets so validate.py is exercised on this layer).

    FIX (Issue 5/10): coordinate corruption is applied FIRST, then the separate
    ~1% missing-latitude injection runs independently. Both are logged to
    ground_truth so the pipeline can be tested against both failure modes.
    The two injections are independent — double-corruption on the same row
    is intentional (real data can have multiple issues on one record).
    """
    assets = []
    wp_lookup = _build_wp_lookup()
    mp_id = 1

    for chain_name, chain in ALL_CORRIDOR_CHAINS:
        cum_km = 0.0
        for i in range(len(chain) - 1):
            name1, lat1, lon1, _ = chain[i]
            name2, lat2, lon2, _ = chain[i + 1]

            # Skip duplicate shared origin when western/kisumu chains start
            # (Nairobi Terminal and Sinendet appear in multiple chains)
            seg_km = _haversine_km((lat1, lon1), (lat2, lon2))
            n_steps = max(int(seg_km / 5), 1)  # ~1 monitoring point per 5km

            for j in range(n_steps + 1):
                if i > 0 and j == 0:
                    continue  # skip duplicate at shared waypoint boundary

                t = j / n_steps if n_steps else 0
                lat = lat1 + (lat2 - lat1) * t
                lon = lon1 + (lon2 - lon1) * t
                jlat, jlon = _jitter_km(lat, lon, km=0.8)
                cum_km += seg_km / n_steps if n_steps else 0

                asset_id = f"MP-{mp_id:04d}"
                row = {
                    "asset_id": asset_id,
                    "asset_type": "monitoring_point",
                    "nearest_site_code": "",
                    "segment": f"{name1}-{name2}",
                    "chainage_km_approx": round(cum_km, 1),
                    "latitude": round(jlat, 6),
                    "longitude": round(jlon, 6),
                    "flood_landslide_risk_zone": FLOOD_RISK_SEGMENTS.get(f"{name1}-{name2}", "low"),
                    "sensor_suite": "pressure,flow,fiber_acoustic,rainfall",
                    "corridor_chain": chain_name,
                }

                # FIX Issue 10: corrupt coordinates first, then blank-latitude injection
                row = inject_invalid_coordinates(row, asset_id, "corridor_assets")

                # ~1% missing latitude (separate from coordinate corruption above)
                if random.random() < 0.01:
                    row["latitude"] = ""
                    log_issue(asset_id, "corridor_assets", "missing_required_field:latitude",
                              f"latitude blanked on {asset_id}")

                assets.append(row)
                mp_id += 1

    # Pump stations — jitter 2km from town centre
    for pid, town in PUMP_STATION_TOWNS:
        if town not in wp_lookup:
            # Safety guard: skip if town somehow missing from lookup
            continue
        lat, lon = wp_lookup[town]
        jlat, jlon = _jitter_km(lat, lon, km=2.0)
        nearest_site = next(
            (code for _, chain in ALL_CORRIDOR_CHAINS for name, _, _, code in chain if name == town and code),
            ""
        )
        assets.append({
            "asset_id": pid,
            "asset_type": "pump_station",
            "nearest_site_code": nearest_site,
            "segment": town,
            "chainage_km_approx": "",
            "latitude": round(jlat, 6),
            "longitude": round(jlon, 6),
            "flood_landslide_risk_zone": "",
            "sensor_suite": "pressure,flow,vibration",
            "corridor_chain": "named_station",
        })

    # Depots — jitter 3km from town centre
    for did, town in DEPOT_TOWNS:
        if town not in wp_lookup:
            continue
        lat, lon = wp_lookup[town]
        jlat, jlon = _jitter_km(lat, lon, km=3.0)
        nearest_site = next(
            (code for _, chain in ALL_CORRIDOR_CHAINS for name, _, _, code in chain if name == town and code),
            ""
        )
        assets.append({
            "asset_id": did,
            "asset_type": "depot",
            "nearest_site_code": nearest_site,
            "segment": town,
            "chainage_km_approx": "",
            "latitude": round(jlat, 6),
            "longitude": round(jlon, 6),
            "flood_landslide_risk_zone": "",
            "sensor_suite": "level,fire_detection",
            "corridor_chain": "named_station",
        })

    # ── Post-generation coordinate validation guard ──────────────────────────
    # Any row with |latitude| > 90 or |longitude| > 180 is a generator error
    # (e.g. the interpolation produced a physically impossible value).
    # Clamp to valid range and log so the pipeline can detect it.
    for row in assets:
        lat_val = row.get("latitude")
        lon_val = row.get("longitude")
        if lat_val == "" or lon_val == "":
            continue  # intentionally blanked for missing-field injection — skip
        try:
            lat_f = float(lat_val)
            lon_f = float(lon_val)
        except (TypeError, ValueError):
            continue
        if abs(lat_f) > 90:
            clamped = max(-90.0, min(90.0, lat_f))
            log_issue(row["asset_id"], "corridor_assets", "generator_error:invalid_latitude",
                      f"lat={lat_f} clamped to {clamped}")
            row["latitude"] = round(clamped, 6)
        if abs(lon_f) > 180:
            clamped = max(-180.0, min(180.0, lon_f))
            log_issue(row["asset_id"], "corridor_assets", "generator_error:invalid_longitude",
                      f"lon={lon_f} clamped to {clamped}")
            row["longitude"] = round(clamped, 6)

    return assets


def generate_corridor_telemetry(assets: list[dict], hours: int = 48, interval_min: int = 30) -> list[dict]:
    """
    48h / 30-min synthetic time series for every corridor asset that carries
    sensors (monitoring_point + pump_station). Adds rainfall_mm alongside
    the existing pressure/flow/temperature vocabulary — additive, not a change
    to the frozen fact_telemetry columns.

    Three demo anomaly events are injected deterministically (given SEED):
      - A slow leak (pressure/flow ramp-down) at one monitoring point
      - A flood-risk rainfall spike in a high_flood zone
      - A landslide-precursor rainfall spike near the Naivasha-Nakuru segment

    FIX (Issue 3): All three anomaly target lookups now use a safe default
    (None / fallback index) so a missing segment never raises StopIteration.
    FIX (Issue 7): Issues logged with dataset="corridor_telemetry" so the
    dataset_counts breakdown in write_messiness_spec() is accurate.
    """
    sensor_assets = [a for a in assets if a["asset_type"] in ("monitoring_point", "pump_station")]
    monitoring_points = [a for a in assets if a["asset_type"] == "monitoring_point"]

    # FIX Issue 3: safe defaults — fall back to a fixed index if target not found
    fallback_mp = monitoring_points[len(monitoring_points) // 3] if monitoring_points else None

    leak_target = next(
        (a["asset_id"] for a in monitoring_points
         if a.get("flood_landslide_risk_zone") == "low" and a.get("corridor_chain") == "main"),
        fallback_mp["asset_id"] if fallback_mp else None
    )
    flood_target = next(
        (a["asset_id"] for a in monitoring_points if a.get("flood_landslide_risk_zone") == "high_flood"),
        fallback_mp["asset_id"] if fallback_mp else None
    )
    # Landslide target: prefer Naivasha-Nakuru segment (escarpment), fall back to any high_flood
    landslide_target = next(
        (a["asset_id"] for a in monitoring_points if a.get("segment") == "Naivasha-Nakuru"),
        next(
            (a["asset_id"] for a in monitoring_points if a.get("flood_landslide_risk_zone") == "high_flood"),
            fallback_mp["asset_id"] if fallback_mp else None
        )
    )

    start = TODAY - timedelta(hours=hours)
    n_steps = int(hours * 60 / interval_min)
    rows = []
    reading_counter = 1

    for asset in sensor_assets:
        aid = asset["asset_id"]
        base_pressure = random.uniform(200, 550)
        base_flow = random.uniform(1500, 4500)

        for step in range(n_steps):
            ts = start + timedelta(minutes=interval_min * step)
            pressure = round(float(np.clip(np.random.normal(base_pressure, 15), 0, 1000)), 1)
            flow = round(float(np.clip(np.random.normal(base_flow, 200), 0, 6000)), 1)
            temperature = round(float(np.clip(np.random.normal(28, 5), 10, 50)), 1)
            rainfall = max(0.0, round(float(np.random.normal(0.3, 0.6)), 2))
            if 14 <= ts.hour <= 18:
                rainfall += max(0.0, round(float(np.random.normal(1.2, 1.0)), 2))
            status = "normal"
            reading_id = f"GTL-{reading_counter:06d}"

            # Demo anomaly 1: slow leak — pressure/flow ramp-down
            if aid == leak_target and 40 <= step <= 48:
                frac = (step - 40) / 8
                pressure = round(max(0.0, pressure - 200 * frac), 1)
                flow = round(max(0.0, flow - 900 * frac), 1)
                status = "warning" if step < 46 else "critical"
                log_issue(reading_id, "corridor_telemetry", "pressure_spike",
                          f"simulated leak ramp-down at {aid}, step={step}")

            # Demo anomaly 2: flood-risk rainfall spike
            if aid == flood_target and 20 <= step <= 28:
                rainfall += round(random.uniform(8, 15), 2)
                status = "advisory" if rainfall < 15 else "warning"

            # Demo anomaly 3: landslide-precursor rainfall spike (Naivasha-Nakuru escarpment)
            if aid == landslide_target and 60 <= step <= 68:
                rainfall += round(random.uniform(6, 11), 2)
                status = "warning"

            rows.append({
                "reading_id": reading_id,
                "asset_id": aid,
                "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%S"),
                "pressure_psi": pressure,
                "flow_rate_bph": flow,
                "temperature_celsius": temperature,
                "rainfall_mm": rainfall,
                "status": status,
            })
            reading_counter += 1

    return rows

# ============================================================================
# Write helpers
# ============================================================================
def write_csv(rows: list[dict], path: Path, fieldnames: list[str]):
    """Write a list of dicts to CSV."""
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
    print(f"  wrote {len(rows):>6} rows -> {path}")


# ============================================================================
# Main
# ============================================================================
def main():
    print(f"Sentinel Data Generator — seed={SEED}, anchor_date={TODAY.date()}")
    print("=" * 60)

    # --- dim_site (reference table — frozen, 6 rows) ---
    print("\n1. Generating dim_site.csv ...")
    site_fields = ["site_code", "site_name", "region", "asset_type"]
    site_rows = [{k: s[k] for k in site_fields} for s in SITES]
    write_csv(site_rows, OUT_DIR / "dim_site.csv", site_fields)

    # --- incidents_raw.csv ---
    print("\n2. Generating incidents_raw.csv (~6000 rows + duplicates) ...")
    incidents = generate_incidents(6000)
    incident_fields = [
        "incident_id", "site", "latitude", "longitude", "incident_date",
        "incident_type", "severity", "compliance_score", "description",
        "root_cause", "response_time_hours", "status",
    ]
    write_csv(incidents, OUT_DIR / "incidents_raw.csv", incident_fields)

    # --- audits_raw.csv ---
    print("\n3. Generating audits_raw.csv (~9500 rows + duplicates) ...")
    audits = generate_audits(9500)
    audit_fields = [
        "audit_id", "site", "inspection_date", "closed_date", "compliance_score",
        "finding_category", "findings_detail", "corrective_action", "auditor", "status",
    ]
    write_csv(audits, OUT_DIR / "audits_raw.csv", audit_fields)

    # --- pipeline_telemetry (two batches — frozen schema) ---
    print("\n4. Generating pipeline_telemetry_batch1.csv (4300 rows) ...")
    telemetry_batch1 = generate_telemetry(4300)
    telemetry_fields = [
        "reading_id", "timestamp", "site", "pipeline_section",
        "pressure_psi", "flow_rate_bph", "temperature_celsius",
        "valve_status", "sensor_id",
    ]
    write_csv(telemetry_batch1, OUT_DIR / "pipeline_telemetry_batch1.csv", telemetry_fields)

    print("\n5. Generating pipeline_telemetry_batch2.csv (700 rows) ...")
    telemetry_batch2 = generate_telemetry(700)
    write_csv(telemetry_batch2, OUT_DIR / "pipeline_telemetry_batch2.csv", telemetry_fields)

    # --- dim_asset.csv (corridor geo layer — main + western + kisumu) ---
    print("\n6. Generating dim_asset.csv (corridor monitoring points, pump stations, depots) ...")
    corridor_assets = generate_corridor_assets()
    asset_fields = [
        "asset_id", "asset_type", "nearest_site_code", "segment",
        "chainage_km_approx", "latitude", "longitude",
        "flood_landslide_risk_zone", "sensor_suite", "corridor_chain",
    ]
    write_csv(corridor_assets, OUT_DIR / "dim_asset.csv", asset_fields)

    # --- corridor_telemetry.csv (48h/30min synthetic time series) ---
    print("\n7. Generating corridor_telemetry.csv (48h geo-tagged sensor readings) ...")
    corridor_telemetry = generate_corridor_telemetry(corridor_assets)
    corridor_telemetry_fields = [
        "reading_id", "asset_id", "timestamp", "pressure_psi",
        "flow_rate_bph", "temperature_celsius", "rainfall_mm", "status",
    ]
    write_csv(corridor_telemetry, OUT_DIR / "corridor_telemetry.csv", corridor_telemetry_fields)

    # --- Ground truth issues log ---
    print("\n8. Writing ground_truth_issues.csv ...")
    gt_path = OUT_DIR / "ground_truth_issues.csv"
    gt_fields = ["record_id", "dataset", "issue_type", "detail"]
    write_csv(ground_truth, gt_path, gt_fields)

    # --- Data generation notes ---
    print("\n9. Writing docs/data_generation_notes.md ...")
    write_messiness_spec(incidents, audits, telemetry_batch1 + telemetry_batch2,
                         corridor_assets, corridor_telemetry)

    # --- Summary ---
    total_rows = (
        len(incidents) + len(audits) + len(site_rows)
        + len(telemetry_batch1) + len(telemetry_batch2)
        + len(corridor_assets) + len(corridor_telemetry)
    )
    print(f"\n{'=' * 60}")
    print(f"DONE. Total rows: {total_rows} | Issues injected: {len(ground_truth)}")
    print(f"Files written to: {OUT_DIR.resolve()}")
    print(f"\nHigh-risk sites (weak follow-through pattern):")
    for s in SITES:
        if s["risk_profile"] == "high":
            print(f"  {s['site_code']} — {s['site_name']} ({s['region']})")
    print(f"\nCorridor chains generated:")
    for chain_name, chain in ALL_CORRIDOR_CHAINS:
        print(f"  {chain_name}: {chain[0][0]} → {chain[-1][0]}")


def write_messiness_spec(incidents: list, audits: list, telemetry: list,
                         corridor_assets: list = None, corridor_telemetry: list = None):
    """
    Write the human-readable messiness specification to docs/.
    FIX Issue 4: summary line now includes corridor row counts.
    FIX Issue 7/8: dataset_counts printout covers corridor datasets.
    """
    docs_dir = Path("docs")
    docs_dir.mkdir(exist_ok=True)

    corridor_assets = corridor_assets or []
    corridor_telemetry = corridor_telemetry or []

    issue_counts = Counter(g["issue_type"].split(":")[0] for g in ground_truth)
    dataset_counts = Counter(g["dataset"] for g in ground_truth)

    total_rows = (len(incidents) + len(audits) + len(telemetry)
                  + len(corridor_assets) + len(corridor_telemetry))

    # FIX Issue 4: parenthetical now lists all five dataset row counts
    row_breakdown = (
        f"incidents: {len(incidents)}, audits: {len(audits)}, "
        f"telemetry: {len(telemetry)}, corridor_assets: {len(corridor_assets)}, "
        f"corridor_telemetry: {len(corridor_telemetry)}"
    )

    lines = [
        "# Data Generation Notes — Sentinel Stage 1",
        "",
        "## Overview",
        "",
        f"Generated with **seed `{SEED}`** on anchor date `{TODAY.date()}` for full reproducibility.",
        "Running `python3 src/generate_data.py` twice produces identical output.",
        "",
        f"- **Total data rows:** {total_rows} ({row_breakdown})",
        "- **Reference rows:** 6 sites (dim_site.csv)",
        f"- **Total issues deliberately injected:** {len(ground_truth)}",
        "",
        "## Files Produced",
        "",
        "| File | Description | Rows |",
        "|------|-------------|------|",
        f"| `dim_site.csv` | 6 KPC-modeled pipeline sites (frozen join key) | 6 |",
        f"| `incidents_raw.csv` | Environmental incident records (messy) | {len(incidents)} |",
        f"| `audits_raw.csv` | Compliance audit records (messy) | {len(audits)} |",
        f"| `pipeline_telemetry_batch1.csv` | Pipeline sensor readings — batch 1 (messy) | {min(len(telemetry), 4300)} |",
        f"| `pipeline_telemetry_batch2.csv` | Pipeline sensor readings — batch 2 (messy) | {max(0, len(telemetry) - 4300)} |",
        f"| `dim_asset.csv` | Corridor geo layer: main line + western spur + Kisumu branch | {len(corridor_assets)} |",
        f"| `corridor_telemetry.csv` | 48h/30min geo-tagged sensor readings incl. rainfall | {len(corridor_telemetry)} |",
        f"| `ground_truth_issues.csv` | Answer key: every injected issue | {len(ground_truth)} |",
        "",
        "## Corridor Chains",
        "",
        "| Chain | Route | Covers |",
        "|-------|-------|--------|",
        "| main | Mombasa → Nairobi Terminal | SITE-002, SITE-003 |",
        "| western | Nairobi Terminal → Nakuru → Sinendet → Eldoret | SITE-001, SITE-004, SITE-005, SITE-006 |",
        "| kisumu | Sinendet → Kisumu | SITE-006 (branch origin) |",
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
        "SITE-006 (Sinendet) now also has corridor coverage via the western spur,",
        "and is the branch origin of the Sinendet-Kisumu chain — so its high-risk",
        "pattern is visible in both the incident/audit tables AND the corridor map.",
        "",
        "## Datasets",
        "",
        "### Environmental Incidents (`incidents_raw.csv`)",
        "",
        "Spills, leaks, and fires — the **outcome** layer.",
        "Includes latitude/longitude assigned from canonical site coordinates with ±0.01–0.03° jitter.",
        "",
        "### Compliance Audits (`audits_raw.csv`)",
        "",
        "Regulatory inspection findings — the **oversight gap** layer.",
        "",
        "### Pipeline Telemetry (batches 1 & 2)",
        "",
        "Continuous sensor readings (pressure, flow, temperature) — the **leading indicator** layer.",
        "5000 total rows. Covers the previous 90 days. Pressure spikes cluster in groups of 3-5 readings.",
        "",
        "### Corridor Geo Layer (`dim_asset.csv`, `corridor_telemetry.csv`)",
        "",
        "Additive — not a replacement for dim_site/fact_incidents/fact_audits/fact_telemetry.",
        "",
        "- **`dim_asset.csv`** — monitoring points every ~5km along three chains (main + western + kisumu),",
        "  plus named pump stations and depots. `nearest_site_code` links back to dim_site where a real",
        "  site sits on the route. The `corridor_chain` column identifies which chain each row belongs to.",
        "- **`corridor_telemetry.csv`** — 48h at 30-min intervals for every monitoring_point and pump_station.",
        "  Adds `rainfall_mm` as a new leading-indicator field not present in pipeline_telemetry_batch*.csv.",
        "  Three demo anomaly events seeded deterministically: slow leak (pressure/flow ramp-down),",
        "  flood-risk rainfall spike, landslide-precursor rainfall spike (Naivasha-Nakuru escarpment).",
        "- Town-level names are from KPC's public station list. Coordinates and readings are simulated —",
        "  jittered from public town-centre reference points, not real asset siting or SCADA data.",
        "",
        "### Shared Join Key: `site` (core datasets) / `asset_id` (corridor layer)",
        "",
        "Core datasets (incidents/audits/telemetry) join through `dim_site.site_id`.",
        "Corridor layer joins through `dim_asset.asset_id` and links back via `nearest_site_code`.",
        "",
        "## Messiness Injected",
        "",
        "| Issue Type | Count | Datasets | Expected Pipeline Outcome |",
        "|-----------|-------|----------|--------------------------|",
    ]

    # FIX Issue 8: corridor datasets included in outcome descriptions
    issue_outcomes = {
        "dirty_label":            ("incidents, telemetry", "Corrected (auto-normalized)"),
        "mixed_date_format":      ("incidents, audits", "Corrected (standardized to ISO 8601)"),
        "missing_required_field": ("incidents, corridor_assets", "Review (held for human sign-off)"),
        "missing_optional_field": ("incidents", "Trusted (not an error)"),
        "future_date":            ("incidents, audits", "Rejected (physically impossible)"),
        "out_of_range":           ("incidents, audits", "Rejected or Corrected (clamp if recoverable)"),
        "closed_before_inspection": ("audits", "Rejected (logical impossibility)"),
        "duplicate_id":           ("incidents, audits, telemetry", "Rejected (uniqueness violation)"),
        "invalid_coordinates":    ("incidents, corridor_assets", "Rejected (physically impossible coordinates)"),
        "sensor_dropout":         ("telemetry", "Corrected/Review (null sensor reading)"),
        "pressure_spike":         ("telemetry, corridor_telemetry", "Review (potential leading indicator for leaks)"),
    }

    for issue_type, count in issue_counts.most_common():
        datasets, outcome = issue_outcomes.get(issue_type, ("TBD", "TBD"))
        lines.append(f"| `{issue_type}` | {count} | {datasets} | {outcome} |")

    # FIX Issue 5: all five dataset labels in the breakdown
    lines += [
        "",
        "## Issues by Dataset",
        "",
        f"- incidents: {dataset_counts.get('incidents', 0)}",
        f"- audits: {dataset_counts.get('audits', 0)}",
        f"- telemetry: {dataset_counts.get('telemetry', 0)}",
        f"- corridor_assets: {dataset_counts.get('corridor_assets', 0)}",
        f"- corridor_telemetry: {dataset_counts.get('corridor_telemetry', 0)}",
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
        "## Known Limitations",
        "",
        "- Some rows have multiple issues (e.g., dirty severity AND future date on the same",
        "  record). This is intentional — real data isn't one-problem-per-row. Compute recall",
        "  **per issue type**, not per row.",
        "- Pressure spikes are clustered by index position rather than strictly by site+time",
        "  adjacency. This is a simplification; real spikes would be sensor-specific.",
        "- Coordinate jitter is uniform random rather than GPS-realistic noise patterns.",
        "- Telemetry timestamps are uniformly distributed; real SCADA systems have",
        "  fixed polling intervals with occasional gaps.",
        "- Corridor coordinates are jittered from public town-centre reference points —",
        "  they are not real asset coordinates or real SCADA data.",
        "- ~1% of corridor monitoring points may have both invalid_coordinates AND",
        "  missing_required_field:latitude injected. Both are logged to ground_truth.",
        "  This is intentional — the pipeline must handle multi-issue rows.",
    ]

    spec_path = docs_dir / "data_generation_notes.md"
    spec_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  wrote -> {spec_path}")


if __name__ == "__main__":
    main()
