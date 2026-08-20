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

# Real pipeline section names matching dim_asset.csv segment labels
PIPELINE_SECTIONS = [
    "Section A — Mombasa-Nairobi Main",
    "Section B — Nairobi-Nakuru Spur",
    "Section C — Nakuru-Eldoret Extension",
    "Section D — Sinendet Lateral",
    "Section E — Makueni Branch",
]

# All corridor assets from dim_asset.csv — used for live corridor telemetry generation.
# Includes monitoring points (MP), pump stations (PS), and depots (DEP).
# Format: (asset_id, segment_label, flood_zone, is_high_risk_proximity)
CORRIDOR_ASSETS = [
    # ── Main line: MP assets (sample — every 5th to keep batch size reasonable) ──
    ("MP-0001", "Mombasa-Samburu",          "low",           False),
    ("MP-0005", "Mombasa-Samburu",          "low",           False),
    ("MP-0010", "Mombasa-Samburu",          "low",           False),
    ("MP-0013", "Samburu-Maungu",           "low",           False),
    ("MP-0018", "Samburu-Maungu",           "low",           False),
    ("MP-0022", "Samburu-Maungu",           "low",           False),
    ("MP-0026", "Maungu-Voi",              "high_flood",     True),
    ("MP-0028", "Maungu-Voi",              "high_flood",     True),
    ("MP-0031", "Voi-Manyani",             "high_flood",     True),
    ("MP-0033", "Voi-Manyani",             "high_flood",     True),
    ("MP-0036", "Manyani-Mtito Andei",     "high_flood",     True),
    ("MP-0040", "Manyani-Mtito Andei",     "high_flood",     True),
    ("MP-0045", "Manyani-Mtito Andei",     "high_flood",     True),
    ("MP-0048", "Mtito Andei-Makindu",     "high_flood",     True),
    ("MP-0052", "Mtito Andei-Makindu",     "high_flood",     True),
    ("MP-0057", "Mtito Andei-Makindu",     "high_flood",     True),
    ("MP-0059", "Makindu-Sultan Hamud",    "moderate_flood", True),
    ("MP-0063", "Makindu-Sultan Hamud",    "moderate_flood", True),
    ("MP-0068", "Makindu-Sultan Hamud",    "moderate_flood", False),
    ("MP-0072", "Sultan Hamud-Konza",      "moderate_flood", False),
    ("MP-0076", "Sultan Hamud-Konza",      "moderate_flood", False),
    ("MP-0077", "Konza-Athi River",        "low",            False),
    ("MP-0082", "Konza-Athi River",        "low",            False),
    ("MP-0084", "Athi River-Nairobi Terminal", "low",        False),
    ("MP-0088", "Athi River-Nairobi Terminal", "low",        False),
    # ── Western spur: MP assets ──
    ("MP-0089", "Nairobi Terminal-Naivasha", "moderate_flood", False),
    ("MP-0095", "Nairobi Terminal-Naivasha", "moderate_flood", False),
    ("MP-0100", "Nairobi Terminal-Naivasha", "moderate_flood", False),
    ("MP-0105", "Naivasha-Nakuru",          "high_flood",     True),
    ("MP-0110", "Naivasha-Nakuru",          "high_flood",     True),
    ("MP-0116", "Naivasha-Nakuru",          "high_flood",     True),
    ("MP-0117", "Nakuru-Sinendet",          "low",            False),
    ("MP-0125", "Nakuru-Sinendet",          "low",            False),
    ("MP-0132", "Nakuru-Sinendet",          "low",            False),
    ("MP-0133", "Sinendet-Eldoret",         "low",            False),
    ("MP-0138", "Sinendet-Eldoret",         "low",            False),
    ("MP-0143", "Sinendet-Eldoret",         "low",            False),
    # ── Kisumu branch: MP assets ──
    ("MP-0144", "Sinendet-Muhoroni",        "moderate_flood", False),
    ("MP-0148", "Sinendet-Muhoroni",        "moderate_flood", False),
    ("MP-0151", "Sinendet-Muhoroni",        "moderate_flood", False),
    ("MP-0152", "Muhoroni-Kisumu",          "low",            False),
    ("MP-0157", "Muhoroni-Kisumu",          "low",            False),
    ("MP-0160", "Muhoroni-Kisumu",          "low",            False),
    # ── All pump stations — every one included ──
    ("PS-01",   "Mombasa",                          "low",            False),
    ("PS-02",   "Mombasa-Samburu",                  "low",            False),
    ("PS-03",   "Mombasa-Samburu",                  "low",            False),
    ("PS-04",   "Samburu-Maungu",                   "high_flood",     True),
    ("PS-05",   "Samburu-Maungu",                   "low",            False),
    ("PS-06",   "Mtito Andei-Makindu",              "high_flood",     True),   # SITE-003 — high risk
    ("PS-07",   "Makindu-Sultan Hamud",             "moderate_flood", False),
    ("PS-08",   "Sultan Hamud-Konza",               "moderate_flood", False),
    ("PS-10",   "Athi River-Nairobi Terminal",      "low",            False),
    ("PS-23",   "Nairobi Terminal-Naivasha",        "moderate_flood", False),
    ("PS-24",   "Naivasha-Nakuru",                  "high_flood",     True),
    ("PS-26",   "Nakuru-Sinendet",                  "low",            False),  # SITE-006 — high risk
    ("PS-27",   "Sinendet-Eldoret",                 "low",            False),
    ("PS-28",   "Muhoroni-Kisumu",                  "low",            False),
    # ── Depots ──
    ("DEP-01",  "Mombasa",                  "low",            False),
    ("DEP-02",  "Nairobi Terminal",         "low",            False),
]

