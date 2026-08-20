-- V15: Technician and qualification tables

CREATE TABLE IF NOT EXISTS technician (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    app_user_id     BIGINT      NOT NULL REFERENCES app_user(id),
    station_home_id VARCHAR(50) NULL REFERENCES dim_site(site_id)
);

CREATE TABLE IF NOT EXISTS technician_qualification (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    technician_id      BIGINT       NOT NULL REFERENCES technician(id),
    qualification_type VARCHAR(100) NOT NULL,
    certificate_url    TEXT         NULL,
    expires_at         DATE         NULL
);

CREATE INDEX IF NOT EXISTS idx_tech_user     ON technician(app_user_id);
CREATE INDEX IF NOT EXISTS idx_tq_technician ON technician_qualification(technician_id);
