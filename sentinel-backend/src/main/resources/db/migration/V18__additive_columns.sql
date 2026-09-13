-- V18: Additive columns on existing tables — purely non-breaking

-- Process E linkage: flag a CAPA as requiring a maintenance work order
ALTER TABLE capa ADD COLUMN IF NOT EXISTS requires_work_order BOOLEAN NOT NULL DEFAULT FALSE;

-- CAPA escalation: timestamp set by the scheduled escalation check job
-- when due_date has passed and status is still open/in_progress
ALTER TABLE capa ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP NULL;

-- Near-miss vs hazard distinction on hazard_report
-- Values: 'hazard' (default, backwards-compatible) | 'near_miss'
ALTER TABLE hazard_report ADD COLUMN IF NOT EXISTS report_type VARCHAR(20) NOT NULL DEFAULT 'hazard';