# Status escalation probabilities per flood zone
# (normal, advisory, warning, critical)
FLOOD_ZONE_STATUS_WEIGHTS = {
    "high_flood":     [0.50, 0.25, 0.15, 0.10],
    "moderate_flood": [0.70, 0.18, 0.09, 0.03],
    "low":            [0.88, 0.08, 0.03, 0.01],
}

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


def generate_corridor_telemetry(rng: random.Random, np_rng, now: "datetime") -> list:
    """
    Generate one environmental reading per corridor asset (MP, PS, DEP).

    Each reading has:
    - realistic pressure / flow / temperature / rainfall
    - a derived status ("normal" | "advisory" | "warning" | "critical")
      weighted by flood zone, with extra pressure on high-risk PS nodes

    High-risk proximity assets (flood zone = high_flood, or PS-06/PS-26) get
    escalated status probabilities to drive the corridor heatmap dynamically.
    """
    STATUS_LEVELS = ["normal", "advisory", "warning", "critical"]
    rows = []

    for asset_id, segment, flood_zone, high_risk_proximity in CORRIDOR_ASSETS:
        # Pressure: pump stations run at higher pressure (they're boosters)
        is_ps = asset_id.startswith("PS-")
        is_dep = asset_id.startswith("DEP-")

        if is_ps:
            base_pressure = float(np_rng.normal(480, 70))
            base_flow = float(np_rng.normal(3200, 600))
        elif is_dep:
            base_pressure = float(np_rng.normal(200, 30))   # storage, lower pressure
            base_flow = float(np_rng.normal(1500, 400))
        else:
            base_pressure = float(np_rng.normal(400, 80))
            base_flow = float(np_rng.normal(3000, 800))

        pressure = round(float(np.clip(base_pressure, 50, 700)), 1)
        flow = round(float(np.clip(base_flow, 500, 5500)), 1)
        temperature = round(float(np.clip(np_rng.normal(30, 6), 15, 50)), 1)

        # Rainfall: higher in flood zones
        rainfall_base = 0.8 if flood_zone == "high_flood" else 0.4 if flood_zone == "moderate_flood" else 0.1
        rainfall = round(max(0.0, float(np_rng.normal(rainfall_base, 0.3))), 2)

        # Status: blend flood zone weights with extra boost for high-risk proximity
        weights = list(FLOOD_ZONE_STATUS_WEIGHTS.get(flood_zone, FLOOD_ZONE_STATUS_WEIGHTS["low"]))
        if high_risk_proximity or asset_id in ("PS-06", "PS-26"):
            # Shift probability mass toward warning/critical
            weights[0] -= 0.10
            weights[2] += 0.07
            weights[3] += 0.03

        # Occasional pressure spike → forces "warning" or "critical"
        if rng.random() < 0.02:  # 2% spike chance
            pressure = round(float(np_rng.uniform(750, 1100)), 1)
            weights = [0.0, 0.0, 0.50, 0.50]

        status = rng.choices(STATUS_LEVELS, weights=weights, k=1)[0]

        reading_id = f"LCT-{asset_id}-{now.strftime('%Y%m%d%H%M%S')}"

        rows.append({
            "reading_id":          reading_id,
            "asset_id":            asset_id,
            "timestamp":           now.strftime("%Y-%m-%dT%H:%M:%S"),
            "pressure_psi":        pressure,
            "flow_rate_bph":       flow,
            "temperature_celsius": temperature,
            "rainfall_mm":         rainfall,
            "status":              status,
        })

    return rows


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

    # Shared RNG instances for this run
    rng = random.Random()
    np_rng = np.random.default_rng()
    now = datetime.now(timezone.utc)

    # ── Stage 1: Generate ───────────────────────────────────────────────────
    log(f"[1/4] Generating {n_rows} new rows...")
    raw_df = generate_batch(n_rows)
    log(f"      → {len(raw_df)} rows  ({raw_df.columns.tolist()[:4]}...)")

    # ── Stage 1b: Generate corridor telemetry ───────────────────────────────
    corridor_rows = generate_corridor_telemetry(rng, np_rng, now)
    log(f"      → {len(corridor_rows)} corridor readings ({len(CORRIDOR_ASSETS)} assets)")

    # ── Stage 2: Ingest (assign batch_id, checksum) ─────────────────────────
    log("[2/4] Ingesting...")
    mgr = IngestionManager()
    raw_df["_source_file"] = "live_batch.csv"
    raw_df["_batch_id"] = mgr.batch_id    # Persist raw batch so the existing ingest log path still works
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
    _write_json_export(decided_df, corridor_rows, mgr.batch_id, ts)

    # ── Stage 6: Score predictions (fast — reads cached features, skips rebuild) ──
    # Feature engineering (180-day build, ~70s) and diagnostics (~60s) are ONLY
    # run in run_full_etl.sh to avoid blocking the 2-minute live loop.
    # The live loop just re-scores using the existing fact_site_features.parquet.
    features_path = WAREHOUSE_DIR / "fact_site_features.parquet"
    model_path    = Path("models/logreg_v1.pkl")

    if features_path.exists() and model_path.exists():
        log("[7/7] Scoring site predictions (cached features)...")
        try:
            from src.predict import load_model, score_current_sites, write_predictions_json
            features_df = pd.read_parquet(features_path)
            pipe = load_model(model_path)
            preds_df = score_current_sites(features_df, pipe)
            preds_df.to_parquet(WAREHOUSE_DIR / "fact_predictions.parquet", index=False)
            write_predictions_json(preds_df, WAREHOUSE_DIR)
            log(f"      → {len(preds_df)} site scores → fact_predictions.parquet")
        except Exception as exc:
            log(f"      WARNING: Scoring failed — {exc}")
    else:
        log("[7/7] Scoring skipped — run 'run_full_etl.sh' first to build features + train model")

    log(f"{'='*55}")
    return {
        "batch_id":   mgr.batch_id,
        "timestamp":  ts,
        "total_rows": len(decided_df),
        "decisions":  counts,
        **result,
    }


