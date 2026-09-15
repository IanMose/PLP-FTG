-- V9: Add Kisumu Terminal (site-007 / PS28), rename sites to real KPC identities.
--
-- Changes:
--   1. Add site-007 — Kisumu Terminal (PS28), one of KPC's 5 confirmed depots.
--      Source: Wikipedia / LeadIQ / OGJ 1995: "terminals constructed at Nakuru,
--      Eldoret, and Kisumu". KPC official tender Nov 2024 confirms PS28 = Kisumu.
--
--   2. Rename site-002: "Mombasa Terminal" → "Mombasa Terminal (Kipevu / PS14)"
--      Source: KPC tender KPC/PU/001-OT/18-19 (Scribd): PS14 = KOSF (Kipevu
--      Oil Storage Facility). KPC took full operational control in 2023.
--
--   3. Rename site-003: "Makueni Pump Station" → "Makueni Pipeline Section (Thange)"
--      The 2015 Thange River spill occurred on the Mombasa-Nairobi pipeline in
--      Makueni County near Kibwezi (confirmed by Kenya Senate petition records and
--      academic studies). There is no KPC management facility called "Makueni
--      Pump Station" — this site represents the high-risk corridor segment for the
--      Kimeu v. KPC simulation framing.
--
--   4. Link PS-28 in dim_asset to the new site-007 (FK was NULL before).

-- ─── 1. Add Kisumu Terminal to dim_site ──────────────────────────────────────
INSERT INTO dim_site (site_id, site_name, location) VALUES
('site-007', 'Kisumu Terminal (PS28)', 'Kisumu, Kenya');

-- ─── 2. Seed minimal realistic data for Kisumu (normal-risk site) ────────────
-- Two incidents — low severity, normal operations pattern
INSERT INTO fact_incidents (incident_id, site_id, incident_date, severity, description, compliance_score, decision, decision_reason, batch_id) VALUES
('INC-2026-0501', 'site-007', '2026-07-18 00:00:00', 'Low',
 'Minor product spill during tanker loading — contained within bund, no environmental impact.',
 88, 'trusted', 'All validation rules pass', 'b-0033'),
('INC-2026-0502', 'site-007', '2026-07-10 00:00:00', 'Medium',
 'Metering skid calibration drift detected — recalibrated within 4 hours.',
 74, 'corrected', 'compliance_score normalized from out-of-range after manual review', 'b-0032');

-- One recent audit — good compliance, no follow-up required
INSERT INTO fact_audits (audit_id, site_id, inspection_date, auditor, findings, compliance_score, follow_up_required) VALUES
('AUD-2026-0230', 'site-007', '2026-07-20 00:00:00', 'F. Ochieng',
 'Satisfactory across all areas. Loading bay drainage maintained. Emergency response drills current.',
 87, FALSE);

-- ─── 3. Rename existing sites to reflect real KPC identities ─────────────────
UPDATE dim_site
   SET site_name = 'Mombasa Terminal (Kipevu / PS14)',
       location  = 'Kipevu, Mombasa, Kenya'
 WHERE site_id = 'site-002';

UPDATE dim_site
   SET site_name = 'Makueni Pipeline Section (Thange)',
       location  = 'Makueni County, Kenya'
 WHERE site_id = 'site-003';

-- ─── 4. Link PS-28 in dim_asset to the new site-007 ─────────────────────────
UPDATE dim_asset
   SET nearest_site_code = 'site-007'
 WHERE asset_id = 'PS-28';
