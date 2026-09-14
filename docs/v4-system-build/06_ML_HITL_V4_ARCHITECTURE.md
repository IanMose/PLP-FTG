# 06 — ML + HITL V4 Architecture

---

## 1. Current State Summary

The HITL platform has a complete UI and a complete database schema, but the ML execution layer is incomplete:

| Component | Status |
|---|---|
| `model_feedback` table | ✅ Implemented (V16) |
| `model_registry` table | ✅ Implemented (V16) — seeded with `logreg_v1` |
| `training_run` table | ✅ Implemented (V16) |
| `retraining_schedule` table | ✅ Implemented (V19) |
| `model_performance_snapshot` table | ✅ Implemented (V20) |
| ML Admin UI (5 pages) | ✅ Implemented |
| Feedback collection (rating + CAPA closure) | ✅ Implemented |
| Champion promote / reject / rollback | ✅ Implemented |
| Drift detection (`DriftDetectionService`) | ✅ Implemented |
| `src/retrain.py` | ❌ **Does not exist** |
| `predict.py` reads champion from registry | ❌ **Hardcoded path** |
| `POST /api/ml/training-run` | ❌ **Missing endpoint** |
| `POST /api/ml/model-registry` (register new model) | ❌ **Missing endpoint** |
| End-to-end feedback → retrain → promote → predict loop | ❌ **Broken** |

---

## 2. V4 ML Lifecycle Design

The V4 lifecycle closes the loop that is currently broken:

```
Operational Data (fact_incidents, fact_audits, fact_environmental, fact_tank_telemetry)
        │
        ▼
Feature Engineering (features.py → fact_site_features view / snapshot)
        │
        ▼
Prediction (predict.py → reads champion from model_registry → fact_predictions)
        │
        ▼
Risk Detection (AlertRulesEngine → alerts, event_log)
        │
        ▼
Human Review:
    ├─ Direct rating: ML Admin Feedback Queue → model_feedback (source='human_review')
    └─ Indirect: CAPA closure → model_feedback (source='capa_outcome')
        │
        ▼
Feedback Dataset (model_feedback table)
        │
        ▼
Retraining Trigger:
    ├─ Manual: "Retrain Now" button → POST /api/ml/trigger-retrain
    └─ Scheduled: retraining_schedule.next_run_at reached → same trigger
        │
        ▼
retrain.py:
    ├─ Fetch feedback from PostgreSQL
    ├─ Join with fact_site_features (current features)
    ├─ Filter to labeled rows only (rating != 'uncertain')
    ├─ Train LogisticRegression on enriched dataset
    ├─ Evaluate on fixed holdout set (same time-based split as original)
    ├─ Save challenger PKL artifact
    ├─ POST /api/ml/model-registry → register challenger (status='challenger')
    └─ POST /api/ml/training-run  → record training run
        │
        ▼
ML Admin Portal — Compare & Approve:
    ├─ Side-by-side metrics (Precision / Recall / F1)
    ├─ Feature importance diff (champion vs challenger)
    ├─ Human clicks "Approve & Promote" → PATCH /api/ml/model-registry/{id}/promote
    └─ (or) Human clicks "Reject" → challenger status='rejected', champion unchanged
        │
        ▼
Champion Updated in model_registry
        │
        ▼
predict.py (next run):
    └─ SELECT artifact_path FROM model_registry WHERE status='champion'
       → load new PKL → new predictions → fact_predictions
        │
        ▼
DriftDetectionService (daily scheduled job):
    ├─ Compute baseline accuracy (first 30 feedback rows after last promotion)
    ├─ Compute recent accuracy (most recent 30 feedback rows)
    ├─ INSERT INTO model_performance_snapshot
    └─ If |baseline - recent| > threshold → drift banner in ML Admin Overview
```

---

## 3. Model Registry Design

### 3.1 Lifecycle States

