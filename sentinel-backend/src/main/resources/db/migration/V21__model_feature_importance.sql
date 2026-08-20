-- V21: Store feature importance JSON per model version in model_registry
-- Enables champion-vs-challenger explainability diff in the ML Admin Compare page.
-- Shape mirrors the existing feature_importance.json warehouse artifact:
--   { "featureName": weight_as_float, ... }
-- Populated when a training run completes (via POST /api/ml/training-run body).

ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS feature_importance TEXT NULL;

-- Backfill the seeded champion (logreg_v1) with the known feature importance values
-- from sentinel/data/warehouse/feature_importance.json
UPDATE model_registry
SET feature_importance = '{
  "audit_finding_open_count": 0.952,
  "days_since_last_audit": 0.21,
  "incident_rate_90d": 0.18,
  "rejection_rate": 0.09,
  "asset_age_years": 0.08
}'
WHERE id = '00000000-0000-0000-0000-000000000001';
