-- Create technician and technician_qualification tables

CREATE TABLE IF NOT EXISTS technician (
    id BIGSERIAL PRIMARY KEY,
    app_user_id BIGINT NOT NULL REFERENCES app_user(id),
    station_home_id VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS technician_qualification (
    id BIGSERIAL PRIMARY KEY,
    technician_id BIGINT NOT NULL REFERENCES technician(id),
    qualification_type VARCHAR(100) NOT NULL,
    certificate_url VARCHAR(500),
    expires_at DATE
);

CREATE INDEX IF NOT EXISTS idx_technician_user ON technician(app_user_id);
CREATE INDEX IF NOT EXISTS idx_tech_qual_technician ON technician_qualification(technician_id);
