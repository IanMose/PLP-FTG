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
│   ├── generate_data.py      # Synthetic data generator (seed 1508)
│   ├── ingest.py             # Stage 1: batch ingestion + checksums
│   ├── transform.py          # Stage 2: normalization + deduplication
│   ├── validate.py           # Stage 3: 8 validation rules + CLI gate
│   ├── decide.py             # Stage 4: 4-outcome routing
│   ├── load.py               # Stage 5: warehouse writer
│   ├── run_pipeline.py       # Live runner (called every 2 min)
│   ├── features.py           # ML Stage A: fact_site_features table
│   ├── predict.py            # ML Stage B: logistic regression train/score
│   ├── diagnostics.py        # ML Stage C: KM survival, EWMA, correlation
│   └── roi/
│       ├── __init__.py
│       ├── models.py         # RoiInput / RoiResult dataclasses
│       ├── scenarios.py      # simulate_reference_scenario() — reuses diagnostics EWMA
│       └── calculator.py     # calculate_roi() formula + roi_simulation_result.json writer
├── data/
│   ├── raw/                  # Input CSVs
│   ├── reference/
│   │   └── thange_kimeu_2025.json   # Court-record anchor (display-only)
│   ├── warehouse/            # Output Parquet + DuckDB + JSON artifacts
│   └── quarantine/           # Rejected records
├── models/
│   ├── .gitkeep
│   └── logreg_v1.pkl         # Trained model artifact (gitignored binary)
├── tests/
│   ├── test_transform.py
│   ├── test_validate.py
│   └── test_features.py      # 14 tests across 5 feature functions
├── run_live.sh               # Bash loop: runs run_pipeline.py on an interval
└── requirements.txt
```

---

## Synthetic Data

`generate_data.py` produces a fully reproducible dataset (seed `1508`, anchor
date `2026-07-22`).

### Output files

| File                              | Rows   | Description                                          |
| --------------------------------- | ------ | ---------------------------------------------------- |
| `dim_site.csv`                    | 7      | KPC site reference (uppercase `SITE-001`…`SITE-007`) |
| `incidents_raw.csv`               | ~6 090 | Environmental incident records (deliberately messy)  |
| `audits_raw.csv`                  | ~9 595 | Compliance audit records (deliberately messy)        |
| `pipeline_telemetry_batch1/2.csv` | varies | Pipeline sensor readings                             |
| `dim_asset.csv`                   | 176    | Corridor monitoring assets (MPs, PSs, DEPs)          |
| `corridor_telemetry.csv`          | 176    | One reading per asset per run                        |
| `ground_truth_issues.csv`         | ~6 237 | Answer key: every injected data issue                |

### Injected messiness

| Issue Type                                    | Count  | Expected Outcome      |
| --------------------------------------------- | ------ | --------------------- |
| Mixed date formats (ISO, US, day-first)       | ~3 571 | Corrected             |
| Dirty severity labels (`crit`, `hi`, `major`) | ~1 285 | Corrected             |
| Missing required fields                       | ~516   | Review                |
| Out-of-range compliance scores (<0 or >100)   | ~311   | Corrected or Rejected |
| Future incident dates                         | ~209   | Rejected              |
| Duplicate IDs                                 | ~185   | Rejected              |
| Closed-before-inspection dates                | ~160   | Rejected              |
| Invalid coordinates                           | ~155   | Rejected              |

### High-risk site bias

**SITE-003 (Makueni)** and **SITE-006 (Sinendet)** are generated with degraded
characteristics to model the Kimeu v. KPC pattern:

- ~40% of all incidents despite being only 2 of 7 sites
- 70% High/Critical severity vs 30% for normal sites
- Mean audit compliance score: 62 vs 82
- Audit closure rate: 35% vs 70%; closure lag: 20–90 days vs 5–30 days

---

## Pipeline Stages (Stage 1 — Core ETL)

### Stage 1 — Ingest (`ingest.py`)

Assigns a UUID `batch_id`, reads CSVs from `data/raw/`, computes SHA-256
checksums, tags every row with `_source_file` and `_batch_id`, skips reference
files, and appends a log entry to `ingest_log.json`.

**Output:** `data/warehouse/raw_batch.parquet`

---

### Stage 2 — Transform (`transform.py`)

1. Normalizes severity (20+ dirty variants → `Low / Medium / High / Critical`)
2. Normalizes incident type, status, and site labels to canonical forms
3. Converts all date/timestamp columns to ISO 8601 UTC using `format='mixed'`
4. Deduplicates on natural key, keeping the latest record by `ingestion_timestamp`

**Output:** `data/warehouse/transformed_batch.parquet`

---

### Stage 3 — Validate (`validate.py`)

Eight named rules:

| Rule                  | Condition                                       |
| --------------------- | ----------------------------------------------- |
| `no_future_incidents` | `incident_date` / `inspection_date` ≤ today UTC |
| `valid_severity`      | `Low / Medium / High / Critical` only           |
| `score_bounds`        | `compliance_score` in [0, 100]                  |
| `date_order`          | `closed_date` ≥ `inspection_date`               |
| `uniqueness`          | No duplicate IDs within batch                   |
| `valid_coordinates`   | Valid range, not (0, 0)                         |
| `valid_pressure`      | 0–1000 PSI (telemetry only)                     |
| `sensor_readings`     | At least one non-null reading (telemetry only)  |

**CLI gate:**

```bash
python -m src.validate --fail-below 0.90
# Exits 0 (GATE PASSED) or 1 (GATE FAILED)
```

---

### Stage 4 — Decide (`decide.py`)

Every record receives exactly one outcome:

| Outcome       | Condition                                       |
| ------------- | ----------------------------------------------- |
| **trusted**   | All rules pass                                  |
| **corrected** | Only recoverable failures; correction succeeded |
| **review**    | Ambiguous or uncorrectable failure              |
| **rejected**  | Hard rule failure                               |

Hard rules (reject): `no_future_incidents`, `uniqueness`, `valid_coordinates`
Recoverable (auto-correct): `valid_severity` (fuzzy lookup), `score_bounds` (clamp)
Review: `date_order`, `valid_pressure`, `sensor_readings`

**Output:** `decided_batch.parquet`, `decision_summary.json`, `quarantine/rejected_batch.parquet`

**Current warehouse state:**

| Outcome   | Count  |
| --------- | ------ |
| trusted   | 18 974 |
| corrected | 327    |
| review    | 205    |
| rejected  | 294    |

---

### Stage 5 — Load (`load.py`)

Filters to trusted + corrected records. Splits by natural ID into `fact_incidents`,
`fact_audits`, `fact_telemetry`. Writes Parquet and DuckDB. Quarantines rejected
records. Loads `dim_site.csv` as a reference table.

---

## ML Analytics (Stage 2 — Feature Engineering + Model)

### `features.py` — Feature Engineering (Stage A)

Builds `fact_site_features.parquet` — one row per `(site_id, as_of_date)` for the
last 180 days × 7 sites = up to 1,260 rows.

**Feature schema:**

| Column                        | Description                                     |
| ----------------------------- | ----------------------------------------------- |
| `site_id`                     | e.g. `"site-003"`                               |
| `as_of_date`                  | Snapshot date                                   |
| `days_since_last_audit`       | NULL if never audited (imputed to 999 in model) |
| `rejection_rate_7d`           | 0.0–1.0                                         |
| `rejection_rate_30d`          | 0.0–1.0                                         |
| `incident_count_30d`          | Integer count                                   |
| `incident_severity_score_30d` | Weighted: Crit=4, High=3, Med=2, Low=1          |
| `pressure_anomaly_count_14d`  | Readings > 1000 PSI in last 14 days             |
| `audit_finding_open_count`    | Audits with status != 'Closed'                  |

Reads from Parquet files only (not DuckDB) to avoid lock contention with the live runner.

```bash
python -m src.features
```

**Tests:** `tests/test_features.py` — 14 tests across 5 feature functions.

---

### `predict.py` — Predictive Model (Stage B)

Logistic regression classifier predicting 7-day Critical incident probability per site.

**Key design decisions:**

- `class_weight='balanced'` — handles label imbalance
- `random_state=42` — deterministic every run
- Time-based train/test split (no shuffle) — prevents data leakage
- Features imputed: `days_since_last_audit` NULLs → 999 ("never audited")
- Labels: `1` if any High/Critical incident in next 7 days for that `(site_id, as_of_date)`

**Outputs:**

- `models/logreg_v1.pkl` — trained model artifact
- `data/warehouse/fact_predictions.parquet` — scored probabilities per site (latest date)
- `data/warehouse/backtest_report.json` — precision=0.619, recall=0.677, F1=0.647
- `data/warehouse/feature_importance.json` — standardized coefficients
- `data/warehouse/predictions_export.json` — sidecar for Spring Boot

**Champion loading:** `--score` mode calls `GET /api/ml/champion-artifact-path` and loads
the artifact registered in `model_registry` rather than a hardcoded file path.

```bash
python -m src.predict --train   # train + evaluate + write pkl
python -m src.predict --score   # load champion from registry, score current features
python -m src.predict           # both (default)
```

---

### `diagnostics.py` — Statistical Diagnostics (Stage C)

Produces three independent diagnostic artifacts, each with a quotable number:

**Kaplan-Meier survival curves:**

- Fleet median: **23 days** | High-risk median: **56 days** (2.41× gap)
- `data/warehouse/survival_curve_data.json`

**EWMA pressure control charts:**

- Average lead time: **17.1 days** before hard breach (λ=0.2, L=3.0)
- `data/warehouse/control_chart_data.json`
- `data/warehouse/drift_events.json` — feeds alert narrative service

**Rejection rate × incident correlation:**

- Pearson r=0.703 (p=0.119, n=6 — state this honestly)
- `data/warehouse/correlation_data.json`

```bash
python -m src.diagnostics
```

---

## ROI Module (`src/roi/`)

Quantifies the financial value of the 17.1-day EWMA lead time under explicit,
user-visible assumptions.

### `models.py`

```python
@dataclass
class Assumption:
    value: float; unit: str; source_type: str; source: str; note: str

