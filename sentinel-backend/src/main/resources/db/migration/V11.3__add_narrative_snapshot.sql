-- V13: add narrative_incident_count to alerts
-- Stores the incident count that was used to generate the current narrative,
-- so the staleness check can compare against a reliable number rather than
-- regex-parsing the narrative text (which breaks when LLM rewrites the phrasing).
-- Backfills to 0 so existing alerts will refresh once on next ETL cycle.

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS narrative_incident_count BIGINT DEFAULT 0;
UPDATE alerts SET narrative_incident_count = 0 WHERE narrative_incident_count IS NULL;
