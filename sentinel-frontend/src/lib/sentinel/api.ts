/**
 * Typed fetch wrappers for the Sentinel Spring Boot backend API.
 *
 * All authenticated endpoints read the JWT from the "sentinel-token" cookie
 * (written by LoginForm on the client side) so Next.js Server Components can
 * pass the Bearer header without touching localStorage.
 *
 * No mock fallbacks — if the backend is unreachable, these functions throw.
 * Callers (dashboard page Server Components) catch the error and render
 * <BackendError> instead of empty or fake content.
 */

import { getAuthToken } from "@/server/server-actions";
import type {
  Alert,
  ControlChartData,
  CorrelationData,
  DataQualitySummary,
  FeatureImportanceData,
  IngestBatch,
  PredictionDto,
  SiteDetail,
  SiteRiskSummary,
  SurvivalCurveData,
  TelemetrySummary,
  WhatIfRequest,
  WhatIfResponse,
} from "./types";
import type { AuthResponse, CreateUserRequest, SentinelUser, SentinelRole } from "./auth-types";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

/** Throws a clear error if the env var is missing — called inside each fetch function. */
function requireApiBase(): string {
  if (!API_BASE) {
    throw new Error(
      "NEXT_PUBLIC_SENTINEL_API_URL is not set. " +
      "Add it to .env.local, e.g. NEXT_PUBLIC_SENTINEL_API_URL=http://localhost:8080",
    );
  }
  return API_BASE;
}

const TIMEOUT_MS = 15_000;

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

/** Fetch options that include the JWT Authorization header. */
async function authedOpts(): Promise<RequestInit> {
  const token = await getAuthToken();
  return {
    cache: "no-store",
    signal: makeTimeoutSignal(),
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

/** Parse a JSON error body from the backend's GlobalExceptionHandler format. */
async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body.message ?? body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

// ─── Risk ────────────────────────────────────────────────────────────────────

/** GET /api/sites/risk-summary */
export async function fetchRiskSummary(): Promise<SiteRiskSummary[]> {
  const res = await fetch(`${requireApiBase()}/api/sites/risk-summary`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/sites/{siteId} */
export async function fetchSiteDetail(siteId: string): Promise<SiteDetail> {
  const res = await fetch(`${requireApiBase()}/api/sites/${siteId}`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/**
 * POST /api/sites/{siteId}/simulate
 *
 * What-if risk simulation — no auth required (/api/sites/** is permitAll()).
 * IMPORTANT: This is a plain fetch — do NOT use authedOpts() here.
 * authedOpts() calls getAuthToken() which is a Server Action and will
 * throw when invoked from a client-side event handler.
 */
export async function simulateRisk(
  siteId: string,
  overrides: WhatIfRequest,
): Promise<WhatIfResponse> {
  const res = await fetch(`${requireApiBase()}/api/sites/${siteId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: makeTimeoutSignal(),
    body: JSON.stringify(overrides),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

/** GET /api/alerts */
export async function fetchAlerts(): Promise<Alert[]> {
  const res = await fetch(`${requireApiBase()}/api/alerts`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** POST /api/alerts/{id}/ack */
export async function acknowledgeAlert(id: string): Promise<void> {
  const opts = await authedOpts();
  const res = await fetch(`${requireApiBase()}/api/alerts/${id}/ack`, { ...opts, method: "POST" });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
}

// ─── Data Quality ─────────────────────────────────────────────────────────────

/** GET /api/quality/summary */
export async function fetchQualitySummary(): Promise<DataQualitySummary> {
  const res = await fetch(`${requireApiBase()}/api/quality/summary`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/quality/batches */
export async function fetchBatches(): Promise<IngestBatch[]> {
  const res = await fetch(`${requireApiBase()}/api/quality/batches`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

/** GET /api/telemetry/summary */
export async function fetchTelemetrySummary(): Promise<TelemetrySummary> {
  const res = await fetch(`${requireApiBase()}/api/telemetry/summary`, await authedOpts());
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/auth/login — public endpoint, no JWT needed */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${requireApiBase()}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Invalid email or password");
  }
  return res.json();
}

// ─── User Management ──────────────────────────────────────────────────────────

/** GET /api/users */
export async function fetchUsers(token: string): Promise<SentinelUser[]> {
  const res = await fetch(`${requireApiBase()}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Users fetch failed: ${res.status}`);
  return res.json();
}

/** GET /api/users/roles */
export async function fetchRoles(token: string): Promise<SentinelRole[]> {
  const res = await fetch(`${requireApiBase()}/api/users/roles`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Roles fetch failed: ${res.status}`);
  return res.json();
}

/** POST /api/users */
export async function createUser(request: CreateUserRequest, token: string): Promise<SentinelUser> {
  const res = await fetch(`${requireApiBase()}/api/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? "Failed to create user");
  }
  return res.json();
}

/** PATCH /api/users/{id}/status */
export async function updateUserStatus(id: number, status: string, token: string): Promise<SentinelUser> {
  const res = await fetch(`${requireApiBase()}/api/users/${id}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(`Status update failed: ${res.status}`);
  return res.json();
}

/** DELETE /api/users/{id} */
export async function deleteUser(id: number, token: string): Promise<void> {
  const res = await fetch(`${requireApiBase()}/api/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ─── ETL Config ───────────────────────────────────────────────────────────────

/** GET /api/config/etl — public, no JWT needed */
export async function fetchEtlConfig(): Promise<{ frontendRefreshMs: number; pollIntervalMs: number; rowsPerCycle: number }> {
  const base = requireApiBase();
  const res = await fetch(`${base}/api/config/etl`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ETL config fetch failed: ${res.status}`);
  return res.json();
}

// ─── Analytics (Stage C / D diagnostics) ─────────────────────────────────────

/** GET /api/analytics/survival-curves */
export async function fetchSurvivalCurves(): Promise<SurvivalCurveData> {
  const res = await fetch(`${requireApiBase()}/api/analytics/survival-curves`, {
    cache: "no-store",
    signal: makeTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/analytics/pressure-charts */
export async function fetchPressureCharts(): Promise<ControlChartData> {
  const res = await fetch(`${requireApiBase()}/api/analytics/pressure-charts`, {
    cache: "no-store",
    signal: makeTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/analytics/correlation */
export async function fetchCorrelation(): Promise<CorrelationData> {
  const res = await fetch(`${requireApiBase()}/api/analytics/correlation`, {
    cache: "no-store",
    signal: makeTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/analytics/feature-importance */
export async function fetchFeatureImportance(): Promise<FeatureImportanceData> {
  const res = await fetch(`${requireApiBase()}/api/analytics/feature-importance`, {
    cache: "no-store",
    signal: makeTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/sites/predictions */
export async function fetchPredictions(): Promise<PredictionDto[]> {
  const res = await fetch(`${requireApiBase()}/api/sites/predictions`, {
    cache: "no-store",
    signal: makeTimeoutSignal(),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

/** GET /api/sites/{siteId}/prediction */
export async function fetchSitePrediction(siteId: string): Promise<PredictionDto | null> {
  const res = await fetch(`${requireApiBase()}/api/sites/${siteId}/prediction`, {
    cache: "no-store",
    signal: makeTimeoutSignal(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}
