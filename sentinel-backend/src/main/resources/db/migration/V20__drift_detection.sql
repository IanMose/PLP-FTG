-- V20: Model performance snapshots for drift detection
-- Computed by a daily @Scheduled job in DriftDetectionService.
-- Stores both 'baseline' (first 30 feedback rows after promotion) and
-- 'recent' (rolling most-recent 30 feedback rows) windows per model.

CREATE TABLE IF NOT EXISTS model_performance_snapshot (
    id                  VARCHAR(36)   PRIMARY KEY,
    model_registry_id   VARCHAR(36)   NOT NULL REFERENCES model_registry(id),
    window_type         VARCHAR(20)   NOT NULL,
    -- 'baseline' | 'recent'
    accuracy            NUMERIC(6,4)  NOT NULL,
    precision_score     NUMERIC(6,4)  NULL,
    recall_score        NUMERIC(6,4)  NULL,
    f1_score            NUMERIC(6,4)  NULL,
    sample_size         INT           NOT NULL,
    computed_at         TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mps_model       ON model_performance_snapshot(model_registry_id);
CREATE INDEX IF NOT EXISTS idx_mps_window      ON model_performance_snapshot(window_type);
CREATE INDEX IF NOT EXISTS idx_mps_computed_at ON model_performance_snapshot(computed_at);
