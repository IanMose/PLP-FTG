# Data Generation Notes — Sentinel Stage 1

## Overview

Generated with **seed `1508`** on anchor date `2026-07-22` for full reproducibility.
Running `python3 src/generate_data.py` twice produces identical output.

- **Total data rows:** 15685 (incidents: 6090, audits: 9595)
- **Reference rows:** 6 sites (dim_site.csv)
- **Total issues deliberately injected:** 6237

## Files Produced

| File | Description | Rows |
|------|-------------|------|
| `dim_site.csv` | 6 KPC-modeled pipeline sites | 6 |
| `incidents_raw.csv` | Environmental incident records (messy) | 6090 |
| `audits_raw.csv` | Compliance audit records (messy) | 9595 |
| `ground_truth_issues.csv` | Answer key: every injected issue | 6237 |

## Deliberate Signal (for Stage 2 risk model)

Two of the six sites — **SITE-003 (Makueni Pump Station)** and **SITE-006 (Sinendet
Pump Station)** — are generated with:

- Lower audit compliance scores (mean ~62 vs ~82 for normal sites)
- Lower closure rates (35% vs 70% closed)
- Longer closure lag (20-90 days vs 5-30 days)
- More incidents overall (~40% of all incidents despite being only 2/6 sites)
- Higher severity incidents (70% High/Critical vs 30% for normal sites)
- Incident types skewed toward Leak/Spill (60% vs 30%)

This models the pattern documented in the Kimeu v. KPC judgment:
weak audit follow-through precedes environmental incidents.

## Messiness Injected

| Issue Type | Count | Expected Pipeline Outcome |
|-----------|-------|--------------------------|
| `mixed_date_format` | 3571 | Corrected (standardized to ISO 8601) |
| `dirty_label` | 1285 | Corrected (auto-normalized) |
| `missing_required_field` | 516 | Review (held for human sign-off) |
| `out_of_range` | 311 | Rejected or Corrected (clamp if recoverable) |
| `future_date` | 209 | Rejected (physically impossible) |
| `duplicate_id` | 185 | Rejected (uniqueness violation) |
| `closed_before_inspection` | 160 | Rejected (logical impossibility) |

## Issues by Dataset

- incidents: 3353
- audits: 2884

## How to Compute Detection Rate

After the pipeline runs, join the decision log against `ground_truth_issues.csv`
on `record_id`. For each issue type, check whether the pipeline caught it and
routed it to the correct outcome:

```
detection_rate = (issues correctly routed) / (total issues injected)
```

This is the honest, quantified ROI evidence for Stage 1.
Put this number in the memo and the pitch.

## Known Limitation

Some rows have multiple issues (e.g., dirty severity AND future date on the same
record). This is intentional — real data isn't one-problem-per-row. Compute recall
**per issue type**, not per row.