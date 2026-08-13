"use client";

import { Activity, Calendar, Gauge, ShieldAlert, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { computeRiskScore } from "@/lib/sentinel/risk-formula";
import type { SeverityBand } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface RiskScoreBreakdownProps {
  riskScore: number;
  severityBand: SeverityBand;
  incidentCount: number;
  critHighCount: number;
  daysSinceAudit: number;
  rejectedRate: number;      // 0.0-1.0
  pressureSpikeCount: number;
}

const bandStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  High: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Low: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

/** Progress bar fill colour based on how dominant a factor is (% of its max weight) */
function factorBarClass(contrib: number, maxWeight: number): string {
  const pct = contrib / maxWeight;
  if (pct >= 0.75) return "[&>div]:bg-red-500";
  if (pct >= 0.45) return "[&>div]:bg-orange-400";
  return "[&>div]:bg-primary";
}

export function RiskScoreBreakdown({
  riskScore,
  severityBand,
  incidentCount,
  critHighCount,
  daysSinceAudit,
  rejectedRate,
  pressureSpikeCount,
}: RiskScoreBreakdownProps) {
  const { contribs } = computeRiskScore(
    incidentCount,
    critHighCount,
    daysSinceAudit,
    rejectedRate,
    pressureSpikeCount,
  );

  const critHighPct = incidentCount > 0
    ? Math.round((critHighCount / incidentCount) * 100) : 0;

  const factors = [
    {
      icon: Activity,
      label: "Incident frequency",
      weight: "30%",
      contrib: contribs.incidentFrequency,
      maxWeight: 30,
      detail: `${incidentCount} incidents recorded`,
    },
    {
      icon: ShieldAlert,
      label: "Severity mix",
      weight: "30%",
      contrib: contribs.severityMix,
      maxWeight: 30,
      detail: `${critHighCount} of ${incidentCount} are Critical/High (${critHighPct}%)`,
    },
    {
      icon: Calendar,
      label: "Audit recency",
      weight: "20%",
      contrib: contribs.auditRecency,
      maxWeight: 20,
      detail: daysSinceAudit === 365 ? "Never audited" : `Last audited ${daysSinceAudit} days ago`,
    },
    {
      icon: Gauge,
      label: "Rejection rate",
      weight: "10%",
      contrib: contribs.rejectionRate,
      maxWeight: 10,
      detail: `${(rejectedRate * 100).toFixed(1)}% of records rejected`,
    },
    {
      icon: Zap,
      label: "Pressure spikes",
      weight: "10%",
      contrib: contribs.pressureSpikes,
      maxWeight: 10,
      detail: `${pressureSpikeCount} spike event${pressureSpikeCount === 1 ? "" : "s"} detected`,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Risk Score Breakdown</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn(bandStyles[severityBand])}>{severityBand}</Badge>
            <Badge variant="outline" className="tabular-nums font-mono">
              {riskScore}/100
            </Badge>
          </div>
        </div>
        <CardDescription>How the composite score is composed across 5 factors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map(({ icon: Icon, label, weight, contrib, maxWeight, detail }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Icon className="size-3.5 text-muted-foreground" />
                {label}
                <span className="text-muted-foreground font-normal">({weight})</span>
              </span>
              <span className="tabular-nums text-muted-foreground text-xs">
                {contrib.toFixed(1)} / {maxWeight} pts
              </span>
            </div>
            {/* Progress value is contrib as % of maxWeight, scaled to 100 */}
            <Progress
              value={(contrib / maxWeight) * 100}
              className={cn("h-1.5", factorBarClass(contrib, maxWeight))}
            />
            <p className="text-muted-foreground text-xs">{detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
