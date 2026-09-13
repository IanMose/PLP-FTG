-- V7: Correct pump station segments in dim_asset and add missing stations.
--
-- V6 seeded all pump stations with single-town segment labels (e.g. 'Samburu',
-- 'Maungu') instead of the correct corridor-span labels (e.g. 'Mombasa-Samburu').
-- Uses MERGE INTO (H2-compatible upsert) to correct existing rows and add new ones.
-- New stations added: PS-12 Athi River, PS-21 Naivasha, PS-22 Nakuru booster, PS-25 Nakuru junction.

-- ── Main line: correct segment labels ────────────────────────────────────────
MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-01', 'pump_station', 'site-002', 'Mombasa', NULL, -4.051253, 39.666512, NULL, 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-02', 'pump_station', NULL, 'Mombasa-Samburu', NULL, -3.874, 39.451, NULL, 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-03', 'pump_station', NULL, 'Mombasa-Samburu', NULL, -3.799, 39.312, NULL, 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-04', 'pump_station', NULL, 'Samburu-Maungu', NULL, -3.197989, 38.46737, 'high_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-05', 'pump_station', NULL, 'Samburu-Maungu', NULL, -3.740, 39.056, NULL, 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-06', 'pump_station', 'site-003', 'Mtito Andei-Makindu', NULL, -2.290399, 37.847388, 'high_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-07', 'pump_station', NULL, 'Makindu-Sultan Hamud', NULL, -1.935023, 37.317402, 'moderate_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-08', 'pump_station', NULL, 'Sultan Hamud-Konza', NULL, -1.754144, 37.162143, 'moderate_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-10', 'pump_station', 'site-001', 'Athi River-Nairobi Terminal', NULL, -1.289533, 36.837614, NULL, 'pressure,flow,vibration');

-- ── Western spur: correct segment labels ─────────────────────────────────────
MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-23', 'pump_station', NULL, 'Nairobi Terminal-Naivasha', NULL, -0.698859, 36.435725, 'moderate_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-24', 'pump_station', 'site-004', 'Naivasha-Nakuru', NULL, -0.28649, 36.080296, 'high_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-26', 'pump_station', 'site-006', 'Nakuru-Sinendet', NULL, 0.042708, 35.451443, NULL, 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-27', 'pump_station', 'site-005', 'Sinendet-Eldoret', NULL, 0.499555, 35.26818, NULL, 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-28', 'pump_station', NULL, 'Muhoroni-Kisumu', NULL, -0.089499, 34.759396, NULL, 'pressure,flow,vibration');

-- ── New stations — genuinely absent in V6 ────────────────────────────────────
MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-12', 'pump_station', NULL, 'Konza-Athi River', NULL, -1.451, 36.978, NULL, 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-21', 'pump_station', NULL, 'Nairobi Terminal-Naivasha', NULL, -0.717, 36.433, 'moderate_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-22', 'pump_station', 'site-004', 'Naivasha-Nakuru', NULL, -0.303, 36.081, 'high_flood', 'pressure,flow,vibration');

MERGE INTO dim_asset (asset_id, asset_type, nearest_site_code, segment, chainage_km_approx, latitude, longitude, flood_landslide_risk_zone, sensor_suite)
KEY (asset_id)
VALUES ('PS-25', 'pump_station', 'site-004', 'Nakuru-Sinendet', NULL, -0.302, 36.079, NULL, 'pressure,flow,vibration');
