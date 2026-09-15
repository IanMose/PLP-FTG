-- V32: Performance indexes identified in 07_PERFORMANCE_BOTTLENECK_ANALYSIS.md
-- These indexes improve query performance for common access patterns.

CREATE INDEX IF NOT EXISTS idx_incidents_severity_date
    ON fact_incidents(severity, incident_date DESC);

CREATE INDEX IF NOT EXISTS idx_incidents_decision_date
    ON fact_incidents(decision, incident_date DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_site_source_rating
    ON model_feedback(site_id, source, rating);

CREATE INDEX IF NOT EXISTS idx_feedback_created
    ON model_feedback(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_predictions_site_date_desc
    ON fact_predictions(site_id, as_of_date DESC);
