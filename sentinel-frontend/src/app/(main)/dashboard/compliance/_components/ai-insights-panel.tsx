import { AlertTriangle, ArrowRight, Bot, TrendingDown, Wrench } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceNetworkSummary, ComplianceTrendPoint, ComplianceViolation } from "@/lib/sentinel/types";

interface AiInsightsPanelProps {
  network: ComplianceNetworkSummary;
  violations: ComplianceViolation[];
  trend: ComplianceTrendPoint[];
}

interface Insight {
  icon: typeof Bot;
  headline: string;
  body: string;
  action: string;
  priority: "Critical" | "High" | "Medium";
}

function deriveInsights(
  network: ComplianceNetworkSummary,
  violations: ComplianceViolation[],
  trend: ComplianceTrendPoint[],
): Insight[] {
  const insights: Insight[] = [];

  // Insight 1: fastest deteriorating domain from trend
  if (trend.length >= 2) {
    const latest = trend[trend.length - 1];
    const prev   = trend[trend.length - 2];
    const deltas = [
      { name: "Safety",          key: "safetyScore",         delta: (latest.safetyScore ?? 0) - (prev.safetyScore ?? 0) },
      { name: "Environmental",   key: "environmentalScore",  delta: (latest.environmentalScore ?? 0) - (prev.environmentalScore ?? 0) },
      { name: "Asset Integrity", key: "assetIntegrityScore", delta: (latest.assetIntegrityScore ?? 0) - (prev.assetIntegrityScore ?? 0) },
      { name: "Regulatory",      key: "regulatoryScore",     delta: (latest.regulatoryScore ?? 0) - (prev.regulatoryScore ?? 0) },
    ];
    const worst = deltas.sort((a, b) => a.delta - b.delta)[0];
    if (worst.delta < 0) {
      insights.push({
        icon: TrendingDown,
        headline: `${worst.name} compliance is deteriorating`,
        body: `${worst.name} compliance fell ${Math.abs(worst.delta).toFixed(1)} points week-on-week and is the fastest-declining domain. Check for recent incidents or overdue activities in this area.`,
        action: `Review open ${worst.name.toLowerCase()} violations and schedule corrective briefing.`,
        priority: worst.delta < -3 ? "High" : "Medium",
      });
    }
  }

  // Insight 2: worst non-compliant site
  const redSites = [...network.sites]
    .filter((s) => s.overallRag === "RED")
    .sort((a, b) => a.overallScore - b.overallScore);
  if (redSites.length > 0) {
    const worst = redSites[0];
    insights.push({
      icon: AlertTriangle,
      headline: `${worst.siteName} requires immediate compliance attention`,
      body: `${worst.siteName} has an OCS of ${worst.overallScore.toFixed(1)}% (RED) with ${worst.openViolations} open violation${worst.openViolations !== 1 ? "s" : ""}. This is the lowest-scoring site on the network.`,
      action: `Dispatch HSE officer to ${worst.siteName}. Review all open violations and initiate corrective actions within 48 hours.`,
      priority: "Critical",
    });
  }

  // Insight 3: most overdue critical violation
  const criticals = violations
    .filter((v) => v.severity === "Critical")
    .sort((a, b) => a.violationDate.localeCompare(b.violationDate));
  if (criticals.length > 0) {
    const oldest = criticals[0];
    insights.push({
      icon: Wrench,
      headline: `Critical violation ${oldest.ruleId} has been open since ${oldest.violationDate}`,
      body: `Rule "${oldest.ruleName}" at ${oldest.siteName} remains unresolved. ${oldest.description}`,
      action: oldest.recommendedAction ?? "Escalate to department head for immediate resolution.",
      priority: "Critical",
    });
  }

  // Fallback insight if data is all green
  if (insights.length === 0) {
    insights.push({
      icon: Bot,
      headline: "All compliance domains are performing within acceptable thresholds",
      body: `Network OCS is ${network.networkOcs.toFixed(1)}% with no critical violations open. Continue current monitoring cadence and focus on maintaining training currency and inspection schedules.`,
      action: "Schedule next monthly compliance review.",
      priority: "Medium",
    });
  }

  return insights.slice(0, 3);
}

const priorityStyles: Record<string, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:text-red-400",
  High:     "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  Medium:   "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
};

export function AiInsightsPanel({ network, violations, trend }: AiInsightsPanelProps) {
  const insights = deriveInsights(network, violations, trend);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
            <Bot className="size-4 text-muted-foreground" />
          </div>
          <div>
            <CardTitle>AI Compliance Insights</CardTitle>
            <CardDescription>Derived from current compliance scores, violations, and trend data</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, i) => {
          const Icon = insight.icon;
          return (
            <div key={i} className="rounded-lg border p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                  <p className="font-semibold text-sm leading-snug">{insight.headline}</p>
                </div>
                <Badge className={priorityStyles[insight.priority]}>{insight.priority}</Badge>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed pl-6">{insight.body}</p>
              <div className="flex items-start gap-1.5 pl-6">
                <ArrowRight className="size-3 shrink-0 text-muted-foreground mt-0.5" />
                <p className="text-xs font-medium">{insight.action}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
