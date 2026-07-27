/**
 * Typed fetch wrappers for the Sentinel Spring Boot backend API.
 *
 * All authenticated endpoints read the JWT from the "sentinel-token" cookie
 * (written by LoginForm on the client side) so Next.js Server Components can
 * pass the Bearer header without touching localStorage.
 *
 * Falls back to mock data gracefully when the backend is unreachable.
 */

import { getAuthToken } from "@/server/server-actions";
import type { Alert, DataQualitySummary, IngestBatch, SiteDetail, SiteRiskSummary, TelemetrySummary } from "./types";
import type { AuthResponse, CreateUserRequest, SentinelUser, SentinelRole } from "./auth-types";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

const BASE_OPTS: RequestInit = {
  cache: "no-store",
  signal: AbortSignal.timeout(10_000),
};

/** Fetch options that include the JWT Authorization header. */
async function authedOpts(): Promise<RequestInit> {
  const token = await getAuthToken();
  return {
    ...BASE_OPTS,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  };
}

// ─── Risk ────────────────────────────────────────────────────────────────────

/** GET /api/sites/risk-summary */
export async function fetchRiskSummary(): Promise<SiteRiskSummary[]> {
  if (!API_BASE) {
    const { mockSites } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockSites;
  }
  try {
    const res = await fetch(`${API_BASE}/api/sites/risk-summary`, await authedOpts());
    if (!res.ok) throw new Error(`Risk summary fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] risk-summary unreachable, using mock data");
    const { mockSites } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockSites;
  }
}

/** GET /api/sites/{siteId} */
export async function fetchSiteDetail(siteId: string): Promise<SiteDetail> {
  if (!API_BASE) {
    const { getMockSiteDetail } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return getMockSiteDetail(siteId);
  }
  try {
    const res = await fetch(`${API_BASE}/api/sites/${siteId}`, await authedOpts());
    if (!res.ok) throw new Error(`Site detail fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn(`[Sentinel API] site/${siteId} unreachable, using mock data`);
    const { getMockSiteDetail } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return getMockSiteDetail(siteId);
  }
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

/** GET /api/alerts */
export async function fetchAlerts(): Promise<Alert[]> {
  if (!API_BASE) {
    const { mockAlerts } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockAlerts;
  }
  try {
    const res = await fetch(`${API_BASE}/api/alerts`, await authedOpts());
    if (!res.ok) throw new Error(`Alerts fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] alerts unreachable, using mock data");
    const { mockAlerts } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockAlerts;
  }
}

/** POST /api/alerts/{id}/ack */
export async function acknowledgeAlert(id: string): Promise<void> {
  if (!API_BASE) return;
  const opts = await authedOpts();
  const res = await fetch(`${API_BASE}/api/alerts/${id}/ack`, { ...opts, method: "POST" });
  if (!res.ok) throw new Error(`Alert acknowledge failed: ${res.status}`);
}

// ─── Data Quality ─────────────────────────────────────────────────────────────

/** GET /api/quality/summary */
export async function fetchQualitySummary(): Promise<DataQualitySummary> {
  if (!API_BASE) {
    const { mockQualitySummary } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockQualitySummary;
  }
  try {
    const res = await fetch(`${API_BASE}/api/quality/summary`, await authedOpts());
    if (!res.ok) throw new Error(`Quality summary fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] quality/summary unreachable, using mock data");
    const { mockQualitySummary } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockQualitySummary;
  }
}

/** GET /api/quality/batches */
export async function fetchBatches(): Promise<IngestBatch[]> {
  if (!API_BASE) {
    const { mockBatches } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockBatches;
  }
  try {
    const res = await fetch(`${API_BASE}/api/quality/batches`, await authedOpts());
    if (!res.ok) throw new Error(`Batches fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] quality/batches unreachable, using mock data");
    const { mockBatches } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockBatches;
  }
}

// ─── Telemetry ────────────────────────────────────────────────────────────────

/** GET /api/telemetry/summary */
export async function fetchTelemetrySummary(): Promise<TelemetrySummary> {
  if (!API_BASE) {
    const { mockTelemetrySummary } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockTelemetrySummary;
  }
  try {
    const res = await fetch(`${API_BASE}/api/telemetry/summary`, await authedOpts());
    if (!res.ok) throw new Error(`Telemetry summary fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] telemetry/summary unreachable, using mock data");
    const { mockTelemetrySummary } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockTelemetrySummary;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/auth/login — public endpoint, no JWT needed */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
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
  const res = await fetch(`${API_BASE}/api/users`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Users fetch failed: ${res.status}`);
  return res.json();
}

/** POST /api/users */
export async function createUser(request: CreateUserRequest, token: string): Promise<SentinelUser> {
  const res = await fetch(`${API_BASE}/api/users`, {
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
  const res = await fetch(`${API_BASE}/api/users/${id}/status`, {
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
  const res = await fetch(`${API_BASE}/api/users/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

/** GET /api/users/roles */
export async function fetchRoles(token: string): Promise<SentinelRole[]> {
  const res = await fetch(`${API_BASE}/api/users/roles`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Roles fetch failed: ${res.status}`);
  return res.json();
}
