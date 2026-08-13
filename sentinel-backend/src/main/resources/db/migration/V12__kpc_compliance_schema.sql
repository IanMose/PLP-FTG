-- V12: Compliance Intelligence Module schema
--
-- Extends the existing 7 canonical KPC sites (site-001..site-007) with:
--   1. New columns on dim_site (station_type, region, criticality, latitude, longitude, is_active)
--   2. Compliance configuration tables (domains, indicators, scores, violations, trend)
--   3. Compliance-flavoured incidents, audits, and alerts using site-001..site-007 only
--
-- No site data is deleted. V2 and V9 sites are preserved exactly as-is.
-- kpc-* IDs from the original draft are NOT used — canonical site-NNN IDs throughout.

-- ─────────────────────────────────────────────────────────────
-- 1. Extend dim_site with compliance-relevant columns
-- ─────────────────────────────────────────────────────────────

ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS station_type  VARCHAR(50);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS region        VARCHAR(100);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS criticality   VARCHAR(20) DEFAULT 'High';
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS latitude      DECIMAL(9,6);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS longitude     DECIMAL(9,6);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE;

-- Populate the new columns for the 7 canonical sites
UPDATE dim_site SET station_type = 'Terminal',    region = 'Nairobi',     criticality = 'Critical', latitude = -1.292,  longitude = 36.822, is_active = TRUE WHERE site_id = 'site-001';
UPDATE dim_site SET station_type = 'Terminal',    region = 'Coast',       criticality = 'Critical', latitude = -4.049,  longitude = 39.674, is_active = TRUE WHERE site_id = 'site-002';
UPDATE dim_site SET station_type = 'Pipeline',    region = 'Makueni',     criticality = 'Critical', latitude = -2.283,  longitude = 37.833, is_active = TRUE WHERE site_id = 'site-003';
UPDATE dim_site SET station_type = 'Depot',       region = 'Rift Valley', criticality = 'High',     latitude = -0.303,  longitude = 36.080, is_active = TRUE WHERE site_id = 'site-004';
UPDATE dim_site SET station_type = 'Terminal',    region = 'Rift Valley', criticality = 'High',     latitude =  0.517,  longitude = 35.268, is_active = TRUE WHERE site_id = 'site-005';
UPDATE dim_site SET station_type = 'Pump Station',region = 'Bomet',       criticality = 'Critical', latitude =  0.043,  longitude = 35.451, is_active = TRUE WHERE site_id = 'site-006';
UPDATE dim_site SET station_type = 'Terminal',    region = 'Nyanza',      criticality = 'High',     latitude = -0.102,  longitude = 34.762, is_active = TRUE WHERE site_id = 'site-007';

