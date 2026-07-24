"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, Shield, ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const severityStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:text-red-400",
  High: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  Low: "bg-green-500/10 text-green-700 dark:text-green-400",
};

export function AlertTimeline({ alerts }: AlertTimelineProps) {
  const recent = alerts.slice(0, 6);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4 before:absolute before:top-2 before:bottom-2 before:left-[15px] before:w-px before:bg-border">
          {recent.map((alert) => {
            const Icon = severityIcons[alert.severity];
            return (
              <div key={alert.id} className="relative flex gap-3 pl-9">
                <div
                  className={cn(
                    "absolute left-1 top-0.5 flex size-7 items-center justify-center rounded-full",
                    severityStyles[alert.severity],
                  )}
                >
                  <Icon className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate font-medium text-sm">{alert.title}</p>
                  <p className="text-muted-foreground text-xs">
                    {alert.siteName} ·{" "}
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
