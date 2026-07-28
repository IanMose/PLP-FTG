"use client";

import Link from "next/link";

import { ArrowUpRight, CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { RagStatus, SiteComplianceCard } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface ComplianceHeatmapProps {
  sites: SiteComplianceCard[];
}

const ragConfig: Record<RagStatus, { bg: string; text: string; icon: typeof ShieldCheck }> = {
  GREEN: { bg: "bg-green-950/70 ring-green-500/40",  text: "text-green-400",  icon: ShieldCheck },
  AMBER: { bg: "bg-yellow-950/60 ring-yellow-500/30", text: "text-yellow-400", icon: ShieldAlert },
  RED:   { bg: "bg-red-950/80 ring-red-500/40",       text: "text-red-400",    icon: ShieldAlert },
};

export function ComplianceHeatmap({ sites }: ComplianceHeatmapProps) {
  const sorted = [...sites].sort((a, b) => a.overallScore - b.overallScore);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Heat Map</CardTitle>
        <CardDescription>
          KPC station compliance scores — lowest score first. Click to drill down.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {sorted.map((site) => {
              const config = ragConfig[site.overallRag];
              return (
                <Tooltip key={site.siteId}>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/dashboard/compliance/sites/${site.siteId}`}
                      className={cn(
                        "group relative flex flex-col items-center justify-center gap-1 rounded-lg p-3 ring-1 transition-all hover:scale-105 hover:shadow-md",
                        config.bg,
                      )}
                    >
                      <div className={cn("font-bold text-2xl tabular-nums", config.text)}>
                        {site.overallScore.toFixed(0)}
                      </div>
                      <div className="line-clamp-1 text-center text-xs">{site.siteName}</div>
                      {site.openViolations > 0 && (
                        <div className="absolute top-1.5 left-1.5 flex size-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                          {site.openViolations}
                        </div>
                      )}
                      <ArrowUpRight className="absolute top-1.5 right-1.5 size-3 opacity-0 transition-opacity group-hover:opacity-60" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="space-y-1">
                    <p className="font-medium">{site.siteName}</p>
                    <p className="text-xs">OCS: {site.overallScore.toFixed(1)}% — {site.overallRag}</p>
                    <p className="text-xs">Safety: {site.safetyScore.toFixed(1)}%</p>
                    <p className="text-xs">Environmental: {site.environmentalScore.toFixed(1)}%</p>
                    <p className="text-xs">Asset Integrity: {site.assetIntegrityScore.toFixed(1)}%</p>
                    <p className="text-xs">Regulatory: {site.regulatoryScore.toFixed(1)}%</p>
                    <p className="text-xs">Open violations: {site.openViolations}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3">
          <span className="text-muted-foreground text-xs">Legend:</span>
          {(["GREEN", "AMBER", "RED"] as RagStatus[]).map((rag) => {
            const cfg = ragConfig[rag];
            return (
              <Badge key={rag} className={cn("gap-1", cfg.bg, cfg.text)}>
                <cfg.icon className="size-3" />
                {rag}
              </Badge>
            );
          })}
          <span className="ml-2 text-muted-foreground text-xs">Red dot = open violation count</span>
        </div>
      </CardContent>
    </Card>
  );
}
