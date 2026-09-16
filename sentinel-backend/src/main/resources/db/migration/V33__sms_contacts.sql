-- V33__sms_contacts.sql
-- SMS contact management for Africa's Talking integration
-- Stores phone numbers of on-call personnel for Critical alert notifications

CREATE TABLE IF NOT EXISTS sms_contacts (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    phone_number    VARCHAR(20) NOT NULL UNIQUE,
    role            VARCHAR(50),           -- on_call, site_manager, emergency
    site_id         VARCHAR(20),           -- NULL = all sites
    active          BOOLEAN NOT NULL DEFAULT TRUE,
    min_severity    VARCHAR(20) DEFAULT 'Critical',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_sms_contact_site FOREIGN KEY (site_id) REFERENCES dim_site(site_id)
);

-- Index for active contact lookup (most common query)
CREATE INDEX idx_sms_contacts_active ON sms_contacts(active) WHERE active = TRUE;

-- Index for site-specific contact lookup
CREATE INDEX idx_sms_contacts_site ON sms_contacts(site_id) WHERE site_id IS NOT NULL;

-- Seed sample contacts (inactive by default - ops team should configure real numbers)
-- Using placeholder numbers in Kenya format for documentation purposes
INSERT INTO sms_contacts (name, phone_number, role, site_id, active, min_severity) VALUES
    ('On-Call Engineer (Placeholder)', '+254700000001', 'on_call', NULL, FALSE, 'Critical'),
    ('Ops Manager (Placeholder)', '+254700000002', 'emergency', NULL, FALSE, 'Critical');

COMMENT ON TABLE sms_contacts IS 'SMS recipients for Critical alert notifications via Africa''s Talking';
COMMENT ON COLUMN sms_contacts.phone_number IS 'International format required (e.g., +254712345678)';
COMMENT ON COLUMN sms_contacts.min_severity IS 'Minimum severity to trigger SMS: Critical, High, or Medium';
