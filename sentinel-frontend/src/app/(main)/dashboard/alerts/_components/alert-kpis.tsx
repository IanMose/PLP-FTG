"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert, DataQualitySummary } from "@/lib/sentinel/types";

interface AlertKpisProps {
  alerts: Alert[];
  quality: DataQualitySummary;
}

/** Mean time to acknowledge (minutes) for Critical + High alerts that have been acknowledged */
function computeMtta(alerts: Alert[]): number | null {
  const eligible = alerts.filter(
    (a) =>
      (a.severity === "Critical" || a.severity === "High") &&
      a.acknowledgedAt != null,
  );
  if (eligible.length === 0) return null;

  const totalMs = eligible.reduce((sum, a) => {
    const created = new Date(a.createdAt).getTime();
    const acked = new Date(a.acknowledgedAt!).getTime();
    return sum + (acked - created);
  }, 0);

  return Math.round(totalMs / eligible.length / 60_000); // ms → minutes
}

function formatMtta(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function AlertKpis({ alerts, quality }: AlertKpisProps) {
  const activeAlerts = alerts.filter((a) => a.status === "active").length;
  const criticalAlerts = alerts.filter((a) => a.severity === "Critical" && a.status === "active").length;
  const acknowledgedAlerts = alerts.filter((a) => a.status === "acknowledged").length;
  const mttaMinutes = computeMtta(alerts);

  return (
    <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      {/* Top row — 4 cards */}
      <div className="grid grid-cols-1 border-b xl:grid-cols-8">
        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 ring-0 xl:col-span-2 xl:border-r">
          <CardHeader>
            <CardTitle className="font-normal">Active Alerts</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="space-y-1">
              <div className="text-3xl leading-none tracking-tight">{activeAlerts}</div>
              <p className="text-muted-foreground text-xs">{criticalAlerts} critical, require immediate action</p>
            </div>
            <Badge className="bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400">
              Needs attention
            </Badge>
          </CardContent>
        </Card>

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 ring-0 xl:col-span-2 xl:border-r">
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

        <Card className="gap-5 overflow-hidden rounded-none border-0 border-foreground/10 ring-0 xl:col-span-2 xl:border-r">
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

        <Card className="gap-5 overflow-hidden rounded-none border-0 ring-0 xl:col-span-2">
          <CardHeader>
            <CardTitle className="font-normal">Gate Status</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div className="flex flex-col gap-1">
              <div className="text-3xl leading-none tracking-tight">
                {(quality.passRate * 100).toFixed(1)}%
              </div>
              <p className="text-muted-foreground text-xs">
                Pass rate (threshold: {(quality.threshold * 100).toFixed(0)}%)
              </p>
            </div>
            <Badge className="bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300">
              {quality.gateStatus === "passed" ? "Passed" : "Failed"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row — MTTA full-width card */}
      <Card className="gap-5 overflow-hidden rounded-none border-0 ring-0">
        <CardHeader>
          <CardTitle className="font-normal">Mean Time to Acknowledge (MTTA)</CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <div className="flex flex-col gap-1">
            <div className="text-3xl leading-none tracking-tight">
              {mttaMinutes !== null ? formatMtta(mttaMinutes) : "—"}
            </div>
            <p className="text-muted-foreground text-xs">
              Average response time for Critical &amp; High alerts
              {mttaMinutes === null ? " — no acknowledged alerts yet" : ""}
            </p>
          </div>
          <Badge
            className={
              mttaMinutes === null
                ? "bg-muted text-muted-foreground"
                : mttaMinutes <= 30
                  ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-300"
                  : mttaMinutes <= 120
                    ? "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"
                    : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400"
            }
          >
            {mttaMinutes === null
              ? "No data"
              : mttaMinutes <= 30
                ? "On target"
                : mttaMinutes <= 120
                  ? "Elevated"
                  : "Slow response"}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}
