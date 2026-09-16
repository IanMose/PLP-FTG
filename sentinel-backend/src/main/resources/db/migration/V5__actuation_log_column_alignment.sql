-- =============================================================================
-- V5: Align actuation_log columns with ActuationLogEntity
-- =============================================================================
-- The baseline schema created actuation_log with different column names
-- than the JPA entity expects. This migration adds the missing columns.
-- =============================================================================

-- Add missing columns to actuation_log
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS action VARCHAR(50);
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS status VARCHAR(30);
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS actuator_type VARCHAR(30);
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS request_timestamp TIMESTAMP;
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS response_timestamp TIMESTAMP;
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS triggered_by VARCHAR(100);
ALTER TABLE actuation_log ADD COLUMN IF NOT EXISTS notes TEXT;

-- Migrate data from old columns to new columns (if any data exists)
UPDATE actuation_log SET action = action_type WHERE action IS NULL AND action_type IS NOT NULL;
UPDATE actuation_log SET status = action_status WHERE status IS NULL AND action_status IS NOT NULL;
UPDATE actuation_log SET request_timestamp = command_sent_at WHERE request_timestamp IS NULL AND command_sent_at IS NOT NULL;
UPDATE actuation_log SET response_timestamp = command_acked_at WHERE response_timestamp IS NULL AND command_acked_at IS NOT NULL;

-- Set defaults for NOT NULL columns
UPDATE actuation_log SET action = 'CLOSE_VALVE' WHERE action IS NULL;
UPDATE actuation_log SET status = 'pending' WHERE status IS NULL;
UPDATE actuation_log SET actuator_type = 'MOCK' WHERE actuator_type IS NULL;
UPDATE actuation_log SET request_timestamp = CURRENT_TIMESTAMP WHERE request_timestamp IS NULL;

-- Add NOT NULL constraints
ALTER TABLE actuation_log ALTER COLUMN action SET NOT NULL;
ALTER TABLE actuation_log ALTER COLUMN status SET NOT NULL;
ALTER TABLE actuation_log ALTER COLUMN actuator_type SET NOT NULL;
ALTER TABLE actuation_log ALTER COLUMN request_timestamp SET NOT NULL;

-- Remove event_id foreign key constraint (entity allows null)
ALTER TABLE actuation_log ALTER COLUMN event_id DROP NOT NULL;

-- Update index for status column
CREATE INDEX IF NOT EXISTS idx_actuation_status ON actuation_log(status, request_timestamp DESC);
