"use client";

import { useState } from "react";
import { useTankTelemetryList } from "@/lib/control-plane/api";
import { TankCard } from "@/components/control-plane/TankCard";
import { mockTankTelemetry } from "@/lib/control-plane/mocks";

const SITES = Array.from(
  new Set(mockTankTelemetry.map((t) => ({ id: t.siteId, name: t.siteName }))),
).reduce<{ id: string; name: string }[]>((acc, s) => {
  if (!acc.find((x) => x.id === s.id)) acc.push(s);
  return acc;
}, []);

export default function LiveTankMonitorPage() {
  const [siteId, setSiteId] = useState<string | undefined>(undefined);
  const { data: tanks, isLoading, isError } = useTankTelemetryList(siteId);

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--console-text)]">
            Live Tank Monitor
          </h1>
          <p className="text-xs text-[var(--console-text-dim)] mt-0.5">
            Auto-refreshes every 3 seconds — mock data active until backend is live
          </p>
        </div>

        {/* Site filter */}
        <select
          value={siteId ?? ""}
          onChange={(e) => setSiteId(e.target.value || undefined)}
          className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] px-3 py-1.5 text-sm text-[var(--console-text)] focus:outline-none focus:ring-1 focus:ring-white/20"
        >
          <option value="">All sites</option>
          {SITES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* States */}
      {isError && (
        <div className="rounded-md border border-[var(--console-border)] p-6 text-center text-sm text-[var(--console-text-dim)]">
          Telemetry unavailable — no data shown rather than a stale reading.
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-[var(--console-text-dim)] animate-pulse">
          Loading tank telemetry…
        </div>
      )}

      {tanks && tanks.length === 0 && (
        <div className="text-sm text-[var(--console-text-dim)]">
          No tanks reporting for this filter.
        </div>
      )}

      {/* Tank grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tanks?.map((tank) => (
          <TankCard key={tank.tankId} tank={tank} />
        ))}
      </div>

      {/* Legend */}
      <div className="pt-4 border-t border-[var(--console-border)] flex flex-wrap gap-4 text-xs text-[var(--console-text-dim)]">
        {(["NORMAL", "WATCH", "WARNING", "CRITICAL", "EMERGENCY"] as const).map((band) => (
          <span key={band} className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: `var(--risk-${band.toLowerCase().replace("emergency", "emergency")})`,
              }}
            />
            {band.charAt(0) + band.slice(1).toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}
