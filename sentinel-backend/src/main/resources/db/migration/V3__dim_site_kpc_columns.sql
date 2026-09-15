-- V3: Add KPC-specific columns to dim_site
-- These columns are mapped by SiteEntity and were missed in the V1 baseline.
-- All use IF NOT EXISTS for idempotency.

ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS station_type VARCHAR(50);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS region       VARCHAR(100);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS criticality  VARCHAR(30);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS latitude     DOUBLE PRECISION;
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS longitude    DOUBLE PRECISION;
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS is_active    BOOLEAN DEFAULT TRUE;
