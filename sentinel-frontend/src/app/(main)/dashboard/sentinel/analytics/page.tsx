import Link from "next/link";

import { ArrowLeft, ArrowUpRight, Calendar, Gauge, ShieldAlert, Zap } from "lucide-react";

import { BackendError } from "@/components/backend-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  fetchCorrelation,
  fetchFeatureImportance,
  fetchPressureCharts,
  fetchRiskSummary,
  fetchSurvivalCurves,
} from "@/lib/sentinel/api";
import type { SeverityBand, SiteRiskSummary } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

import { RiskHeatmap } from "../_components/risk-heatmap";
import { CorrelationScatterChart } from "./_components/correlation-scatter-chart";
import { FeatureImportanceBar } from "./_components/feature-importance-bar";
import { PressureControlChart } from "./_components/pressure-control-chart";
import { SurvivalCurveChart } from "./_components/survival-curve-chart";

const severityBadgeStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400 ring-red-300 dark:ring-red-500/30",
  High: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400 ring-orange-300 dark:ring-orange-500/30",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400 ring-yellow-300 dark:ring-yellow-500/30",
  Low: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400 ring-green-300 dark:ring-green-500/30",
};

const riskBarColors: Record<SeverityBand, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

function RiskBar({ score, band }: { score: number; band: SeverityBand }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", riskBarColors[band])}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="tabular-nums text-sm font-medium">{score}</span>
    </div>
  );
}

export default async function AnalyticsPage() {
  let sites: SiteRiskSummary[];
  try {
    sites = await fetchRiskSummary();
  } catch (err) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link href="/dashboard/sentinel"><ArrowLeft /></Link>
          </Button>
          <h1 className="text-2xl tracking-tight sm:text-3xl">Risk Heatmap — All KPC Sites</h1>
        </div>
        <BackendError message={err instanceof Error ? err.message : "Failed to load site data"} />
      </div>
    );
  }

  // Fetch analytics data in parallel — each is gracefully optional
  const [survivalResult, controlResult, correlationResult, featureResult] =
    await Promise.allSettled([
      fetchSurvivalCurves(),
      fetchPressureCharts(),
      fetchCorrelation(),
      fetchFeatureImportance(),
    ]);

  const survival    = survivalResult.status    === "fulfilled" ? survivalResult.value    : null;
  const control     = controlResult.status     === "fulfilled" ? controlResult.value     : null;
  const correlation = correlationResult.status === "fulfilled" ? correlationResult.value : null;
  const features    = featureResult.status     === "fulfilled" ? featureResult.value     : null;

  const sorted = [...sites].sort((a, b) => b.riskScore - a.riskScore);

  const criticalCount = sites.filter((s) => s.severityBand === "Critical").length;
  const highCount = sites.filter((s) => s.severityBand === "High").length;
  const avgScore = Math.round(sites.reduce((s, x) => s + x.riskScore, 0) / (sites.length || 1));
  const totalSpikes = sites.reduce((s, x) => s + x.pressureSpikeCount, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link href="/dashboard/sentinel">
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl tracking-tight sm:text-3xl">Risk Heatmap — All KPC Sites</h1>
            <p className="text-muted-foreground text-sm">
              All {sites.length} KPC operational facilities — risk score, incident history, and audit status.
              Click any site to drill down into its incident and telemetry records.
            </p>
          </div>
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <ShieldAlert className="size-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Critical sites</p>
              <p className="font-bold text-xl tabular-nums">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10">
              <ShieldAlert className="size-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">High risk sites</p>
              <p className="font-bold text-xl tabular-nums">{highCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Gauge className="size-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Avg risk score</p>
              <p className="font-bold text-xl tabular-nums">{avgScore}/100</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-4 pb-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
              <Zap className="size-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Pressure spikes</p>
              <p className="font-bold text-xl tabular-nums">{totalSpikes}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full heatmap — fullView hides the "View All" button */}
      <RiskHeatmap sites={sites} fullView />

      {/* Detailed stats table */}      <Card>
        <CardHeader>
          <CardTitle>Site Risk Details</CardTitle>
          <CardDescription>
            All {sites.length} KPC sites — sorted by risk score. PS numbers are embedded in site names.
            Click a site name to view incidents and telemetry.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile: stacked cards */}
          <div className="divide-y sm:hidden">
            {sorted.map((site) => (
              <Link
                key={site.siteId}
                href={`/dashboard/sentinel/sites/${site.siteId}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">{site.siteName}</span>
                    <Badge className={cn("text-[10px] shrink-0", severityBadgeStyles[site.severityBand])}>
                      {site.severityBand}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-3 text-muted-foreground text-xs">
                    <span>{site.incidentCount} incidents</span>
                    <span>{site.daysSinceLastAudit}d since audit</span>
                    {site.pressureSpikeCount > 0 && (
                      <span className="text-orange-500">⚡ {site.pressureSpikeCount} spikes</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={cn("font-bold tabular-nums text-lg", {
                    "text-red-600 dark:text-red-400": site.severityBand === "Critical",
                    "text-orange-600 dark:text-orange-400": site.severityBand === "High",
                    "text-yellow-600 dark:text-yellow-400": site.severityBand === "Medium",
                    "text-green-600 dark:text-green-400": site.severityBand === "Low",
                  })}>
                    {site.riskScore}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Site</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Band</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Risk Score</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Incidents</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Spikes</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Days since audit</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Rejected %</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Last audit</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {sorted.map((site) => (
                  <tr
                    key={site.siteId}
                    className="group hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/sentinel/sites/${site.siteId}`}
                        className="font-medium hover:underline"
                      >
                        {site.siteName}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={cn("text-[10px]", severityBadgeStyles[site.severityBand])}>
                        {site.severityBand}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <RiskBar score={site.riskScore} band={site.severityBand} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{site.incidentCount}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {site.pressureSpikeCount > 0 ? (
                        <span className="text-orange-500">⚡ {site.pressureSpikeCount}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn(site.daysSinceLastAudit > 14 ? "text-orange-600 dark:text-orange-400" : "")}>
                        {site.daysSinceLastAudit}d
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cn(site.rejectedRate > 0.1 ? "text-red-600 dark:text-red-400" : "text-muted-foreground")}>
                        {(site.rejectedRate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {site.lastAuditDate ? (
                        <span className="flex items-center justify-end gap-1">
                          <Calendar className="size-3" />
                          {site.lastAuditDate}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/sentinel/sites/${site.siteId}`}
                        className="inline-flex items-center gap-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-foreground text-xs"
                      >
                        View
                        <ArrowUpRight className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ── Statistical Diagnostics section ─────────────────────────────── */}
      {(survival || control || correlation || features) && (
        <>
          <div className="space-y-1 mt-2">
            <h2 className="text-xl font-semibold tracking-tight">Statistical Diagnostics</h2>
            <p className="text-muted-foreground text-sm">
              Three independent diagnostics computed from the pipeline data. Each produces one
              quotable number for operational decision-making.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {survival && <SurvivalCurveChart data={survival} />}
            {correlation && <CorrelationScatterChart data={correlation} />}
            {control && <PressureControlChart data={control} />}
            {features && <FeatureImportanceBar data={features} />}
          </div>
        </>
      )}
    </div>
  );
}