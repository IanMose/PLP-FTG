-- V2: Seed data — sites, incidents, audits, alerts, and ingest log
-- Mirrors the Stage 1 pipeline output and frontend mock expectations

-- Sites (dim_site)
INSERT INTO dim_site (site_id, site_name, location) VALUES
('site-001', 'Melbourne Central', 'Melbourne, VIC'),
('site-002', 'Brisbane North', 'Brisbane, QLD'),
('site-003', 'Sydney Harbour', 'Sydney, NSW'),
('site-004', 'Perth West', 'Perth, WA'),
('site-005', 'Adelaide South', 'Adelaide, SA'),
('site-006', 'Hobart Docks', 'Hobart, TAS'),
('site-007', 'Darwin Port', 'Darwin, NT'),
('site-008', 'Canberra HQ', 'Canberra, ACT'),
('site-009', 'Gold Coast Marina', 'Gold Coast, QLD'),
('site-010', 'Cairns Terminal', 'Cairns, QLD'),
('site-011', 'Newcastle Yard', 'Newcastle, NSW'),
('site-012', 'Geelong Plant', 'Geelong, VIC');

-- Incidents for site-001 (Melbourne Central)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0398', 'site-001', '2026-07-20 00:00:00', 'Critical', 'Unauthorized access to restricted zone — perimeter breach detected by sensor grid.', 28, 'rejected', 'compliance_score below hard threshold (30)', 'b-0034'),
('INC-2026-0399', 'site-001', '2026-07-19 00:00:00', 'High', 'Chemical storage temperature exceeded safe range for 4+ hours.', 52, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0034'),
('INC-2026-0385', 'site-001', '2026-07-15 00:00:00', 'Medium', 'PPE non-compliance observed during routine check.', 75, 'trusted', 'All validation rules pass', 'b-0033'),
('INC-2026-0372', 'site-001', '2026-07-10 00:00:00', 'High', 'Fire suppression system offline for scheduled maintenance — extended beyond window.', 60, 'corrected', 'severity normalized from high to High (case correction)', 'b-0032');

-- Incidents for site-002 (Brisbane North)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0370', 'site-002', '2026-07-18 00:00:00', 'High', 'Structural crack detected in loading bay support column.', 45, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0033'),
('INC-2026-0371', 'site-002', '2026-07-17 00:00:00', 'Medium', 'Forklift collision with storage rack — no injuries.', 68, 'trusted', 'All validation rules pass', 'b-0033');

-- Incidents for site-005 (Adelaide South)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0380', 'site-005', '2026-07-16 00:00:00', 'High', 'Electrical panel overheating — emergency shutdown triggered.', 55, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0033'),
('INC-2026-0381', 'site-005', '2026-07-14 00:00:00', 'Critical', 'Gas leak detected in processing unit — evacuation initiated.', 20, 'rejected', 'compliance_score below hard threshold (30)', 'b-0032');

-- Incidents for site-009 (Gold Coast Marina)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0441', 'site-009', '2026-07-21 00:00:00', 'Critical', 'Structural integrity alert — dock C section 4 weight limit exceeded.', 15, 'rejected', 'compliance_score below hard threshold (30)', 'b-0034'),
('INC-2026-0442', 'site-009', '2026-07-21 00:00:00', 'Critical', 'Oil spill detected in berth area — containment protocols activated.', 22, 'rejected', 'compliance_score below hard threshold (30)', 'b-0034'),
('INC-2026-0443', 'site-009', '2026-07-20 00:00:00', 'High', 'Navigation light system failure — vessels rerouted.', 48, 'review', 'Severity High + compliance_score in ambiguous range (40-60)', 'b-0034');

-- Incidents for site-007 (Darwin Port)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0388', 'site-007', '2026-07-25 00:00:00', 'Medium', 'Equipment maintenance log entry with future date.', 70, 'rejected', 'hard rule failure: no_future_incidents', 'b-0032');

-- Incidents for site-011 (Newcastle Yard)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0350', 'site-011', '2026-07-12 00:00:00', 'High', 'Crane load sensor malfunction — operations paused.', 58, 'trusted', 'All validation rules pass', 'b-0031'),
('INC-2026-0351', 'site-011', '2026-07-11 00:00:00', 'Medium', 'Slip hazard identified in warehouse section B.', 72, 'corrected', 'severity normalized from med to Medium', 'b-0031');

-- Incidents for site-003 (Sydney Harbour)
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0360', 'site-003', '2026-07-13 00:00:00', 'Low', 'Minor signage damage reported at east entrance.', 90, 'trusted', 'All validation rules pass', 'b-0031');