```
                     ┌──────────────┐
  retrain.py         │  challenger  │
  registers ─────────►             │
                     └──────┬───────┘
                            │  human approves
                            ▼
                     ┌──────────────┐    human approves
 was champion ──────►   archived   │◄── new challenger
                     └──────┬───────┘
                            │  rollback
                            ▼
                     ┌──────────────┐
                     │   champion   │ (only one at a time)
                     └──────┬───────┘
                            │  human rejects
                            ▼
                     ┌──────────────┐
                     │   rejected   │ (terminal — no transitions out)
                     └──────────────┘
```

**Invariants enforced by `MlAdminController`:**
- Exactly one row has `status = 'champion'` at all times.
- At most one row has `status = 'challenger'` at any time.
- `PATCH /promote` atomically: sets challenger → champion AND current champion → archived.
- `PATCH /rollback` atomically: sets archived → champion AND current champion → archived.
- Neither operation auto-promotes — human click always required.

### 3.2 New Backend Endpoints Required

```
POST /api/ml/model-registry
    Body: { version, algorithm, precision_score, recall_score, f1_score,
            artifact_path, feature_importance (JSON string), notes }
    Auth: ML_ADMIN or SERVICE (Python retrain.py uses a service token)
    Response: 201 Created + { id, status:'challenger' }

POST /api/ml/training-run
    Body: { model_registry_id, triggered_by, rows_used, feedback_rows_used,
            started_at, completed_at, notes }
    Auth: ML_ADMIN or SERVICE
    Response: 201 Created + { id }

POST /api/ml/trigger-retrain
    Body: {} (empty — server side decides parameters)
    Auth: ML_ADMIN
    Effect: sets retraining_schedule.status='running', then invokes retrain.py
            (subprocess call on same host, or GitHub Actions workflow dispatch)
    Response: 202 Accepted + { message: "Retraining started" }

GET /api/ml/feedback-export
    Query params: ?min_rating_count=10&exclude_uncertain=true
    Auth: SERVICE (Python retrain.py)
    Response: array of { site_id, prediction_id, rating, created_at }
```

---

## 4. `src/retrain.py` Design

### 4.1 Module Outline

```python
"""
sentinel/src/retrain.py
=======================
Trains a challenger logistic regression model using accumulated model_feedback
joined with fact_site_features.

Invoked by:
    python -m src.retrain                    # manual trigger
    [via POST /api/ml/trigger-retrain]       # from ML Admin "Retrain Now" button

Outputs:
    models/logreg_v{N}.pkl                   # challenger artifact
    Registers via: POST /api/ml/model-registry
                   POST /api/ml/training-run
"""
```

### 4.2 Data Sources

```python
# 1. Existing labeled feature rows (from original synthetic dataset)
base_features = pd.read_parquet("data/warehouse/fact_site_features.parquet")

# 2. Human feedback labels (from PostgreSQL via API)
feedback = requests.get(f"{API_BASE}/api/ml/feedback-export",
                        headers={"X-Service-Token": SERVICE_TOKEN}).json()
feedback_df = pd.DataFrame(feedback)

# 3. Join: match feedback to feature snapshots by (site_id, nearest as_of_date)
# Feedback 'rating' maps to label: accurate=keep original, inaccurate=flip, uncertain=drop
enriched = merge_feedback_with_features(base_features, feedback_df)
```

### 4.3 Training Logic

```python
FEATURES = [
    "days_since_last_audit",
    "rejection_rate_7d",
    "rejection_rate_30d",
    "incident_count_30d",
    "incident_severity_score_30d",
    "pressure_anomaly_count_14d",
    "audit_finding_open_count",
    # V4 additions if tank telemetry features exist:
    # "tank_overfill_events_7d",
    # "avg_tank_level_pct_7d",
]

# Same time-based train/test split as predict.py
train = enriched[enriched.as_of_date < TRAIN_CUTOFF]
test  = enriched[enriched.as_of_date >= TRAIN_CUTOFF]

pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("model",  LogisticRegression(class_weight="balanced", max_iter=1000)),
])
pipeline.fit(train[FEATURES], train["label"])

# Evaluate on holdout
y_pred = pipeline.predict(test[FEATURES])
metrics = {
    "precision": precision_score(test["label"], y_pred),
    "recall":    recall_score(test["label"], y_pred),
    "f1":        f1_score(test["label"], y_pred),
}

# Compute feature importance (absolute logistic regression coefficients, normalised)
coefs = np.abs(pipeline["model"].coef_[0])
feature_importance = dict(zip(FEATURES, (coefs / coefs.sum()).round(3).tolist()))
```

