-- V13: Compliance domain + indicator configuration seed data
-- Seeds all 16 KPI indicator configurations from the Compliance Design document.
-- Weights, thresholds, and descriptions are data — not code.

-- ─── Domains ────────────────────────────────────────────────
INSERT INTO compliance_domains (domain_id, domain_name, domain_weight, description, display_order) VALUES
('SCD',  'Safety Compliance',           0.3000, 'Measures whether people operating on KPC sites are protected by correct procedures, authorisations, training, and equipment.', 1),
('ECD',  'Environmental Compliance',    0.2500, 'Measures KPC adherence to environmental regulations covering water, air, waste, and spill response.', 2),
('AICD', 'Asset Integrity Compliance',  0.2500, 'Measures the extent to which KPC physical assets are inspected, maintained, and monitored within required intervals.', 3),
('RCD',  'Regulatory Compliance',       0.2000, 'Measures whether KPC fulfils obligations to external regulators and its own internal governance requirements.', 4);

-- ─── Safety Indicators ──────────────────────────────────────
INSERT INTO compliance_indicators
  (indicator_id, indicator_name, domain_id, indicator_weight, green_threshold, amber_threshold, indicator_type, description, formula_description, data_sources)
VALUES
('PCI',   'PPE Compliance Rate',                    'SCD', 0.2500, 95.00, 80.00, 'LEADING',  'Percentage of workers observed wearing correct PPE for their task and zone.',         '(Workers with correct PPE / Total workers observed) × 100', 'DS-09'),
('TCI',   'Training Compliance Rate',               'SCD', 0.3000, 90.00, 75.00, 'LEADING',  'Percentage of employees with all mandatory HSE training current and not expired.',     '(Employees with current training / Total employees requiring training) × 100', 'DS-04,DS-05'),
('PTWCI', 'Permit-to-Work Compliance Rate',         'SCD', 0.3000, 98.00, 90.00, 'LEADING',  'Percentage of high-risk activities carried out under a valid, closed PTW.',           '(High-risk activities with valid PTW / Total high-risk activities) × 100', 'DS-10,DS-02'),
('IRCI',  'Incident Reporting Timeliness Rate',     'SCD', 0.1500, 95.00, 80.00, 'LAGGING',  'Percentage of incidents reported within required timeframe (24h or 4h for LTI).',    '(Incidents reported on time / Total incidents) × 100', 'DS-03');

-- ─── Environmental Indicators ───────────────────────────────
INSERT INTO compliance_indicators
  (indicator_id, indicator_name, domain_id, indicator_weight, green_threshold, amber_threshold, indicator_type, description, formula_description, data_sources)
VALUES
('WQCI',  'Water Quality Discharge Compliance Rate','ECD', 0.2500, 95.00, 80.00, 'MIXED',    'Percentage of water discharge samples meeting NEMA discharge standards.',              '(Compliant samples / Total samples) × 100', 'DS-11'),
('AQCI',  'Air Emissions Compliance Rate',          'ECD', 0.2000, 95.00, 80.00, 'MIXED',    'Percentage of air quality readings within NEMA Air Quality Regulations limits.',       '(Readings within limits / Total readings) × 100', 'DS-11'),
('WMCI',  'Waste Management Compliance Rate',       'ECD', 0.3000, 90.00, 75.00, 'LEADING',  'Percentage of waste consignments with compliant documentation and licensed disposal.', '(Compliant consignments / Total consignments) × 100', 'DS-12'),
('SRCI',  'Spill Response Compliance Rate',         'ECD', 0.2500, 95.00, 80.00, 'LAGGING',  'Percentage of spills with compliant response initiation time and documentation.',      '(Compliant responses / Total spills) × 100', 'DS-13');

-- ─── Asset Integrity Indicators ─────────────────────────────
INSERT INTO compliance_indicators
  (indicator_id, indicator_name, domain_id, indicator_weight, green_threshold, amber_threshold, indicator_type, description, formula_description, data_sources)
VALUES
('ICI',   'Asset Inspection Compliance Rate',       'AICD', 0.3000, 95.00, 80.00, 'LEADING', 'Percentage of assets inspected within their required inspection interval.',             '(Assets inspected on schedule / Total assets due) × 100', 'DS-01,DS-02'),
('PMCI',  'Preventive Maintenance Completion Rate', 'AICD', 0.3000, 90.00, 75.00, 'LEADING', 'Percentage of planned PM work orders completed on schedule.',                          '(PM WOs completed on schedule / Total PM WOs planned) × 100', 'DS-02'),
('CMCI',  'Corrosion Monitoring Coverage Rate',     'AICD', 0.2000, 90.00, 75.00, 'LEADING', 'Percentage of corrosion monitoring points read within required interval.',              '(Points read within interval / Total points due) × 100', 'DS-14'),
('LDCI',  'Leak Detection System Availability',     'AICD', 0.2000, 99.00, 95.00, 'LEADING', 'Percentage of time the pipeline leak detection system is operational.',                '(Available hours / Total required hours) × 100', 'DS-08');

-- ─── Regulatory Indicators ──────────────────────────────────
INSERT INTO compliance_indicators
  (indicator_id, indicator_name, domain_id, indicator_weight, green_threshold, amber_threshold, indicator_type, description, formula_description, data_sources)
VALUES
('ACI',   'HSE Audit Completion Rate',              'RCD', 0.2500, 95.00, 80.00, 'LAGGING',  'Percentage of planned HSE audits completed within their scheduled date.',              '(Audits completed on schedule / Total planned audits) × 100', 'DS-06'),
('CACI',  'Corrective Action Closure Rate',         'RCD', 0.3000, 90.00, 75.00, 'LAGGING',  'Percentage of corrective actions closed with evidence by target date.',                '(CARs closed on time / Total CARs due) × 100', 'DS-07'),
('RRI',   'Regulatory Report Submission Rate',      'RCD', 0.2500, 100.00,90.00, 'LAGGING',  'Percentage of statutory reports submitted on time and complete.',                      '(Reports submitted on time / Total reports due) × 100', 'DS-15'),
('SOPCI','Internal SOP Adherence Rate',             'RCD', 0.2000, 90.00, 75.00, 'MIXED',    'Percentage of observed activities carried out in accordance with approved KPC SOPs.',  '(Compliant observations / Total observations) × 100', 'DS-16');
