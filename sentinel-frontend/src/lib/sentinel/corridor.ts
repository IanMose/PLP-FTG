/**
 * Typed fetch wrappers for the corridor heatmap endpoints.
 *
 * No mock fallbacks — if the backend is unreachable, these functions throw.
 * The calling page (sites/page.tsx) catches the error and renders
 * <BackendError> instead of empty or fake content.
 */

import { getAuthToken } from "@/server/server-actions";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

function requireApiBase(): string {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_SENTINEL_API_URL is not set. " +
      "Add it to .env.local, e.g. NEXT_PUBLIC_SENTINEL_API_URL=http://localhost:8080",
    );
  }
  return API_BASE;
}

const TIMEOUT_MS = 10_000;

/**
 * Returns an AbortSignal that fires after TIMEOUT_MS.
 *
 * AbortSignal.timeout() is avoided here because it throws a DOMException
 * (TimeoutError) whose .message property is a read-only getter. Turbopack's
 * error boundary tries to write to .message and crashes with:
 *   "TypeError: Cannot set property message of which has only a getter"
 *
 * Using AbortController + setTimeout throws a plain Error instead, which
 * the error boundary handles cleanly.
 */
function makeTimeoutSignal(): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(new Error(`Request timed out after ${TIMEOUT_MS}ms`)), TIMEOUT_MS);
  return controller.signal;
}

async function authedOpts(): Promise<RequestInit> {
  const token = await getAuthToken();
  return {
    cache: "no-store",
    signal: makeTimeoutSignal(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.message ?? body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Fetch wrappers ───────────────────────────────────────────────────────────

/** GET /api/corridor/risk-heatmap */
export async function fetchRiskHeatmap(): Promise<HeatPoint[]> {
  const res = await fetch(`${requireApiBase()}/api/corridor/risk-heatmap`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/corridor/assets */
export async function fetchCorridorAssets(): Promise<CorridorAsset[]> {
  const res = await fetch(`${requireApiBase()}/api/corridor/assets`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}