def _write_json_export(decided_df: pd.DataFrame, corridor_rows: list, batch_id: str, ts: str):
    """
    Write a compact JSON file the Spring Boot scheduler reads every minute.
    Only trusted + corrected records are exported for incidents/audits.
    Corridor telemetry (environmental readings) is exported in full — it feeds
    fact_environmental for the corridor heatmap weight computation.
    """
    import json

    export = {
        "batch_id":      batch_id,
        "timestamp":     ts,
        "incidents":     [],
        "audits":        [],
        "telemetry":     [],
        "environmental": [],
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

    # Site telemetry
    if "reading_id" in trusted_df.columns:
        tel_df = trusted_df[trusted_df["reading_id"].notna() &
                            (trusted_df["reading_id"].astype(str) != "")].copy()
        export["telemetry"] = _df_to_records(tel_df)

    # Corridor environmental readings (all, not quality-gated)
    export["environmental"] = [{k: _clean_value(v) for k, v in row.items()} for row in corridor_rows]

    export_path = WAREHOUSE_DIR / "live_batch.json"
    with open(export_path, "w") as f:
        json.dump(export, f, default=str, indent=None)


def _clean_value(v):
    """Replace NaN/inf with None for JSON safety."""
    import math
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _df_to_records(df: pd.DataFrame) -> list:
    """Convert a DataFrame to a list of dicts safe for JSON serialisation."""
    records = df.where(df.notna(), other=None).to_dict(orient="records")
    return [{k: _clean_value(val) for k, val in row.items()} for row in records]


def push_to_backend(export_path: Path, push_url: str, api_key: str, verbose: bool = True) -> bool:
    """
    POST the live_batch.json payload to the Spring Boot backend's /api/etl/push endpoint.

    Returns True on success, False on failure.
    """
    import urllib.request
    import urllib.error

    def log(msg):
        if verbose:
            print(msg)

    try:
        with open(export_path, "rb") as f:
            payload = f.read()

        req = urllib.request.Request(
            url=push_url,
            data=payload,
            headers={
                "Content-Type": "application/json",
                "X-ETL-Api-Key": api_key,
            },
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            log(f"[PUSH] {resp.status} OK → {push_url}")
            log(f"[PUSH] Response: {body}")
            return True

    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        log(f"[PUSH] HTTP {e.code} error → {push_url}: {body}")
        return False
    except Exception as e:
        log(f"[PUSH] Failed to push to backend: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Sentinel Live ETL — single run")
    parser.add_argument("--rows", type=int, default=50,
                        help="Number of new rows to generate per run (default: 50)")
    parser.add_argument("--quiet", action="store_true", help="Suppress output")
    parser.add_argument(
        "--push-url",
        default=os.environ.get("ETL_PUSH_URL", ""),
        help="If set, POST live_batch.json to this URL after the pipeline runs "
             "(e.g. https://sentinel-backend.onrender.com/api/etl/push). "
             "Can also be set via ETL_PUSH_URL env var.",
    )
    parser.add_argument(
        "--api-key",
        default=os.environ.get("ETL_API_KEY", ""),
        help="API key sent as X-ETL-Api-Key header when --push-url is used. "
             "Can also be set via ETL_API_KEY env var.",
    )
    args = parser.parse_args()

    summary = run(n_rows=args.rows, verbose=not args.quiet)

    # ── Push to backend if URL is configured ─────────────────────────────────
    if args.push_url:
        export_path = WAREHOUSE_DIR / "live_batch.json"
        if export_path.exists():
            success = push_to_backend(export_path, args.push_url, args.api_key, verbose=not args.quiet)
            if not success:
                # Exit with error code so GitHub Actions marks the step as failed
                sys.exit(1)
        else:
            print(f"[PUSH] live_batch.json not found at {export_path} — skipping push")
            sys.exit(1)

    if not args.quiet:
        print(f"\nDone. batch_id={summary['batch_id'][:8]}...")


if __name__ == "__main__":
    main()
