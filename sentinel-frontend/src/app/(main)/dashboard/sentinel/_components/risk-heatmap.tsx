"use client";

import Link from "next/link";

import { AlertTriangle, ArrowUpRight, Shield, ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SeverityBand, SiteRiskSummary } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface RiskHeatmapProps {
  sites: SiteRiskSummary[];
}

const severityConfig: Record<SeverityBand, { color: string; bg: string; icon: typeof Shield }> = {
  Critical: {
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-500/15 ring-red-500/30",
    icon: ShieldAlert,
  },
  High: {
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-500/15 ring-orange-500/30",
    icon: AlertTriangle,
  },
  Medium: {
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-500/15 ring-yellow-500/30",
    icon: Shield,
  },
  Low: {
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-500/15 ring-green-500/30",
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

export function RiskHeatmap({ sites }: RiskHeatmapProps) {
  const sorted = [...sites].sort((a, b) => b.riskScore - a.riskScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risk Heatmap</CardTitle>
        <CardDescription>Site-by-site risk visualization — sorted by risk score (highest first)</CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
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
                      <div className={cn("font-bold text-2xl tabular-nums", config.color)}>{site.riskScore}</div>
                      <div className="line-clamp-1 text-center text-xs">{site.siteName}</div>
                      <ArrowUpRight className="absolute top-1.5 right-1.5 size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="space-y-1">
                    <p className="font-medium">{site.siteName}</p>
                    <p className="text-xs">Risk Score: {site.riskScore}/100</p>
                    <p className="text-xs">Incidents: {site.incidentCount}</p>
                    <p className="text-xs">Days since audit: {site.daysSinceLastAudit}</p>
                    <p className="text-xs">Rejected rate: {(site.rejectedRate * 100).toFixed(1)}%</p>
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
