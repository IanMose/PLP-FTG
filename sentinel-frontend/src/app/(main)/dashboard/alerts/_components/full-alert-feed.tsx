"use client";

import { useState, useTransition } from "react";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Bell, ChevronDown, ChevronRight, Loader2, Shield, ShieldAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { acknowledgeAlert } from "@/lib/sentinel/api";
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

function AlertRow({ alert }: { alert: Alert }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  // Optimistic local status so the UI responds immediately
  const [localStatus, setLocalStatus] = useState<AlertStatus>(alert.status);

  const Icon = severityIcons[alert.severity];
  const ExpandIcon = expanded ? ChevronDown : ChevronRight;

  function handleAcknowledge() {
    startTransition(async () => {
      try {
        await acknowledgeAlert(alert.id);
        setLocalStatus("acknowledged");
      } catch {
        // Silent — the badge will revert on next page load if the call failed
      }
    });
  }

  return (
    <>
      <TableRow
        className="cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
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

        <TableCell>
          <div className="flex items-center gap-1.5">
            <ExpandIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-[180px] truncate font-medium text-sm">{alert.title}</span>
          </div>
        </TableCell>

        <TableCell className="text-muted-foreground text-sm">{alert.siteName}</TableCell>

        <TableCell className="max-w-[160px] truncate text-muted-foreground text-xs">{alert.rule}</TableCell>

        <TableCell>
          <Badge variant="outline" className={cn("text-xs capitalize", statusStyles[localStatus])}>
            {localStatus}
          </Badge>
        </TableCell>

        <TableCell className="text-right text-muted-foreground text-xs">
          {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
        </TableCell>

        <TableCell
          className="text-right"
          onClick={(e) => e.stopPropagation()} // don't toggle expand when clicking ack
        >
          {localStatus === "active" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              disabled={isPending}
              onClick={handleAcknowledge}
            >
              {isPending ? <Loader2 className="size-3 animate-spin" /> : "Acknowledge"}
            </Button>
          )}
          {localStatus === "acknowledged" && alert.acknowledgedBy && (
            <span className="text-muted-foreground text-xs">by {alert.acknowledgedBy}</span>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded detail row */}
      {expanded && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={7} className="py-3">
            <div className="flex flex-col gap-2 pl-8 text-sm">
              <p className="text-foreground/80">{alert.description}</p>
              {alert.recordIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-muted-foreground text-xs">Linked records:</span>
                  {alert.recordIds.map((rid) => (
                    <span
                      key={rid}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-muted-foreground text-xs"
                    >
                      {rid}
                    </span>
                  ))}
                </div>
              )}
              {alert.acknowledgedAt && (
                <p className="text-muted-foreground text-xs">
                  Acknowledged{" "}
                  {formatDistanceToNow(new Date(alert.acknowledgedAt), { addSuffix: true })}
                  {alert.acknowledgedBy ? ` by ${alert.acknowledgedBy}` : ""}
                </p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

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
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
