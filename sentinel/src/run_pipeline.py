"""
Sentinel — Live ETL Runner
==========================
Generates a small rolling batch of fresh synthetic data and runs the full
5-stage pipeline (ingest → transform → decide → load).

Designed to be called every minute by the automation loop (run_live.sh) so
the Spring Boot backend always sees up-to-date warehouse output.

Usage:
    python3 -m src.run_pipeline            # one run, ~50 new rows
    python3 -m src.run_pipeline --rows 200 # one run with 200 rows
"""

import argparse
import random
import sys
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pandas as pd
import numpy as np

# ── Pipeline stage imports ──────────────────────────────────────────────────
from src.ingest import IngestionManager
from src.transform import transform
from src.decide import decide_batch
from src.load import load_dim_site, load_trusted_output

# ── Config ──────────────────────────────────────────────────────────────────
RAW_DIR = Path("data/raw")
WAREHOUSE_DIR = Path("data/warehouse")
QUARANTINE_DIR = Path("data/quarantine")

SITE_CODES = ["SITE-001", "SITE-002", "SITE-003", "SITE-004", "SITE-005", "SITE-006"]
HIGH_RISK = {"SITE-003", "SITE-006"}
SEVERITIES = ["Low", "Medium", "High", "Critical"]
INCIDENT_TYPES = ["Leak", "Spill", "Fire", "Near Miss", "Equipment Failure"]
STATUSES = ["Open", "In Progress", "Closed"]

SENSOR_IDS = [f"SNS-{i:03d}" for i in range(1, 15)]
PIPELINE_SECTIONS = [
    "Section A — Mombasa-Nairobi Main",
    "Section B — Nairobi-Nakuru Spur",
    "Section C — Nakuru-Eldoret Extension",
    "Section D — Sinendet Lateral",
    "Section E — Makueni Branch",
]

SITE_COORDS = {
    "SITE-001": (-1.30,  36.85),
    "SITE-002": (-4.05,  39.65),
    "SITE-003": (-2.28,  37.83),
    "SITE-004": (-0.30,  36.07),
    "SITE-005": ( 0.52,  35.27),
    "SITE-006": ( 0.05,  35.45),
}


def _jitter(lat, lon):
    return (
        round(lat + random.uniform(-0.03, 0.03), 6),
        round(lon + random.uniform(-0.03, 0.03), 6),
    )


