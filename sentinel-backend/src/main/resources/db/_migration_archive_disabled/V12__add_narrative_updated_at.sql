-- V12: add narrative_updated_at to alerts
-- Tracks when the narrative was last written or refreshed, separately from
-- when the alert was created. Allows the UI to show "narrative updated 2h ago"
-- vs "generated 3 days ago" so safety officers know how fresh the assessment is.
-- Backfills existing rows with created_at so they are never shown as null.

ALTER TABLE alerts ADD COLUMN IF NOT EXISTS narrative_updated_at TIMESTAMP;
UPDATE alerts SET narrative_updated_at = created_at WHERE narrative_updated_at IS NULL;
