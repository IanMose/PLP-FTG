#!/usr/bin/env bash
# =============================================================================
# Sentinel — Full ETL CLI
# =============================================================================
# Generates a fresh dataset with a random seed, runs the full 5-stage ETL
# pipeline on ALL raw CSVs (incidents + audits + telemetry batches), loads
# everything into the warehouse (DuckDB + Parquet), and runs the quality gate.
#
# Usage:
#   chmod +x run_full_etl.sh
#   ./run_full_etl.sh                     # random seed, default 6090 incidents
#   ./run_full_etl.sh --seed 42           # fixed seed for reproducibility
#   ./run_full_etl.sh --incidents 3000    # smaller dataset
#   ./run_full_etl.sh --skip-generate     # re-run ETL on existing raw CSVs
#   ./run_full_etl.sh --gate 0.85         # custom pass threshold (default 0.90)
# =============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Defaults ──────────────────────────────────────────────────────────────────
SEED=""
N_INCIDENTS=6090
N_AUDITS=3000
N_TELEMETRY=5000
GATE_THRESHOLD=0.90
SKIP_GENERATE=false

# ── Arg parsing ───────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --seed)         SEED="$2";          shift 2 ;;
        --incidents)    N_INCIDENTS="$2";   shift 2 ;;
        --audits)       N_AUDITS="$2";      shift 2 ;;
        --telemetry)    N_TELEMETRY="$2";   shift 2 ;;
        --gate)         GATE_THRESHOLD="$2";shift 2 ;;
        --skip-generate) SKIP_GENERATE=true; shift ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# ── Virtual env ───────────────────────────────────────────────────────────────
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
elif [ -f "../.venv/bin/activate" ]; then
    source ../.venv/bin/activate
fi

echo ""
echo "============================================================"
echo "  Sentinel Full ETL"
echo "  $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "============================================================"

# ── Stage 0: Generate raw data ────────────────────────────────────────────────
if [ "$SKIP_GENERATE" = false ]; then
    echo ""
    echo "[GENERATE] Synthesising raw data..."
    python3 - <<PYEOF
import random, sys
import numpy as np
from faker import Faker

# Determine seed
seed_arg = "${SEED}"
if seed_arg:
    seed = int(seed_arg)
else:
    import time
    seed = int(time.time() * 1000) % 999983   # large prime mod — different every run
    print(f"  Using random seed: {seed}")

random.seed(seed)
np.random.seed(seed)
Faker.seed(seed)

import src.generate_data as g
# Patch the module's globals so generate_* use the new seed
g.SEED = seed
g.fake = Faker()
g.fake.seed_instance(seed)
g.ground_truth.clear()

import csv
from pathlib import Path

n_inc  = int("${N_INCIDENTS}")
n_aud  = int("${N_AUDITS}")
n_tel  = int("${N_TELEMETRY}")

print(f"  Generating {n_inc} incidents, {n_aud} audits, {n_tel}x2 telemetry rows...")

incidents = g.generate_incidents(n_inc)
audits    = g.generate_audits(n_aud)
tel1      = g.generate_telemetry(n_tel)
tel2      = g.generate_telemetry(n_tel)

out = g.OUT_DIR
out.mkdir(parents=True, exist_ok=True)

def write_csv(rows, path):
    if not rows: return
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=rows[0].keys())
        w.writeheader()
        w.writerows(rows)

write_csv(incidents, out / 'incidents_raw.csv')
write_csv(audits,    out / 'audits_raw.csv')
write_csv(tel1,      out / 'pipeline_telemetry_batch1.csv')
write_csv(tel2,      out / 'pipeline_telemetry_batch2.csv')
write_csv(g.ground_truth, out / 'ground_truth_issues.csv')

issues_by_type = {}
for issue in g.ground_truth:
    t = issue['issue_type']
    issues_by_type[t] = issues_by_type.get(t, 0) + 1

print(f"  Seed {seed} done.")
print(f"  Rows  : {len(incidents)} incidents | {len(audits)} audits | {len(tel1)+len(tel2)} telemetry")
print(f"  Issues: {len(g.ground_truth)} injected data quality problems")
for t, cnt in sorted(issues_by_type.items(), key=lambda x: -x[1])[:8]:
    print(f"    {t}: {cnt}")
