-- V16: Remove Compliance Intelligence Module tables
-- V12 and V13 are preserved for Flyway checksum tracking.
-- This migration reverses the schema additions from V12.
-- compliance_score column on fact_incidents and fact_audits is NOT touched
-- (it is a V1 default field, not part of the compliance module).

-- Drop compliance tables in FK-safe order
DROP TABLE IF EXISTS compliance_trend;
DROP TABLE IF EXISTS compliance_violations;
DROP TABLE IF EXISTS compliance_scores;
DROP TABLE IF EXISTS compliance_indicators;
DROP TABLE IF EXISTS compliance_domains;

-- Remove the dim_site columns added by V12 (optional — they are useful metadata)
-- Uncomment below if you want a full V12 rollback on dim_site:
-- ALTER TABLE dim_site DROP COLUMN IF EXISTS station_type;
-- ALTER TABLE dim_site DROP COLUMN IF EXISTS region;
-- ALTER TABLE dim_site DROP COLUMN IF EXISTS criticality;
-- ALTER TABLE dim_site DROP COLUMN IF EXISTS latitude;
-- ALTER TABLE dim_site DROP COLUMN IF EXISTS longitude;
-- ALTER TABLE dim_site DROP COLUMN IF EXISTS is_active;

-- Remove CMP-prefixed compliance-flavoured seed incidents (optional)
-- These are ordinary incidents that will continue to work fine without
-- the compliance module. Uncomment to remove them:
-- DELETE FROM alerts WHERE id LIKE 'cmp-alert-%';
-- DELETE FROM fact_audits WHERE audit_id LIKE 'CMP-AUD-%';
-- DELETE FROM fact_incidents WHERE incident_id LIKE 'CMP-INC-%';
