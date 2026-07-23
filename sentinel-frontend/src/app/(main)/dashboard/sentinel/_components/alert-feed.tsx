"use client";

import Link from "next/link";

import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, CheckCircle2, Clock, ExternalLink, Shield, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Alert, SeverityBand } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface AlertFeedProps {
  alerts: Alert[];
  limit?: number;
  showViewAll?: boolean;
}

const severityStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  High: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Low: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

const severityIcons: Record<SeverityBand, typeof Shield> = {
  Critical: ShieldAlert,
  High: AlertTriangle,
  Medium: Bell,
  Low: Shield,
};

const statusStyles: Record<string, string> = {
  active: "bg-red-500/10 text-red-700 dark:text-red-400",
  acknowledged: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400",
};

const statusIcons: Record<string, typeof Clock> = {
  active: Clock,
  acknowledged: CheckCircle2,
  resolved: CheckCircle2,
};

export function AlertFeed({ alerts, limit, showViewAll = false }: AlertFeedProps) {
  const displayed = limit ? alerts.slice(0, limit) : alerts;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Alert Feed</CardTitle>
            <CardDescription>
              {alerts.filter((a) => a.status === "active").length} active alerts
            </CardDescription>
          </div>
          {showViewAll && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/sentinel/alerts">
                View All
                <ExternalLink className="ml-1 size-3" />
              </Link>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3">
          {displayed.map((alert) => {
            const SeverityIcon = severityIcons[alert.severity];
            const StatusIcon = statusIcons[alert.status];
            return (
              <div
                key={alert.id}
                className="flex gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    severityStyles[alert.severity],
                  )}
                >
                  <SeverityIcon className="size-4" />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-sm">{alert.title}</p>
                      <p className="text-muted-foreground text-xs">{alert.siteName}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className={cn("text-[10px]", severityStyles[alert.severity])}>
                        {alert.severity}
                      </Badge>
                      <Badge className={cn("gap-1 text-[10px]", statusStyles[alert.status])}>
                        <StatusIcon className="size-2.5" />
                        {alert.status}
                      </Badge>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-muted-foreground text-xs">{alert.description}</p>

                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-muted-foreground text-[11px]">
                    <span>Rule: {alert.rule}</span>
                    <span>•</span>
                    <span title={format(new Date(alert.createdAt), "PPpp")}>
                      {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                    </span>
                    {alert.recordIds.length > 0 && (
                      <>
                        <span>•</span>
                        <span>{alert.recordIds.length} record(s)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {displayed.length === 0 && (
            <div className="flex h-32 items-center justify-center text-muted-foreground text-sm">
              No alerts to display.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
