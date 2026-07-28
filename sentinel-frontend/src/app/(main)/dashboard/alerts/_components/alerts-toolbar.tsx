"use client";

import { Download, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Alert } from "@/lib/sentinel/types";

interface AlertsToolbarProps {
  /** The currently-visible alerts — whatever tab is active gets passed here. */
  alerts: Alert[];
  /** Label shown on the refresh timestamp. */
  updatedLabel?: string;
}

/**
 * Converts the visible alert list to a CSV blob and triggers a download.
 * Columns match the FullAlertFeed table: Severity, Title, Site, Rule,
 * Status, Created, Acknowledged By.
 */
function downloadCsv(alerts: Alert[]) {
  const header = ["Severity", "Title", "Site", "Rule", "Status", "Created", "Acknowledged By"];

  const rows = alerts.map((a) => [
    a.severity,
    a.title,
    a.siteName,
    a.rule,
    a.status,
    new Date(a.createdAt).toISOString(),
    a.acknowledgedBy ?? "",
  ]);

  const escape = (val: string) =>
    `"${val.replace(/"/g, '""')}"`;

  const csv = [header, ...rows]
    .map((row) => row.map(escape).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `sentinel-alerts-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();

  URL.revokeObjectURL(url);
}

export function AlertsToolbar({ alerts, updatedLabel = "Updated 5 min ago" }: AlertsToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        <RotateCw className="size-4" />
        <span>{updatedLabel}</span>
      </div>
      <Button size="sm" variant="outline" onClick={() => downloadCsv(alerts)}>
        <Download data-icon="inline-start" />
        Export
      </Button>
    </div>
  );
}
