-- V2: Seed data — KPC domain sites, incidents, audits, alerts, and ingest log.
-- Site IDs are lowercase (site-001 … site-006) — the canonical DB key format.
-- The Python ETL normalizes to uppercase SITE-001; transform.py lowercases
-- before load so both paths resolve to the same FK.

-- ─── Sites (dim_site) ───────────────────────────────────────────────────────
-- Six Kenya Pipeline Company facilities matching the Stage 1 synthetic data.
-- site-003 and site-006 are the two high-risk sites modeled on the Kimeu v. KPC
-- corridor (weak audit follow-through preceding environmental incidents).

INSERT INTO dim_site (site_id, site_name, location) VALUES
('site-001', 'Nairobi Terminal',        'Nairobi, Kenya'),
('site-002', 'Mombasa Terminal',        'Mombasa, Kenya'),
('site-003', 'Makueni Pump Station',    'Makueni County, Kenya'),
('site-004', 'Nakuru Depot',            'Nakuru, Kenya'),
('site-005', 'Eldoret Depot',           'Uasin Gishu, Kenya'),
('site-006', 'Sinendet Pump Station',   'Bomet, Kenya');

-- ─── Incidents ───────────────────────────────────────────────────────────────
-- Incidents for site-003 (Makueni Pump Station — high-risk)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0459', 'site-003', '2026-07-20 00:00:00', 'Critical',
 'Pipeline leak detected near Thange River crossing — containment bunds activated.',
 28, 'rejected', 'compliance_score below hard threshold (30)', 'b-0034'),
('INC-2026-0460', 'site-003', '2026-07-19 00:00:00', 'High',
 'Valve failure on Section E causing pressure drop downstream — pump isolated.',
 52, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0034'),
('INC-2026-0385', 'site-003', '2026-07-15 00:00:00', 'Medium',
 'Leak detection sensor offline for 6 hours — maintenance window overrun.',
 75, 'trusted', 'All validation rules pass', 'b-0033'),
('INC-2026-0372', 'site-003', '2026-07-10 00:00:00', 'High',
 'Containment bund integrity failure observed during routine inspection.',
 60, 'corrected', 'severity normalized from high to High (case correction)', 'b-0032');

-- Incidents for site-006 (Sinendet Pump Station — high-risk)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0441', 'site-006', '2026-07-21 00:00:00', 'Critical',
 'Oil spill detected near lateral branch junction — environmental response deployed.',
 15, 'rejected', 'compliance_score below hard threshold (30)', 'b-0034'),
('INC-2026-0442', 'site-006', '2026-07-21 00:00:00', 'Critical',
 'Pump station pressure exceeding design limits — emergency shutdown triggered.',
 22, 'rejected', 'compliance_score below hard threshold (30)', 'b-0034'),
('INC-2026-0443', 'site-006', '2026-07-20 00:00:00', 'High',
 'Corrosion on lateral pipe joints identified — repair scheduled.',
 48, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0034');

-- Incidents for site-001 (Nairobi Terminal — normal risk)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0398', 'site-001', '2026-07-20 00:00:00', 'Critical',
 'Unauthorized access to restricted zone — perimeter breach detected by sensor grid.',
 28, 'rejected', 'compliance_score below hard threshold (30)', 'b-0034'),
('INC-2026-0399', 'site-001', '2026-07-19 00:00:00', 'High',
 'Fuel storage temperature exceeded safe range for 4+ hours.',
 52, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0034');

-- Incidents for site-002 (Mombasa Terminal — normal risk)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0370', 'site-002', '2026-07-18 00:00:00', 'High',
 'Marine loading arm seal failure — minor hydrocarbon release contained.',
 45, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0033'),
('INC-2026-0371', 'site-002', '2026-07-17 00:00:00', 'Medium',
 'Forklift incident in dispatch yard — no injuries, container damaged.',
 68, 'trusted', 'All validation rules pass', 'b-0033');

-- Incidents for site-005 (Eldoret Depot — normal risk)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0380', 'site-005', '2026-07-16 00:00:00', 'High',
 'Electrical panel overheating — emergency shutdown of depot section C.',
 55, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0033'),
('INC-2026-0381', 'site-005', '2026-07-14 00:00:00', 'Low',
 'PPE non-compliance observed during routine inspection — verbal warning issued.',
 88, 'trusted', 'All validation rules pass', 'b-0032');

-- Incident with injected future date (validates no_future_incidents rule)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0388', 'site-004', '2026-07-25 00:00:00', 'Medium',
 'Equipment maintenance log entry with future date — data entry error.',
 70, 'rejected', 'hard rule failure: no_future_incidents', 'b-0032');

-- ─── Audits ──────────────────────────────────────────────────────────────────
INSERT INTO fact_audits (audit_id, site_id, inspection_date, auditor, findings, compliance_score, follow_up_required) VALUES
-- High-risk sites: lower scores, follow-up required
('AUD-2026-0198', 'site-003', '2026-07-01 00:00:00', 'J. Mwangi',
 'Three non-conformances: emergency response plan outdated, containment bunds cracked, environmental monitoring gaps.',
 48, TRUE),
('AUD-2026-0185', 'site-003', '2026-06-15 00:00:00', 'M. Ochieng',
 'Leak detection system offline for 72 hrs. Maintenance records incomplete for Section E.',
 55, TRUE),
('AUD-2026-0201', 'site-006', '2026-07-03 00:00:00', 'R. Kipchoge',
 'Four critical non-conformances: corrosion on pipe joints, safety equipment expired, access control gaps, no leak detection calibration.',
 38, TRUE),
