"use client";

/**
 * DashboardAutoRefresh
 *
 * Invisible client component that polls router.refresh() on a configurable
 * interval so Next.js Server Components re-fetch their data from the backend
 * without a full page reload.
 *
 * The interval is fetched once from GET /api/config/etl (driven by
 * sentinel.etl.frontend-refresh-ms in application.yml) so there is a single
 * source of truth for all timing values.
 *
 * Falls back to DEFAULT_INTERVAL_MS if the backend is unreachable on mount.
 */

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const DEFAULT_INTERVAL_MS = 125_000; // 2 min 5 s — matches yml default
const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export function DashboardAutoRefresh() {
  const router   = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let intervalMs = DEFAULT_INTERVAL_MS;

    async function start(ms: number) {
      // Clear any existing timer before starting a new one
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        router.refresh();
      }, ms);
    }

    // Fetch the interval from the backend; fall back to default on any error
    async function init() {
      if (API_BASE) {
        try {
          const res = await fetch(`${API_BASE}/api/config/etl`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            if (typeof data.frontendRefreshMs === "number" && data.frontendRefreshMs > 0) {
              intervalMs = data.frontendRefreshMs;
            }
          }
        } catch {
          // Backend unreachable — use default, dashboard still works
        }
      }
      await start(intervalMs);
    }

    init();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  // router is stable across renders; empty dep array is intentional here
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Renders nothing — purely behavioural
  return null;
}
