"use client";

import { useState } from "react";
import { useTankTelemetryList } from "@/lib/control-plane/api";
import { TankCard } from "@/components/control-plane/TankCard";
import { mockTankTelemetry } from "@/lib/control-plane/mocks";
import { RISK_BAND } from "@/lib/control-plane/tokens";
import type { RiskBandKey } from "@/lib/control-plane/tokens";

const SITES = Array.from(
  new Set(mockTankTelemetry.map((t) => ({ id: t.siteId, name: t.siteName }))),
).reduce<{ id: string; name: string }[]>((acc, s) => {
  if (!acc.find((x) => x.id === s.id)) acc.push(s);
  return acc;
}, []);

const BANDS: RiskBandKey[] = ["NORMAL", "WATCH", "WARNING", "CRITICAL", "EMERGENCY"];

// ── Fleet Status Bar ──────────────────────────────────────────────────────────

interface FleetStatusBarProps {
  tanks: { riskBand: RiskBandKey }[];
}

function FleetStatusBar({ tanks }: FleetStatusBarProps) {
  const counts = BANDS.reduce<Record<RiskBandKey, number>>(
    (acc, b) => ({ ...acc, [b]: 0 }),
    {} as Record<RiskBandKey, number>,
  );
  tanks.forEach((t) => {
    counts[t.riskBand] = (counts[t.riskBand] ?? 0) + 1;
  });

  const worstBand = BANDS.slice().reverse().find((b) => counts[b] > 0) ?? "NORMAL";
  const worstToken = RISK_BAND[worstBand];

  return (
    <div className="rounded-lg border border-[var(--console-border)] bg-[var(--console-panel)] px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Fleet posture */}
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: worstToken.token }}
            aria-hidden
          />
          <div>
            <span className="text-xs font-semibold uppercase tracking-widest text-[var(--console-text-dim)]">
              Fleet Posture
            </span>
            <span
              className={`ml-2 text-sm font-bold ${worstToken.text}`}
            >
              {worstToken.label}
            </span>
          </div>
          <span className="text-xs text-[var(--console-text-dim)]">
            — {tanks.length} tank{tanks.length !== 1 ? "s" : ""} reporting
          </span>
        </div>

        {/* Per-band counts */}
        <div className="flex flex-wrap gap-3">
          {BANDS.map((band) => {
            const token = RISK_BAND[band];
            const count = counts[band];
            return (
              <div key={band} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: token.token }}
                  aria-hidden
                />
                <span className={`text-xs font-mono tabular-nums ${count > 0 ? token.text : "text-[var(--console-text-dim)]"}`}>
                  {count}
                </span>
                <span className="text-[10px] uppercase tracking-wide text-[var(--console-text-dim)]">
                  {band.charAt(0) + band.slice(1).toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Risk bar */}
      <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full bg-[var(--console-border)]">
        {BANDS.map((band) => {
          const pct = tanks.length > 0 ? (counts[band] / tanks.length) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={band}
              style={{ width: `${pct}%`, backgroundColor: RISK_BAND[band].token }}
              className="h-full transition-all duration-500"
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

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
            Auto-refreshes every 3 s — mock data active until backend is live.
            Click any tank card to open its interlock chain.
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

      {/* Fleet status bar — only when data available */}
      {tanks && tanks.length > 0 && <FleetStatusBar tanks={tanks} />}

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
      <div className="pt-4 border-t border-[var(--console-border)]">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-[var(--console-text-dim)]">
          Risk band legend
        </p>
        <div className="flex flex-wrap gap-5 text-xs text-[var(--console-text-dim)]">
          {BANDS.map((band) => (
            <span key={band} className="flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: RISK_BAND[band].token }}
                aria-hidden
              />
              <span className={RISK_BAND[band].text}>{RISK_BAND[band].label}</span>
              <span className="text-[10px]">
                {band === "NORMAL" && "(0–30)"}
                {band === "WATCH" && "(31–50)"}
                {band === "WARNING" && "(51–70)"}
                {band === "CRITICAL" && "(71–85)"}
                {band === "EMERGENCY" && "(86–100)"}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
