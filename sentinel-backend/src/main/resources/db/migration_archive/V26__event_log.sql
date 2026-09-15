-- V23: Event log for the event-driven alert-to-action system (Stage 3 Feature 2)
-- Every threshold breach, anomaly detection, or automation trigger is recorded here

CREATE TABLE IF NOT EXISTS event_log (
    event_id                VARCHAR(50)     PRIMARY KEY,
    event_type              VARCHAR(50)     NOT NULL,
    severity                VARCHAR(20)     NOT NULL,
    site_id                 VARCHAR(20)     NOT NULL REFERENCES dim_site(site_id),
    tank_id                 VARCHAR(30),
    signal_type             VARCHAR(50)     NOT NULL,
    signal_value            DECIMAL(10,4),
    threshold_value         DECIMAL(10,4),
    source_reading_id       VARCHAR(50),
    loading_operation_id    VARCHAR(50),
    alert_id                VARCHAR(50)     REFERENCES alerts(id),
    created_at              TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed               BOOLEAN         DEFAULT FALSE,
    processed_at            TIMESTAMP,
    actuation_triggered     BOOLEAN         DEFAULT FALSE,
    notification_sent       BOOLEAN         DEFAULT FALSE,
    
    CONSTRAINT chk_event_severity CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
    CONSTRAINT chk_event_type CHECK (event_type IN ('overfill_risk', 'pressure_breach', 'threshold_warning', 'system_alert'))
);

-- Index for event processing (find unprocessed events)
CREATE INDEX IF NOT EXISTS idx_event_log_unprocessed 
    ON event_log(processed, created_at) 
    WHERE processed = FALSE;

-- Index for site-specific event queries
CREATE INDEX IF NOT EXISTS idx_event_log_site_time 
    ON event_log(site_id, created_at DESC);

-- Index for event type analysis
CREATE INDEX IF NOT EXISTS idx_event_log_type_time 
    ON event_log(event_type, created_at DESC);

-- Index for deduplication by loading operation
CREATE INDEX IF NOT EXISTS idx_event_log_loading_op 
    ON event_log(loading_operation_id, event_type);

COMMENT ON TABLE event_log IS 'Audit trail of all control-plane events - threshold breaches, anomalies, automation triggers';
COMMENT ON COLUMN event_log.event_type IS 'Type of event: overfill_risk, pressure_breach, threshold_warning, system_alert';
COMMENT ON COLUMN event_log.signal_value IS 'The actual sensor value that triggered the event';
COMMENT ON COLUMN event_log.threshold_value IS 'The threshold that was breached';
COMMENT ON COLUMN event_log.actuation_triggered IS 'Whether this event triggered an automatic actuation';
