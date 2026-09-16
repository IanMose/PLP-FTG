-- Add requires_work_order column to capa table
ALTER TABLE capa ADD COLUMN IF NOT EXISTS requires_work_order BOOLEAN NOT NULL DEFAULT FALSE;
