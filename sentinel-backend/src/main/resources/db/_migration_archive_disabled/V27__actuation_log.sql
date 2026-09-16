-- V24: Actuation log - simulated valve control audit trail (Stage 3 Feature 3)
-- Every valve control command (simulated or real) is logged here for compliance

CREATE TABLE IF NOT EXISTS actuation_log (
    actuation_id            VARCHAR(50)     PRIMARY KEY,
    event_id                VARCHAR(50)     REFERENCES event_log(event_id),
    site_id                 VARCHAR(20)     NOT NULL REFERENCES dim_site(site_id),
    tank_id                 VARCHAR(30),
    action                  VARCHAR(50)     NOT NULL DEFAULT 'CLOSE_VALVE',
    actuator_type           VARCHAR(30)     NOT NULL DEFAULT 'MOCK',
    status                  VARCHAR(30)     NOT NULL,
    latency_ms              INTEGER,
    request_timestamp       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    response_timestamp      TIMESTAMP,
    error_message           TEXT,
    triggered_by            VARCHAR(100),
    notes                   TEXT,
    
    CONSTRAINT chk_actuation_status CHECK (status IN ('simulated_success', 'simulated_failure', 'pending', 'timeout', 'error')),
    CONSTRAINT chk_actuator_type CHECK (actuator_type IN ('MOCK', 'SCADA', 'MANUAL'))
);

-- Index for event-to-actuation lookup
CREATE INDEX IF NOT EXISTS idx_actuation_log_event 
    ON actuation_log(event_id);

-- Index for site-specific actuation history
CREATE INDEX IF NOT EXISTS idx_actuation_log_site_time 
    ON actuation_log(site_id, request_timestamp DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_actuation_log_status 
    ON actuation_log(status, request_timestamp DESC);

COMMENT ON TABLE actuation_log IS 'Audit trail of all valve control commands - simulated in Stage 3, SCADA in production';
COMMENT ON COLUMN actuation_log.actuator_type IS 'MOCK = simulated actuator, SCADA = real KPC integration (future)';
COMMENT ON COLUMN actuation_log.status IS 'simulated_success indicates the mock actuator responded successfully';
COMMENT ON COLUMN actuation_log.notes IS 'Always includes disclaimer that this is a simulated actuator in Stage 3';