-- Audits
INSERT INTO fact_audits (audit_id, site_id, inspection_date, auditor, findings, compliance_score, follow_up_required) VALUES
('AUD-2026-0198', 'site-001', '2026-07-01 00:00:00', 'J. Thompson', '3 non-conformances identified: emergency exit signage, chemical labeling, access logs incomplete.', 61, TRUE),
('AUD-2026-0185', 'site-001', '2026-06-15 00:00:00', 'M. Chen', 'Satisfactory overall. Minor issue with equipment calibration records.', 78, FALSE),
('AUD-2026-0201', 'site-009', '2026-06-28 00:00:00', 'R. Patel', '5 critical non-conformances: structural maintenance overdue, safety equipment expired, dock lighting inadequate, waste management non-compliant, access control gaps.', 34, TRUE),
('AUD-2026-0205', 'site-002', '2026-07-10 00:00:00', 'S. Williams', 'Two findings: loading bay drainage and emergency lighting.', 72, TRUE),
('AUD-2026-0210', 'site-005', '2026-07-05 00:00:00', 'K. Johnson', 'Electrical compliance gaps and outdated risk assessment.', 55, TRUE),
('AUD-2026-0212', 'site-003', '2026-07-15 00:00:00', 'M. Chen', 'Score bounds violation auto-corrected from 105 to 100.', 88, FALSE),
('AUD-2026-0215', 'site-004', '2026-07-18 00:00:00', 'L. Davis', 'All areas compliant. Good housekeeping.', 92, FALSE),
('AUD-2026-0218', 'site-006', '2026-07-19 00:00:00', 'A. Brown', 'Minor dock surface wear noted. No safety concern.', 85, FALSE),
('AUD-2026-0220', 'site-007', '2026-07-12 00:00:00', 'R. Patel', 'Equipment calibration overdue. Follow-up scheduled.', 65, TRUE),
('AUD-2026-0222', 'site-008', '2026-07-20 00:00:00', 'J. Thompson', 'Exemplary compliance across all areas.', 96, FALSE),
('AUD-2026-0225', 'site-011', '2026-07-08 00:00:00', 'S. Williams', 'Crane inspection overdue. Loading zone demarcation faded.', 62, TRUE),
('AUD-2026-0228', 'site-012', '2026-07-21 00:00:00', 'K. Johnson', 'All clear. Plant in excellent condition.', 94, FALSE);

-- Ingest Log
INSERT INTO ingest_log (batch_id, source_filename, row_count, sha256_checksum, ingestion_timestamp, trusted_count, corrected_count, review_count, rejected_count) VALUES
('b-0034', 'incidents_2026-07-22.csv', 340, 'a3f2c8e1d4b5a6f7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1', '2026-07-22 08:00:00', 298, 22, 12, 8),
('b-0033', 'incidents_2026-07-21.csv', 285, 'b4e3d9f2a5c6b7a8e9d0c1b2a3f4e5d6c7b8a9f0e1d2c3b4a5f6e7d8c9b0a1f2', '2026-07-21 08:00:00', 252, 18, 9, 6),
('b-0032', 'incidents_2026-07-20.csv', 312, 'c5f4e0a3b6d7c8b9a0e1d2c3b4a5f6e7d8c9b0a1f2e3d4c5b6a7f8e9d0c1b2a3', '2026-07-20 08:00:00', 270, 25, 11, 6),
('b-0031', 'incidents_2026-07-19.csv', 298, 'd6a5f1b4c7e8d9c0b1a2f3e4d5c6b7a8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4', '2026-07-19 08:00:00', 265, 19, 8, 6),
('b-0030', 'incidents_2026-07-18.csv', 275, 'e7b6a2c5d8f9e0d1c2b3a4f5e6d7c8b9a0f1e2d3c4b5a6f7e8d9c0b1a2f3e4d5', '2026-07-18 08:00:00', 240, 20, 10, 5);

-- Alerts
INSERT INTO alerts (id, site_id, severity, status, title, description, rule, record_ids, created_at) VALUES
('alert-001', 'site-009', 'Critical', 'active', 'Data quality gate failed', 'Trusted+corrected rate dropped below 90% threshold. Current rate: 63%.', 'DQ gate threshold (--fail-below 0.90)', 'INC-2026-0441,INC-2026-0442,INC-2026-0443', '2026-07-22 08:15:00'),
('alert-002', 'site-001', 'Critical', 'active', 'High rejection rate detected', '18% of records rejected in latest batch — exceeds 10% site threshold.', 'Site rejection rate > 10%', 'INC-2026-0398,INC-2026-0399', '2026-07-22 07:45:00'),
('alert-003', 'site-005', 'High', 'active', 'Audit overdue', 'Last audit was 17 days ago. Threshold is 14 days for High-risk sites.', 'Audit frequency threshold (14d for High-risk)', '', '2026-07-22 06:00:00'),
('alert-004', 'site-002', 'High', 'acknowledged', 'Incident frequency spike', '9 incidents in the last 30 days — 3x rolling average.', 'Incident frequency > 3x 90-day rolling average', 'INC-2026-0370,INC-2026-0371', '2026-07-21 14:30:00'),
('alert-005', 'site-007', 'Medium', 'active', 'Future incident date detected', 'Record INC-2026-0388 has incident_date after ingestion date.', 'No future incidents (validate.py rule)', 'INC-2026-0388', '2026-07-21 10:00:00'),
('alert-006', 'site-011', 'High', 'resolved', 'Duplicate incident IDs in batch', 'Batch b-0032 contained 3 duplicate incident_id values.', 'Uniqueness (incident_id unique within batch)', 'INC-2026-0350,INC-2026-0351', '2026-07-20 16:00:00'),
('alert-007', 'site-003', 'Low', 'resolved', 'Score bounds violation auto-corrected', 'compliance_score of 105 clamped to 100 — logged as corrected.', 'Score bounds (0-100)', 'AUD-2026-0212', '2026-07-19 09:00:00');

-- Update alert-004 acknowledgment
UPDATE alerts SET acknowledged_at = '2026-07-21 15:00:00', acknowledged_by = 'analyst@sentinel.io' WHERE id = 'alert-004';
UPDATE alerts SET acknowledged_at = '2026-07-20 17:00:00', acknowledged_by = 'admin@sentinel.io' WHERE id = 'alert-006';
UPDATE alerts SET acknowledged_at = '2026-07-19 09:15:00', acknowledged_by = 'analyst@sentinel.io' WHERE id = 'alert-007';
