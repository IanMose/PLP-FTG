-- V31: Site feature snapshot table — consumed by retrain.py and predict.py
-- Populated by Python features.py on each pipeline run.
-- This table enables the ML loop to read features directly from the database
-- instead of relying on file-based handoff.

CREATE TABLE IF NOT EXISTS fact_site_features (
    site_id                     VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    as_of_date                  DATE          NOT NULL,
    days_since_last_audit       INTEGER,
    rejection_rate_7d           NUMERIC(7,4),
    rejection_rate_30d          NUMERIC(7,4),
    incident_count_30d          INTEGER,
    incident_severity_score_30d NUMERIC(7,4),
    pressure_anomaly_count_14d  INTEGER,
    audit_finding_open_count    INTEGER,
    -- V4 additions (null until tank telemetry data exists):
    tank_overfill_events_7d     INTEGER,
    avg_tank_level_pct_7d       NUMERIC(5,2),
    computed_at                 TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (site_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_site_features_date
    ON fact_site_features(as_of_date DESC);

COMMENT ON TABLE fact_site_features IS 'Daily site feature snapshots for ML model training and scoring. Populated by Python ETL.';
