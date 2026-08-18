-- data-h2.sql — loaded by spring.sql.init on H2 dev profile only (create-drop).
-- Seeds the 7 KPC pipeline sites so the risk API returns real data without Flyway.
-- Incidents, audits, and telemetry are injected by the ETL pipeline at runtime.

INSERT INTO dim_site (site_id, site_name, location) VALUES
  ('site-001', 'Nairobi Terminal',        'Nairobi, Kenya'),
  ('site-002', 'Mombasa Terminal',         'Mombasa, Kenya'),
  ('site-003', 'Makueni Pump Station',     'Makueni County, Kenya'),
  ('site-004', 'Nakuru Depot',             'Nakuru, Kenya'),
  ('site-005', 'Eldoret Terminal',         'Eldoret, Kenya'),
  ('site-006', 'Sinendet Pump Station',    'Kericho County, Kenya'),
  ('site-007', 'Kisumu Terminal',          'Kisumu, Kenya');
