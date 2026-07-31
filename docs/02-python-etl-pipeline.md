# Sentinel — Python ETL Pipeline

The Python pipeline (`sentinel/`) is Stage 1 of the system. It ingests raw HSE
data, enforces data-quality rules, routes each record to one of four outcomes,
and writes clean output to a local warehouse. It also runs continuously as a
live data generator, feeding the Spring Boot backend every 2 minutes.

---

## Directory Layout

```
sentinel/
├── src/
│   ├── generate_data.py   # Synthetic data generator
│   ├── ingest.py          # Stage 1: batch ingestion + checksums
│   ├── transform.py       # Stage 2: normalization + deduplication
│   ├── validate.py        # Stage 3: 8 validation rules + CLI gate
│   ├── decide.py          # Stage 4: 4-outcome routing
│   ├── load.py            # Stage 5: warehouse writer
│   └── run_pipeline.py    # Live runner (called every 2 min)
├── data/
│   ├── raw/               # Input CSVs
│   ├── warehouse/         # Output Parquet + DuckDB
│   └── quarantine/        # Rejected records
├── tests/
│   ├── test_transform.py
│   └── test_validate.py
├── run_live.sh            # Bash loop: runs run_pipeline.py on an interval
└── requirements.txt
```

---

## Synthetic Data

`generate_data.py` produces a fully reproducible dataset (seed `1508`, anchor
date `2026-07-22`).

### Output files

| File | Rows | Description |
|---|---|---|
| `dim_site.csv` | 7 | KPC site reference (uppercase `SITE-001`…`SITE-007`) |
| `incidents_raw.csv` | ~6 090 | Environmental incident records (deliberately messy) |
| `audits_raw.csv` | ~9 595 | Compliance audit records (deliberately messy) |
| `pipeline_telemetry_batch1/2.csv` | varies | Pipeline sensor readings |
| `dim_asset.csv` | 176 | Corridor monitoring assets (MPs, PSs, DEPs) |
| `corridor_telemetry.csv` | 176 | One reading per asset per run |
| `ground_truth_issues.csv` | ~6 237 | Answer key: every injected data issue |

### Injected messiness

The generator deliberately degrades data to test the pipeline's detection
capability. Every injected issue type has a known expected outcome:

| Issue Type | Count | Expected Outcome |
|---|---|---|
| Mixed date formats (ISO, US, day-first) | ~3 571 | Corrected |
| Dirty severity labels (`crit`, `hi`, `major`) | ~1 285 | Corrected |
| Missing required fields | ~516 | Review |
| Out-of-range compliance scores (<0 or >100) | ~311 | Corrected or Rejected |
| Future incident dates | ~209 | Rejected |
| Duplicate IDs | ~185 | Rejected |
| Closed-before-inspection dates | ~160 | Rejected |
| Invalid coordinates | ~155 | Rejected |

### High-risk site bias

Two sites — **SITE-003 (Makueni)** and **SITE-006 (Sinendet)** — are
generated with degraded characteristics to model the Kimeu v. KPC pattern:

- ~40% of all incidents despite being only 2 of 7 sites
- 70% High/Critical severity vs 30% for normal sites
- Mean audit compliance score: 62 vs 82
- Audit closure rate: 35% vs 70%
- Closure lag: 20–90 days vs 5–30 days
- Incident types skewed toward Leak/Spill (60% vs 30%)

---

## Pipeline Stages

### Stage 1 — Ingest (`ingest.py`)

**What it does:**
- Assigns a UUID `batch_id` per run
- Reads CSV / Parquet / JSON files from `data/raw/`
- Computes a SHA-256 checksum per file
- Tags every row with `_source_file` and `_batch_id` for traceability
- Skips `ground_truth_*` and `dim_*` files (reference data, not pipeline input)
- Appends a log entry per file to `data/warehouse/ingest_log.json`

**Output:** `data/warehouse/raw_batch.parquet`

```bash
python -m src.ingest                      # all CSVs in data/raw/
python -m src.ingest --input data/raw/incidents_raw.csv  # single file
```

---

### Stage 2 — Transform (`transform.py`)

**What it does:**
1. **Normalizes categorical text** via lookup tables:
   - Severity: 20+ dirty variants (`crit`, `hi`, `major`, `l`, …) → `Low / Medium / High / Critical`
   - Incident type: `oil leak`, `minor spill`, `equip. failure` → canonical forms
   - Status: `opened`, `resolved`, `in_progress` → `Open / Closed / In Progress`
   - Site labels: 60+ dirty variants (`nairobi term`, `makueni ps`, `kipevu terminal`) → `site-XXX` (lowercase)
2. **Converts all date/timestamp columns** to ISO 8601 UTC using `format='mixed'`
   (handles US format, day-first, with/without timezone)
3. **Deduplicates** on natural key (`incident_id`, `audit_id`, `reading_id`),
   keeping the latest record by `ingestion_timestamp`

**Output:** `data/warehouse/transformed_batch.parquet`

---

### Stage 3 — Validate (`validate.py`)

Eight named rules, each returning a boolean Series over the batch:

