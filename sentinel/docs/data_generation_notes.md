# Data Generation Notes — Sentinel Stage 1

## Overview

Generated with **seed `1508`** on anchor date `2026-07-22` for full reproducibility.
Running `python3 src/generate_data.py` twice produces identical output.

- **Total data rows:** 38294 (incidents: 6090, audits: 9595, telemetry: 5050, corridor_assets: 183, corridor_telemetry: 17376)
- **Reference rows:** 6 sites (dim_site.csv)
- **Total issues deliberately injected:** 7256

## Files Produced

| File | Description | Rows |
|------|-------------|------|
| `dim_site.csv` | 6 KPC-modeled pipeline sites (frozen join key) | 6 |
| `incidents_raw.csv` | Environmental incident records (messy) | 6090 |
| `audits_raw.csv` | Compliance audit records (messy) | 9595 |
| `pipeline_telemetry_batch1.csv` | Pipeline sensor readings — batch 1 (messy) | 4300 |
| `pipeline_telemetry_batch2.csv` | Pipeline sensor readings — batch 2 (messy) | 750 |
| `dim_asset.csv` | Corridor geo layer: main line + western spur + Kisumu branch | 183 |
| `corridor_telemetry.csv` | 48h/30min geo-tagged sensor readings incl. rainfall | 17376 |
| `ground_truth_issues.csv` | Answer key: every injected issue | 7256 |

## Corridor Chains

| Chain | Route | Covers |
|-------|-------|--------|
| main | Mombasa → Nairobi Terminal | SITE-002, SITE-003 |
| western | Nairobi Terminal → Nakuru → Sinendet → Eldoret | SITE-001, SITE-004, SITE-005, SITE-006 |
| kisumu | Sinendet → Kisumu | SITE-006 (branch origin) |

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

SITE-006 (Sinendet) now also has corridor coverage via the western spur,
and is the branch origin of the Sinendet-Kisumu chain — so its high-risk
pattern is visible in both the incident/audit tables AND the corridor map.

## Datasets

### Environmental Incidents (`incidents_raw.csv`)

Spills, leaks, and fires — the **outcome** layer.
Includes latitude/longitude assigned from canonical site coordinates with ±0.01–0.03° jitter.

### Compliance Audits (`audits_raw.csv`)

Regulatory inspection findings — the **oversight gap** layer.

### Pipeline Telemetry (batches 1 & 2)

Continuous sensor readings (pressure, flow, temperature) — the **leading indicator** layer.
5000 total rows. Covers the previous 90 days. Pressure spikes cluster in groups of 3-5 readings.

### Corridor Geo Layer (`dim_asset.csv`, `corridor_telemetry.csv`)

Additive — not a replacement for dim_site/fact_incidents/fact_audits/fact_telemetry.

- **`dim_asset.csv`** — monitoring points every ~5km along three chains (main + western + kisumu),
  plus named pump stations and depots. `nearest_site_code` links back to dim_site where a real
  site sits on the route. The `corridor_chain` column identifies which chain each row belongs to.
- **`corridor_telemetry.csv`** — 48h at 30-min intervals for every monitoring_point and pump_station.
  Adds `rainfall_mm` as a new leading-indicator field not present in pipeline_telemetry_batch*.csv.
  Three demo anomaly events seeded deterministically: slow leak (pressure/flow ramp-down),
  flood-risk rainfall spike, landslide-precursor rainfall spike (Naivasha-Nakuru escarpment).
- Town-level names are from KPC's public station list. Coordinates and readings are simulated —
  jittered from public town-centre reference points, not real asset siting or SCADA data.

### Shared Join Key: `site` (core datasets) / `asset_id` (corridor layer)

Core datasets (incidents/audits/telemetry) join through `dim_site.site_id`.
Corridor layer joins through `dim_asset.asset_id` and links back via `nearest_site_code`.

## Messiness Injected

| Issue Type | Count | Datasets | Expected Pipeline Outcome |
|-----------|-------|----------|--------------------------|
| `mixed_date_format` | 3466 | incidents, audits | Corrected (standardized to ISO 8601) |
| `dirty_label` | 2047 | incidents, telemetry | Corrected (auto-normalized) |
| `missing_required_field` | 590 | incidents, corridor_assets | Review (held for human sign-off) |
| `out_of_range` | 292 | incidents, audits | Rejected or Corrected (clamp if recoverable) |
| `duplicate_id` | 235 | incidents, audits, telemetry | Rejected (uniqueness violation) |
| `future_date` | 196 | incidents, audits | Rejected (physically impossible) |
| `sensor_dropout` | 155 | telemetry | Corrected/Review (null sensor reading) |
| `closed_before_inspection` | 142 | audits | Rejected (logical impossibility) |
| `invalid_coordinates` | 75 | incidents, corridor_assets | Rejected (physically impossible coordinates) |
| `pressure_spike` | 56 | telemetry, corridor_telemetry | Review (potential leading indicator for leaks) |
| `generator_error` | 2 | TBD | TBD |

## Issues by Dataset

- incidents: 3408
- audits: 2798
- telemetry: 1035
- corridor_assets: 6
- corridor_telemetry: 9

## How to Compute Detection Rate

After the pipeline runs, join the decision log against `ground_truth_issues.csv`
on `record_id`. For each issue type, check whether the pipeline caught it and
routed it to the correct outcome:

```
detection_rate = (issues correctly routed) / (total issues injected)
```

This is the honest, quantified ROI evidence for Stage 1.
Put this number in the memo and the pitch.

## Known Limitations

- Some rows have multiple issues (e.g., dirty severity AND future date on the same
  record). This is intentional — real data isn't one-problem-per-row. Compute recall
  **per issue type**, not per row.
- Pressure spikes are clustered by index position rather than strictly by site+time
  adjacency. This is a simplification; real spikes would be sensor-specific.
- Coordinate jitter is uniform random rather than GPS-realistic noise patterns.
- Telemetry timestamps are uniformly distributed; real SCADA systems have
  fixed polling intervals with occasional gaps.
- Corridor coordinates are jittered from public town-centre reference points —
  they are not real asset coordinates or real SCADA data.
- ~1% of corridor monitoring points may have both invalid_coordinates AND
  missing_required_field:latitude injected. Both are logged to ground_truth.
  This is intentional — the pipeline must handle multi-issue rows.