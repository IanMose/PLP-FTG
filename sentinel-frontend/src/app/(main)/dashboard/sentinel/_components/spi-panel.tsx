"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";
import { Check, Loader2, Circle } from "lucide-react";

interface SpiSummary {
  hazardReportsThisMonth: number;
  avgCapaClosureDays: number;
  pctCapasClosedOnTime: number;
  overdueCapas: number;
  hazardReportTrend: { month: string; count: number }[];
  incidents30d: number;
  highCriticalIncidents30d: number;
}

// ── Compact 7-step safety loop visualisation ──────────────────────────────────

const LOOP_STEPS = [
  { key: "sense",     label: "Sense",     color: "#0ea5e9" },
  { key: "understand",label: "Understand",color: "#6366f1" },
  { key: "predict",   label: "Predict",   color: "#f59e0b" },
  { key: "decide",    label: "Decide",    color: "#ea580c" },
  { key: "interlock", label: "Interlock", color: "#dc2626" },
  { key: "verify",    label: "Verify",    color: "#10b981" },
  { key: "learn",     label: "Learn",     color: "#a855f7" },
] as const;

function SafetyLoopBar() {
  return (
    <div
      className="flex items-center justify-between overflow-x-auto gap-0 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3"
      aria-label="Sentinel Safety Loop — 7 steps"
    >
      {LOOP_STEPS.map((step, i) => (
        <span key={step.key} className="flex shrink-0 items-center gap-1">
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white"
            style={{ backgroundColor: step.color }}
            aria-hidden
          >
            <Check className="h-2.5 w-2.5" />
          </span>
          <span
            className="text-[11px] font-semibold"
            style={{ color: step.color }}
          >
            {step.label}
          </span>
          {i < LOOP_STEPS.length - 1 && (
            <span className="mx-1 text-[10px] text-muted-foreground" aria-hidden>
              →
            </span>
          )}
        </span>
      ))}
      {/* Loop back arrow */}
      <span className="ml-2 shrink-0 text-[10px] text-muted-foreground" title="Loop repeats continuously">
        ↺
      </span>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function SpiPanel({ spi }: { spi: SpiSummary | null }) {
  if (!spi) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">
          HSE Safety Loop — Performance Indicators
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          The Sentinel loop runs continuously: telemetry in → verified intervention out.
          These metrics measure loop health.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Safety loop visualisation */}
        <SafetyLoopBar />

        {/* SPI metrics */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Leading */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Hazards this month</p>
            <div className="flex items-end gap-3">
              <p className="text-2xl font-bold tabular-nums">{spi.hazardReportsThisMonth}</p>
              {spi.hazardReportTrend.length > 1 && (
                <div className="h-8 w-16 mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spi.hazardReportTrend}>
                      <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="#3b82f620" strokeWidth={1.5} dot={false} />
                      <Tooltip
                        content={({ active, payload }) =>
                          active && payload?.length ? (
                            <div className="rounded border bg-background px-2 py-1 text-xs shadow">
                              {payload[0].payload.month}: {payload[0].value}
                            </div>
                          ) : null
                        }
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Leading indicator</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg CAPA closure</p>
            <p className="text-2xl font-bold tabular-nums">
              {spi.avgCapaClosureDays || 0}{" "}
              <span className="text-sm font-normal">days</span>
            </p>
            <p className="text-xs text-muted-foreground">Leading indicator</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">On-time closure rate</p>
            <p className="text-2xl font-bold tabular-nums">
              {spi.pctCapasClosedOnTime || 0}
              <span className="text-sm font-normal">%</span>
            </p>
            {spi.overdueCapas > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">{spi.overdueCapas} overdue</p>
            )}
          </div>

          {/* Lagging */}
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Incidents (30d)</p>
            <p className="text-2xl font-bold tabular-nums">{spi.incidents30d}</p>
            <p className="text-xs text-muted-foreground">Lagging indicator</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
