-- Create work_order table for maintenance tracking

CREATE TABLE IF NOT EXISTS work_order (
    id VARCHAR(36) PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL,
    capa_id VARCHAR(36),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_technician_id BIGINT REFERENCES technician(id),
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    due_date DATE,
    completed_at TIMESTAMP,
    verified_by BIGINT REFERENCES app_user(id),
    verified_at TIMESTAMP,
    created_by BIGINT NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_order_site ON work_order(site_id);
CREATE INDEX IF NOT EXISTS idx_work_order_status ON work_order(status);
CREATE INDEX IF NOT EXISTS idx_work_order_technician ON work_order(assigned_technician_id);
