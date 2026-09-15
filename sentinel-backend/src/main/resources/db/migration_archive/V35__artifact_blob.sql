-- V30: Store model PKL as base64 blob in model_registry
-- Prevents artifact loss when container filesystem is ephemeral (Render free tier)
-- TEXT chosen over BYTEA: base64 encoding makes it portable across JDBC drivers.
-- logreg_v1.pkl is ~5KB → ~7KB base64. Acceptable in a TEXT column.

ALTER TABLE model_registry
    ADD COLUMN IF NOT EXISTS artifact_blob TEXT NULL;

COMMENT ON COLUMN model_registry.artifact_blob IS 'Base64-encoded model artifact (PKL file). Used when filesystem is ephemeral.';