-- Normal-risk sites: higher scores, mix of follow-up
('AUD-2026-0205', 'site-002', '2026-07-10 00:00:00', 'S. Waweru',
 'Two findings: marine loading arm maintenance overdue, emergency lighting coverage gap in tank farm.',
 72, TRUE),
('AUD-2026-0210', 'site-005', '2026-07-05 00:00:00', 'K. Njoroge',
 'Electrical compliance gaps and outdated hazardous area risk assessment.',
 65, TRUE),
('AUD-2026-0212', 'site-001', '2026-07-15 00:00:00', 'M. Ochieng',
 'Satisfactory compliance. Score bounds violation auto-corrected (105 → 100).',
 88, FALSE),
('AUD-2026-0215', 'site-004', '2026-07-18 00:00:00', 'L. Kamau',
 'All areas compliant. Good housekeeping and documentation standards.',
 92, FALSE),
('AUD-2026-0218', 'site-001', '2026-07-19 00:00:00', 'A. Githae',
 'Minor fire suppression system calibration drift noted. Corrective order raised.',
 85, FALSE);

-- ─── Ingest Log ──────────────────────────────────────────────────────────────
INSERT INTO ingest_log (batch_id, source_filename, row_count, sha256_checksum, ingestion_timestamp, trusted_count, corrected_count, review_count, rejected_count) VALUES
('b-0034', 'incidents_2026-07-22.csv', 340, 'a3f2c8e1d4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1', '2026-07-22 08:00:00', 298, 22, 12, 8),
('b-0033', 'incidents_2026-07-21.csv', 285, 'b4e3d9f2a5c6b7a8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2', '2026-07-21 08:00:00', 252, 18,  9, 6),
('b-0032', 'incidents_2026-07-20.csv', 312, 'c5f4e0a3b6d7c8b9a0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3', '2026-07-20 08:00:00', 270, 25, 11, 6),
('b-0031', 'incidents_2026-07-19.csv', 298, 'd6a5f1b4c7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4', '2026-07-19 08:00:00', 265, 19,  8, 6),
('b-0030', 'incidents_2026-07-18.csv', 275, 'e7b6a2c5d8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5', '2026-07-18 08:00:00', 240, 20, 10, 5);

-- ─── Alerts ──────────────────────────────────────────────────────────────────
-- Alerts reference only site-001 … site-006 (the six KPC sites above).
-- site-009 removed — it had no dim_site row and caused FK violations.

INSERT INTO alerts (id, site_id, severity, status, title, description, rule, record_ids, created_at) VALUES
('alert-001', 'site-006', 'Critical', 'active',
 'Data quality gate failed — Sinendet',
 'Trusted+corrected rate at Sinendet Pump Station dropped below 90% threshold. Current rate: 63%.',
 'DQ gate threshold (--fail-below 0.90)',
 'INC-2026-0441,INC-2026-0442,INC-2026-0443',
 '2026-07-22 08:15:00'),

('alert-002', 'site-003', 'Critical', 'active',
 'High rejection rate — Makueni',
 '18% of records rejected in latest batch at Makueni Pump Station — exceeds 10% site threshold.',
 'Site rejection rate > 10%',
 'INC-2026-0459,INC-2026-0460',
 '2026-07-22 07:45:00'),

('alert-003', 'site-003', 'High', 'active',
 'Audit overdue — Makueni Pump Station',
 'Last audit was 21 days ago. Threshold is 14 days for Critical-risk sites.',
 'Audit frequency threshold (14d for Critical-risk)',
 '',
 '2026-07-22 06:00:00'),

('alert-004', 'site-006', 'High', 'acknowledged',
 'Containment integrity gap preceded spill incident',
 'Audit AUD-2026-0201 found containment non-conformances with no corrective action. Oil spill (INC-2026-0441) followed 18 days later at the same site.',
 'Unresolved audit finding preceding incident of same type',
 'AUD-2026-0201,INC-2026-0441',
 '2026-07-21 14:30:00'),

('alert-005', 'site-004', 'Medium', 'active',
 'Future incident date detected',
 'Record INC-2026-0388 has incident_date (2026-07-25) after ingestion date (2026-07-22).',
 'No future incidents (validate.py rule)',
 'INC-2026-0388',
 '2026-07-21 10:00:00'),

('alert-006', 'site-002', 'High', 'resolved',
 'Incident frequency spike — Mombasa Terminal',
 '9 incidents in the last 30 days at Mombasa Terminal — 3× rolling 90-day average.',
 'Incident frequency > 3x 90-day rolling average',
 'INC-2026-0370,INC-2026-0371',
 '2026-07-20 16:00:00'),

('alert-007', 'site-001', 'Low', 'resolved',
 'Score bounds violation auto-corrected',
 'compliance_score of 105 clamped to 100 — logged as corrected in batch b-0033.',
 'Score bounds (0-100)',
 'AUD-2026-0212',
 '2026-07-19 09:00:00');

-- Acknowledgement audit trail
UPDATE alerts SET acknowledged_at = '2026-07-21 15:00:00', acknowledged_by = 'analyst@sentinel.kpc' WHERE id = 'alert-004';
UPDATE alerts SET acknowledged_at = '2026-07-20 17:00:00', acknowledged_by = 'admin@sentinel.kpc'   WHERE id = 'alert-006';
UPDATE alerts SET acknowledged_at = '2026-07-19 09:15:00', acknowledged_by = 'analyst@sentinel.kpc' WHERE id = 'alert-007';
