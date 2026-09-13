"use client";

import { useState } from "react";
import { Activity, Calendar, Gauge, RotateCcw, ShieldAlert, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { simulateRisk } from "@/lib/sentinel/api";
import { computeRiskScore } from "@/lib/sentinel/risk-formula";
import type { SeverityBand, WhatIfResponse } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface WhatIfPanelProps {
  siteId: string;
  currentScore: number;
  currentBand: SeverityBand;
  liveIncidentCount: number;
  liveCritHighCount: number;
  liveDaysSinceAudit: number;
  liveRejectedRate: number;   // 0.0-1.0
  livePressureSpikes: number;
}

const bandStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  High: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Low: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

const deltaClass = (delta: number) =>
  delta > 0
    ? "text-red-600 dark:text-red-400"
    : delta < 0
      ? "text-green-600 dark:text-green-400"
      : "text-muted-foreground";

export function WhatIfPanel({
  siteId,
  currentScore,
  currentBand,
  liveIncidentCount,
  liveCritHighCount,
  liveDaysSinceAudit,
  liveRejectedRate,
  livePressureSpikes,
}: WhatIfPanelProps) {
  // Derive live percentage values for slider initialisation
  const liveCritHighPct = liveIncidentCount > 0
    ? Math.round((liveCritHighCount / liveIncidentCount) * 100) : 0;
  const liveRejectionPct = Math.round(liveRejectedRate * 100);

  // Slider state — each initialised from live values
  const [incidentCount,  setIncidentCount]  = useState(liveIncidentCount);
  const [critHighPct,    setCritHighPct]    = useState(liveCritHighPct);
  const [auditDays,      setAuditDays]      = useState(liveDaysSinceAudit);
  const [rejectionPct,   setRejectionPct]   = useState(liveRejectionPct);
  const [pressureSpikes, setPressureSpikes] = useState(livePressureSpikes);

  // Server-confirmed breakdown — updates on onValueCommit (once per gesture)
  const [serverResult, setServerResult] = useState<WhatIfResponse | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // ── Real-time score: pure JS, zero network, updates on every onValueChange ──
  // critHighCount is always derived from current incidentCount × critHighPct
  // (bottleneck fix: avoids using stale live count when incidentCount is also moved)
  const critHighCount = Math.round(incidentCount * critHighPct / 100);
  const rejectedRate  = rejectionPct / 100;
  const { score: simScore, band: simBand, contribs } = computeRiskScore(
    incidentCount,
    critHighCount,
    auditDays,
    rejectedRate,
    pressureSpikes,
  );
  const delta = simScore - currentScore;

  // ── Server confirmation: fires once on mouse-up (onValueCommit) ──
  const confirmWithServer = async () => {
    setIsConfirming(true);
    try {
      const result = await simulateRisk(siteId, {
        incidentCountOverride:   incidentCount,
        critHighPercentOverride: critHighPct,
        daysSinceAuditOverride:  auditDays,
        rejectionRateOverride:   rejectedRate,
        pressureSpikesOverride:  pressureSpikes,
      });
      setServerResult(result);
    } catch {
      // Server confirmation is non-blocking — local compute already showed the score
    } finally {
      setIsConfirming(false);
    }
  };

  const reset = () => {
    setIncidentCount(liveIncidentCount);
    setCritHighPct(liveCritHighPct);
    setAuditDays(liveDaysSinceAudit);
    setRejectionPct(liveRejectionPct);
    setPressureSpikes(livePressureSpikes);
    setServerResult(null);
  };

  const isAtLiveValues =
    incidentCount  === liveIncidentCount &&
    critHighPct    === liveCritHighPct &&
    auditDays      === liveDaysSinceAudit &&
    rejectionPct   === liveRejectionPct &&
    pressureSpikes === livePressureSpikes;

  // Use server-confirmed breakdown when available, otherwise use live local compute
  const displayContribs = serverResult
    ? {
        incidentFrequency: serverResult.incidentFrequencyContrib,
        severityMix:       serverResult.severityMixContrib,
        auditRecency:      serverResult.auditRecencyContrib,
        rejectionRate:     serverResult.rejectionRateContrib,
        pressureSpikes:    serverResult.pressureSpikesContrib,
      }
    : contribs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">What-If: Risk Drivers</CardTitle>
        <CardDescription>
          Adjust any factor to see how the score changes in real time.
          Audit frequency is the leading indicator in the Kimeu v.&nbsp;KPC judgment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── Sliders ── */}
        <div className="space-y-4">

          {/* Incident count */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Activity className="size-3.5 text-muted-foreground" />
                Incident count
              </span>
              <span className="tabular-nums font-mono text-xs">{incidentCount} / 200</span>
            </div>
            <Slider
              value={[incidentCount]}
              min={0} max={200} step={1}
              onValueChange={([v]) => setIncidentCount(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0</span><span>200</span>
            </div>
          </div>

          {/* Critical/High % */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-muted-foreground" />
                Critical/High severity
              </span>
              <span className="tabular-nums font-mono text-xs">{critHighPct}%</span>
            </div>
            <Slider
              value={[critHighPct]}
              min={0} max={100} step={1}
              onValueChange={([v]) => setCritHighPct(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0%</span><span>100%</span>
            </div>
          </div>

          {/* Audit recency */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                Days since last audit
              </span>
              <span className="tabular-nums font-mono text-xs">{auditDays}d</span>
            </div>
            <Slider
              value={[auditDays]}
              min={0} max={365} step={1}
              onValueChange={([v]) => setAuditDays(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>Audited today</span><span>Never (365d)</span>
            </div>
          </div>

          {/* Rejection rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Gauge className="size-3.5 text-muted-foreground" />
                Data rejection rate
              </span>
              <span className="tabular-nums font-mono text-xs">{rejectionPct}%</span>
            </div>
            <Slider
              value={[rejectionPct]}
              min={0} max={100} step={1}
              onValueChange={([v]) => setRejectionPct(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0%</span><span>100%</span>
            </div>
          </div>

          {/* Pressure spikes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Zap className="size-3.5 text-muted-foreground" />
                Pressure spike events
              </span>
              <span className="tabular-nums font-mono text-xs">{pressureSpikes}</span>
            </div>
            <Slider
              value={[pressureSpikes]}
              min={0} max={20} step={1}
              onValueChange={([v]) => setPressureSpikes(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0</span><span>20</span>
            </div>
          </div>
        </div>

        {/* ── Score result ── */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Current:&nbsp;
              <span className="font-mono font-medium text-foreground">{currentScore}</span>
              &nbsp;
              <Badge className={cn("text-[10px]", bandStyles[currentBand])}>{currentBand}</Badge>
            </div>
            <div className="text-sm">
              Simulated:&nbsp;
              <span className="font-mono font-semibold text-base">{simScore}</span>
              &nbsp;
              <Badge className={cn("text-[10px]", bandStyles[simBand])}>{simBand}</Badge>
            </div>
          </div>
          {!isAtLiveValues && (
            <div className="space-y-0.5">
              <p className={cn("text-sm font-semibold tabular-nums", deltaClass(delta))}>
                {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "▶ No change"} points
                {isConfirming && (
                  <span className="ml-2 text-muted-foreground text-xs font-normal">confirming…</span>
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                Factors: incident freq 30% · severity 30% · audit 20% · rejection 10% · spikes 10%
              </p>
            </div>
          )}
        </div>

        {/* ── Per-component breakdown — updates on server confirm ── */}
        {!isAtLiveValues && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {serverResult ? "Server-confirmed breakdown" : "Live breakdown"}
            </p>
            {isConfirming ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(
                  [
                    ["Incident freq",   displayContribs.incidentFrequency, 30],
                    ["Severity mix",    displayContribs.severityMix,       30],
                    ["Audit recency",   displayContribs.auditRecency,      20],
                    ["Rejection rate",  displayContribs.rejectionRate,     10],
                    ["Pressure spikes", displayContribs.pressureSpikes,    10],
                  ] as [string, number, number][]
                ).map(([label, contrib, max]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
                    <Progress
                      value={(contrib / max) * 100}
                      className="h-1.5 flex-1"
                    />
                    <span className="w-14 text-right tabular-nums font-mono text-muted-foreground">
                      {contrib.toFixed(1)} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reset button — only shown when sliders have moved ── */}
        {!isAtLiveValues && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={reset}
          >
            <RotateCcw className="size-3" />
            Reset to live values
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