def _now_iso():
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def generate_batch(n_rows: int) -> pd.DataFrame:
    """
    Produce a small, realistic batch of mixed records (incidents + audits + telemetry).
    Deliberately introduces the same messiness patterns as generate_data.py so the
    pipeline's validation and decision layers have something real to chew on.
    """
    rng = random.Random()  # unseeded — truly random each call
    np_rng = np.random.default_rng()

    now = datetime.now(timezone.utc)
    rows = []

    # Split roughly: 40% incidents, 30% audits, 30% telemetry
    n_inc  = max(1, int(n_rows * 0.40))
    n_aud  = max(1, int(n_rows * 0.30))
    n_tel  = max(1, n_rows - n_inc - n_aud)

    # ── Incidents ────────────────────────────────────────────────────────────
    for i in range(n_inc):
        site = rng.choice(list(HIGH_RISK) if rng.random() < 0.40 else [
            s for s in SITE_CODES if s not in HIGH_RISK
        ])
        lat, lon = _jitter(*SITE_COORDS[site])

        weights = [0.10, 0.20, 0.40, 0.30] if site in HIGH_RISK else [0.35, 0.35, 0.20, 0.10]
        severity = rng.choices(SEVERITIES, weights=weights, k=1)[0]

        # Occasionally inject mess (~8% each)
        if rng.random() < 0.08:
            severity = severity.lower()          # dirty casing
        if rng.random() < 0.04:
            severity = ""                        # missing → review

        inc_date = (now - timedelta(days=rng.randint(0, 30))).strftime("%Y-%m-%d")
        if rng.random() < 0.02:                  # 2% future date → rejected
            inc_date = (now + timedelta(days=rng.randint(1, 10))).strftime("%Y-%m-%d")

        score = float(np_rng.normal(
            {"Low": 88, "Medium": 75, "High": 60, "Critical": 45}.get(severity.capitalize(), 70), 8
        ))
        score = round(float(np.clip(score, 0, 100)), 1)
        if rng.random() < 0.02:                  # 2% out-of-range → corrected
            score = rng.choice([-5.0, 105.0])

        rows.append({
            "incident_id": f"LI-{now.strftime('%Y%m%d%H%M%S')}-{i:04d}",
            "site":         site,
            "latitude":     lat,
            "longitude":    lon,
            "incident_date": inc_date,
            "incident_type": rng.choice(INCIDENT_TYPES),
            "severity":      severity,
            "compliance_score": score,
            "description":   f"Live batch incident at {site}",
            "root_cause":    rng.choice(["Corrosion", "Valve Failure", "Operator Error", ""]),
            "response_time_hours": round(float(np_rng.exponential(8)), 1),
            "status":        rng.choice(STATUSES),
        })

    # ── Audits ───────────────────────────────────────────────────────────────
    for i in range(n_aud):
        site = rng.choice(SITE_CODES)
        score = float(np_rng.normal(62 if site in HIGH_RISK else 82, 10))
        score = round(float(np.clip(score, 0, 100)), 1)

        insp = (now - timedelta(days=rng.randint(0, 14))).strftime("%Y-%m-%d")
        closed = ""
        if rng.random() < 0.6:
            closed = (now - timedelta(days=rng.randint(0, 10))).strftime("%Y-%m-%d")

        rows.append({
            "audit_id":        f"LA-{now.strftime('%Y%m%d%H%M%S')}-{i:04d}",
            "site":            site,
            "inspection_date": insp,
            "closed_date":     closed,
            "compliance_score": score,
            "finding_category": rng.choice(["Containment Integrity", "Leak Detection",
                                            "Emergency Response", "Documentation"]),
            "findings_detail": f"Live batch audit finding at {site}",
            "corrective_action": "Scheduled corrective action" if rng.random() < 0.7 else "",
            "auditor":         rng.choice(["A. Kamau", "B. Otieno", "C. Wanjiru", "D. Mwangi"]),
            "status":          rng.choices(STATUSES,
                                           weights=[0.35, 0.30, 0.35] if site in HIGH_RISK else [0.15, 0.15, 0.70],
                                           k=1)[0],
        })

    # ── Telemetry ────────────────────────────────────────────────────────────
    for i in range(n_tel):
        site = rng.choice(SITE_CODES)
        pressure = round(float(np_rng.normal(400, 80)), 1)
        pressure = float(np.clip(pressure, 200, 600))

        # 1% pressure spike → triggers alert
        if rng.random() < 0.01:
            pressure = round(float(np_rng.uniform(1050, 1500)), 1)

        rows.append({
            "reading_id":          f"LT-{now.strftime('%Y%m%d%H%M%S')}-{i:06d}",
            "timestamp":           now.strftime("%Y-%m-%dT%H:%M:%S"),
            "site":                site,
            "pipeline_section":    rng.choice(PIPELINE_SECTIONS),
            "pressure_psi":        pressure,
            "flow_rate_bph":       round(float(np_rng.normal(3000, 800)), 1),
            "temperature_celsius": round(float(np_rng.normal(30, 6)), 1),
            "valve_status":        rng.choices(["Open", "Closed", "Partially Open"],
                                               weights=[0.5, 0.3, 0.2], k=1)[0],
            "sensor_id":           rng.choice(SENSOR_IDS),
        })

    return pd.DataFrame(rows)


