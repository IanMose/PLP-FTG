-- V14: HSE Foundation — new roles, hazard_report, capa, required_qualification on alerts
-- Fixes the duplicate V11 narrative issue by consolidating in V14 if not already applied.

-- ── New roles ────────────────────────────────────────────────────────────────
INSERT INTO app_role (name) VALUES ('Field Technician')  ON CONFLICT (name) DO NOTHING;
INSERT INTO app_role (name) VALUES ('Station Manager')   ON CONFLICT (name) DO NOTHING;
INSERT INTO app_role (name) VALUES ('Maintenance Team')  ON CONFLICT (name) DO NOTHING;
INSERT INTO app_role (name) VALUES ('ML Admin')          ON CONFLICT (name) DO NOTHING;

-- ── Hazard report with embedded thin risk assessment ─────────────────────────
CREATE TABLE IF NOT EXISTS hazard_report (
    id                  VARCHAR(36)  PRIMARY KEY,
    site_id             VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    asset_id            BIGINT       NULL,
    category            VARCHAR(100) NOT NULL,
    description         TEXT         NOT NULL,
    severity_estimate   VARCHAR(20)  NOT NULL,
    reporter_id         BIGINT       NOT NULL REFERENCES app_user(id),
    photo_url           TEXT         NULL,
    -- Embedded thin risk assessment
    likelihood_rating   INTEGER      NULL,
    severity_rating     INTEGER      NULL,
    risk_rating         INTEGER      NULL,
    mitigation_note     TEXT         NULL,
    assessed_by         BIGINT       NULL REFERENCES app_user(id),
    assessed_at         TIMESTAMP    NULL,
    linked_alert_id     VARCHAR(255) NULL,
    status              VARCHAR(50)  NOT NULL DEFAULT 'open',
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_hazard_site   ON hazard_report(site_id);
CREATE INDEX IF NOT EXISTS idx_hazard_status ON hazard_report(status);

-- ── CAPA ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS capa (
    id                  VARCHAR(36)  PRIMARY KEY,
    source_alert_id     VARCHAR(255) NULL,
    source_hazard_id    VARCHAR(36)  NULL REFERENCES hazard_report(id),
    owner_id            BIGINT       NOT NULL REFERENCES app_user(id),
    due_date            DATE         NOT NULL,
    description         TEXT         NOT NULL,
    status              VARCHAR(50)  NOT NULL DEFAULT 'open',
    evidence_url        TEXT         NULL,
    verified_by         BIGINT       NULL REFERENCES app_user(id),
    closed_at           TIMESTAMP    NULL,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_capa_owner  ON capa(owner_id);
CREATE INDEX IF NOT EXISTS idx_capa_status ON capa(status);

-- ── Add required_qualification to alerts ─────────────────────────────────────
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS required_qualification VARCHAR(100) NULL;