| Rule | Field(s) | Condition |
|---|---|---|
| `no_future_incidents` | `incident_date`, `inspection_date` | Must be ≤ today UTC |
| `valid_severity` | `severity` | Must be `Low / Medium / High / Critical` |
| `score_bounds` | `compliance_score` | Must be in [0, 100] |
| `date_order` | `closed_date`, `inspection_date` | `closed_date` ≥ `inspection_date` |
| `uniqueness` | `incident_id` / `audit_id` / `reading_id` | No duplicates within batch |
| `valid_coordinates` | `latitude`, `longitude` | In valid range; not (0, 0) |
| `valid_pressure` | `pressure_psi` | 0–1000 PSI (telemetry rows only) |
| `sensor_readings` | `pressure_psi`, `flow_rate_bph`, `temp` | At least one non-null (telemetry only) |

The module also functions as a **CLI data-quality gate**:

```bash
python -m src.validate --fail-below 0.90
# Exits 0 (GATE PASSED) or 1 (GATE FAILED) based on trusted+corrected rate
```

This gate runs in CI on every push. It enforces that at least 90% of records
in a batch are trusted or auto-corrected.

---

### Stage 4 — Decide (`decide.py`)

Every record receives exactly one of four outcomes with a reason string:

| Outcome | Condition | Example reason |
|---|---|---|
| **trusted** | All rules pass | `"all rules passed"` |
| **corrected** | Only recoverable failures; correction succeeded | `"severity corrected: 'crit' -> 'Critical'"` |
| **review** | Ambiguous or uncorrectable failure | `"missing required field: severity"` |
| **rejected** | Hard rule failure | `"hard rule failure: no_future_incidents"` |

**Rule classification:**

| Class | Rules |
|---|---|
| Recoverable (auto-correct) | `valid_severity`, `score_bounds` |
| Review (human sign-off) | `date_order`, `valid_pressure`, `sensor_readings` |
| Hard fail (reject) | `no_future_incidents`, `uniqueness`, `valid_coordinates` |

**Precedence:** hard fail > missing required field > recoverable > review.

Auto-corrections applied:
- Severity: fuzzy-matched to canonical value via `SEVERITY_LOOKUP`
- Score out of bounds: clamped to [0, 100]

If a correction is attempted but cannot be applied (e.g., `compliance_score`
is non-numeric), the record is routed to `review` instead.

**Output:**
- `data/warehouse/decided_batch.parquet` — all records + `decision` + `decision_reason`
- `data/warehouse/decision_summary.json` — `{trusted, corrected, review, rejected}` counts
- `data/quarantine/rejected_batch.parquet` — rejected records only

---

### Stage 5 — Load (`load.py`)

**What it does:**
- Filters to `trusted` + `corrected` records for clean warehouse tables
- Splits by natural ID column:
  - `incident_id` → `fact_incidents`
  - `audit_id` → `fact_audits`
  - `reading_id` → `fact_telemetry`
- Writes each table as Parquet and to `sentinel.duckdb`
- Writes `decided_all.parquet` (all 4 outcomes) for full auditability
- Quarantines `rejected` records to `data/quarantine/rejected_records.csv`
- Loads `dim_site.csv` as a reference table (no validation — controlled 7-row input)

**Current warehouse state (from `decision_summary.json`):**

| Outcome | Count |
|---|---|
| trusted | 18 974 |
| corrected | 327 |
| review | 205 |
| rejected | 294 |

---

## Live Pipeline (`run_pipeline.py` + `run_live.sh`)

The live runner generates a rolling batch of fresh data and runs all 5 stages
continuously, keeping the Spring Boot backend's database populated.

### Batch composition (~200 rows per cycle)

- **~80 incidents** — 40% skewed to high-risk sites; severity weighted toward
  High/Critical at SITE-003/006; ~8% dirty severity, ~2% future dates, ~2% bad scores
- **~60 audits** — high-risk sites get lower scores (mean 62), lower closure rates
- **~60 telemetry** — pressure normally distributed around 400 PSI; 1% spike above 1 050 PSI
- **56 corridor environmental readings** — one per corridor asset (MP, PS, DEP);
  status probabilities weighted by flood zone (`high_flood` / `moderate_flood` / `low`)

### JSON export (`live_batch.json`)

After each cycle the pipeline writes a bridge file that Spring Boot reads:

```json
{
  "batch_id": "<uuid>",
  "timestamp": "2026-07-28T...",
  "incidents": [...],
  "audits": [...],
  "telemetry": [...],
  "environmental": [...],
  "summary": { "trusted": 148, "corrected": 22, "review": 18, "rejected": 12 }
}
```

Only `trusted` + `corrected` records are included in incidents/audits/telemetry.
All 56 corridor environmental readings are exported regardless of decision outcome
(they feed the corridor heatmap, not the quality pipeline).

### run_live.sh

```bash
./run_live.sh        # defaults: ROWS=200, INTERVAL=120
ROWS=50 INTERVAL=60 ./run_live.sh   # override
```

Log output rotates at 10 MB to `logs/etl.log`.

---

## Tests

```bash
pytest tests/ -v
```

| File | Coverage |
|---|---|
| `test_transform.py` | Severity normalization, date parsing, deduplication, site lookup |
| `test_validate.py` | Each validation rule with valid and invalid inputs |

---

## Decision Rate Measurement

To measure how well the pipeline catches injected issues:

```bash
# 1. Run the pipeline
python -m src.ingest && python -m src.transform
python -m src.decide && python -m src.load

# 2. Join decided output against ground_truth_issues.csv on record_id
# 3. For each issue_type, check whether the pipeline routed it correctly
# detection_rate = correctly_routed / total_injected_of_that_type
```

Detection rates are computed per issue type, not per row. A record with two
injected issues (e.g., dirty severity AND future date) counts separately for
each issue type.
