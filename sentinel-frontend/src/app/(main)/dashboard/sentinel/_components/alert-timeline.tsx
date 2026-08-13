"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, CheckCircle2, Shield, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert, SeverityBand } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface AlertTimelineProps {
  alerts: Alert[];
}

const severityIcons: Record<SeverityBand, typeof Shield> = {
  Critical: ShieldAlert,
  High: AlertTriangle,
  Medium: Bell,
  Low: Shield,
};

const severityColors: Record<SeverityBand, string> = {
  Critical: "bg-red-500",
  High: "bg-orange-500",
  Medium: "bg-yellow-500",
  Low: "bg-green-500",
};

const statusBadgeStyles: Record<string, string> = {
  active: "bg-red-500/10 text-red-700 dark:text-red-400",
  acknowledged: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function AlertTimeline({ alerts }: AlertTimelineProps) {
  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Alert Timeline</CardTitle>
        <CardDescription>Chronological view of recent alert activity</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
          {sortedAlerts.slice(0, 8).map((alert) => {
            const Icon = severityIcons[alert.severity];
            return (
              <div key={alert.id} className="relative flex gap-3 pl-9">
                <div className="absolute left-1.5 top-1 flex size-3.5 items-center justify-center">
                  <span className={cn("size-2.5 rounded-full", severityColors[alert.severity])} />
                </div>
                <div className="flex-1 space-y-1 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className="size-3.5 text-muted-foreground" />
                      <span className="font-medium text-sm">{alert.title}</span>
                    </div>
                    <Badge className={cn("text-[10px]", statusBadgeStyles[alert.status])}>
                      {alert.status === "resolved" && <CheckCircle2 className="mr-0.5 size-2.5" />}
                      {alert.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground text-xs">{alert.siteName} — {alert.rule}</p>
                  <p className="text-muted-foreground text-[11px]">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
