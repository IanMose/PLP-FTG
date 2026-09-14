# Sentinel Predictive Model — Improvements Summary

This document summarizes the improvements made to `src/predict.py` as part of the predictive model upgrade initiative.

## Changes Implemented

### 1. AUC-ROC Metric and Quality Gate
- **What:** Added `roc_auc_score` to model evaluation
- **Why:** AUC is a better metric for imbalanced classification than accuracy
- **Gate:** Training refuses to save if AUC < 0.55 (configurable via `MIN_ACCEPTABLE_AUC`)

### 2. Model Registry with Versioning
- **What:** Each training run produces a timestamped, git-sha-tagged artifact
- **Files:** `models/registry.json` tracks all versions and current pointer
- **Rollback:** Use `--rollback VERSION` to restore a previous model
- **List:** Use `--list-versions` to see all available models

### 3. XGBoost with Head-to-Head Comparison
- **What:** Trains both LogisticRegression and XGBClassifier
- **Selection:** Automatically picks the model with higher test AUC
- **Override:** Use `--force-logreg` or `--force-xgb` to skip comparison

### 4. SHAP Explainability
- **What:** Replaced manual `X_scaled * coef` decomposition with SHAP
- **Benefit:** Works for both linear and tree models
- **Output:** Same `top_features` JSON format, no API changes

### 5. Probability Calibration
- **What:** Applied `CalibratedClassifierCV` (sigmoid method) to winning model
- **Why:** `class_weight="balanced"` shifts probabilities away from empirical frequency
- **Result:** 0.70/0.40 thresholds now correspond to actual risk levels

## JSON Contract (Unchanged)

### predictions_export.json
```json
[
  {
    "site_id": "SITE-003",
    "as_of_date": "2026-08-01",
    "incident_probability_7d": 0.7234,
    "model_version": "20260913_143052_abc123",
    "top_features": "[{\"feature\": \"incident_severity_score_30d\", \"contribution\": 0.312}, ...]"
  }
]
```

### feature_importance.json
```json
{
  "model_version": "20260913_143052_abc123",
  "label_definition": "Any Critical incident in next 7 days",
  "features": [
    {"name": "incident_severity_score_30d", "importance": 0.28, "direction": "positive", "coefficient": 0.45}
  ]
}
```

## Future Work (Not Implemented)

### Feature Expansion (Priority 5)
- Blocked on: Inventory of available upstream signals from Stage A
- Candidates: flow rate anomalies, temperature readings, calendar features

### Feedback Loop (Priority 6)
- Blocked on: Data pipeline to log realized outcomes against past predictions
- Required: Table linking prediction_id → actual_incident (occurred/not)

### Drift Detection (Priority 8)
- Blocked on: Architecture decision — extend existing EWMA diagnostics or new module?
- Scope: Monitor feature distribution drift and calibration drift over time
