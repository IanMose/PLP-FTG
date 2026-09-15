-- =============================================================================
-- SENTINEL DATABASE BASELINE SCHEMA
-- =============================================================================
-- Generated: 2026-09-15
-- Consolidates all previous migrations (V1-V37) into a single idempotent baseline.
-- 
-- IDEMPOTENT: All statements use IF NOT EXISTS / IF EXISTS patterns.
-- Safe to run multiple times on existing databases.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- CORE TABLES (from V1)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dim_site (
    site_id       VARCHAR(50)  PRIMARY KEY,
    site_name     VARCHAR(200) NOT NULL,
    location      VARCHAR(200),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    -- KPC-specific site metadata
    station_type  VARCHAR(50),
    region        VARCHAR(100),
    criticality   VARCHAR(30),
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    is_active     BOOLEAN      DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS fact_incidents (
    incident_id         VARCHAR(50)  PRIMARY KEY,
    site_id             VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    incident_date       TIMESTAMP    NOT NULL,
    severity            VARCHAR(20)  NOT NULL,
    description         TEXT,
    compliance_score    INTEGER,
    status              VARCHAR(30),
    closed_date         TIMESTAMP,
    decision            VARCHAR(20)  NOT NULL,
    decision_reason     TEXT,
    batch_id            VARCHAR(50),
    ingestion_timestamp TIMESTAMP,
    latitude            DOUBLE PRECISION,
    longitude           DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS fact_audits (
    audit_id            VARCHAR(50)  PRIMARY KEY,
    site_id             VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    inspection_date     TIMESTAMP    NOT NULL,
    auditor             VARCHAR(100),
    findings            TEXT,
    compliance_score    INTEGER,
    follow_up_required  BOOLEAN      DEFAULT FALSE,
    closed_date         TIMESTAMP,
    decision            VARCHAR(20),
    decision_reason     TEXT,
    batch_id            VARCHAR(50),
    ingestion_timestamp TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingest_log (
    id                  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    batch_id            VARCHAR(50)  NOT NULL UNIQUE,
    source_filename     VARCHAR(255) NOT NULL,
    row_count           INTEGER      NOT NULL,
    sha256_checksum     VARCHAR(64)  NOT NULL,
    ingestion_timestamp TIMESTAMP    NOT NULL,
    trusted_count       INTEGER      DEFAULT 0,
    corrected_count     INTEGER      DEFAULT 0,
    review_count        INTEGER      DEFAULT 0,
    rejected_count      INTEGER      DEFAULT 0
);

CREATE TABLE IF NOT EXISTS alerts (
    id                          VARCHAR(50)  PRIMARY KEY,
    site_id                     VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    severity                    VARCHAR(50)  NOT NULL,
    status                      VARCHAR(50)  NOT NULL DEFAULT 'active',
    title                       VARCHAR(500) NOT NULL,
    description                 TEXT,
    rule                        VARCHAR(200),
    record_ids                  TEXT,
    created_at                  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at             TIMESTAMP,
    acknowledged_by             VARCHAR(100),
    narrative                   TEXT,
    narrative_updated_at        TIMESTAMP,
    narrative_snapshot          TEXT,
    narrative_incident_count    BIGINT       DEFAULT 0,
    required_qualification      VARCHAR(100)
);

-- Core indexes
CREATE INDEX IF NOT EXISTS idx_incidents_site_date ON fact_incidents(site_id, incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_decision ON fact_incidents(decision);
CREATE INDEX IF NOT EXISTS idx_audits_site_date ON fact_audits(site_id, inspection_date);
CREATE INDEX IF NOT EXISTS idx_alerts_site ON alerts(site_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_ingest_log_timestamp ON ingest_log(ingestion_timestamp);

-- ─────────────────────────────────────────────────────────────────────────────
-- USER MANAGEMENT (from V3)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS app_role (
    id          BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(50)  NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_user (
    id             BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(150) NOT NULL,
    email          VARCHAR(255) NOT NULL UNIQUE,
    password_hash  VARCHAR(255) NOT NULL,
    role_id        BIGINT       NOT NULL REFERENCES app_role(id),
    status         VARCHAR(30)  NOT NULL DEFAULT 'Active',
    joined_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_app_user_email ON app_user(email);
CREATE INDEX IF NOT EXISTS idx_app_user_role ON app_user(role_id);
CREATE INDEX IF NOT EXISTS idx_app_user_status ON app_user(status);

-- ─────────────────────────────────────────────────────────────────────────────
-- TELEMETRY (from V5)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fact_telemetry (
    reading_id           VARCHAR(50)  PRIMARY KEY,
    timestamp            TIMESTAMP    NOT NULL,
    site                 VARCHAR(50)  NOT NULL,
    pipeline_section     VARCHAR(100),
    pressure_psi         DOUBLE PRECISION,
    flow_rate_bph        DOUBLE PRECISION,
    temperature_celsius  DOUBLE PRECISION,
    valve_status         VARCHAR(30),
    sensor_id            VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_telemetry_site_ts ON fact_telemetry(site, timestamp);
CREATE INDEX IF NOT EXISTS idx_telemetry_pressure ON fact_telemetry(pressure_psi);

-- ─────────────────────────────────────────────────────────────────────────────
-- CORRIDOR ASSETS (from V6)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dim_asset (
    asset_id                   VARCHAR(20)  PRIMARY KEY,
    asset_type                 VARCHAR(30)  NOT NULL,
    nearest_site_code          VARCHAR(20)  REFERENCES dim_site(site_id),
    segment                    VARCHAR(100),
    chainage_km_approx         NUMERIC(6,1),
    latitude                   NUMERIC(9,6) NOT NULL,
    longitude                  NUMERIC(9,6) NOT NULL,
    flood_landslide_risk_zone  VARCHAR(30),
    sensor_suite               VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS fact_environmental (
    reading_id           VARCHAR(20)  PRIMARY KEY,
    asset_id             VARCHAR(20)  REFERENCES dim_asset(asset_id),
    reading_timestamp    TIMESTAMP    NOT NULL,
    pressure_psi         NUMERIC(6,1),
    flow_rate_bph        NUMERIC(8,1),
    temperature_celsius  NUMERIC(5,1),
    rainfall_mm          NUMERIC(5,2),
    status               VARCHAR(20)
);

CREATE INDEX IF NOT EXISTS idx_fact_env_asset_time ON fact_environmental(asset_id, reading_timestamp);

-- ─────────────────────────────────────────────────────────────────────────────
-- ML PIPELINE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Model Registry
CREATE TABLE IF NOT EXISTS model_registry (
    model_id        VARCHAR(50)   PRIMARY KEY,
    model_name      VARCHAR(100)  NOT NULL,
    version         VARCHAR(20)   NOT NULL,
    training_date   TIMESTAMP     NOT NULL,
    metrics         JSONB,
    artifact_path   VARCHAR(500),
    artifact_blob   TEXT,
    status          VARCHAR(20)   NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ML Predictions
CREATE TABLE IF NOT EXISTS fact_predictions (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id       VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    as_of_date    DATE         NOT NULL,
    probability   NUMERIC(7,4) NOT NULL,
    model_version VARCHAR(50),
    top_features  TEXT,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_predictions_site_date UNIQUE (site_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_predictions_site_date ON fact_predictions(site_id, as_of_date DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_site_date_desc ON fact_predictions(site_id, as_of_date DESC);

-- Model Feedback (HITL)
CREATE TABLE IF NOT EXISTS model_feedback (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id         VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    prediction_date DATE         NOT NULL,
    original_score  NUMERIC(7,4) NOT NULL,
    adjusted_score  NUMERIC(7,4),
    rating          VARCHAR(20)  NOT NULL,
    comment         TEXT,
    source          VARCHAR(50)  NOT NULL DEFAULT 'human',
    created_by      VARCHAR(100),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_site ON model_feedback(site_id);
CREATE INDEX IF NOT EXISTS idx_feedback_site_source_rating ON model_feedback(site_id, source, rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON model_feedback(created_at DESC);

-- Retraining Schedule
CREATE TABLE IF NOT EXISTS retraining_schedule (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_name      VARCHAR(100) NOT NULL,
    schedule_type   VARCHAR(30)  NOT NULL,
    cron_expression VARCHAR(50),
    last_run        TIMESTAMP,
    next_run        TIMESTAMP,
    status          VARCHAR(20)  DEFAULT 'active',
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

-- Drift Detection
CREATE TABLE IF NOT EXISTS drift_detection (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id        VARCHAR(50)  NOT NULL REFERENCES model_registry(model_id),
    detection_date  DATE         NOT NULL,
    drift_score     NUMERIC(7,4) NOT NULL,
    drift_type      VARCHAR(30),
    features_affected TEXT,
    action_taken    VARCHAR(100),
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_drift_model ON drift_detection(model_id);

-- Feature Importance
CREATE TABLE IF NOT EXISTS model_feature_importance (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    model_id        VARCHAR(50)  NOT NULL REFERENCES model_registry(model_id),
    feature_name    VARCHAR(100) NOT NULL,
    importance      NUMERIC(7,4) NOT NULL,
    rank            INTEGER,
    created_at      TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feature_model ON model_feature_importance(model_id);

-- Site Features Snapshot
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
    tank_overfill_events_7d     INTEGER,
    avg_tank_level_pct_7d       NUMERIC(5,2),
    computed_at                 TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (site_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_site_features_date ON fact_site_features(as_of_date DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- HSE TABLES
-- ─────────────────────────────────────────────────────────────────────────────

-- Hazard Reports
CREATE TABLE IF NOT EXISTS hazard_report (
    id                  VARCHAR(36)   PRIMARY KEY,
    site_id             VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    reported_by         BIGINT        NOT NULL REFERENCES app_user(id),
    category            VARCHAR(50)   NOT NULL,
    description         TEXT          NOT NULL,
    location_detail     VARCHAR(255),
    risk_level          VARCHAR(20)   NOT NULL DEFAULT 'medium',
    status              VARCHAR(30)   NOT NULL DEFAULT 'open',
    assigned_to         BIGINT        REFERENCES app_user(id),
    resolved_at         TIMESTAMP,
    resolution_notes    TEXT,
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    report_type         VARCHAR(20)   NOT NULL DEFAULT 'hazard'
);

CREATE INDEX IF NOT EXISTS idx_hazard_site ON hazard_report(site_id);
CREATE INDEX IF NOT EXISTS idx_hazard_status ON hazard_report(status);
CREATE INDEX IF NOT EXISTS idx_hazard_assigned ON hazard_report(assigned_to);

-- CAPA (Corrective and Preventive Actions)
CREATE TABLE IF NOT EXISTS capa (
    id                  VARCHAR(36)   PRIMARY KEY,
    source_type         VARCHAR(30)   NOT NULL,
    source_id           VARCHAR(50)   NOT NULL,
    site_id             VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    finding_summary     TEXT          NOT NULL,
    root_cause          TEXT,
    corrective_action   TEXT,
    preventive_action   TEXT,
    assigned_to         BIGINT        REFERENCES app_user(id),
    status              VARCHAR(30)   NOT NULL DEFAULT 'open',
    priority            VARCHAR(20)   NOT NULL DEFAULT 'medium',
    due_date            DATE,
    completed_at        TIMESTAMP,
    verified_by         BIGINT        REFERENCES app_user(id),
    verified_at         TIMESTAMP,
    created_by          BIGINT        NOT NULL REFERENCES app_user(id),
    created_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    requires_work_order BOOLEAN       NOT NULL DEFAULT FALSE,
    escalated_at        TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capa_site ON capa(site_id);
CREATE INDEX IF NOT EXISTS idx_capa_status ON capa(status);
CREATE INDEX IF NOT EXISTS idx_capa_source ON capa(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_capa_assigned ON capa(assigned_to);

-- Technicians
CREATE TABLE IF NOT EXISTS technician (
    id              BIGSERIAL PRIMARY KEY,
    app_user_id     BIGINT NOT NULL REFERENCES app_user(id),
    station_home_id VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_technician_user ON technician(app_user_id);

-- Technician Qualifications
CREATE TABLE IF NOT EXISTS technician_qualification (
    id                  BIGSERIAL PRIMARY KEY,
    technician_id       BIGINT NOT NULL REFERENCES technician(id),
    qualification_type  VARCHAR(100) NOT NULL,
    certificate_url     VARCHAR(500),
    expires_at          DATE
);

CREATE INDEX IF NOT EXISTS idx_tech_qual_technician ON technician_qualification(technician_id);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_order (
    id                      VARCHAR(36) PRIMARY KEY,
    site_id                 VARCHAR(50) NOT NULL REFERENCES dim_site(site_id),
    capa_id                 VARCHAR(36) REFERENCES capa(id),
    title                   VARCHAR(255) NOT NULL,
    description             TEXT,
    assigned_technician_id  BIGINT REFERENCES technician(id),
    status                  VARCHAR(50) NOT NULL DEFAULT 'open',
    priority                VARCHAR(20) NOT NULL DEFAULT 'medium',
    due_date                DATE,
    completed_at            TIMESTAMP,
    verified_by             BIGINT REFERENCES app_user(id),
    verified_at             TIMESTAMP,
    created_by              BIGINT NOT NULL REFERENCES app_user(id),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_work_order_site ON work_order(site_id);
CREATE INDEX IF NOT EXISTS idx_work_order_capa ON work_order(capa_id);
CREATE INDEX IF NOT EXISTS idx_work_order_status ON work_order(status);
CREATE INDEX IF NOT EXISTS idx_work_order_technician ON work_order(assigned_technician_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- TANK TELEMETRY (Control Plane)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fact_tank_telemetry (
    reading_id          VARCHAR(50)     PRIMARY KEY,
    site_id             VARCHAR(50)     NOT NULL REFERENCES dim_site(site_id),
    tank_id             VARCHAR(30)     NOT NULL,
    reading_timestamp   TIMESTAMP       NOT NULL,
    tank_level_pct      NUMERIC(5,2)    NOT NULL,
    temperature_celsius NUMERIC(5,2),
    pressure_psi        NUMERIC(7,2),
    flow_rate_lpm       NUMERIC(10,2),
    loading_operation_id VARCHAR(50),
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tank_telemetry_site_time 
    ON fact_tank_telemetry(site_id, reading_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tank_telemetry_loading 
    ON fact_tank_telemetry(loading_operation_id);

-- Event Log
CREATE TABLE IF NOT EXISTS event_log (
    event_id            VARCHAR(50)     PRIMARY KEY,
    event_type          VARCHAR(50)     NOT NULL,
    severity            VARCHAR(20)     NOT NULL,
    site_id             VARCHAR(20)     NOT NULL,
    tank_id             VARCHAR(30),
    signal_type         VARCHAR(50)     NOT NULL,
    signal_value        NUMERIC(10,4),
    threshold_value     NUMERIC(10,4),
    source_reading_id   VARCHAR(50),
    loading_operation_id VARCHAR(50),
    alert_id            VARCHAR(50),
    created_at          TIMESTAMP       NOT NULL,
    processed           BOOLEAN         DEFAULT FALSE,
    processed_at        TIMESTAMP,
    actuation_triggered BOOLEAN         DEFAULT FALSE,
    notification_sent   BOOLEAN         DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_event_site_time 
    ON event_log(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_unprocessed 
    ON event_log(processed, created_at);
CREATE INDEX IF NOT EXISTS idx_event_loading_op 
    ON event_log(loading_operation_id, event_type);

-- Actuation Log
CREATE TABLE IF NOT EXISTS actuation_log (
    actuation_id        VARCHAR(50)     PRIMARY KEY,
    event_id            VARCHAR(50)     NOT NULL REFERENCES event_log(event_id),
    site_id             VARCHAR(20)     NOT NULL,
    tank_id             VARCHAR(30),
    action_type         VARCHAR(50)     NOT NULL,
    action_status       VARCHAR(20)     NOT NULL,
    command_sent_at     TIMESTAMP       NOT NULL,
    command_acked_at    TIMESTAMP,
    latency_ms          INTEGER,
    operator_override   BOOLEAN         DEFAULT FALSE,
    override_reason     TEXT,
    created_at          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_actuation_event 
    ON actuation_log(event_id);
CREATE INDEX IF NOT EXISTS idx_actuation_site_time 
    ON actuation_log(site_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_incidents_severity_date 
    ON fact_incidents(severity, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_decision_date 
    ON fact_incidents(decision, incident_date DESC);

-- =============================================================================
-- END OF BASELINE SCHEMA
-- =============================================================================