PYEOF
else
    echo "[GENERATE] Skipped — using existing raw CSVs in data/raw/"
fi

# ── Stage 1–5: Full pipeline on historical CSVs ───────────────────────────────
echo ""
echo "[ETL] Running full pipeline on historical raw data..."
python3 - <<PYEOF
import pandas as pd
import numpy as np
from pathlib import Path
import json, os

from src.ingest import IngestionManager
from src.transform import transform
from src.decide import decide_batch
from src.load import load_dim_site, load_to_duckdb

RAW_DIR       = Path("data/raw")
WAREHOUSE_DIR = Path("data/warehouse")
QUARANTINE_DIR = Path("data/quarantine")
DB_PATH       = str(WAREHOUSE_DIR / "sentinel.duckdb")

WAREHOUSE_DIR.mkdir(parents=True, exist_ok=True)
QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)

# Load dim_site first
print("  [1/6] Loading dim_site reference...")
n_sites = load_dim_site(str(WAREHOUSE_DIR), str(RAW_DIR))
print(f"        {n_sites} sites loaded")

# Read all raw source files
print("  [2/6] Reading raw CSVs...")
frames = []
source_files = [
    "incidents_raw.csv",
    "audits_raw.csv",
    "pipeline_telemetry_batch1.csv",
    "pipeline_telemetry_batch2.csv",
]
for fname in source_files:
    fpath = RAW_DIR / fname
    if fpath.exists():
        df = pd.read_csv(fpath, low_memory=False)
        df["_source_file"] = fname
        frames.append(df)
        print(f"        {fname}: {len(df)} rows")
    else:
        print(f"        WARNING: {fname} not found, skipping")

if not frames:
    print("ERROR: No raw data files found in data/raw/")
    raise SystemExit(1)

raw_df = pd.concat(frames, ignore_index=True)
print(f"        Total: {len(raw_df)} rows combined")

# Ingest — assign batch_id + checksum
print("  [3/6] Ingesting (batch_id + checksum)...")
mgr = IngestionManager()
raw_df["_batch_id"] = mgr.batch_id
raw_path = WAREHOUSE_DIR / "raw_batch.parquet"
raw_df.to_parquet(raw_path, index=False)
print(f"        batch_id: {mgr.batch_id[:12]}...")

# Transform — normalise, dates, dedup
print("  [4/6] Transforming...")
transformed_df = transform(raw_df)
transformed_path = WAREHOUSE_DIR / "transformed_batch.parquet"
transformed_df.to_parquet(transformed_path, index=False)
print(f"        {len(transformed_df)} rows after dedup (removed {len(raw_df)-len(transformed_df)} dupes)")

# Decide — validate + four-outcome routing
print("  [5/6] Deciding (validate + route)...")
decided_df = decide_batch(transformed_df)
decided_path = WAREHOUSE_DIR / "decided_batch.parquet"
decided_df.to_parquet(decided_path, index=False)

counts = decided_df["decision"].value_counts().to_dict()
total  = len(decided_df)
trusted_rate = (counts.get("trusted", 0) + counts.get("corrected", 0)) / total * 100
print(f"        trusted:   {counts.get('trusted', 0):>6}")
print(f"        corrected: {counts.get('corrected', 0):>6}")
print(f"        review:    {counts.get('review', 0):>6}")
print(f"        rejected:  {counts.get('rejected', 0):>6}")
print(f"        pass rate: {trusted_rate:.1f}%")

# Save decision summary for quality gate
summary_path = WAREHOUSE_DIR / "decision_summary.json"
with open(summary_path, "w") as f:
    json.dump(counts, f, indent=2)

# Load — warehouse tables (replace full history)
print("  [6/6] Loading to warehouse (DuckDB + Parquet)...")
import duckdb

warehouse_df = decided_df[decided_df["decision"].isin(["trusted", "corrected"])].copy()
cols_to_drop = ["decision", "decision_reason", "_source_file", "_batch_id", "ingestion_timestamp"]
warehouse_df = warehouse_df.drop(columns=[c for c in cols_to_drop if c in warehouse_df.columns])

# Split by record type
incidents_df = pd.DataFrame()
audits_df    = pd.DataFrame()
telemetry_df = pd.DataFrame()

