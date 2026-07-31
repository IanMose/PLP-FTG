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

export const cachedFetchAlerts          = cache(fetchAlerts);
export const cachedFetchQualitySummary  = cache(fetchQualitySummary);
export const cachedFetchRiskSummary     = cache(fetchRiskSummary);
export const cachedFetchTelemetrySummary = cache(fetchTelemetrySummary);
export const cachedFetchBatches         = cache(fetchBatches);
