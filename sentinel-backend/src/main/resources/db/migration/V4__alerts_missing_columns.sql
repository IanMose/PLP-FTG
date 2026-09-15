-- V4: Add missing columns to alerts table and fix column sizes
-- AlertEntity maps narrative_incident_count and requiredQualification
-- which were not in the V1 baseline.

-- Add missing columns
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS narrative_incident_count BIGINT DEFAULT 0;

-- Fix VARCHAR lengths that may be too short for real data
ALTER TABLE alerts ALTER COLUMN severity TYPE VARCHAR(50);
ALTER TABLE alerts ALTER COLUMN status   TYPE VARCHAR(50);

-- Also fix alerts.required_qualification if not already added in V1
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS required_qualification VARCHAR(100);
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS narrative              TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS narrative_updated_at   TIMESTAMP;
