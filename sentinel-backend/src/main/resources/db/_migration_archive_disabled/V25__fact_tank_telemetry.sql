-- V22: Tank-level telemetry for loading-gantry overfill detection (Stage 3 Feature 1)
-- This is the primary signal for Problem 10: Spill and Overfill Prevention

CREATE TABLE IF NOT EXISTS fact_tank_telemetry (
    reading_id              VARCHAR(50)     PRIMARY KEY,
    site_id                 VARCHAR(20)     NOT NULL REFERENCES dim_site(site_id),
    tank_id                 VARCHAR(30)     NOT NULL,
    reading_timestamp       TIMESTAMP       NOT NULL,
    tank_level_pct          DECIMAL(5,2)    NOT NULL,
    flow_rate_bph           DECIMAL(10,2),
    valve_status            VARCHAR(20)     NOT NULL DEFAULT 'Unknown',
    sensor_id               VARCHAR(30),
    loading_operation_id    VARCHAR(50),
    overfill_flag           BOOLEAN         NOT NULL DEFAULT FALSE,
    batch_id                VARCHAR(100),
    ingestion_timestamp     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_tank_level_range CHECK (tank_level_pct >= 0 AND tank_level_pct <= 100),
    CONSTRAINT chk_valve_status CHECK (valve_status IN ('Open', 'Closed', 'Partially Open', 'Unknown'))
);

-- Index for time-series queries by site
CREATE INDEX IF NOT EXISTS idx_tank_telemetry_site_time 
    ON fact_tank_telemetry(site_id, reading_timestamp DESC);

-- Index for loading operation timeline
CREATE INDEX IF NOT EXISTS idx_tank_telemetry_loading_op 
    ON fact_tank_telemetry(loading_operation_id, reading_timestamp);

-- Index for overfill breach detection (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_tank_telemetry_overfill 
    ON fact_tank_telemetry(overfill_flag, reading_timestamp DESC)
    WHERE overfill_flag = TRUE;

-- Index for threshold breach queries
CREATE INDEX IF NOT EXISTS idx_tank_telemetry_level_high 
    ON fact_tank_telemetry(tank_level_pct) 
    WHERE tank_level_pct > 90;

COMMENT ON TABLE fact_tank_telemetry IS 'Tank level readings during loading operations - core signal for overfill prevention';
COMMENT ON COLUMN fact_tank_telemetry.tank_level_pct IS 'Tank fill percentage 0-100. Threshold breach at 95%';
COMMENT ON COLUMN fact_tank_telemetry.valve_status IS 'Valve state: Open/Closed/Partially Open. Open + >95% = overfill risk';
COMMENT ON COLUMN fact_tank_telemetry.overfill_flag IS 'Set TRUE when tank_level_pct > 95 AND valve_status = Open';
