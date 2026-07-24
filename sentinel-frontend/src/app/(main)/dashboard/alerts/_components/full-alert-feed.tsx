"use client";

import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, Shield, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Alert, AlertStatus, SeverityBand } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface FullAlertFeedProps {
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

const statusStyles: Record<AlertStatus, string> = {
  active: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  acknowledged: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800",
  resolved: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800",
};

export function FullAlertFeed({ alerts }: FullAlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground text-sm">No alerts to display.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">All Alerts ({alerts.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Severity</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Rule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => {
              const Icon = severityIcons[alert.severity];
              return (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full",
                          severityStyles[alert.severity],
                        )}
                      >
                        <Icon className="size-3" />
                      </div>
                      <span className="text-xs">{alert.severity}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate font-medium">{alert.title}</TableCell>
                  <TableCell className="text-muted-foreground">{alert.siteName}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{alert.rule}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs capitalize", statusStyles[alert.status])}>
                      {alert.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
