# Sentinel — Stage 2 Features 1–4 Build Plan
> Features: Feature Engineering Pipeline · Predictive Model · Statistical Diagnostics · Explainability  
> Date: 11 August 2026 (Day 9 of build window)  
> Status: Brainstorm → Staged Implementation Plan

---

## Reality Check — What Already Exists

Before building anything, these are the confirmed starting conditions:

| Layer | What's there | What's missing for F1–F4 |
|---|---|---|
| Python ETL | 5 stages working, 19 800 records, 97.6% pass rate, `sentinel.duckdb` populated | `features.py`, `predict.py`, `diagnostics.py`, `tests/test_features.py` |
| Backend (Java) | `RiskService` 5-component score, `RiskController`, corridor, quality, telemetry all live | `AnalyticsController`, `AnalyticsService`, `fact_predictions` table, feature-importance endpoint |
| Frontend (Next.js) | `/dashboard/sentinel/analytics/page.tsx` exists and renders a site-list/heatmap view | No survival curve chart, no control-chart component, no feature-importance bar, no model prediction column |
| DB schema | V10 migrations applied, `fact_incidents`, `fact_audits`, `fact_telemetry` populated | `fact_site_features` table, `fact_predictions` table |
| Tests | `test_transform.py` + `test_validate.py` passing in CI | `test_features.py` |
| `requirements.txt` | pandas, pandera, pytest, duckdb, pyarrow, numpy, faker | scikit-learn, joblib, lifelines, scipy |

**`SITE_COORDS` bug is already fixed** (lowercase keys in `RiskService.java`).  
**`acknowledgedBy` stub** (`"api-user"`) still needs the one-liner fix — do it before demo.

---

## Bottleneck Analysis

These are the real blockers that can cascade if not handled in the right order.

### B1 — Entity Grain Decision (blocks everything)
`features.py` must decide: one row per `(site, as_of_date)` with a rolling window.
If you get the grain wrong — e.g., one row per event — the model labels will be
wrong, the diagnostics will be wrong, and you'll rewrite the whole thing.
**Decision: `(site_id TEXT, as_of_date DATE)` as the composite key. One row per site
per day. Daily snapshots over the last 180 days of synthetic data.**

### B2 — DuckDB Concurrency (blocks live pipeline)
`run_pipeline.py` writes to `sentinel.duckdb` every 2 minutes. If `features.py`
opens the same DuckDB file at the same time, you get a lock error.
**Decision: `features.py` reads from Parquet files (`fact_incidents.parquet`,
`fact_audits.parquet`, `fact_telemetry.parquet`), not from DuckDB directly.
Only writes its own output (`fact_site_features.parquet` + DuckDB table)
after the live runner has closed its connection.**

### B3 — Label Sparsity (blocks model training)
The synthetic dataset has ~6 090 incidents across 7 sites over ~180 days.
High/Critical incidents at site-003 and site-006 are ~40% of all incidents.
But a 30-day forward label on daily snapshots means each site has ~180 rows.
7 sites × 180 days = 1 260 total rows. The positive class (incident in next 30d)
will be ~60–70% at high-risk sites and ~25–30% at normal sites.
**Decision: Use `class_weight='balanced'` in logistic regression. This prevents
the model from ignoring the minority class. Do NOT use accuracy as a metric —
use precision-recall. If the training set is still too small for GBM, skip it
and ship logistic regression — it is defensible and explainable.**

