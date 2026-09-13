"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";
const POLL_INTERVAL_MS = 15_000; // 15 s
const ALERT_SEVERITIES = new Set(["Critical", "High"]);

export interface NewAlertInfo {
  id: string;
  siteId: string;
  siteName: string;
  severity: string;
  title: string;
}

interface UseSentinelAlertsResult {
  newAlerts: NewAlertInfo[];
  activeCount: number;
  clearNew: () => void;
}

/**
 * useSentinelAlerts — v3
 *
 * Triggers sound when a NEW Critical/High alert ID appears that wasn't
 * present on the previous poll.
 *
 * This is the correct operational behaviour:
 *  - Sound fires once when a new alert is created (new problem detected)
 *  - Goes quiet while the same alert stays active (officer already knows)
 *  - Fires again only if the alert is resolved and a new one is raised
 *
 * Previous v2 watched batch IDs from /api/quality/batches — those are
 * static historical seed records and never change, so sound never fired.
 *
 * Strategy:
 *   1. Poll /api/alerts every 15 seconds
 *   2. On first fetch, seed the known alert IDs — no sound
 *   3. On subsequent fetches, find Critical/High alert IDs not seen before
 *   4. Fire sound for those new alerts
 */
export function useSentinelAlerts(): UseSentinelAlertsResult {
  const [newAlerts, setNewAlerts]   = useState<NewAlertInfo[]>([]);
  const [activeCount, setActiveCount] = useState(0);

  // Set of alert IDs we have already notified about
  const knownIds     = useRef<Set<string>>(new Set());
  const isFirstFetch = useRef(true);

  function authHeaders(): HeadersInit {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("sentinel_token") ?? "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  const poll = useCallback(async () => {
    if (!API_BASE) return;
    try {
      const res = await fetch(`${API_BASE}/api/alerts`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!res.ok) return;

      const alerts: Array<{
        id: string; siteId: string; siteName: string;
        severity: string; status: string; title: string;
      }> = await res.json();

      const activeAlerts  = alerts.filter((a) => a.status === "active");
      const dangerousAlerts = activeAlerts.filter((a) =>
        ALERT_SEVERITIES.has(a.severity)
      );

      setActiveCount(activeAlerts.length);

      if (isFirstFetch.current) {
        // Seed — record all current IDs silently, no sound on page load
        dangerousAlerts.forEach((a) => knownIds.current.add(a.id));
        isFirstFetch.current = false;
        return;
      }

      // Find alerts whose ID we have never seen before
      const brandNew = dangerousAlerts.filter(
        (a) => !knownIds.current.has(a.id)
      );

      // Add them to known so we don't fire again on the next poll
      brandNew.forEach((a) => knownIds.current.add(a.id));

      if (brandNew.length > 0) {
        setNewAlerts(
          brandNew.map((a) => ({
            id: a.id,
            siteId: a.siteId,
            siteName: a.siteName,
            severity: a.severity,
            title: a.title,
          }))
        );
      }
    } catch {
      // Silent — network errors don't crash the sound system
    }
  }, []);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  const clearNew = useCallback(() => setNewAlerts([]), []);

  return { newAlerts, activeCount, clearNew };
}
