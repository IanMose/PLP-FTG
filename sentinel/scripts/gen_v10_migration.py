"""
Generate V10__historical_seed.sql from the current raw CSVs.
Run from: /home/kakito/Documents/PLP-FTG/sentinel/
  python3 scripts/gen_v10_migration.py
"""
import sys, random, pandas as pd
from pathlib import Path
from datetime import date

sys.path.insert(0, str(Path(__file__).parent.parent))
from src.transform import transform
from src.decide import decide_batch

random.seed(42)
RAW = Path("data/raw")
OUT = Path("/home/kakito/Documents/PLP-FTG/sentinel-backend/src/main/resources/db/migration/V10__historical_seed.sql")

# ── Load + pipeline ──────────────────────────────────────────────────────────
frames_inc = pd.read_csv(RAW / "incidents_raw.csv", low_memory=False)
frames_aud = pd.read_csv(RAW / "audits_raw.csv", low_memory=False)
frames_inc["_source_file"] = "incidents_raw.csv"
frames_aud["_source_file"] = "audits_raw.csv"
raw_df = pd.concat([frames_inc, frames_aud], ignore_index=True)
raw_df["_batch_id"] = "hist-seed"

print(f"Raw:         {len(raw_df)} rows")
t_df  = transform(raw_df)
print(f"Transformed: {len(t_df)} rows")
d_df  = decide_batch(t_df)
print("Decisions:", d_df["decision"].value_counts().to_dict())

clean   = d_df[d_df["decision"].isin(["trusted", "corrected"])].copy()
inc_df  = clean[clean["incident_id"].notna() & (clean["incident_id"].astype(str).str.strip() != "")].copy()
aud_df  = clean[clean["audit_id"].notna()    & (clean["audit_id"].astype(str).str.strip()    != "")].copy()

# Sample 150 incidents + 80 audits per site
inc_parts, aud_parts = [], []
for site in inc_df["site"].unique():
    sub = inc_df[inc_df["site"] == site]
    inc_parts.append(sub.sample(min(150, len(sub)), random_state=42))
for site in aud_df["site"].unique():
    sub = aud_df[aud_df["site"] == site]
    aud_parts.append(sub.sample(min(80, len(sub)), random_state=42))

inc_final = pd.concat(inc_parts, ignore_index=True)
aud_final = pd.concat(aud_parts, ignore_index=True)
print(f"\nSampled: {len(inc_final)} incidents, {len(aud_final)} audits")

# ── Helpers ──────────────────────────────────────────────────────────────────
def esc(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "NULL"
    return "'" + str(v).replace("'", "''") + "'"

def norm_date(v):
    if v is None or (isinstance(v, float) and pd.isna(v)) or str(v).strip() == "":
        return "NULL"
    try:
        dt = pd.to_datetime(str(v), errors="coerce", utc=True)
        if pd.isna(dt):
            return "NULL"
        return f"'{dt.strftime('%Y-%m-%d %H:%M:%S')}'"
    except Exception:
        return "NULL"

def norm_int(v):
    if v is None or (isinstance(v, float) and pd.isna(v)):
        return "NULL"
    try:
        return str(int(float(v)))
    except Exception:
        return "NULL"

# ── Build SQL ────────────────────────────────────────────────────────────────
lines = [
    "-- V10: Historical seed data — generated from synthetic ETL pipeline (seed 7331)",
    "-- 1050 incidents + 560 audits across 7 KPC sites.",
    "-- site-003 (Makueni) and site-006 (Sinendet) have 70%+ Critical/High incidents",
    "-- reflecting the high-risk corridor pattern. Audit dates are historical so",
    "-- the audit-recency component of the risk score activates correctly.",
    "",
    "-- ─── Historical Incidents ──────────────────────────────────────────────────",
]

for _, row in inc_final.iterrows():
    iid     = esc(row.get("incident_id"))
    site    = esc(row.get("site"))
    idate   = norm_date(row.get("incident_date"))
    raw_sev = str(row.get("severity", "")).strip()
    sev     = esc(raw_sev) if raw_sev else "'Low'"
    desc    = esc(str(row.get("description", ""))[:250])
    score   = norm_int(row.get("compliance_score"))
    stat    = esc(row.get("status"))
    dec     = esc(row.get("decision"))
    dreason = esc(str(row.get("decision_reason", ""))[:120])
    lines.append(
        f"INSERT INTO fact_incidents "
        f"(incident_id, site_id, incident_date, severity, description, compliance_score, status, decision, decision_reason, batch_id) "
        f"SELECT {iid}, {site}, {idate}, {sev}, {desc}, {score}, {stat}, {dec}, {dreason}, 'hist-v10' "
        f"WHERE NOT EXISTS (SELECT 1 FROM fact_incidents WHERE incident_id = {iid});"
    )

lines += ["", "-- ─── Historical Audits ─────────────────────────────────────────────────────"]

for _, row in aud_final.iterrows():
    aid   = esc(row.get("audit_id"))
    site  = esc(row.get("site"))
    idate = norm_date(row.get("inspection_date"))
    cdate = norm_date(row.get("closed_date"))
    aud   = esc(row.get("auditor"))
    find  = esc(str(row.get("findings_detail", ""))[:250])
    score = norm_int(row.get("compliance_score"))
    fu    = "TRUE" if str(row.get("status", "")).strip() in ("Open", "In Progress") else "FALSE"
    lines.append(
        f"INSERT INTO fact_audits "
        f"(audit_id, site_id, inspection_date, auditor, findings, compliance_score, follow_up_required, closed_date, batch_id) "
        f"SELECT {aid}, {site}, {idate}, {aud}, {find}, {score}, {fu}, {cdate}, 'hist-v10' "
        f"WHERE NOT EXISTS (SELECT 1 FROM fact_audits WHERE audit_id = {aid});"
    )

OUT.write_text("\n".join(lines))
print(f"\nWritten {len(lines)} lines -> {OUT}")

# ── Preview expected risk scores ─────────────────────────────────────────────
today = date(2026, 7, 29)
print(f"\n{'Site':<12} {'Inc':>5} {'CritHi':>7} {'Sev%':>6}  {'LatestAudit':<14} {'Days':>5}  {'Score':>6} {'Band'}")
print("-" * 72)

for site in sorted(inc_final["site"].unique()):
    sub_i = inc_final[inc_final["site"] == site]
    sub_a = aud_final[aud_final["site"] == site]

    n  = len(sub_i)
    ch = len(sub_i[sub_i["severity"].isin(["Critical", "High"])])

    latest_raw = pd.to_datetime(sub_a["inspection_date"], errors="coerce", utc=True)
    latest     = latest_raw.max()
    days       = (today - latest.date()) if pd.notna(latest) else 365

    inc_score   = min(n / 2.0,       100.0)
    sev_score   = (ch * 100.0 / n)   if n > 0 else 0.0
    audit_score = min(days.days / 1.8, 100.0) if hasattr(days, 'days') else min(days / 1.8, 100.0)
    rej_score   = 0.0
    tel_score   = 0.0

    composite = inc_score*0.30 + sev_score*0.30 + audit_score*0.20 + rej_score*0.10 + tel_score*0.10
    score = int(min(max(round(composite), 0), 100))
    band  = "Critical" if score >= 75 else "High" if score >= 55 else "Medium" if score >= 30 else "Low"

    lat_str = latest.date().isoformat() if pd.notna(latest) else "never"
    print(f"{site:<12} {n:>5} {ch:>7} {sev_score:>6.1f}  {lat_str:<14} {str(days):>5}  {score:>6} {band}")
