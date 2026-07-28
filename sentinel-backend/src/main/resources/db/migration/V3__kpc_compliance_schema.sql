-- V3: KPC Kenya stations + Compliance Intelligence Module schema
-- Replaces Australian placeholder sites with KPC pipeline network stations.
-- Adds compliance configuration tables (domain/indicator config, weights, thresholds)
-- and compliance score + violation tables.
--
-- Design decisions:
--   - compliance_domains and compliance_indicators are config-driven (no hardcoded weights)
--   - compliance_scores stores per-site, per-indicator, per-period calculated scores
--   - compliance_violations stores individual business-rule breach records
--   - All weights/thresholds are database values, changeable without code deployment

-- ─────────────────────────────────────────────────────────────
-- 1. Replace Australian placeholder sites with KPC Kenya stations
-- ─────────────────────────────────────────────────────────────

DELETE FROM alerts;
DELETE FROM fact_audits;
DELETE FROM fact_incidents;
DELETE FROM dim_site;

-- Add KPC-specific columns to dim_site without breaking existing schema
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS station_type  VARCHAR(50);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS region        VARCHAR(100);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS criticality   VARCHAR(20) DEFAULT 'High';
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS latitude      DECIMAL(9,6);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS longitude     DECIMAL(9,6);
ALTER TABLE dim_site ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT TRUE;

INSERT INTO dim_site (site_id, site_name, location, station_type, region, criticality, latitude, longitude) VALUES
('kpc-msa',    'Mombasa Terminal',           'Mombasa, Coast',             'Terminal',      'Coast',           'Critical', -4.0435, 39.6682),
('kpc-nbi',    'Nairobi Depot',              'Nairobi, Nairobi',           'Depot',         'Nairobi',         'Critical', -1.2921, 36.8219),
('kpc-nkr',    'Nakuru Station',             'Nakuru, Rift Valley',        'Pump Station',  'Rift Valley',     'High',     -0.3031, 36.0800),
('kpc-eld',    'Eldoret Station',            'Eldoret, Rift Valley',       'Pump Station',  'Rift Valley',     'High',     0.5143,  35.2698),
('kpc-ksm',    'Kisumu Depot',               'Kisumu, Nyanza',             'Depot',         'Nyanza',          'High',     -0.1022, 34.7617),
('kpc-nbi-w',  'Nairobi West Station',       'Nairobi West, Nairobi',      'Pump Station',  'Nairobi',         'Critical', -1.3192, 36.7820),
('kpc-kak',    'Kakamega Station',           'Kakamega, Western',          'Pump Station',  'Western',         'Medium',   0.2827,  34.7519),
('kpc-gil',    'Gilgil Station',             'Gilgil, Rift Valley',        'Pump Station',  'Rift Valley',     'Medium',   -0.5024, 36.3264),
('kpc-nai-s',  'Nairobi South Depot',        'Nairobi South, Nairobi',     'Depot',         'Nairobi',         'High',     -1.3667, 36.8167),
('kpc-thk',    'Thika Station',              'Thika, Central',             'Pump Station',  'Central',         'Medium',   -1.0332, 37.0694);

