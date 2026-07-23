"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert, DataQualitySummary } from "@/lib/sentinel/types";

interface AlertKpisProps {
  alerts: Alert[];
  quality: DataQualitySummary;
}

export function AlertKpis({ alerts, quality }: AlertKpisProps) {
  const activeAlerts = alerts.filter((a) => a.status === "active").length;
  const criticalAlerts = alerts.filter((a) => a.severity === "Critical" && a.status === "active").length;
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged").length;
  const resolvedAlerts = alerts.filter((a) => a.status === "resolved").length;

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="grid grid-cols-1 xl:grid-cols-8">
        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="text-3xl leading-none tracking-tight">{activeAlerts}</div>
              <p className="text-muted-foreground text-xs">{criticalAlerts} critical, require immediate action</p>
            </div>
            <Badge className="bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400">Needs attention</Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 border-b ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">Critical Severity</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl leading-none tracking-tight">{criticalAlerts}</div>
              <p className="text-muted-foreground text-xs">Threshold breaches and hard failures</p>
            </div>
            <Badge className="bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-300">Critical</Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 ring-0 xl:col-span-4 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">Acknowledged</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl leading-none tracking-tight">{acknowledgedAlerts}</div>
              <p className="text-muted-foreground text-xs">Being investigated by the team</p>
            </div>
            <Badge className="bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
              In progress
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 ring-0 xl:col-span-4">
          <CardHeader>
            <CardTitle className="font-normal">Gate Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl leading-none tracking-tight">
                {(quality.passRate * 100).toFixed(1)}%
              </div>
              <p className="text-muted-foreground text-xs">Pass rate (threshold: {(quality.threshold * 100).toFixed(0)}%)</p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {quality.gateStatus === "passed" ? "Passed" : "Failed"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
