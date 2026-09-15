-- Add missing columns to capa table
ALTER TABLE capa ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP;
ALTER TABLE capa ADD COLUMN IF NOT EXISTS requires_work_order BOOLEAN NOT NULL DEFAULT FALSE;
