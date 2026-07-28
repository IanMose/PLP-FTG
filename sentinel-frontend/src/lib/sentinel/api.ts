/**
 * Typed fetch wrappers for the Sentinel Spring Boot backend API.
 *
 * When NEXT_PUBLIC_SENTINEL_API_URL is set, fetches from the real backend.
 * If the backend is unreachable or slow, gracefully falls back to mock data.
 */

import type {
  Alert,
  ComplianceNetworkSummary,
  ComplianceSummary,
  ComplianceTrendPoint,
  ComplianceViolation,
  DataQualitySummary,
  IngestBatch,
  SiteDetail,
  SiteRiskSummary,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

const fetchOpts: RequestInit = {
  cache: "no-store",
  signal: AbortSignal.timeout(10000), // 10s timeout — covers JVM cold start
};

// ─── Risk ───────────────────────────────────────────────────────────────────

/** GET /api/sites/risk-summary */
export async function fetchRiskSummary(): Promise<SiteRiskSummary[]> {
  if (!API_BASE) {
    const { mockSites } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockSites;
  }
  try {
    const res = await fetch(`${API_BASE}/api/sites/risk-summary`, fetchOpts);
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
    const res = await fetch(`${API_BASE}/api/sites/${siteId}`, fetchOpts);
    if (!res.ok) throw new Error(`Site detail fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn(`[Sentinel API] site/${siteId} unreachable, using mock data`);
    const { getMockSiteDetail } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return getMockSiteDetail(siteId);
  }
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

/** GET /api/alerts */
export async function fetchAlerts(): Promise<Alert[]> {
  if (!API_BASE) {
    const { mockAlerts } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockAlerts;
  }
  try {
    const res = await fetch(`${API_BASE}/api/alerts`, fetchOpts);
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
  try {
    const res = await fetch(`${API_BASE}/api/quality/summary`, fetchOpts);
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
    const res = await fetch(`${API_BASE}/api/quality/batches`, fetchOpts);
    if (!res.ok) throw new Error(`Batches fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] quality/batches unreachable, using mock data");
    const { mockBatches } = await import("@/app/(main)/dashboard/sentinel/_components/sentinel-data");
    return mockBatches;
  }
}

// ─── Compliance ──────────────────────────────────────────────────────────────

/** GET /api/compliance/network */
export async function fetchComplianceNetwork(): Promise<ComplianceNetworkSummary> {
  if (!API_BASE) {
    const { mockComplianceNetwork } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return mockComplianceNetwork;
  }
  try {
    const res = await fetch(`${API_BASE}/api/compliance/network`, fetchOpts);
    if (!res.ok) throw new Error(`Compliance network fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] compliance/network unreachable, using mock data");
    const { mockComplianceNetwork } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return mockComplianceNetwork;
  }
}

/** GET /api/compliance/sites/{siteId} */
export async function fetchComplianceSite(siteId: string): Promise<ComplianceSummary> {
  if (!API_BASE) {
    const { getMockComplianceSite } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return getMockComplianceSite(siteId);
  }
  try {
    const res = await fetch(`${API_BASE}/api/compliance/sites/${siteId}`, fetchOpts);
    if (!res.ok) throw new Error(`Compliance site fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn(`[Sentinel API] compliance/sites/${siteId} unreachable, using mock data`);
    const { getMockComplianceSite } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return getMockComplianceSite(siteId);
  }
}

/** GET /api/compliance/violations?siteId= */
export async function fetchComplianceViolations(
  siteId?: string,
): Promise<ComplianceViolation[]> {
  if (!API_BASE) {
    const { mockViolations } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return siteId ? mockViolations.filter((v) => v.siteId === siteId) : mockViolations;
  }
  const url = siteId
    ? `${API_BASE}/api/compliance/violations?siteId=${siteId}`
    : `${API_BASE}/api/compliance/violations`;
  try {
    const res = await fetch(url, fetchOpts);
    if (!res.ok) throw new Error(`Compliance violations fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] compliance/violations unreachable, using mock data");
    const { mockViolations } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return siteId ? mockViolations.filter((v) => v.siteId === siteId) : mockViolations;
  }
}

/** GET /api/compliance/trend?siteId= */
export async function fetchComplianceTrend(
  siteId?: string,
): Promise<ComplianceTrendPoint[]> {
  if (!API_BASE) {
    const { mockComplianceTrend } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return mockComplianceTrend;
  }
  const url = siteId
    ? `${API_BASE}/api/compliance/trend?siteId=${siteId}`
    : `${API_BASE}/api/compliance/trend`;
  try {
    const res = await fetch(url, fetchOpts);
    if (!res.ok) throw new Error(`Compliance trend fetch failed: ${res.status}`);
    return res.json();
  } catch {
    console.warn("[Sentinel API] compliance/trend unreachable, using mock data");
    const { mockComplianceTrend } = await import(
      "@/app/(main)/dashboard/sentinel/_components/sentinel-data"
    );
    return mockComplianceTrend;
  }
}