### B4 — `lifelines` KM Curve on Sparse Closure Data
Many audit records in the synthetic data have `closed_date = ""` (open/in-progress).
Kaplan-Meier requires a `duration` column and an `event_observed` boolean.
Records with no `closed_date` are right-censored (we observe them up to today
but they haven't closed). Lifelines handles censoring natively — but you must
correctly set `event_observed = False` for open audits, not drop them.
**Decision: `duration = (closed_date - inspection_date).days` for closed audits.
For open audits: `duration = (today - inspection_date).days`, `event_observed = False`.
Never drop open audits — they are the most operationally interesting data points.**

### B5 — EWMA Needs Ordered Time Series
`fact_telemetry.parquet` from the live runner has `timestamp` in ISO 8601 but
the rows are not guaranteed to be in order (batch writes are concurrent).
`pandas.ewm()` silently produces wrong results on an unsorted series.
**Decision: Always `sort_values("timestamp")` per site before computing EWMA.
Group by `site` + `pipeline_section`, apply EWMA per group.**

### B6 — Backend Endpoint Design (blocks frontend)
The analytics charts need pre-computed JSON, not raw data the frontend calculates.
The frontend has no pandas/scipy. Everything statistical stays in Python.
The backend serves pre-computed JSON from a file or a new DB table.
**Decision: Python writes three JSON files to `data/warehouse/`:
`survival_curve_data.json`, `control_chart_data.json`, `correlation_data.json`,
`feature_importance.json`. The Spring Boot `AnalyticsController` reads these files
on request. No new DB tables needed for diagnostics — they're computed artifacts, not facts.**

### B7 — `requirements.txt` in CI
The CI workflow installs `requirements.txt` then runs `pytest`.
Adding `scikit-learn` + `lifelines` will slow CI by ~45 seconds on first run
(package download). On repeat runs it's cached.
**Decision: Pin exact versions. Add to `requirements.txt` in Stage A before
any code that imports them so CI doesn't fail mid-implementation.**

---

---

## Stage Map — Four Stages, One Gate Each

```
Stage A  ──→  Feature Engineering Pipeline  (features.py + test_features.py)
     ↓
Stage B  ──→  Predictive Model              (predict.py + fact_predictions)
     ↓
Stage C  ──→  Statistical Diagnostics       (diagnostics.py + 3 JSON outputs)
     ↓
Stage D  ──→  Explainability + Frontend     (feature_importance.json + 4 chart components)
```

Each stage has a hard **Done When** gate. Do not start the next stage until the
current gate passes. This is not perfectionism — it prevents B3/B5/B6 cascades
where a broken input silently corrupts every downstream artifact.

---

## Stage A — Feature Engineering Pipeline

### Goal
A `features.py` module that produces `fact_site_features.parquet` — one row per
`(site_id, as_of_date)` — populated for every site and day in the synthetic dataset.
This is the single input to both the model (Stage B) and the diagnostics (Stage C).

### Input sources
- `sentinel/data/warehouse/fact_incidents.parquet`
- `sentinel/data/warehouse/fact_audits.parquet`
- `sentinel/data/warehouse/fact_telemetry.parquet`
- `sentinel/data/raw/dim_site.csv` (site list, 7 rows)

### Output schema
```
fact_site_features.parquet
  site_id                    TEXT        — e.g. "site-003"
  as_of_date                 DATE        — the snapshot date
  days_since_last_audit      INTEGER     — NULL if no audit ever
  rejection_rate_7d          FLOAT       — 0.0–1.0
  rejection_rate_30d         FLOAT       — 0.0–1.0
  incident_count_30d         INTEGER
  incident_severity_score_30d FLOAT      — weighted: Crit=4, High=3, Med=2, Low=1
  pressure_anomaly_count_14d INTEGER     — readings > 1000 PSI in last 14 days
  audit_finding_open_count   INTEGER     — audits with status != 'Closed'
```

### Implementation steps (exact)

**Step A1 — Add dependencies to `requirements.txt`**
```
scikit-learn==1.5.2
joblib==1.4.2
lifelines==0.29.0
scipy==1.14.1
```
Do this first. Commit. Let CI run. Confirm it still passes before any new code.

**Step A2 — Create `sentinel/src/features.py`**

Structure:
```python
# features.py
def load_warehouse_tables(warehouse_dir: str) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    """Load fact_incidents, fact_audits, fact_telemetry, dim_site from Parquet."""

def build_date_range(start_date: date, end_date: date) -> list[date]:
    """Return a list of daily dates between start and end inclusive."""

def compute_days_since_last_audit(audits_df: pd.DataFrame, site_id: str, as_of: date) -> int | None:
    """Filter audits for site up to as_of date. Return days since most recent."""

def compute_rejection_rates(incidents_df: pd.DataFrame, audits_df: pd.DataFrame,
                             site_id: str, as_of: date) -> dict:
    """Return rejection_rate_7d and rejection_rate_30d for a site as of a date."""

def compute_incident_features(incidents_df: pd.DataFrame, site_id: str, as_of: date) -> dict:
    """Return incident_count_30d and incident_severity_score_30d."""

def compute_pressure_anomalies(telemetry_df: pd.DataFrame, site_id: str, as_of: date) -> int:
    """Count pressure_psi > 1000 in last 14 days for site."""

def compute_open_findings(audits_df: pd.DataFrame, site_id: str, as_of: date) -> int:
    """Count audits with status != 'Closed' for site."""

def build_feature_table(warehouse_dir: str, days_back: int = 180) -> pd.DataFrame:
    """
    Main entry point. Builds the full (site, as_of_date) feature table.
    Loops over the last `days_back` days × 7 sites = up to 1260 rows.
    """

def main():
    """CLI: python -m src.features"""
```

**Performance note:** The naive loop (7 sites × 180 days × 5 functions × parquet filter each time)
is ~6 000 pandas filter operations. That will be slow (~30–60 seconds).
Optimization: load all three Parquet files once, convert dates to `pd.Timestamp`,
then filter in-memory using boolean masks. No DuckDB queries needed.

**Step A3 — Create `sentinel/tests/test_features.py`**

Use a hand-built 3-row fixture with exactly known values.
Test each feature function individually with a tiny DataFrame.
Do NOT test `build_feature_table()` — that's an integration concern.

Example fixture pattern:
```python
@pytest.fixture
def minimal_audits():
    return pd.DataFrame({
        "site":             ["site-003", "site-003"],
        "inspection_date":  ["2026-06-01T00:00:00Z", "2026-07-01T00:00:00Z"],
        "closed_date":      ["2026-06-15T00:00:00Z", ""],
        "compliance_score": [55.0, 62.0],
        "status":           ["Closed", "Open"],
        "decision":         ["trusted", "trusted"],
    })

def test_days_since_last_audit_returns_correct_delta(minimal_audits):
    result = compute_days_since_last_audit(minimal_audits, "site-003", date(2026, 8, 1))
    assert result == 31  # 2026-07-01 to 2026-08-01
```

Write one test per feature function. 7 tests minimum.

**Step A4 — Wire into `run_pipeline.py`**

After `load_trusted_output()` completes, call:
```python
from src.features import build_feature_table
features_df = build_feature_table(str(WAREHOUSE_DIR), days_back=180)
features_path = WAREHOUSE_DIR / "fact_site_features.parquet"
features_df.to_parquet(features_path, index=False)
log(f"[6/6] Features: {len(features_df)} site-day rows → fact_site_features.parquet")
```

**Step A5 — Add to `run_full_etl.sh`**

Confirm `run_full_etl.sh` calls `python -m src.features` after `python -m src.load`.

### Done When ✓
- [ ] `fact_site_features.parquet` exists with 7 sites × N days rows
- [ ] Every row has non-null values for all 8 feature columns (NULLs only where data genuinely doesn't exist)
- [ ] `pytest tests/test_features.py -v` passes with ≥7 tests
- [ ] `python -m pytest tests/ -v` (full suite) still passes in CI

---

## Stage B — Predictive Model (30-Day Incident Probability)

### Goal
A trained logistic regression classifier that outputs `incident_probability_30d`
per site. Backtested with real precision and recall numbers. Persisted as a
model artifact. Scored on each pipeline run, writing `fact_predictions.parquet`.

### Input
`fact_site_features.parquet` from Stage A. Nothing else.

### Output
```
sentinel/models/logreg_v1.pkl         — trained model artifact
data/warehouse/fact_predictions.parquet
  site_id                TEXT
  as_of_date             DATE
  incident_probability_30d FLOAT      — 0.0–1.0
  model_version          TEXT         — e.g. "logreg_v1"

data/warehouse/backtest_report.json
  {
    "model_version": "logreg_v1",
    "train_cutoff": "2026-05-01",
    "test_from": "2026-05-02",
    "precision": 0.XX,
    "recall": 0.XX,
    "f1": 0.XX,
    "n_train": 840,
    "n_test": 420,
    "positive_rate_train": 0.XX,
    "positive_rate_test": 0.XX
  }
```

### Label Construction (critical — get this right)

For each `(site_id, as_of_date)` row in `fact_site_features`:
1. Look forward 30 days in `fact_incidents`
2. `label = 1` if ANY incident with `severity IN ('High', 'Critical')` exists
   for that `site_id` with `incident_date` in `(as_of_date, as_of_date + 30 days]`
3. Otherwise `label = 0`

This join must be done on the full `fact_incidents.parquet` (all decisions),
not just trusted/corrected records — you want to know if a real incident happened,
regardless of its data quality decision.

### Time Split (critical — no data leakage)

```
train: as_of_date < cutoff_date        (earlier 2/3 of date range)
test:  as_of_date >= cutoff_date       (later 1/3 of date range)
```

NEVER shuffle before splitting. The whole point is to simulate forward prediction.
If the synthetic data covers roughly 180 days, use day 120 as the cutoff:
train on days 1–120, test on days 121–180.

### Implementation steps (exact)

**Step B1 — Create `sentinel/src/predict.py`**

```python
# predict.py

FEATURES = [
    "days_since_last_audit",
    "rejection_rate_7d",
    "rejection_rate_30d",
    "incident_count_30d",
    "incident_severity_score_30d",
    "pressure_anomaly_count_14d",
    "audit_finding_open_count",
]
MODEL_VERSION = "logreg_v1"
MODEL_PATH = Path("models/logreg_v1.pkl")

def build_labels(features_df: pd.DataFrame, incidents_df: pd.DataFrame) -> pd.DataFrame:
    """Add label column to feature rows via forward-looking 30-day join."""

def train_model(features_with_labels: pd.DataFrame, cutoff_date: date) -> tuple:
    """
    Time-split train/test. Fit LogisticRegression(class_weight='balanced').
    Return (fitted_model, backtest_report_dict).
    """

def evaluate_model(model, X_test, y_test) -> dict:
    """Return precision, recall, f1, and a per-threshold PR curve list."""

def save_model(model, path: Path):
    """joblib.dump(model, path)"""

def load_model(path: Path):
    """joblib.load(path) — raises FileNotFoundError if not trained yet."""

def score_current_sites(features_df: pd.DataFrame, model) -> pd.DataFrame:
    """
    Score the most recent as_of_date row for each site.
    Returns DataFrame with site_id, as_of_date, incident_probability_30d, model_version.
    """

def main():
    """CLI: python -m src.predict [--train] [--score]"""
    # --train: rebuilds model from scratch, writes pkl + backtest_report.json
    # --score: loads existing pkl, scores current features, writes fact_predictions.parquet
    # default (no flags): do both
```

**Step B2 — Handle missing values before training**

`days_since_last_audit` will be NULL for sites with no audit history.
Fill NULLs with a large sentinel value (e.g., `999` = "never audited")
before feeding to scikit-learn. Document this imputation in `backtest_report.json`.

**Step B3 — Create `sentinel/models/` directory**

Add `sentinel/models/.gitkeep` and add `sentinel/models/*.pkl` to `.gitignore`
(model artifacts are large binaries, not source code).

**Step B4 — Wire into `run_pipeline.py`**

After `build_feature_table()`:
```python
from src.predict import score_current_sites, load_model
model = load_model(Path("models/logreg_v1.pkl"))
preds_df = score_current_sites(features_df, model)
preds_df.to_parquet(WAREHOUSE_DIR / "fact_predictions.parquet", index=False)
log(f"[7/7] Predictions: {len(preds_df)} site scores → fact_predictions.parquet")
```

The model is trained once manually (`python -m src.predict --train`).
Scoring runs on every pipeline cycle automatically.

**Step B5 — Backend: `fact_predictions` table + endpoint**

Create `V11__fact_predictions.sql`:
```sql
CREATE TABLE fact_predictions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id       VARCHAR(50) NOT NULL REFERENCES dim_site(site_id),
    as_of_date    DATE        NOT NULL,
    probability   NUMERIC(5,4) NOT NULL,
    model_version VARCHAR(50),
    created_at    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_predictions_site_date ON fact_predictions(site_id, as_of_date);
```

Add `PredictionEntity`, `PredictionRepository`, and a `GET /api/sites/predictions`
endpoint on `RiskController` returning the latest probability per site.
Update `SiteRiskSummaryDto` with an `incidentProbability30d` field (nullable Float).

**Step B6 — Update `EtlReloadService` to load predictions**

After loading incidents/audits/telemetry, read `fact_predictions.parquet` and
upsert into the `fact_predictions` DB table (same `ON CONFLICT DO NOTHING`
pattern as other tables, keyed on `(site_id, as_of_date)`).

### Done When ✓
- [ ] `fact_predictions.parquet` exists with 7 rows (one per site, latest as_of_date)
- [ ] `backtest_report.json` exists with real precision and recall numbers
- [ ] `python -m src.predict --train` runs without error
- [ ] `python -m src.predict --score` runs without error
- [ ] `GET /api/sites/predictions` returns 7 rows via Swagger UI
- [ ] Precision and recall numbers are written in plain text in the pitch deck notes

---

## Stage C — Statistical Diagnostics

### Goal
Three separate diagnostic outputs, each producing one quotable number for the
pitch and one chart component on the analytics page. All computation stays in Python.
The backend serves pre-computed JSON files. The frontend renders them with Recharts.

### Diagnostic 1 — Time-to-Closure Survival Analysis

**What it answers:** "How much longer does it take to close an audit finding at
a high-risk site compared to the fleet median?"

**Input:** `fact_audits.parquet`

**Output:** `data/warehouse/survival_curve_data.json`
```json
{
  "fleet_median_days": 18,
  "high_risk_median_days": 47,
  "quotable": "High-risk sites take 2.6× longer to close audit findings than fleet median",
  "curves": {
    "fleet":     [{"t": 0, "survival": 1.0}, {"t": 7, "survival": 0.82}, ...],
    "high_risk": [{"t": 0, "survival": 1.0}, {"t": 7, "survival": 0.71}, ...]
  }
}
```

**Implementation:**
```python
from lifelines import KaplanMeierFitter

def compute_survival_curves(audits_df: pd.DataFrame) -> dict:
    # Split into high_risk (site-003, site-006) vs fleet (all others)
    # For each group:
    #   duration = (closed_date - inspection_date).days  for closed audits
    #   duration = (today - inspection_date).days        for open audits  
    #   event_observed = (status == "Closed")
    # Fit KM per group
    # Extract timeline at t=0,7,14,21,30,60,90 for frontend chart
    # Return medians + curve points
```

**Key quotable:** median closure at site-003/site-006 vs. fleet median.
This is the "time-to-closure" number that appears in the pitch.

---

### Diagnostic 2 — EWMA Pressure Control Charts

**What it answers:** "How many days before a hard pressure breach does statistical
drift become detectable? That's the lead time Sentinel would have given at Thange."

**Input:** `fact_telemetry.parquet`

**Output:** `data/warehouse/control_chart_data.json`
```json
{
  "sites": {
    "site-003": {
      "readings": [
        {"timestamp": "2026-07-01T...", "pressure": 412.3, "ewma": 415.1,
         "ucl": 487.2, "lcl": 343.0, "drift_flag": false}
      ],
      "drift_events": [
        {"timestamp": "2026-07-18T...", "days_before_spike": 4}
      ],
      "lead_time_days": 4
    }
  },
  "fleet_avg_lead_time_days": 3.2
}
```

**Implementation:**
```python
def compute_ewma_control_chart(telemetry_df: pd.DataFrame, site_id: str,
                                 lam: float = 0.2, L: float = 3.0) -> dict:
    # Filter telemetry for site_id, sort by timestamp
    # Compute EWMA: ewma[i] = lam * pressure[i] + (1-lam) * ewma[i-1]
    # Compute control limits:
    #   sigma = std(first 20 readings as baseline)
    #   UCL = grand_mean + L * sigma * sqrt(lam / (2 - lam))
    #   LCL = grand_mean - L * sigma * sqrt(lam / (2 - lam))
    # Flag readings where EWMA > UCL or EWMA < LCL as drift_flag=True
    # Find drift events that precede a hard spike (pressure > 1000 PSI)
    # Compute lead_time = (spike_timestamp - first_drift_before_spike)
```

**Parameters:** λ=0.2 (standard, moderately responsive), L=3.0 (3-sigma limits).
These are industry-standard EWMA parameters — defend them if asked.

**Key quotable:** average lead time in days between EWMA drift flag and hard spike.
This feeds directly into the ROI calculator's "days of warning" claim.

Also expose breach events as a new `statistical_drift_flag` signal type alongside
the existing `pressure_anomaly` flag. Write them to
`data/warehouse/drift_events.json` for the alert narrative feature (Feature 5).

---

### Diagnostic 3 — Rejection Rate vs. Incident Rate Correlation

**What it answers:** "Does poor data quality at a site predict more incidents?
This ties Stage 1's data-quality work directly to Stage 2 operational insight."

**Input:** `fact_site_features.parquet` (from Stage A)

**Output:** `data/warehouse/correlation_data.json`
```json
{
  "pearson_r": 0.82,
  "p_value": 0.024,
  "interpretation": "Strong positive correlation (r=0.82, p=0.024): sites with higher rejection rates have more incidents in the following 30 days.",
  "scatter_points": [
    {"site_id": "site-003", "site_name": "Makueni Pump Station",
     "rejection_rate_30d": 0.18, "incident_count_30d": 24, "band": "Critical"},
    ...
  ]
}
```

**Implementation:**
```python
from scipy.stats import pearsonr

def compute_rejection_incident_correlation(features_df: pd.DataFrame,
                                            sites_df: pd.DataFrame) -> dict:
    # Aggregate: for each site, take mean rejection_rate_30d and mean incident_count_30d
    # across all date snapshots
    # Compute pearsonr(rejection_rates, incident_counts)
    # Build scatter_points list for frontend
    # Interpret: r > 0.7 → "strong positive correlation"
```

**Key quotable:** the Pearson r value and p-value. If `p < 0.05`, this is
statistically significant — the system's data quality metric from Stage 1
actually predicts operational risk. That's a story a judge can follow.

---

### Backend side for all three diagnostics

Create `sentinel-backend/src/main/java/com/sentinel/analytics/`:
```
AnalyticsController.java    — 3 GET endpoints
AnalyticsService.java       — reads pre-computed JSON files from disk
```

Endpoints:
```
GET /api/analytics/survival-curves     → survival_curve_data.json
GET /api/analytics/pressure-charts     → control_chart_data.json
GET /api/analytics/correlation         → correlation_data.json
```

`AnalyticsService` reads from a configurable path (defaulting to
`../sentinel/data/warehouse/`). No new DB tables for diagnostics — they are
computed artifacts, not relational data. Serve with `@JsonRawValue` or read
the JSON file and return as `ResponseEntity<String>` with `application/json`.

Add these endpoints to `SecurityConfig` as `permitAll()` (same as other read endpoints).

### Done When ✓
- [ ] `survival_curve_data.json` exists with real medians for fleet vs. high-risk
- [ ] `control_chart_data.json` exists with EWMA series for at least site-003 and site-006
- [ ] `correlation_data.json` exists with Pearson r and scatter points
- [ ] `GET /api/analytics/survival-curves` returns 200 via Swagger
- [ ] `GET /api/analytics/pressure-charts` returns 200 via Swagger
- [ ] `GET /api/analytics/correlation` returns 200 via Swagger
- [ ] Three quotable numbers are documented in plain text for the pitch deck

---

## Stage D — Explainability + Frontend Charts

### Goal
Every prediction on the dashboard can be explained in one sentence naming its
top contributing features. The analytics page shows all four diagnostic outputs
(survival curve, control chart, correlation scatter, feature importance bar).
The site drill-down page shows the model's probability alongside the rule-based score.

### Part D1 — Feature Importance Output

**Computation (Python):** After training in `predict.py`, extract:
```python
# For LogisticRegression: standardized coefficients
importances = np.abs(model.coef_[0]) * X_train.std(axis=0)
importances = importances / importances.sum()  # normalize to sum=1

feature_importance = {
    "model_version": MODEL_VERSION,
    "features": [
        {"name": "days_since_last_audit",       "importance": 0.31, "direction": "positive"},
        {"name": "incident_severity_score_30d", "importance": 0.24, "direction": "positive"},
        {"name": "rejection_rate_30d",          "importance": 0.19, "direction": "positive"},
        {"name": "pressure_anomaly_count_14d",  "importance": 0.14, "direction": "positive"},
        {"name": "incident_count_30d",          "importance": 0.09, "direction": "positive"},
        {"name": "audit_finding_open_count",    "importance": 0.03, "direction": "positive"},
    ]
}
```

Write to `data/warehouse/feature_importance.json`.

**Per-prediction top-3:** For each scored site, also compute which 3 features
contributed most to pushing this site's probability above 0.5.
Add this to `fact_predictions.parquet` as a `top_features` column (JSON string).

**Backend:** Add `GET /api/analytics/feature-importance` to `AnalyticsController`.

---

### Part D2 — Frontend: Analytics Page Upgrade

The existing `/dashboard/sentinel/analytics/page.tsx` already renders a
site-list table and heatmap. The diagnostics charts are added below these
in a new "Statistical Diagnostics" section.

**New component files to create:**

```
sentinel-frontend/src/app/(main)/dashboard/sentinel/analytics/_components/
  survival-curve-chart.tsx          ← KM curve (two lines: fleet vs high-risk)
  pressure-control-chart.tsx        ← EWMA line + UCL/LCL bands + drift flags
  correlation-scatter-chart.tsx     ← Rejection rate vs incident count, 7 dots
  feature-importance-bar.tsx        ← Horizontal bar chart, 6 bars
```

**`survival-curve-chart.tsx`**
- `Recharts LineChart`, two `Line` components (fleet=blue, high-risk=red)
- X-axis: days (0 to 90). Y-axis: survival probability (0 to 1.0, formatted as %)
- A `ReferenceLine` at the fleet median and the high-risk median
- Card title: "Audit Closure Time — Fleet vs High-Risk Sites"
- Stat underneath: "Median closure: {fleet_median}d (fleet) vs {high_risk_median}d (high-risk sites)"

**`pressure-control-chart.tsx`**
- `Recharts ComposedChart` — `Line` for EWMA, two `Area` or `ReferenceLine` for UCL/LCL
- `ReferenceArea` or `ReferenceLine` at 1000 PSI (the hard threshold)
- Dot colour change on `drift_flag = true` (orange/amber)
- Stat underneath: "Statistical drift detectable {lead_time_days} days before hard breach"
- Site selector: a `Select` dropdown to switch between site-003 and site-006

**`correlation-scatter-chart.tsx`**
- `Recharts ScatterChart` with a `Scatter` component
- Each dot is a site. Label with site name (`LabelList`).
- Colour dots by severity band (red=Critical, orange=High, etc.)
- X-axis: rejection rate (%). Y-axis: incident count (30d)
- Stat underneath: "r={pearson_r}, p={p_value} — {interpretation}"

**`feature-importance-bar.tsx`**
- `Recharts BarChart` with `layout="vertical"`, horizontal bars
- 6 bars, one per feature. Colour the top bar amber/orange to highlight the leading feature.
- Human-readable feature names: "Days Since Last Audit", "Severity Score (30d)", etc.
- Percentage labels on each bar

**`analytics/page.tsx` additions:**

```tsx
// Add after existing heatmap/table section:
<div className="space-y-1 mt-8">
  <h2 className="text-xl font-semibold tracking-tight">Statistical Diagnostics</h2>
  <p className="text-muted-foreground text-sm">
    Evidence layer: three independent diagnostics computed from the pipeline data.
    Each produces one quotable number for operational decision-making.
  </p>
</div>
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
  <SurvivalCurveChart data={survivalData} />
  <CorrelationScatterChart data={correlationData} sites={sites} />
  <PressureControlChart data={controlChartData} />
  <FeatureImportanceBar data={featureImportanceData} />
</div>
```

Fetch the four analytics endpoints in parallel at the top of the page with
`Promise.all([...])` alongside the existing `fetchRiskSummary()`.

---

### Part D3 — Site Drill-Down: Model Score Column

The site detail page at `/dashboard/sentinel/sites/[siteId]/page.tsx` currently
shows the rule-based risk score breakdown. Add a model prediction card.

**What to add:**
- A new `ModelPredictionCard` component on the site detail page
- Shows: `incident_probability_30d` as a percentage with a confidence label
  ("HIGH" ≥ 70%, "MODERATE" 40–69%, "LOW" < 40%)
- Shows: top 3 contributing features as a mini horizontal bar
- Positioned alongside the existing rule-based risk score breakdown
- Label clearly: "ML Model (logistic regression, backtested)" so a judge sees
  both the rule-based "why" and the model-based "why" side by side

**API:** Reuse `GET /api/sites/predictions` (returns all 7 sites) or add
`GET /api/sites/{id}/prediction` for single-site lookup.

**Update `SiteRiskSummary` type in `types.ts`:**
```typescript
export interface SiteRiskSummary {
  // ... existing fields ...
  incidentProbability30d?: number | null;
}
```

---

### Done When ✓
- [ ] `feature_importance.json` exists in the warehouse
- [ ] All four chart components render with real data on the analytics page
- [ ] No chart is empty or showing placeholder data when the backend is live
- [ ] Site drill-down shows the model probability alongside the rule-based score
- [ ] Switching the site selector on the control chart updates the chart
- [ ] The analytics page survives a `BackendError` gracefully (same pattern as other pages)

---

---

## Cross-Cutting Concerns

### New files created across all 4 stages

**Python pipeline (`sentinel/`):**
```
src/features.py
src/predict.py
src/diagnostics.py           ← holds compute_survival_curves, compute_ewma, compute_correlation
models/logreg_v1.pkl         ← generated, gitignored
models/.gitkeep
tests/test_features.py
data/warehouse/fact_site_features.parquet    ← generated
data/warehouse/fact_predictions.parquet      ← generated
data/warehouse/backtest_report.json          ← generated
data/warehouse/survival_curve_data.json      ← generated
data/warehouse/control_chart_data.json       ← generated
data/warehouse/correlation_data.json         ← generated
data/warehouse/feature_importance.json       ← generated
data/warehouse/drift_events.json             ← generated
```

**Spring Boot backend (`sentinel-backend/`):**
```
src/main/java/com/sentinel/analytics/
  AnalyticsController.java
  AnalyticsService.java
  SurvivalCurveDto.java       (optional — can use raw JSON pass-through)
src/main/resources/db/migration/
  V11__fact_predictions.sql
```

**Frontend (`sentinel-frontend/`):**
```
src/app/(main)/dashboard/sentinel/analytics/_components/
  survival-curve-chart.tsx
  pressure-control-chart.tsx
  correlation-scatter-chart.tsx
  feature-importance-bar.tsx
```

**Updated files:**
```
sentinel/src/run_pipeline.py         ← add features + predict + diagnostics calls
sentinel/requirements.txt            ← add scikit-learn, joblib, lifelines, scipy
sentinel-backend/src/.../risk/RiskController.java         ← add predictions endpoint
sentinel-backend/src/.../common/dto/SiteRiskSummaryDto.java  ← add incidentProbability30d
sentinel-frontend/src/lib/sentinel/types.ts               ← add field
sentinel-frontend/src/lib/sentinel/api.ts                 ← add analytics fetch wrappers
sentinel-frontend/src/app/.../analytics/page.tsx          ← add 4 chart sections
sentinel-frontend/src/app/.../sites/[siteId]/page.tsx     ← add model prediction card
```

### CI changes needed

Add to `ci.yml` after "Run ETL pipeline":
```yaml
- name: Compute features
  run: python -m src.features

- name: Score predictions (requires pre-trained model)
  run: |
    if [ -f models/logreg_v1.pkl ]; then
      python -m src.predict --score
    else
      echo "No model artifact found — skipping scoring (train first locally)"
    fi

- name: Compute diagnostics
  run: python -m src.diagnostics
```

The model is trained locally once and the `backtest_report.json` is committed
to the repo (it's a small JSON file, not a binary). The `.pkl` is gitignored
to keep the repo clean; CI only needs to run scoring if the artifact is present.

---

## Sequencing Decision Tree

```
Do Stage A first?
  YES — everything reads from fact_site_features.parquet.
  If A doesn't work, B and C cannot start.

Can B and C run in parallel after A?
  YES — B reads fact_site_features.parquet, C reads fact_audits + fact_telemetry.
  They have no shared state. Run them in parallel if two people are working.
  If solo, do B before C (model is higher rubric priority than diagnostics).

Can D start before B and C are complete?
  PARTIALLY — D1 (feature importance) needs B to be done.
  D2 charts (survival curve, correlation, control chart) need C to be done.
  The frontend shell (empty cards with loading skeletons) can be built first.

Can backend (B5, C backend) run before Python outputs exist?
  YES — AnalyticsController can return 404/empty if the JSON files don't exist yet.
  Build the backend endpoints first, test them with static fixture JSON,
  then replace with real Python outputs.
```

---

## Estimated Time per Stage

| Stage | Python work | Backend work | Frontend work | Total |
|---|---|---|---|---|
| A — Features | 3–4 h | — | — | 3–4 h |
| B — Model | 3–4 h | 2 h | — | 5–6 h |
| C — Diagnostics | 3 h | 2 h | — | 5 h |
| D — Explainability + Charts | 1 h | 0.5 h | 4–5 h | 5.5–6.5 h |
| **Total** | | | | **~19–22 h** |

At 4–6 hours of focused daily build time, this is 4–5 days of work.
That aligns with the original Phase 1 window (Aug 3–9). Given today is Day 9,
Stage A should be done or nearly done. The plan adjusts: finish A today,
run B and C in parallel over 1–2 days, polish D before Day 11.

---

## Pre-flight Checklist Before Starting

Run these before writing any new code:

```bash
# From sentinel/ directory
cd /home/kakito/Documents/PLP-FTG/sentinel

# 1 — Confirm existing tests still pass
pytest tests/ -v

# 2 — Confirm the warehouse has the three input Parquet files
ls data/warehouse/fact_incidents.parquet
ls data/warehouse/fact_audits.parquet
ls data/warehouse/fact_telemetry.parquet

# 3 — Confirm dim_site has 7 rows
python3 -c "import pandas as pd; df=pd.read_csv('data/raw/dim_site.csv'); print(df[['site_id','site_name']])"

# 4 — Confirm new packages install cleanly
pip install scikit-learn==1.5.2 joblib==1.4.2 lifelines==0.29.0 scipy==1.14.1 --dry-run
```

If any of the above fail, fix those before writing features.py.
The pipeline inputs must be solid before building features on top of them.

---

## Three Numbers That Must Exist Before the Pitch

These are sourced from Stage B and Stage C outputs.
Lock them down as soon as the stages are done.
They go on the Evidence Slide.

| Number | Source | Target value |
|---|---|---|
| Model precision | `backtest_report.json` | ≥ 0.65 (document whatever it is) |
| Model recall | `backtest_report.json` | ≥ 0.60 (document whatever it is) |
| EWMA lead time (days) | `control_chart_data.json` | ≥ 3 days (based on synthetic generator spike pattern) |
| KM closure gap | `survival_curve_data.json` | High-risk median vs fleet median ratio |
| Correlation r | `correlation_data.json` | > 0.70 (based on how the generator was seeded) |

The synthetic data generator seeds site-003 and site-006 with deliberately
degraded patterns, so these targets are realistic. But document whatever the
model actually achieves — do not round up or omit unflattering numbers.
Honesty here is a larger credibility asset than a good-looking number you
can't defend under Q&A.