def run(n_rows: int = 50, verbose: bool = True) -> dict:
    """
    Run one full ETL cycle on a freshly generated batch.

    Returns a summary dict with counts and paths.
    """
    def log(msg):
        if verbose:
            print(msg)

    WAREHOUSE_DIR.mkdir(parents=True, exist_ok=True)
    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)

    ts = datetime.now(timezone.utc).isoformat()
    log(f"\n{'='*55}")
    log(f"  Sentinel Live ETL  |  {ts}")
    log(f"{'='*55}")

    # ── Stage 1: Generate ───────────────────────────────────────────────────
    log(f"[1/4] Generating {n_rows} new rows...")
    raw_df = generate_batch(n_rows)
    log(f"      → {len(raw_df)} rows  ({raw_df.columns.tolist()[:4]}...)")

    # ── Stage 2: Ingest (assign batch_id, checksum) ─────────────────────────
    log("[2/4] Ingesting...")
    mgr = IngestionManager()
    raw_df["_source_file"] = "live_batch.csv"
    raw_df["_batch_id"] = mgr.batch_id

    # Persist raw batch so the existing ingest log path still works
    raw_path = WAREHOUSE_DIR / "raw_batch.parquet"
    raw_df.to_parquet(raw_path, index=False)
    log(f"      → batch_id: {mgr.batch_id[:8]}...")

    # ── Stage 3: Transform ──────────────────────────────────────────────────
    log("[3/4] Transforming...")
    transformed_df = transform(raw_df)
    transformed_path = WAREHOUSE_DIR / "transformed_batch.parquet"
    transformed_df.to_parquet(transformed_path, index=False)
    log(f"      → {len(transformed_df)} rows after dedup")

    # ── Stage 4: Decide ──────────────────────────────────────────────────────
    log("[4/4] Deciding...")
    decided_df = decide_batch(transformed_df)
    decided_path = WAREHOUSE_DIR / "decided_batch.parquet"
    decided_df.to_parquet(decided_path, index=False)

    counts = decided_df["decision"].value_counts().to_dict()
    log(f"      → {counts}")

    # ── Stage 5: Load ────────────────────────────────────────────────────────
    log("[5/5] Loading to warehouse...")
    load_dim_site(str(WAREHOUSE_DIR), str(RAW_DIR))
    result = load_trusted_output(decided_df, str(WAREHOUSE_DIR))

    log(f"      → incidents: {result['incidents_loaded']}  "
        f"audits: {result['audits_loaded']}  "
        f"telemetry: {result['telemetry_loaded']}  "
        f"rejected: {result['rejected']}")

    # ── Write JSON export for Spring Boot scheduler to consume ───────────────
    log("[6/6] Writing JSON export for backend reload...")
    _write_json_export(decided_df, mgr.batch_id, ts)
    log(f"{'='*55}")

    return {
        "batch_id":   mgr.batch_id,
        "timestamp":  ts,
        "total_rows": len(decided_df),
        "decisions":  counts,
        **result,
    }


def _write_json_export(decided_df: pd.DataFrame, batch_id: str, ts: str):
    """
    Write a compact JSON file the Spring Boot scheduler reads every minute.
    Only trusted + corrected records are exported — same filter as load.py.
    Records are normalised: nulls become None, timestamps become ISO strings.
    """
    import json

    export = {
        "batch_id":  batch_id,
        "timestamp": ts,
        "incidents": [],
        "audits":    [],
        "telemetry": [],
        "summary": decided_df["decision"].value_counts().to_dict(),
    }

    trusted_df = decided_df[decided_df["decision"].isin(["trusted", "corrected"])].copy()

    # Incidents
    if "incident_id" in trusted_df.columns:
        inc_df = trusted_df[trusted_df["incident_id"].notna() &
                            (trusted_df["incident_id"].astype(str) != "")].copy()
        export["incidents"] = _df_to_records(inc_df)

    # Audits
    if "audit_id" in trusted_df.columns:
        aud_df = trusted_df[trusted_df["audit_id"].notna() &
                            (trusted_df["audit_id"].astype(str) != "")].copy()
        export["audits"] = _df_to_records(aud_df)

    # Telemetry
    if "reading_id" in trusted_df.columns:
        tel_df = trusted_df[trusted_df["reading_id"].notna() &
                            (trusted_df["reading_id"].astype(str) != "")].copy()
        export["telemetry"] = _df_to_records(tel_df)

    export_path = WAREHOUSE_DIR / "live_batch.json"
    with open(export_path, "w") as f:
        json.dump(export, f, default=str, indent=None)  # compact, default=str handles timestamps


def _df_to_records(df: pd.DataFrame) -> list:
    """Convert a DataFrame to a list of dicts safe for JSON serialisation.
    Replaces NaN, inf, and -inf with None so json.dump produces valid JSON.
    """
    import math

    def _clean(v):
        if v is None:
            return None
        # catch float NaN and ±inf
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return v

    records = df.where(df.notna(), other=None).to_dict(orient="records")
    return [{k: _clean(val) for k, val in row.items()} for row in records]


def main():
    parser = argparse.ArgumentParser(description="Sentinel Live ETL — single run")
    parser.add_argument("--rows", type=int, default=50,
                        help="Number of new rows to generate per run (default: 50)")
    parser.add_argument("--quiet", action="store_true", help="Suppress output")
    args = parser.parse_args()

    summary = run(n_rows=args.rows, verbose=not args.quiet)
    if not args.quiet:
        print(f"\nDone. batch_id={summary['batch_id'][:8]}...")


if __name__ == "__main__":
    main()
