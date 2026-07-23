/**
 * Typed fetch wrappers for the Sentinel Spring Boot backend API.
 *
 * When NEXT_PUBLIC_SENTINEL_API_URL is set, fetches from the real backend.
 * Otherwise, falls back to local mock data for frontend-only development.
 */

import type { Alert, DataQualitySummary, IngestBatch, SiteDetail, SiteRiskSummary } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

const fetchOpts: RequestInit = { cache: "no-store" };

// ─── Risk ───────────────────────────────────────────────────────────────────

/** GET /api/sites/risk-summary */
export async function fetchRiskSummary(): Promise<SiteRiskSummary[]> {
  if (!API_BASE) {
    const { mockSites } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockSites;
  }
  const res = await fetch(`${API_BASE}/api/sites/risk-summary`, fetchOpts);
  if (!res.ok) throw new Error(`Risk summary fetch failed: ${res.status}`);
  return res.json();
}

/** GET /api/sites/{siteId} */
export async function fetchSiteDetail(siteId: string): Promise<SiteDetail> {
  if (!API_BASE) {
    const { getMockSiteDetail } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return getMockSiteDetail(siteId);
  }
  const res = await fetch(`${API_BASE}/api/sites/${siteId}`, fetchOpts);
  if (!res.ok) throw new Error(`Site detail fetch failed: ${res.status}`);
  return res.json();
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

/** GET /api/alerts */
export async function fetchAlerts(): Promise<Alert[]> {
  if (!API_BASE) {
    const { mockAlerts } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockAlerts;
  }
  const res = await fetch(`${API_BASE}/api/alerts`, fetchOpts);
  if (!res.ok) throw new Error(`Alerts fetch failed: ${res.status}`);
  return res.json();
}

/** POST /api/alerts/{id}/ack */
export async function acknowledgeAlert(id: string): Promise<void> {
  if (!API_BASE) return;
  const res = await fetch(`${API_BASE}/api/alerts/${id}/ack`, { method: "POST" });
  if (!res.ok) throw new Error(`Alert acknowledge failed: ${res.status}`);
}

// ─── Data Quality ───────────────────────────────────────────────────────────

/** GET /api/quality/summary */
export async function fetchQualitySummary(): Promise<DataQualitySummary> {
  if (!API_BASE) {
    const { mockQualitySummary } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockQualitySummary;
  }
  const res = await fetch(`${API_BASE}/api/quality/summary`, fetchOpts);
  if (!res.ok) throw new Error(`Quality summary fetch failed: ${res.status}`);
  return res.json();
}

/** GET /api/quality/batches */
export async function fetchBatches(): Promise<IngestBatch[]> {
  if (!API_BASE) {
    const { mockBatches } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockBatches;
  }
  const res = await fetch(`${API_BASE}/api/quality/batches`, fetchOpts);
  if (!res.ok) throw new Error(`Batches fetch failed: ${res.status}`);
  return res.json();
}