-- ─────────────────────────────────────────────────────────────
-- 2. Compliance Domain Configuration
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_domains (
    domain_id       VARCHAR(10)  PRIMARY KEY,        -- e.g. 'SCD'
    domain_name     VARCHAR(100) NOT NULL,
    domain_weight   DECIMAL(5,4) NOT NULL,           -- e.g. 0.3000 (must sum to 1.0 across all active)
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
    indicator_id        VARCHAR(10)  PRIMARY KEY,     -- e.g. 'PCI'
    indicator_name      VARCHAR(150) NOT NULL,
    domain_id           VARCHAR(10)  NOT NULL REFERENCES compliance_domains(domain_id),
    indicator_weight    DECIMAL(5,4) NOT NULL,        -- weight within parent domain (must sum to 1.0 per domain)
    green_threshold     DECIMAL(5,2) NOT NULL,        -- minimum score for Green status
    amber_threshold     DECIMAL(5,2) NOT NULL,        -- minimum score for Amber status (below = Red)
    indicator_type      VARCHAR(20)  NOT NULL DEFAULT 'LEADING', -- LEADING / LAGGING / MIXED
    description         TEXT,
    formula_description TEXT,
    data_sources        TEXT,                         -- comma-separated DS-xx references
    is_active           BOOLEAN      NOT NULL DEFAULT TRUE,
    version             INTEGER      NOT NULL DEFAULT 1,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- 4. Compliance Score Table (per site, per indicator, per period)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_scores (
    id                  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id             VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    indicator_id        VARCHAR(10)  NOT NULL REFERENCES compliance_indicators(indicator_id),
    domain_id           VARCHAR(10)  NOT NULL REFERENCES compliance_domains(domain_id),
    score               DECIMAL(5,2) NOT NULL,        -- 0.00–100.00
    rag_status          VARCHAR(10)  NOT NULL,         -- GREEN / AMBER / RED
    numerator           INTEGER,                       -- compliant count used in calculation
    denominator         INTEGER,                       -- total count used in calculation
    period_start        DATE         NOT NULL,
    period_end          DATE         NOT NULL,
    calculated_at       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    config_version      INTEGER      NOT NULL DEFAULT 1 -- links to indicator version at calculation time
);

CREATE INDEX idx_compliance_scores_site_period
    ON compliance_scores(site_id, period_start, period_end);
CREATE INDEX idx_compliance_scores_indicator
    ON compliance_scores(indicator_id, period_start);
CREATE INDEX idx_compliance_scores_domain
    ON compliance_scores(domain_id, site_id, period_start);

-- ─────────────────────────────────────────────────────────────
-- 5. Compliance Violations Table (individual rule breach records)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_violations (
    id                  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    rule_id             VARCHAR(10)  NOT NULL,         -- BR-S01, BR-E02, etc.
    rule_name           VARCHAR(200) NOT NULL,
    indicator_id        VARCHAR(10)  NOT NULL REFERENCES compliance_indicators(indicator_id),
    domain_id           VARCHAR(10)  NOT NULL REFERENCES compliance_domains(domain_id),
    site_id             VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    asset_reference     VARCHAR(200),                  -- asset_id, incident_id, audit_id, etc.
    severity            VARCHAR(20)  NOT NULL,          -- LOW / MEDIUM / HIGH / CRITICAL
    violation_date      DATE         NOT NULL,
    description         TEXT         NOT NULL,
    recommended_action  TEXT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'OPEN', -- OPEN / IN_PROGRESS / CLOSED
    closed_date         DATE,
    created_at          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violations_site ON compliance_violations(site_id, violation_date);
CREATE INDEX idx_violations_indicator ON compliance_violations(indicator_id, status);
CREATE INDEX idx_violations_domain ON compliance_violations(domain_id, status);
CREATE INDEX idx_violations_status ON compliance_violations(status, severity);

-- ─────────────────────────────────────────────────────────────
-- 6. Compliance Trend Table (weekly OCS + domain snapshots)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE compliance_trend (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id         VARCHAR(50)  REFERENCES dim_site(site_id), -- NULL = network-wide
    week_start      DATE         NOT NULL,
    ocs_score       DECIMAL(5,2),                              -- Overall Compliance Score
    safety_score    DECIMAL(5,2),
    environmental_score DECIMAL(5,2),
    asset_integrity_score DECIMAL(5,2),
    regulatory_score DECIMAL(5,2),
    calculated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_trend_week ON compliance_trend(week_start, site_id);

-- ─────────────────────────────────────────────────────────────
-- 7. Data for newly seeded KPC incidents and audits
--    (replaces Australian placeholder data deleted above)
-- ─────────────────────────────────────────────────────────────

-- KPC incidents (representative subset matching the 16-KPI framework)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, status, decision, decision_reason, batch_id, ingestion_timestamp) VALUES
('KPC-INC-0001', 'kpc-msa',   '2026-07-01 08:00:00', 'High',     'PPE non-compliance observed in pump hall — 3 workers without hard hats.',                           62, 'Open',   'review',     'Severity High + compliance_score in ambiguous range', 'kpc-b001', '2026-07-01 09:00:00'),
('KPC-INC-0002', 'kpc-msa',   '2026-07-03 14:00:00', 'Critical', 'Hot work commenced without valid Permit-to-Work — welding on manifold.',                            18, 'Open',   'rejected',   'compliance_score below hard threshold (30)',          'kpc-b001', '2026-07-03 15:00:00'),
('KPC-INC-0003', 'kpc-nbi',   '2026-07-05 07:30:00', 'Medium',   'Training certification expired for 4 operators — HAZMAT handling course.',                           55, 'Open',   'review',     'Severity Medium + compliance_score < 60',            'kpc-b002', '2026-07-05 08:00:00'),
('KPC-INC-0004', 'kpc-nkr',   '2026-07-06 11:00:00', 'High',     'Minor hydrocarbon spill at valve manifold — 15L contained. Response initiated in 28 minutes.',      48, 'Closed', 'review',     'Severity High + response time borderline',            'kpc-b002', '2026-07-06 12:00:00'),
('KPC-INC-0005', 'kpc-eld',   '2026-07-08 09:15:00', 'Critical', 'Leak detection system offline for 2.5 hours — SCADA communication failure.',                         12, 'Open',   'rejected',   'compliance_score below hard threshold (30)',          'kpc-b002', '2026-07-08 10:00:00'),
('KPC-INC-0006', 'kpc-ksm',   '2026-07-10 13:00:00', 'Medium',   'Preventive maintenance on centrifugal pump overdue by 22 days.',                                     68, 'Open',   'trusted',    'All validation rules pass',                           'kpc-b003', '2026-07-10 14:00:00'),
('KPC-INC-0007', 'kpc-nbi-w', '2026-07-11 10:00:00', 'High',     'Water discharge sample exceeded NEMA limit — TPH at 1.4x permitted level.',                          35, 'Open',   'review',     'Severity High + environmental exceedance',            'kpc-b003', '2026-07-11 11:00:00'),
('KPC-INC-0008', 'kpc-nbi',   '2026-07-12 08:45:00', 'Medium',   'Hazardous waste held on-site for 34 days — exceeds 30-day regulatory limit.',                        72, 'Open',   'trusted',    'All validation rules pass',                           'kpc-b003', '2026-07-12 09:00:00'),
('KPC-INC-0009', 'kpc-nkr',   '2026-07-14 15:30:00', 'High',     'Corrosion monitoring point overdue on segment KPC-NKR-012 by 18 days.',                              45, 'Open',   'review',     'Severity High + integrity concern',                   'kpc-b004', '2026-07-14 16:00:00'),
('KPC-INC-0010', 'kpc-eld',   '2026-07-15 07:00:00', 'Low',      'Near-miss reported 26 hours after occurrence — exceeded 24-hour reporting requirement.',              82, 'Closed', 'trusted',    'All validation rules pass',                           'kpc-b004', '2026-07-15 08:00:00'),
('KPC-INC-0011', 'kpc-ksm',   '2026-07-16 11:30:00', 'Medium',   'SOP deviation during product transfer — valve sequence not followed per SOP-OPS-004.',               70, 'Open',   'trusted',    'All validation rules pass',                           'kpc-b004', '2026-07-16 12:00:00'),
('KPC-INC-0012', 'kpc-msa',   '2026-07-17 09:00:00', 'High',     'Regulatory report to EPRA submitted 4 days late for June operations period.',                         38, 'Closed', 'review',     'Late regulatory report — High severity',              'kpc-b005', '2026-07-17 10:00:00'),
('KPC-INC-0013', 'kpc-kak',   '2026-07-18 14:00:00', 'Medium',   'Air quality sensor offline for 6 hours — VOC readings unavailable.',                                  65, 'Open',   'trusted',    'All validation rules pass',                           'kpc-b005', '2026-07-18 15:00:00'),
('KPC-INC-0014', 'kpc-gil',   '2026-07-19 08:30:00', 'Critical', 'PTW issued but work commenced before gas test completed — confined space entry.',                     22, 'Open',   'rejected',   'compliance_score below hard threshold (30)',          'kpc-b005', '2026-07-19 09:00:00'),
('KPC-INC-0015', 'kpc-nbi-w', '2026-07-20 10:00:00', 'High',     'Inspection of pressure vessel KPC-NBW-PV-003 overdue by 38 days.',                                    40, 'Open',   'review',     'Critical asset inspection overdue',                   'kpc-b006', '2026-07-20 11:00:00'),
('KPC-INC-0016', 'kpc-nbi',   '2026-07-21 09:00:00', 'Medium',   'Audit finding CAR-2026-0047 overdue — Nakuru Station leak detection calibration.',                    74, 'Open',   'trusted',    'All validation rules pass',                           'kpc-b006', '2026-07-21 10:00:00');

-- KPC audits
INSERT INTO fact_audits (audit_id, site_id, inspection_date, auditor, findings, compliance_score, follow_up_required, decision, decision_reason, batch_id, ingestion_timestamp) VALUES
('KPC-AUD-0001', 'kpc-msa',   '2026-07-01 00:00:00', 'J. Mwangi',   '4 non-conformances: PTW bypass on hot work, expired fire suppression certificate, inadequate PPE in pump hall, waste manifest missing for last consignment.',                        58, TRUE,  'review',   'Multiple critical findings', 'kpc-b001', '2026-07-01 09:00:00'),
('KPC-AUD-0002', 'kpc-nbi',   '2026-07-05 00:00:00', 'A. Kamau',    '2 findings: 4 operators with expired HAZMAT training, waste storage exceeding permitted period.',                                                                                     72, TRUE,  'trusted',  'All validation rules pass',  'kpc-b002', '2026-07-05 08:00:00'),
('KPC-AUD-0003', 'kpc-nkr',   '2026-07-08 00:00:00', 'S. Otieno',   '3 findings: corrosion monitoring overdue on 4 segments, PM backlog for 2 pumps, valve inspection overdue.',                                                                           64, TRUE,  'trusted',  'All validation rules pass',  'kpc-b002', '2026-07-08 10:00:00'),
('KPC-AUD-0004', 'kpc-eld',   '2026-07-10 00:00:00', 'J. Mwangi',   '2 critical findings: SCADA leak detection unavailable 2.5hrs, pipeline segment inspection 38 days overdue.',                                                                          41, TRUE,  'review',   'Critical integrity findings', 'kpc-b003', '2026-07-10 14:00:00'),
('KPC-AUD-0005', 'kpc-ksm',   '2026-07-12 00:00:00', 'M. Wanjiku',  '1 finding: centrifugal pump PM overdue 22 days. Otherwise satisfactory.',                                                                                                              81, TRUE,  'trusted',  'All validation rules pass',  'kpc-b003', '2026-07-12 09:00:00'),
('KPC-AUD-0006', 'kpc-nbi-w', '2026-07-14 00:00:00', 'A. Kamau',    '3 findings: water discharge exceedance, pressure vessel overdue, SOP deviation in transfer procedure.',                                                                                53, TRUE,  'review',   'Environmental + integrity',  'kpc-b004', '2026-07-14 16:00:00'),
('KPC-AUD-0007', 'kpc-kak',   '2026-07-16 00:00:00', 'S. Otieno',   'Air quality sensor offline 6 hrs. All other areas satisfactory.',                                                                                                                      85, TRUE,  'trusted',  'All validation rules pass',  'kpc-b004', '2026-07-16 12:00:00'),
('KPC-AUD-0008', 'kpc-gil',   '2026-07-18 00:00:00', 'M. Wanjiku',  '1 critical finding: confined space entry without completed gas test. PTW procedural failure.',                                                                                          44, TRUE,  'review',   'Critical safety finding',    'kpc-b005', '2026-07-18 15:00:00'),
('KPC-AUD-0009', 'kpc-nai-s', '2026-07-19 00:00:00', 'J. Mwangi',   'Exemplary compliance across all areas. All training current. No outstanding findings.',                                                                                                96, FALSE, 'trusted',  'All validation rules pass',  'kpc-b005', '2026-07-19 09:00:00'),
('KPC-AUD-0010', 'kpc-thk',   '2026-07-21 00:00:00', 'A. Kamau',    'Good overall compliance. Minor SOP adherence finding in product transfer area.',                                                                                                        88, FALSE, 'trusted',  'All validation rules pass',  'kpc-b006', '2026-07-21 10:00:00');

-- KPC ingest log
INSERT INTO ingest_log (batch_id, source_filename, row_count, sha256_checksum, ingestion_timestamp, trusted_count, corrected_count, review_count, rejected_count) VALUES
('kpc-b006', 'kpc_incidents_2026-07-22.csv', 285, 'f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2', '2026-07-22 08:00:00', 230, 18, 25, 12),
('kpc-b005', 'kpc_incidents_2026-07-21.csv', 310, 'a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3', '2026-07-21 08:00:00', 258, 22, 20, 10),
('kpc-b004', 'kpc_incidents_2026-07-20.csv', 298, 'b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4', '2026-07-20 08:00:00', 249, 20, 19, 10),
('kpc-b003', 'kpc_incidents_2026-07-19.csv', 262, 'c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5', '2026-07-19 08:00:00', 220, 17, 16,  9),
('kpc-b002', 'kpc_incidents_2026-07-18.csv', 240, 'd5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6', '2026-07-18 08:00:00', 201, 15, 15,  9);

-- KPC alerts (compliance-aware)
INSERT INTO alerts (id, site_id, severity, status, title, description, rule, record_ids, created_at) VALUES
('kpc-alert-001', 'kpc-eld',   'Critical', 'active',       'Leak detection system offline',         'SCADA CPM unavailable for 2.5 hours on Eldoret segment — KPC-ELD-012.',                          'BR-A04: Leak Detection Availability < 99%',           'KPC-INC-0005',       '2026-07-22 08:00:00'),
('kpc-alert-002', 'kpc-msa',   'Critical', 'active',       'PTW bypass — hot work without permit',  'Hot work commenced on Mombasa manifold without valid Permit-to-Work. Immediate stop-work issued.', 'BR-S03: PTW Authorisation Before High-Risk Work',     'KPC-INC-0002',       '2026-07-22 07:30:00'),
('kpc-alert-003', 'kpc-nbi-w', 'High',     'active',       'Inspection overdue — critical asset',   'Pressure vessel KPC-NBW-PV-003 inspection 38 days overdue. Criticality: High.',                   'BR-A01: Asset Inspection Not Overdue',                'KPC-INC-0015',       '2026-07-22 06:00:00'),
('kpc-alert-004', 'kpc-nbi-w', 'High',     'active',       'Water discharge NEMA exceedance',       'TPH level 1.4× NEMA permitted limit at Nairobi West Station. Investigate source.',                 'BR-E01: Water Discharge Parameter Within NEMA Limits','KPC-INC-0007',       '2026-07-21 14:00:00'),
('kpc-alert-005', 'kpc-gil',   'Critical', 'active',       'Confined space entry — gas test skipped','PTW issued but gas test not completed before confined space entry at Gilgil.',                     'BR-S03: PTW Compliance',                              'KPC-INC-0014',       '2026-07-21 10:00:00'),
('kpc-alert-006', 'kpc-nkr',   'High',     'acknowledged', 'Corrosion monitoring overdue',          'Segment KPC-NKR-012 corrosion monitoring point 18 days past required interval.',                   'BR-A03: Corrosion Monitoring Point Coverage',         'KPC-INC-0009',       '2026-07-20 16:00:00'),
('kpc-alert-007', 'kpc-msa',   'High',     'acknowledged', 'Regulatory report submitted late',      'EPRA June operations report submitted 4 days past due date.',                                       'BR-R03: Statutory Report Submission Compliance',      'KPC-INC-0012',       '2026-07-20 09:00:00'),
('kpc-alert-008', 'kpc-nbi',   'Medium',   'active',       'Audit finding CAR overdue',             'CAR-2026-0047 (leak detection calibration, Nakuru) is 41 days past target date.',                   'BR-R02: Corrective Action Closed By Target Date',     'KPC-INC-0016',       '2026-07-21 08:00:00');

UPDATE alerts SET acknowledged_at = '2026-07-20 17:00:00', acknowledged_by = 'hse@kpc.co.ke' WHERE id = 'kpc-alert-006';
UPDATE alerts SET acknowledged_at = '2026-07-20 10:00:00', acknowledged_by = 'regulatory@kpc.co.ke' WHERE id = 'kpc-alert-007';
