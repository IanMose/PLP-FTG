-- =============================================================================
-- SENTINEL SEED DATA
-- =============================================================================
-- Seeds essential reference data for Sentinel.
-- Uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- RBAC ROLES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO app_role (name, description) VALUES
    ('Admin',           'Full system access: user management, configuration, all data'),
    ('HSE Manager',     'Manage incidents, audits, approve alerts; no user admin'),
    ('Auditor',         'Create and manage audit records; read-only on incidents'),
    ('Analyst',         'Read-only access to dashboards, risk scores, telemetry'),
    ('Viewer',          'Read-only access to the alert feed and summary views'),
    ('Field Technician','Field operations: hazard reports, work orders, site inspections'),
    ('Station Manager', 'Station-level management: local incidents, audits, team oversight'),
    ('ML Admin',        'ML pipeline administration: model management, retraining, feedback review')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- KPC SITES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO dim_site (site_id, site_name, location) VALUES
    ('site-001', 'Nairobi Terminal',        'Nairobi, Kenya'),
    ('site-002', 'Mombasa Terminal',        'Mombasa, Kenya'),
    ('site-003', 'Makueni Pump Station',    'Makueni County, Kenya'),
    ('site-004', 'Nakuru Depot',            'Nakuru, Kenya'),
    ('site-005', 'Eldoret Depot',           'Uasin Gishu, Kenya'),
    ('site-006', 'Sinendet Pump Station',   'Bomet, Kenya'),
    ('site-007', 'Kisumu Terminal',         'Kisumu, Kenya')
ON CONFLICT (site_id) DO NOTHING;

-- =============================================================================
-- END OF SEED DATA
-- =============================================================================
