import { AlertTriangle, CheckCircle2, FileWarning, Shield, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert, DataQualitySummary, SiteRiskSummary } from "@/lib/sentinel/types";

interface SentinelKpiStripProps {
  sites: SiteRiskSummary[];
  alerts: Alert[];
  quality: DataQualitySummary;
}

export function SentinelKpiStrip({ sites, alerts, quality }: SentinelKpiStripProps) {
  const criticalSites = sites.filter((s) => s.severityBand === "Critical").length;
  const activeAlerts = alerts.filter((a) => a.status === "active").length;
  const avgRiskScore = Math.round(sites.reduce((sum, s) => sum + s.riskScore, 0) / sites.length);

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Total Sites</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{sites.length}</div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <Shield className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Critical Sites</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{criticalSites}</div>
            <Badge className="bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400">
              <XCircle className="size-3" />
              Needs attention
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{activeAlerts}</div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-orange-500/10">
              <AlertTriangle className="size-4 text-orange-700 dark:text-orange-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Avg Risk Score</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{avgRiskScore}/100</div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <FileWarning className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{(quality.passRate * 100).toFixed(1)}%</div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              <CheckCircle2 className="size-3" />
              {quality.gateStatus === "passed" ? "Gate OK" : "Gate FAIL"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