-- ─────────────────────────────────────────────────────────────
-- 2. Compliance Domain Configuration
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_domains (
    domain_id       VARCHAR(10)  PRIMARY KEY,
    domain_name     VARCHAR(100) NOT NULL,
    domain_weight   DECIMAL(5,4) NOT NULL,
    description     TEXT,
    display_order   INTEGER      NOT NULL DEFAULT 0,
    is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
    version         INTEGER      NOT NULL DEFAULT 1,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 3. Compliance Indicator Configuration
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_indicators (
    indicator_id        VARCHAR(10)  PRIMARY KEY,
    indicator_name      VARCHAR(150) NOT NULL,
    domain_id           VARCHAR(10)  NOT NULL REFERENCES compliance_domains(domain_id),
    indicator_weight    DECIMAL(5,4) NOT NULL,
    green_threshold     DECIMAL(5,2) NOT NULL,
    amber_threshold     DECIMAL(5,2) NOT NULL,
    indicator_type      VARCHAR(20)  NOT NULL DEFAULT 'LEADING',
    description         TEXT,
    formula_description TEXT,
    data_sources        TEXT,
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    version             INTEGER      NOT NULL DEFAULT 1,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 4. Compliance Score Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_scores (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id         VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    indicator_id    VARCHAR(10)  NOT NULL REFERENCES compliance_indicators(indicator_id),
    domain_id       VARCHAR(10)  NOT NULL REFERENCES compliance_domains(domain_id),
    score           DECIMAL(5,2) NOT NULL,
    rag_status      VARCHAR(10)  NOT NULL,
    numerator       INTEGER,
    denominator     INTEGER,
    period_start    DATE         NOT NULL,
    period_end      DATE         NOT NULL,
    calculated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    config_version  INTEGER      NOT NULL DEFAULT 1
);

CREATE INDEX idx_compliance_scores_site_period  ON compliance_scores(site_id, period_start, period_end);
CREATE INDEX idx_compliance_scores_indicator    ON compliance_scores(indicator_id, period_start);
CREATE INDEX idx_compliance_scores_domain       ON compliance_scores(domain_id, site_id, period_start);

-- ─────────────────────────────────────────────────────────────
-- 5. Compliance Violations Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_violations (
    id                  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_id             VARCHAR(10)  NOT NULL,
    rule_name           VARCHAR(200) NOT NULL,
    indicator_id        VARCHAR(10)  NOT NULL REFERENCES compliance_indicators(indicator_id),
    domain_id           VARCHAR(10)  NOT NULL REFERENCES compliance_domains(domain_id),
    site_id             VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    asset_reference     VARCHAR(200),
    severity            VARCHAR(20)  NOT NULL,
    violation_date      DATE         NOT NULL,
    description         TEXT         NOT NULL,
    recommended_action  TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'OPEN',
    closed_date         DATE,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_site      ON compliance_violations(site_id, violation_date);
CREATE INDEX idx_violations_indicator ON compliance_violations(indicator_id, status);
CREATE INDEX idx_violations_domain    ON compliance_violations(domain_id, status);
CREATE INDEX idx_violations_status    ON compliance_violations(status, severity);

-- ─────────────────────────────────────────────────────────────
-- 6. Compliance Trend Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_trend (
    id                      BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id                 VARCHAR(50)  REFERENCES dim_site(site_id),
    week_start              DATE         NOT NULL,
    ocs_score               DECIMAL(5,2),
    safety_score            DECIMAL(5,2),
    environmental_score     DECIMAL(5,2),
    asset_integrity_score   DECIMAL(5,2),
    regulatory_score        DECIMAL(5,2),
    calculated_at           TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_trend_week ON compliance_trend(week_start, site_id);

-- ─────────────────────────────────────────────────────────────
-- 7. Compliance-flavoured incidents using canonical site IDs
--    Mapped from original kpc-* draft to site-001..site-007:
--      kpc-msa   -> site-002 (Mombasa Terminal)
--      kpc-nbi   -> site-001 (Nairobi Terminal)
--      kpc-nkr   -> site-004 (Nakuru Depot)
--      kpc-eld   -> site-005 (Eldoret Terminal)
--      kpc-ksm   -> site-007 (Kisumu Terminal)
--      kpc-nbi-w -> site-001 (absorbed into Nairobi Terminal)
--      kpc-kak, kpc-gil, kpc-nai-s, kpc-thk -> dropped (no canonical equivalent)
--    site-003 (Makueni) and site-006 (Sinendet) are the two highest-risk sites
--    in the main system — they get their own compliance incidents below.
-- ─────────────────────────────────────────────────────────────

INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, status, decision, decision_reason, batch_id, ingestion_timestamp) VALUES
-- site-002 (Mombasa Terminal) — from kpc-msa
('CMP-INC-0001', 'site-002', '2026-07-01 08:00:00', 'High',     'PPE non-compliance observed in pump hall — 3 workers without hard hats.',                        62, 'Open',   'review',   'Severity High + compliance_score in ambiguous range', 'cmp-b001', '2026-07-01 09:00:00'),
('CMP-INC-0002', 'site-002', '2026-07-03 14:00:00', 'Critical', 'Hot work commenced without valid Permit-to-Work — welding on manifold.',                        18, 'Open',   'rejected', 'compliance_score below hard threshold (30)',          'cmp-b001', '2026-07-03 15:00:00'),
('CMP-INC-0012', 'site-002', '2026-07-17 09:00:00', 'High',     'Regulatory report to EPRA submitted 4 days late for June operations period.',                   38, 'Closed', 'review',   'Late regulatory report — High severity',              'cmp-b005', '2026-07-17 10:00:00'),
-- site-001 (Nairobi Terminal) — from kpc-nbi + kpc-nbi-w
('CMP-INC-0003', 'site-001', '2026-07-05 07:30:00', 'Medium',   'Training certification expired for 4 operators — HAZMAT handling course.',                      55, 'Open',   'review',   'Severity Medium + compliance_score < 60',            'cmp-b002', '2026-07-05 08:00:00'),
('CMP-INC-0008', 'site-001', '2026-07-12 08:45:00', 'Medium',   'Hazardous waste held on-site for 34 days — exceeds 30-day regulatory limit.',                   72, 'Open',   'trusted',  'All validation rules pass',                           'cmp-b003', '2026-07-12 09:00:00'),
('CMP-INC-0015', 'site-001', '2026-07-20 10:00:00', 'High',     'Inspection of pressure vessel NBW-PV-003 overdue by 38 days.',                                  40, 'Open',   'review',   'Critical asset inspection overdue',                   'cmp-b006', '2026-07-20 11:00:00'),
('CMP-INC-0016', 'site-001', '2026-07-21 09:00:00', 'Medium',   'Audit finding CAR-2026-0047 overdue — leak detection calibration.',                             74, 'Open',   'trusted',  'All validation rules pass',                           'cmp-b006', '2026-07-21 10:00:00'),
-- site-004 (Nakuru Depot) — from kpc-nkr
('CMP-INC-0004', 'site-004', '2026-07-06 11:00:00', 'High',     'Minor hydrocarbon spill at valve manifold — 15L contained. Response initiated in 28 minutes.', 48, 'Closed', 'review',   'Severity High + response time borderline',            'cmp-b002', '2026-07-06 12:00:00'),
('CMP-INC-0009', 'site-004', '2026-07-14 15:30:00', 'High',     'Corrosion monitoring point overdue on segment NKR-012 by 18 days.',                            45, 'Open',   'review',   'Severity High + integrity concern',                   'cmp-b004', '2026-07-14 16:00:00'),
-- site-005 (Eldoret Terminal) — from kpc-eld
('CMP-INC-0005', 'site-005', '2026-07-08 09:15:00', 'Critical', 'Leak detection system offline for 2.5 hours — SCADA communication failure.',                    12, 'Open',   'rejected', 'compliance_score below hard threshold (30)',          'cmp-b002', '2026-07-08 10:00:00'),
('CMP-INC-0010', 'site-005', '2026-07-15 07:00:00', 'Low',      'Near-miss reported 26 hours after occurrence — exceeded 24-hour reporting requirement.',        82, 'Closed', 'trusted',  'All validation rules pass',                           'cmp-b004', '2026-07-15 08:00:00'),
-- site-007 (Kisumu Terminal) — from kpc-ksm
('CMP-INC-0006', 'site-007', '2026-07-10 13:00:00', 'Medium',   'Preventive maintenance on centrifugal pump overdue by 22 days.',                                68, 'Open',   'trusted',  'All validation rules pass',                           'cmp-b003', '2026-07-10 14:00:00'),
('CMP-INC-0011', 'site-007', '2026-07-16 11:30:00', 'Medium',   'SOP deviation during product transfer — valve sequence not followed per SOP-OPS-004.',          70, 'Open',   'trusted',  'All validation rules pass',                           'cmp-b004', '2026-07-16 12:00:00'),
-- site-003 (Makueni Pipeline Section) — highest-risk site; compliance-specific incidents
('CMP-INC-0017', 'site-003', '2026-07-07 10:00:00', 'High',     'PTW issued for confined space entry but gas test not completed before work commenced.',         22, 'Open',   'rejected', 'compliance_score below hard threshold (30)',          'cmp-b002', '2026-07-07 11:00:00'),
('CMP-INC-0018', 'site-003', '2026-07-13 08:00:00', 'Medium',   'Air quality sensor offline for 6 hours — VOC readings unavailable at Thange section.',          65, 'Open',   'trusted',  'All validation rules pass',                           'cmp-b003', '2026-07-13 09:00:00'),
-- site-006 (Sinendet Pump Station) — second highest-risk site; compliance-specific incidents
('CMP-INC-0019', 'site-006', '2026-07-09 07:00:00', 'High',     'Water discharge sample exceeded NEMA limit — TPH at 1.4x permitted level.',                    35, 'Open',   'review',   'Severity High + environmental exceedance',            'cmp-b002', '2026-07-09 08:00:00'),
('CMP-INC-0020', 'site-006', '2026-07-18 15:00:00', 'Medium',   'Waste manifest missing for last hazardous consignment — regulatory non-compliance.',            58, 'Open',   'review',   'Missing compliance documentation',                    'cmp-b005', '2026-07-18 16:00:00');

-- ─────────────────────────────────────────────────────────────
-- 8. Compliance-flavoured audits using canonical site IDs
-- ─────────────────────────────────────────────────────────────

INSERT INTO fact_audits (audit_id, site_id, inspection_date, auditor, findings, compliance_score, follow_up_required, decision, decision_reason, batch_id, ingestion_timestamp) VALUES
('CMP-AUD-0001', 'site-002', '2026-07-01 00:00:00', 'J. Mwangi',  '4 non-conformances: PTW bypass on hot work, expired fire suppression certificate, inadequate PPE in pump hall, waste manifest missing.',            58, TRUE,  'review',  'Multiple critical findings', 'cmp-b001', '2026-07-01 09:00:00'),
('CMP-AUD-0002', 'site-001', '2026-07-05 00:00:00', 'A. Kamau',   '2 findings: 4 operators with expired HAZMAT training, waste storage exceeding permitted period.',                                                    72, TRUE,  'trusted', 'All validation rules pass',  'cmp-b002', '2026-07-05 08:00:00'),
('CMP-AUD-0003', 'site-004', '2026-07-08 00:00:00', 'S. Otieno',  '3 findings: corrosion monitoring overdue on 4 segments, PM backlog for 2 pumps, valve inspection overdue.',                                         64, TRUE,  'trusted', 'All validation rules pass',  'cmp-b002', '2026-07-08 10:00:00'),
('CMP-AUD-0004', 'site-005', '2026-07-10 00:00:00', 'J. Mwangi',  '2 critical findings: SCADA leak detection unavailable 2.5hrs, pipeline segment inspection 38 days overdue.',                                        41, TRUE,  'review',  'Critical integrity findings', 'cmp-b003', '2026-07-10 14:00:00'),
('CMP-AUD-0005', 'site-007', '2026-07-12 00:00:00', 'M. Wanjiku', '1 finding: centrifugal pump PM overdue 22 days. Otherwise satisfactory.',                                                                           81, TRUE,  'trusted', 'All validation rules pass',  'cmp-b003', '2026-07-12 09:00:00'),
('CMP-AUD-0006', 'site-001', '2026-07-14 00:00:00', 'A. Kamau',   '3 findings: water discharge exceedance, pressure vessel overdue, SOP deviation in transfer procedure.',                                              53, TRUE,  'review',  'Environmental + integrity',  'cmp-b004', '2026-07-14 16:00:00'),
('CMP-AUD-0007', 'site-003', '2026-07-16 00:00:00', 'S. Otieno',  'Confined space PTW failure identified. Air quality sensor offline during inspection window. Follow-up mandated.',                                    44, TRUE,  'review',  'Critical safety finding',   'cmp-b004', '2026-07-16 12:00:00'),
('CMP-AUD-0008', 'site-006', '2026-07-18 00:00:00', 'M. Wanjiku', 'Water discharge exceedance confirmed. Waste manifest gap identified. Corrosion monitoring current.',                                                  52, TRUE,  'review',  'Environmental findings',     'cmp-b005', '2026-07-18 15:00:00'),
('CMP-AUD-0009', 'site-007', '2026-07-19 00:00:00', 'J. Mwangi',  'Exemplary compliance across all areas. All training current. No outstanding findings.',                                                              96, FALSE, 'trusted', 'All validation rules pass',  'cmp-b005', '2026-07-19 09:00:00'),
('CMP-AUD-0010', 'site-004', '2026-07-21 00:00:00', 'A. Kamau',   'Good overall compliance. Minor SOP adherence finding in product transfer area.',                                                                     88, FALSE, 'trusted', 'All validation rules pass',  'cmp-b006', '2026-07-21 10:00:00');

-- ─────────────────────────────────────────────────────────────
-- 9. Compliance-aware alerts using canonical site IDs
-- ─────────────────────────────────────────────────────────────

INSERT INTO alerts (id, site_id, severity, status, title, description, rule, record_ids, created_at) VALUES
('cmp-alert-001', 'site-005', 'Critical', 'active',       'Leak detection system offline',          'SCADA CPM unavailable for 2.5 hours on Eldoret segment.',                                            'BR-A04: Leak Detection Availability < 99%',            'CMP-INC-0005', '2026-07-22 08:00:00'),
('cmp-alert-002', 'site-002', 'Critical', 'active',       'PTW bypass — hot work without permit',   'Hot work commenced on Mombasa manifold without valid Permit-to-Work. Immediate stop-work issued.',    'BR-S03: PTW Authorisation Before High-Risk Work',      'CMP-INC-0002', '2026-07-22 07:30:00'),
('cmp-alert-003', 'site-001', 'High',     'active',       'Inspection overdue — critical asset',    'Pressure vessel NBW-PV-003 inspection 38 days overdue.',                                              'BR-A01: Asset Inspection Not Overdue',                 'CMP-INC-0015', '2026-07-22 06:00:00'),
('cmp-alert-004', 'site-006', 'High',     'active',       'Water discharge NEMA exceedance',        'TPH level 1.4x NEMA permitted limit at Sinendet Station. Investigate source.',                        'BR-E01: Water Discharge Parameter Within NEMA Limits', 'CMP-INC-0019', '2026-07-21 14:00:00'),
('cmp-alert-005', 'site-003', 'Critical', 'active',       'Confined space entry — gas test skipped','PTW issued but gas test not completed before confined space entry at Makueni section.',                'BR-S03: PTW Compliance',                               'CMP-INC-0017', '2026-07-21 10:00:00'),
('cmp-alert-006', 'site-004', 'High',     'acknowledged', 'Corrosion monitoring overdue',           'Segment NKR-012 corrosion monitoring point 18 days past required interval.',                          'BR-A03: Corrosion Monitoring Point Coverage',          'CMP-INC-0009', '2026-07-20 16:00:00'),
('cmp-alert-007', 'site-002', 'High',     'acknowledged', 'Regulatory report submitted late',       'EPRA June operations report submitted 4 days past due date.',                                         'BR-R03: Statutory Report Submission Compliance',       'CMP-INC-0012', '2026-07-20 09:00:00'),
('cmp-alert-008', 'site-001', 'Medium',   'active',       'Audit finding CAR overdue',              'CAR-2026-0047 (leak detection calibration) is 41 days past target date.',                             'BR-R02: Corrective Action Closed By Target Date',      'CMP-INC-0016', '2026-07-21 08:00:00');

UPDATE alerts SET acknowledged_at = '2026-07-20 17:00:00', acknowledged_by = 'hse@kpc.co.ke'           WHERE id = 'cmp-alert-006';
UPDATE alerts SET acknowledged_at = '2026-07-20 10:00:00', acknowledged_by = 'regulatory@kpc.co.ke'    WHERE id = 'cmp-alert-007';
