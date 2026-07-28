import { AlertTriangle, CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceNetworkSummary } from "@/lib/sentinel/types";

interface ComplianceKpiStripProps {
  network: ComplianceNetworkSummary;
}

export function ComplianceKpiStrip({ network }: ComplianceKpiStripProps) {
  const greenSites = network.sites.filter((s) => s.overallRag === "GREEN").length;
  const amberSites = network.sites.filter((s) => s.overallRag === "AMBER").length;
  const redSites   = network.sites.filter((s) => s.overallRag === "RED").length;

  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-xs ring-1 ring-foreground/10">
      <div className="grid divide-y *:data-[slot=card]:rounded-none *:data-[slot=card]:ring-0 md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Network OCS</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{network.networkOcs.toFixed(1)}%</div>
            <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400">{network.networkRag}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Compliant Sites</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{greenSites}</div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="size-4 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">At-Risk Sites</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{amberSites}</div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-yellow-500/10">
              <AlertTriangle className="size-4 text-yellow-700 dark:text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Non-Compliant Sites</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{redSites}</div>
            <Badge className="bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400">
              <XCircle className="size-3" />
              Action required
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-normal text-sm">Open Violations</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <div className="text-2xl leading-none tracking-tight">{network.totalOpenViolations}</div>
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted">
              <ShieldCheck className="size-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