### 4.4 Registration

```python
# Determine next version number from registry
existing = requests.get(f"{API_BASE}/api/ml/model-registry").json()
version = f"logreg_v{len(existing) + 1}"

artifact_path = f"sentinel/models/{version}.pkl"
joblib.dump(pipeline, artifact_path)

# Register challenger
response = requests.post(f"{API_BASE}/api/ml/model-registry", json={
    "version":          version,
    "algorithm":        "logistic_regression",
    "precision_score":  metrics["precision"],
    "recall_score":     metrics["recall"],
    "f1_score":         metrics["f1"],
    "artifact_path":    artifact_path,
    "feature_importance": json.dumps(feature_importance),
    "notes":            f"Trained on {len(train)} rows + {len(feedback_df)} feedback rows",
}, headers={"X-Service-Token": SERVICE_TOKEN})

model_id = response.json()["id"]

# Register training run
requests.post(f"{API_BASE}/api/ml/training-run", json={
    "model_registry_id":  model_id,
    "triggered_by":       "manual",
    "rows_used":          len(train),
    "feedback_rows_used": len(feedback_df),
    "completed_at":       datetime.utcnow().isoformat(),
    "notes":              f"Challenger {version} registered. F1={metrics['f1']:.3f}",
}, headers={"X-Service-Token": SERVICE_TOKEN})
```

---

## 5. `src/predict.py` Champion Selection Fix

**Current (broken):**
```python
MODEL_PATH = Path("models/logreg_v1.pkl")   # hardcoded
```

**V4 fix:**
```python
def load_champion_model(api_base: str, service_token: str):
    """Load the current champion model artifact from the model registry."""
    resp = requests.get(
        f"{api_base}/api/ml/model-registry",
        headers={"X-Service-Token": service_token}
    )
    registry = resp.json()
    champion = next((m for m in registry if m["status"] == "champion"), None)
    if champion is None:
        raise RuntimeError("No champion model found in registry")
    artifact_path = Path(champion["artifact_path"])
    if not artifact_path.exists():
        raise RuntimeError(f"Champion artifact not found at {artifact_path}")
    return joblib.load(artifact_path), champion["version"]
```

---

## 6. Drift Detection Design (Current + V4 Enhancement)

### 6.1 Current Implementation

`DriftDetectionService` (Spring Boot) runs on a daily `@Scheduled` job:
1. Reads `model_feedback` rows for the current champion.
2. Computes **baseline accuracy**: first 30 feedback rows after the champion's `approved_at`.
3. Computes **recent accuracy**: most recent 30 feedback rows.
4. Inserts two rows into `model_performance_snapshot` (window_type = 'baseline' | 'recent').
5. Returns drift status: `ok` if |baseline - recent| < 5%; `warning` if 5–15%; `critical` if > 15%.

### 6.2 V4 Enhancements

| Enhancement | Why |
|---|---|
| Minimum sample size check | Do not report drift if < 10 feedback rows — insufficient data for meaningful drift |
| Prediction confidence trend | Track average `confidence_band` distribution per week — a shift from 'confident' to 'uncertain' is an early drift signal without needing ground-truth labels |
| Feature distribution monitoring | Simple mean/stddev of 7 features per week stored in `model_performance_snapshot`; flag if any feature drifts > 2 stddev from baseline |
| Auto-suggest retrain | When `driftStatus = 'critical'`, the ML Admin Overview shows a "Drift Critical — Consider Retraining" call-to-action button alongside the drift banner |

### 6.3 What Drift Detection Does NOT Do in V4

