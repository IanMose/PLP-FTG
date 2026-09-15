-- V1: Core tables migrated from Stage 1 DuckDB/Parquet warehouse
-- Keys and names frozen from Stage 1: site, date, incident_id, audit_id

CREATE TABLE dim_site (
    site_id       VARCHAR(50)  PRIMARY KEY,
    site_name     VARCHAR(200) NOT NULL,
    location      VARCHAR(200),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fact_incidents (
    incident_id      VARCHAR(50)  PRIMARY KEY,
    site_id          VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    incident_date    TIMESTAMP    NOT NULL,
    severity         VARCHAR(20)  NOT NULL,
    description      TEXT,
    compliance_score INTEGER,
    status           VARCHAR(30),
    closed_date      TIMESTAMP,
    decision         VARCHAR(20)  NOT NULL,
    decision_reason  TEXT,
    batch_id         VARCHAR(50),
    ingestion_timestamp TIMESTAMP
);

CREATE TABLE fact_audits (
    audit_id          VARCHAR(50)  PRIMARY KEY,
    site_id           VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    inspection_date   TIMESTAMP    NOT NULL,
    auditor           VARCHAR(100),
    findings          TEXT,
    compliance_score  INTEGER,
    follow_up_required BOOLEAN     DEFAULT FALSE,
    closed_date       TIMESTAMP,
    decision          VARCHAR(20),
    decision_reason   TEXT,
    batch_id          VARCHAR(50),
    ingestion_timestamp TIMESTAMP
);

CREATE TABLE ingest_log (
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

CREATE TABLE alerts (
    id                VARCHAR(50)  PRIMARY KEY,
    site_id           VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    severity          VARCHAR(20)  NOT NULL,
    status            VARCHAR(20)  NOT NULL DEFAULT 'active',
    title             VARCHAR(500) NOT NULL,
    description       TEXT,
    rule              VARCHAR(200),
    record_ids        TEXT,
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    acknowledged_at   TIMESTAMP,
    acknowledged_by   VARCHAR(100)
);

-- Indexes for common queries
CREATE INDEX idx_incidents_site_date ON fact_incidents(site_id, incident_date);
CREATE INDEX idx_incidents_decision ON fact_incidents(decision);
CREATE INDEX idx_audits_site_date ON fact_audits(site_id, inspection_date);
CREATE INDEX idx_alerts_site ON alerts(site_id);
CREATE INDEX idx_alerts_status ON alerts(status);
CREATE INDEX idx_ingest_log_timestamp ON ingest_log(ingestion_timestamp);
