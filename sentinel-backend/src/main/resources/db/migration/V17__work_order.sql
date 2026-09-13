-- V17: Process E — Maintenance Work Orders
-- A work_order is created when a CAPA finding requires scheduled maintenance
-- rather than an immediate field fix. Linked 1:1 from a CAPA (optional).

CREATE TABLE IF NOT EXISTS work_order (
    id                      VARCHAR(36)   PRIMARY KEY,
    site_id                 VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    capa_id                 VARCHAR(36)   NULL REFERENCES capa(id),
    title                   VARCHAR(255)  NOT NULL,
    description             TEXT          NULL,
    assigned_technician_id  BIGINT        NULL REFERENCES technician(id),
    status                  VARCHAR(50)   NOT NULL DEFAULT 'open',
    -- 'open' | 'in_progress' | 'completed' | 'verified'
    priority                VARCHAR(20)   NOT NULL DEFAULT 'medium',
    -- 'low' | 'medium' | 'high' | 'critical'
    due_date                DATE          NULL,
    completed_at            TIMESTAMP     NULL,
    verified_by             BIGINT        NULL REFERENCES app_user(id),
    verified_at             TIMESTAMP     NULL,
    created_by              BIGINT        NOT NULL REFERENCES app_user(id),
    created_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wo_site       ON work_order(site_id);
CREATE INDEX IF NOT EXISTS idx_wo_capa       ON work_order(capa_id);
CREATE INDEX IF NOT EXISTS idx_wo_status     ON work_order(status);
CREATE INDEX IF NOT EXISTS idx_wo_technician ON work_order(assigned_technician_id);
CREATE INDEX IF NOT EXISTS idx_wo_priority   ON work_order(priority);