- **No auto-promotion.** Drift detection raises a flag; a human decides whether to retrain and promote.
- **No automatic model rollback.** Rollback is always a deliberate human action.
- **No per-feature SHAP monitoring.** SHAP per-prediction requires inference-time scoring which is not part of V4's batch architecture.

---

## 7. HITL Feedback Quality

### 7.1 Feedback Sources

| Source | Trigger | Quality |
|---|---|---|
| `human_review` (ML Admin Feedback Queue) | Reviewer rates a prediction | High — deliberate, explicit |
| `capa_outcome` (CAPA closure) | CAPA verified and closed | High — outcome-confirmed |
| `uncertain` ratings | Reviewer clicks "Uncertain" | Low — excluded from training |

### 7.2 Label Mapping for Retraining

| `model_feedback.rating` | Training label |
|---|---|
| `accurate` | Keep original label (no change to ground truth) |
| `inaccurate` | Flip original label (was 0 → use 1, was 1 → use 0) |
| `uncertain` | Drop row from training set |

### 7.3 Minimum Feedback Threshold

`retrain.py` checks: if `len(usable_feedback_rows) < 5`, log a warning and exit without training:
```
Insufficient feedback for retraining (n=3, minimum=5).
Collect more ratings in the Feedback Queue before retraining.
```

This prevents training on noise from a single reviewer's session.

---

## 8. HITL Portal — V4 UI Improvements

| Page | Current State | V4 Improvement |
|---|---|---|
| Overview | Shows champion/challenger cards + drift banner | Add "Trigger Retrain" shortcut when drift is critical; show feedback count since last retrain |
| Feedback Queue | Lists predictions sorted by confidence (uncertain first) | Add filter by site, date range; show CAPA outcome badges alongside ratings |
| Registry | Compare metrics + feature importance diff + promote/reject/rollback | Add retrain lineage: "Trained on N feedback rows (X accurate, Y inaccurate)" visible on each challenger |
| Training Runs | History table + manual trigger | Show trigger source (manual / schedule / drift_threshold); link each run to its `model_registry` row |
| Drift Monitor | Baseline vs recent accuracy chart | Add prediction confidence distribution trend; add auto-suggest retrain CTA on critical drift |
| Retraining Schedule | Enable/disable + cadence | Show `next_run_at`; show `last_run_id` with link to training run |

---

## 9. ML Security

| Concern | V4 Control |
|---|---|
| Unauthorised model promotion | `@PreAuthorize("hasRole('ML_ADMIN')")` on `/promote`, `/reject`, `/rollback`, `/trigger-retrain` |
| Rogue challenger registration | `POST /api/ml/model-registry` requires SERVICE token (separate from JWT) — only `retrain.py` holds this token |
| Artifact tampering | `model_registry.artifact_path` is immutable after registration; checksum stored in `notes` field |
| Feedback poisoning | Feedback is per-reviewer; `reviewer_id` stored; anomalous single-reviewer mass-rating is detectable |
| Model rollback abuse | Rollback requires `ML_ADMIN` role; all promotions/rollbacks logged with `approved_by` + `approved_at` |

---

## 10. Recommended V4 Implementation Order (ML/HITL)

| Step | Task | Priority |
|---|---|---|
| 1 | Add `POST /api/ml/model-registry` endpoint | P0 |
| 2 | Add `POST /api/ml/training-run` endpoint | P0 |
| 3 | Add `GET /api/ml/feedback-export` endpoint | P0 |
| 4 | Add `POST /api/ml/trigger-retrain` endpoint | P0 |
| 5 | Implement `src/retrain.py` | P0 |
| 6 | Fix `src/predict.py` champion selection from registry | P0 |
| 7 | Add SERVICE_TOKEN env var to Python layer + backend config | P0 |
| 8 | Add minimum feedback threshold check in retrain.py | P1 |
| 9 | Tank telemetry features in features.py (after Feature 1 data exists) | P1 |
| 10 | Drift detection V4 enhancements (confidence trend, min sample check) | P2 |
| 11 | HITL Portal UI improvements (feedback count, retrain lineage) | P2 |
