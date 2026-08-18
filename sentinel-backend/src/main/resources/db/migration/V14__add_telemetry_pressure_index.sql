-- V14: Index on fact_telemetry(site, pressure_psi) to support targeted spike queries.
-- Replaces the full-table GROUP BY scan used by countPressureSpikesBySite()
-- when called from the simulate path on every slider commit.
CREATE INDEX IF NOT EXISTS idx_telemetry_site_pressure
    ON fact_telemetry(site, pressure_psi);
