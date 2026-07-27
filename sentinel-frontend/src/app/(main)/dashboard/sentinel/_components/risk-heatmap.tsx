"use client";

import Link from "next/link";

import { AlertTriangle, ArrowUpRight, ExternalLink, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SeverityBand, SiteRiskSummary } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface RiskHeatmapProps {
  sites: SiteRiskSummary[];
  /** When true the component is in the full-page analytics view — shows all sites without a "View All" link */
  fullView?: boolean;
}

const severityConfig: Record<SeverityBand, { color: string; bg: string; icon: typeof Shield }> = {
  Critical: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-100 ring-red-300 dark:bg-red-950/80 dark:ring-red-500/40",
    icon: ShieldAlert,
  },
  High: {
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-100 ring-orange-300 dark:bg-orange-950/70 dark:ring-orange-500/40",
    icon: AlertTriangle,
  },
  Medium: {
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-100 ring-yellow-300 dark:bg-yellow-950/60 dark:ring-yellow-500/30",
    icon: Shield,
  },
  Low: {
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-100 ring-green-300 dark:bg-green-950/70 dark:ring-green-500/40",
    icon: ShieldCheck,
  },
};

function SeverityBadge({ band }: { band: SeverityBand }) {
  const config = severityConfig[band];
  return (
    <Badge className={cn("gap-1", config.bg, config.color)}>
      <config.icon className="size-3" />
      {band}
    </Badge>
  );
}

export function RiskHeatmap({ sites, fullView = false }: RiskHeatmapProps) {
  const sorted = [...sites].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <CardTitle>Risk Heatmap</CardTitle>
            <CardDescription>
              Site-by-site risk visualization — sorted by risk score (highest first)
            </CardDescription>
          </div>
          {!fullView && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/dashboard/sentinel/analytics">
                View All
                <ExternalLink className="ml-1.5 size-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div
            className={cn(
              "grid gap-2",
              fullView
                ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                : "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6",
            )}
          >
            {sorted.map((site) => {
              const config = severityConfig[site.severityBand];
              return (
                <Tooltip key={site.siteId}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/dashboard/sentinel/sites/${site.siteId}`}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-1 rounded-lg p-3 ring-1 transition-all hover:scale-105 hover:shadow-md",
                        config.bg,
                      )}
                    >
                      {site.pressureSpikeCount > 0 && (
                        <span
                          className="absolute top-1 left-1.5 text-[10px] text-red-600 dark:text-red-400"
                          title="Pressure spikes"
                        >
                          ⚡
                        </span>
                      )}
                      <div className={cn("font-bold text-2xl tabular-nums", config.color)}>
                        {site.riskScore}
                      </div>
                      <div className="line-clamp-1 text-center text-xs">{site.siteName}</div>
                      <ArrowUpRight className="absolute top-1.5 right-1.5 size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="space-y-1">
                    <p className="font-medium">{site.siteName}</p>
                    <p className="text-xs">Risk Score: {site.riskScore}/100</p>
                    <p className="text-xs">Incidents: {site.incidentCount}</p>
                    {site.pressureSpikeCount > 0 && (
                      <p className="text-xs text-red-400">⚡ Pressure Spikes: {site.pressureSpikeCount}</p>
                    )}
                    <p className="text-xs">Days since audit: {site.daysSinceLastAudit}</p>
                    <p className="text-xs">Rejected rate: {(site.rejectedRate * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Click to view incidents →</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
          <span className="text-muted-foreground text-xs">Legend:</span>
          {(["Critical", "High", "Medium", "Low"] as SeverityBand[]).map((band) => (
            <SeverityBadge key={band} band={band} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
