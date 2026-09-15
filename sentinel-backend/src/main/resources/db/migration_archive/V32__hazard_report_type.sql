-- Add report_type column to hazard_report table
ALTER TABLE hazard_report ADD COLUMN IF NOT EXISTS report_type VARCHAR(20) NOT NULL DEFAULT 'hazard';