if "reading_id" in warehouse_df.columns:
    mask_tel = warehouse_df["reading_id"].notna() & (warehouse_df["reading_id"].astype(str).str.strip() != "")
    telemetry_df = warehouse_df[mask_tel].copy()
    warehouse_df = warehouse_df[~mask_tel].copy()

if "incident_id" in warehouse_df.columns:
    mask_inc = warehouse_df["incident_id"].notna() & (warehouse_df["incident_id"].astype(str).str.strip() != "")
    incidents_df = warehouse_df[mask_inc].copy()
    warehouse_df = warehouse_df[~mask_inc].copy()

if "audit_id" in warehouse_df.columns:
    mask_aud = warehouse_df["audit_id"].notna() & (warehouse_df["audit_id"].astype(str).str.strip() != "")
    audits_df = warehouse_df[mask_aud].copy()

# Drop cross-contaminated columns
inc_exclude  = {"audit_id","inspection_date","closed_date","finding_category","findings_detail","corrective_action","auditor"}
aud_exclude  = {"incident_id","incident_type","description","root_cause","response_time_hours","severity","latitude","longitude"}
tel_exclude  = {"incident_id","audit_id","incident_date","incident_type","description","root_cause",
                "response_time_hours","inspection_date","closed_date","finding_category","findings_detail",
                "corrective_action","auditor","follow_up_required","latitude","longitude"}

def clean_cols(df, exclude):
    keep = [c for c in df.columns if c not in exclude]
    return df[keep].dropna(axis=1, how="all")

if len(incidents_df): incidents_df = clean_cols(incidents_df, inc_exclude)
if len(audits_df):    audits_df    = clean_cols(audits_df,    aud_exclude)
if len(telemetry_df): telemetry_df = clean_cols(telemetry_df, tel_exclude)

# Write to DuckDB (full replace — this is the canonical historical load)
con = duckdb.connect(DB_PATH)
for table, df in [("fact_incidents", incidents_df),
                  ("fact_audits",    audits_df),
                  ("fact_telemetry", telemetry_df)]:
    if len(df) == 0:
        continue
    con.execute(f"DROP TABLE IF EXISTS {table}")
    con.execute(f"CREATE TABLE {table} AS SELECT * FROM df")
    print(f"        {table}: {len(df)} rows -> DuckDB")
    df.to_parquet(WAREHOUSE_DIR / f"{table}.parquet", index=False)

# Write full decided for audit trail
con.execute("DROP TABLE IF EXISTS decided_all")
con.execute("CREATE TABLE decided_all AS SELECT * FROM decided_df")
con.close()

# Quarantine
rejected_df = decided_df[decided_df["decision"] == "rejected"]
if len(rejected_df):
    rpath = QUARANTINE_DIR / "rejected_records.csv"
    rejected_df.to_csv(rpath, index=False)
    print(f"        {len(rejected_df)} rejected -> data/quarantine/rejected_records.csv")

print()
print(f"  Warehouse totals:")
print(f"    fact_incidents : {len(incidents_df)}")
print(f"    fact_audits    : {len(audits_df)}")
print(f"    fact_telemetry : {len(telemetry_df)}")
PYEOF

# ── Feature Engineering ───────────────────────────────────────────────────────
echo ""
echo "[FEATURES] Building site feature table (180-day window)..."
python3 -m src.features --raw-dir data/raw --output-dir data/warehouse

# ── Predictive Model ──────────────────────────────────────────────────────────
echo ""
echo "[MODEL] Training predictive model..."
python3 -m src.predict --train

echo ""
echo "[MODEL] Scoring current sites..."
python3 -m src.predict --score

# ── Statistical Diagnostics ───────────────────────────────────────────────────
echo ""
echo "[DIAGNOSTICS] Computing statistical diagnostics..."
python3 -m src.diagnostics --raw-dir data/raw --output-dir data/warehouse

# ── Quality gate ──────────────────────────────────────────────────────────────
echo ""
echo "[GATE] Running quality gate (threshold: ${GATE_THRESHOLD})..."
python3 -m src.validate --fail-below "${GATE_THRESHOLD}"

echo ""
echo "============================================================"
echo "  All done. Warehouse is ready."
echo "  Spring Boot will pick up live_batch.json on next poll."
echo "============================================================"
echo ""
