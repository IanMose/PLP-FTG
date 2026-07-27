/**
 * Typed fetch wrappers for the corridor heatmap endpoints.
 * Follows the same pattern as api.ts: reads JWT from cookie, real fetch with
 * graceful fallback to mock data when the backend isn't running.
 */

import { getAuthToken } from "@/server/server-actions";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

const BASE_OPTS: RequestInit = {
  cache: "no-store",
  signal: AbortSignal.timeout(10_000),
};

async function authedOpts(): Promise<RequestInit> {
  const token = await getAuthToken();
  return {
    ...BASE_OPTS,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

// Types

export interface HeatPoint {
  assetId: string;
  lat: number;
  lon: number;
  weight: number;
  band: "low" | "medium" | "high" | "critical";
}

export interface CorridorAsset {
  assetId: string;
  assetType: string;
  nearestSiteCode: string | null;
  segment: string;
  chainageKmApprox: number;
  latitude: number;
  longitude: number;
  floodLandslideRiskZone: string;
  sensorSuite: string;
}

// Fetch wrappers

/** GET /api/corridor/risk-heatmap */
export async function fetchRiskHeatmap(): Promise<HeatPoint[]> {
  if (!API_BASE) {
    return mockHeatPoints;
  }
  try {
    const res = await fetch(`${API_BASE}/api/corridor/risk-heatmap`, await authedOpts());
    if (!res.ok) throw new Error(`Corridor heatmap fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] corridor/risk-heatmap unreachable, using mock data");
    return mockHeatPoints;
  }
}

/** GET /api/corridor/assets */
export async function fetchCorridorAssets(): Promise<CorridorAsset[]> {
  if (!API_BASE) {
    return mockCorridorAssets;
  }
  try {
    const res = await fetch(`${API_BASE}/api/corridor/assets`, await authedOpts());
    if (!res.ok) throw new Error(`Corridor assets fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] corridor/assets unreachable, using mock data");
    return mockCorridorAssets;
  }
}

// Mock fallback data
// A representative sample of the 99 real monitoring points along the corridor.
// Coordinates are real lat/lon from dim_asset.csv.

export const mockHeatPoints: HeatPoint[] = [
  // Mombasa terminal area — low flood zone
  { assetId: "MP-0001", lat: -4.036697, lon: 39.667218, weight: 0.15, band: "low" },
  { assetId: "MP-0005", lat: -4.009512, lon: 39.491166, weight: 0.18, band: "low" },
  { assetId: "MP-0010", lat: -3.97127,  lon: 39.25931,  weight: 0.20, band: "low" },
  // Samburu-Maungu segment — moderate flood
  { assetId: "MP-0013", lat: -3.924214, lon: 39.142625, weight: 0.40, band: "medium" },
  { assetId: "MP-0018", lat: -3.76757,  lon: 38.97206,  weight: 0.45, band: "medium" },
  { assetId: "MP-0022", lat: -3.627442, lon: 38.798527, weight: 0.50, band: "medium" },
  // Maungu-Voi segment — high flood zone
  { assetId: "MP-0028", lat: -3.370218, lon: 38.554789, weight: 0.70, band: "high" },
  { assetId: "MP-0033", lat: -3.144205, lon: 38.409128, weight: 0.72, band: "high" },
  // Voi-Kibwezi — approaching critical
  { assetId: "MP-0039", lat: -2.855314, lon: 38.182356, weight: 0.58, band: "high" },
  { assetId: "MP-0045", lat: -2.537142, lon: 37.918741, weight: 0.62, band: "high" },
  // Kibwezi-Makindu — high flood, warning status
  { assetId: "MP-0052", lat: -2.224578, lon: 37.632109, weight: 0.76, band: "critical" },
  { assetId: "MP-0057", lat: -1.978341, lon: 37.412874, weight: 0.80, band: "critical" },
  // Makueni pump station approach
  { assetId: "MP-0063", lat: -1.748205, lon: 37.198634, weight: 0.72, band: "high" },
  { assetId: "MP-0068", lat: -1.518472, lon: 36.998127, weight: 0.55, band: "high" },
  // Nairobi approach — moderate
  { assetId: "MP-0075", lat: -1.282314, lon: 36.872504, weight: 0.38, band: "medium" },
  { assetId: "MP-0080", lat: -1.194783, lon: 36.821634, weight: 0.32, band: "medium" },
  // Nairobi terminal area — low risk
  { assetId: "MP-0085", lat: -1.132456, lon: 36.789341, weight: 0.22, band: "low" },
  { assetId: "MP-0090", lat: -1.078234, lon: 36.754128, weight: 0.18, band: "low" },
  { assetId: "MP-0095", lat: -1.024183, lon: 36.718956, weight: 0.15, band: "low" },
  { assetId: "MP-0099", lat: -1.281457, lon: 36.867214, weight: 0.20, band: "low" },
];

export const mockCorridorAssets: CorridorAsset[] = mockHeatPoints.map((p) => ({
  assetId: p.assetId,
  assetType: "monitoring_point",
  nearestSiteCode: null,
  segment: "Mombasa-Nairobi",
  chainageKmApprox: 0,
  latitude: p.lat,
  longitude: p.lon,
  floodLandslideRiskZone: p.band === "critical" ? "high_flood"
    : p.band === "high" ? "moderate_flood"
    : "low",
  sensorSuite: "pressure,flow,fiber_acoustic,rainfall",
}));
