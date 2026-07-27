-- V5: Schema corrections — align DB with JPA entities

-- Add coordinates to fact_incidents (IncidentEntity)
ALTER TABLE fact_incidents ADD COLUMN latitude  DOUBLE;
ALTER TABLE fact_incidents ADD COLUMN longitude DOUBLE;

-- Create fact_telemetry (TelemetryEntity)
CREATE TABLE fact_telemetry (
    reading_id           VARCHAR(50)  PRIMARY KEY,
    timestamp            TIMESTAMP    NOT NULL,
    site                 VARCHAR(50)  NOT NULL,
    pipeline_section     VARCHAR(100),
    pressure_psi         DOUBLE,
    flow_rate_bph        DOUBLE,
    temperature_celsius  DOUBLE,
    valve_status         VARCHAR(30),
    sensor_id            VARCHAR(50)
);

CREATE INDEX idx_telemetry_site_ts ON fact_telemetry(site, timestamp);
