-- V19: Scheduled auto-retraining — single-row table (one global schedule for MVP V2)
-- State machine: disabled → scheduled → running → completed/failed → awaiting_review
-- The Java service enforces the state transitions; this table is the persistent state.

CREATE TABLE IF NOT EXISTS retraining_schedule (
    id              VARCHAR(36)   PRIMARY KEY,
    status          VARCHAR(50)   NOT NULL DEFAULT 'disabled',
    -- 'disabled' | 'scheduled' | 'running' | 'completed' | 'failed' | 'awaiting_review'
    cadence         VARCHAR(50)   NOT NULL DEFAULT 'weekly',
    -- Only 'weekly' in MVP V2; left as VARCHAR for future extension
    next_run_at     TIMESTAMP     NULL,
    last_run_id     VARCHAR(36)   NULL REFERENCES training_run(id),
    updated_by      VARCHAR(36)   NULL,
    updated_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the single global schedule row (disabled by default)
INSERT INTO retraining_schedule (id, status, cadence, updated_at)
VALUES ('00000000-0000-0000-0001-000000000001', 'disabled', 'weekly', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;
