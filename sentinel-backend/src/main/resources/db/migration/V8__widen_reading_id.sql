-- V8: Widen reading_id columns to accommodate live-batch IDs.
--
-- Python's run_pipeline.py generates corridor reading IDs in the format:
--   LCT-{asset_id}-{timestamp}   e.g. LCT-MP-0001-20260728065357  (26 chars)
--
-- V6 defined fact_environmental.reading_id as VARCHAR(20) which was sized for
-- the static seed data (GTL-000096 = 10 chars). This migration widens it to
-- VARCHAR(40) which comfortably covers all current and anticipated ID formats.
-- (fact_telemetry.reading_id is already VARCHAR(50) from V5 — no change needed.)

ALTER TABLE fact_environmental ALTER COLUMN reading_id TYPE VARCHAR(40);
