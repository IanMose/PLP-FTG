-- V16: ML HITL tables — model_feedback, model_registry, training_run

CREATE TABLE IF NOT EXISTS model_feedback (
    id            VARCHAR(36)  PRIMARY KEY,
    prediction_id BIGINT       NULL REFERENCES fact_predictions(id),
    site_id       VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    source        VARCHAR(50)  NOT NULL,
    rating        VARCHAR(20)  NOT NULL,
    note          TEXT         NULL,
    reviewer_id   BIGINT       NULL REFERENCES app_user(id),
    created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_feedback_site   ON model_feedback(site_id);
CREATE INDEX IF NOT EXISTS idx_feedback_source ON model_feedback(source);

CREATE TABLE IF NOT EXISTS model_registry (
    id              VARCHAR(36)  PRIMARY KEY,
    version         VARCHAR(100) NOT NULL,
    algorithm       VARCHAR(100) NOT NULL,
    trained_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    precision_score DECIMAL(5,4) NULL,
    recall_score    DECIMAL(5,4) NULL,
    f1_score        DECIMAL(5,4) NULL,
    status          VARCHAR(50)  NOT NULL DEFAULT 'challenger',
    artifact_path   TEXT         NOT NULL,
    approved_by     BIGINT       NULL REFERENCES app_user(id),
    approved_at     TIMESTAMP    NULL,
    notes           TEXT         NULL
);

CREATE TABLE IF NOT EXISTS training_run (
    id                VARCHAR(36)  PRIMARY KEY,
    model_registry_id VARCHAR(36)  NOT NULL REFERENCES model_registry(id),
    triggered_by      VARCHAR(50)  NOT NULL,
    rows_used         INT          NOT NULL DEFAULT 0,
    feedback_rows_used INT         NOT NULL DEFAULT 0,
    started_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at      TIMESTAMP    NULL,
    notes             TEXT         NULL
);

-- Seed the existing logreg_v1 as the current champion
INSERT INTO model_registry (id, version, algorithm, trained_at,
    precision_score, recall_score, f1_score, status, artifact_path)
VALUES ('00000000-0000-0000-0000-000000000001',
    'logreg_v1', 'logistic_regression', CURRENT_TIMESTAMP,
    0.6190, 0.6770, 0.6470, 'champion', 'sentinel/models/logreg_v1.pkl');
