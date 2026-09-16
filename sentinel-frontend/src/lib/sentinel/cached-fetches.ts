/**
 * React cache() wrappers for server-side data fetching.
 *
 * cache() deduplicates identical calls within the same render pass —
 * so layout.tsx and alerts/page.tsx can both call cachedFetchAlerts()
 * and only one HTTP request is made to the backend per page load.
 *
 * Must be imported by Server Components only (no "use client").
 */

import { cache } from "react";
import { fetchAlerts, fetchQualitySummary, fetchRiskSummary, fetchTelemetrySummary, fetchBatches } from "./api";
import type { Alert, DataQualitySummary, SiteRiskSummary, TelemetrySummary, IngestBatch } from "./types";

// Test mode: return mock data when backend is down (TEMP - remove before prod)
const TEST_MODE = process.env.NEXT_PUBLIC_TEST_MODE === "true";

const MOCK_ALERTS: Alert[] = [];
const MOCK_QUALITY_SUMMARY: DataQualitySummary = {
  trusted: 0,
  corrected: 0,
  review: 0,
  rejected: 0,
  total: 0,
  passRate: 1,
  gateStatus: "passed",
  threshold: 0.9,
  lastBatchId: "",
  lastBatchDate: new Date().toISOString(),
};
const MOCK_RISK_SUMMARY: SiteRiskSummary[] = [];
const MOCK_TELEMETRY_SUMMARY: TelemetrySummary = {
  totalReadings: 0,
  pressureSpikeCount: 0,
  sensorDropoutCount: 0,
  avgPressure: 0,
  avgFlowRate: 0,
  avgTemperature: 0,
};
const MOCK_BATCHES: IngestBatch[] = [];

async function safeFetch<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  if (!TEST_MODE) return fn();
  try {
    return await fn();
  } catch {
    console.warn("[TEST_MODE] Backend unavailable, returning mock data");
    return fallback;
  }
}

export const cachedFetchAlerts          = cache(() => safeFetch(fetchAlerts, MOCK_ALERTS));
export const cachedFetchQualitySummary  = cache(() => safeFetch(fetchQualitySummary, MOCK_QUALITY_SUMMARY));
export const cachedFetchRiskSummary     = cache(() => safeFetch(fetchRiskSummary, MOCK_RISK_SUMMARY));
export const cachedFetchTelemetrySummary = cache(() => safeFetch(fetchTelemetrySummary, MOCK_TELEMETRY_SUMMARY));
export const cachedFetchBatches         = cache(() => safeFetch(fetchBatches, MOCK_BATCHES));