@dataclass
class RoiInput:
    intervention_probability: Assumption    # 0–1
    incident_exposure_kes: Assumption       # KES per incident
    n_high_risk_alerts: Assumption          # count from pipeline
    annual_platform_cost_kes: Optional[Assumption]

@dataclass
class RoiResult:
    lead_time_days: float            # from simulation — never hardcoded
    lead_time_source: str
    expected_avoided_cost_kes: float
    net_benefit_kes: Optional[float]
    roi_pct: Optional[float]
    calculation_breakdown: dict      # every intermediate value, labeled
```

### `scenarios.py`

`simulate_reference_scenario()` reuses `diagnostics.compute_ewma_control_chart()`
against a deterministic synthetic pressure profile. Same inputs → same result on
every run. If no spike detected → `{"signal": "no_signal", "lead_time_days": null}`.

**CRITICAL:** does not create a second EWMA implementation. Calls `diagnostics.py`'s
function directly.

### `calculator.py`

Core formula:

```
expected_avoided_cost = intervention_probability × incident_exposure_kes × n_high_risk_alerts
net_benefit = expected_avoided - annual_platform_cost
roi_pct = net_benefit / annual_platform_cost × 100
```

Writes `data/warehouse/roi_simulation_result.json` once. Spring Boot reads this file;
the Java `RoiController` applies the formula server-side against user-submitted
assumptions without re-running Python.

**Do-not list:**

- Never use `gross_award_kes` (3,018,831,676) as a formula input — court record only
- Never hardcode `lead_time_days` — always read from the simulation result
- Never label the synthetic scenario as historical KPC data

---

## `src/retrain.py` — Model Retraining (Stage 4 / ML HITL)

Called manually from the ML Admin portal ("Retrain Now" button) or scheduled.

**Behaviour:**

1. Loads `fact_site_features.parquet` + feedback labels from `model_feedback` DB table
2. `rating='accurate'` / `rating='capa_outcome'` → confirmed positive labels
3. `rating='inaccurate'` → confirmed negative labels
4. `rating='uncertain'` → excluded from training
5. Feedback labels override synthetic labels for the same `(site_id, as_of_date)` snapshot
6. Retrains `LogisticRegression(class_weight='balanced', random_state=42)` — same feature set as `predict.py`
7. Evaluates against same fixed holdout (time-based cutoff — no shuffle)
8. Saves challenger artifact to `models/logreg_{YYYYMMDD_HHMM}.pkl`
9. Calls `POST /api/ml/training-run` to write `model_registry` (status=`challenger`) + `training_run` rows

**Does not promote automatically** — promotion requires a human click in the portal.

```bash
python -m src.retrain                            # manual trigger
python -m src.retrain --triggered-by schedule    # cron trigger
```

---

## Reference Data

### `data/reference/thange_kimeu_2025.json`

Immutable court-record anchor. Never feed into any formula. Display-only.

```json
{
  "case_id": "thange_kimeu_2025",
  "case_name": "Kimeu & 3074 others v Kenya Pipeline Company Ltd & another",
  "citation": "[2025] KEELC 5239 (KLR)",
  "incident_date": "2015-05-12",
  "judgment_date": "2025-07-11",
  "liability_kpc_pct": 80,
  "damages_kes": 2118831676,
  "environmental_restoration_kes": 900000000,
  "gross_award_kes": 3018831676,
  "source_type": "COURT_RECORD",
  "note": "Reference benchmark only. Never use as generic incident cost input."
}
```

---

## Live Pipeline (`run_pipeline.py` + `run_live.sh`)

Generates ~200 rows per cycle, runs all 5 ETL stages, and writes `live_batch.json`.

```bash
./run_live.sh                        # defaults: ROWS=200, INTERVAL=120
ROWS=50 INTERVAL=60 ./run_live.sh    # override
```

`live_batch.json` structure:

```json
{
  "batch_id": "<uuid>",
  "incidents": [...],  "audits": [...],  "telemetry": [...],
  "environmental": [...],
  "summary": { "trusted": 148, "corrected": 22, "review": 18, "rejected": 12 }
}
```

---

## Warehouse Artifact Summary

| File                         | Written by          | Consumed by                            |
| ---------------------------- | ------------------- | -------------------------------------- |
| `raw_batch.parquet`          | `ingest.py`         | `transform.py`                         |
| `transformed_batch.parquet`  | `transform.py`      | `validate.py`                          |
| `decided_batch.parquet`      | `decide.py`         | `load.py`                              |
| `fact_incidents.parquet`     | `load.py`           | `features.py`, `predict.py`            |
| `fact_audits.parquet`        | `load.py`           | `features.py`                          |
| `fact_telemetry.parquet`     | `load.py`           | `diagnostics.py`                       |
| `fact_site_features.parquet` | `features.py`       | `predict.py`, `retrain.py`             |
| `fact_predictions.parquet`   | `predict.py`        | `EtlReloadService`                     |
| `backtest_report.json`       | `predict.py`        | evidence slide                         |
| `feature_importance.json`    | `predict.py`        | `AnalyticsController`                  |
| `survival_curve_data.json`   | `diagnostics.py`    | `AnalyticsController`                  |
| `control_chart_data.json`    | `diagnostics.py`    | `AnalyticsController`, `RoiController` |
| `correlation_data.json`      | `diagnostics.py`    | `AnalyticsController`                  |
| `drift_events.json`          | `diagnostics.py`    | `NarrativeService`                     |
| `roi_simulation_result.json` | `roi/calculator.py` | `RoiController`                        |
| `live_batch.json`            | `run_pipeline.py`   | `EtlReloadService`                     |
| `sentinel.duckdb`            | `load.py`           | local ad-hoc queries                   |

---

## Tests

```bash
pytest tests/ -v
```

| File                | Coverage                                                         |
| ------------------- | ---------------------------------------------------------------- |
| `test_transform.py` | Severity normalization, date parsing, deduplication, site lookup |
| `test_validate.py`  | Each validation rule with valid and invalid inputs               |
| `test_features.py`  | 14 tests — one per feature function with hand-built fixtures     |
