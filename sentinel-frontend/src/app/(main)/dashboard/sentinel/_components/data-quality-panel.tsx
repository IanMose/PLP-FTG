"use client";

import { format } from "date-fns";
import { CheckCircle2, Clock, Database, FileCheck, Hash, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DataQualitySummary, IngestBatch } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface DataQualityPanelProps {
  summary: DataQualitySummary;
  batches: IngestBatch[];
}

function QualityBar({ summary }: { summary: DataQualitySummary }) {
  const trustedPct = (summary.trusted / summary.total) * 100;
  const correctedPct = (summary.corrected / summary.total) * 100;
  const reviewPct = (summary.review / summary.total) * 100;
  const rejectedPct = (summary.rejected / summary.total) * 100;

  return (
    <div className="space-y-2">
      <div className="flex h-4 w-full overflow-hidden rounded-full">
        <div
          className="bg-green-500 transition-all"
          style={{ width: `${trustedPct}%` }}
          title={`Trusted: ${trustedPct.toFixed(1)}%`}
        />
        <div
          className="bg-blue-500 transition-all"
          style={{ width: `${correctedPct}%` }}
          title={`Corrected: ${correctedPct.toFixed(1)}%`}
        />
        <div
          className="bg-yellow-500 transition-all"
          style={{ width: `${reviewPct}%` }}
          title={`Review: ${reviewPct.toFixed(1)}%`}
        />
        <div
          className="bg-red-500 transition-all"
          style={{ width: `${rejectedPct}%` }}
          title={`Rejected: ${rejectedPct.toFixed(1)}%`}
        />
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-green-500" />
          <span>Trusted ({summary.trusted})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-blue-500" />
          <span>Corrected ({summary.corrected})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-yellow-500" />
          <span>Review ({summary.review})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-red-500" />
          <span>Rejected ({summary.rejected})</span>
        </div>
      </div>
    </div>
  );
}

export function DataQualityPanel({ summary, batches }: DataQualityPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Quality</CardTitle>
            <CardDescription>CI gate status and decision breakdown</CardDescription>
          </div>
          <Badge
            className={cn(
              "gap-1",
              summary.gateStatus === "passed"
                ? "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                : "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
            )}
          >
            {summary.gateStatus === "passed" ? (
              <CheckCircle2 className="size-3" />
            ) : (
              <XCircle className="size-3" />
            )}
            Gate {summary.gateStatus.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <QualityBar summary={summary} />

        <div className="space-y-2">
          <h4 className="flex items-center gap-1.5 font-medium text-sm">
            <Database className="size-3.5" />
            Recent Batches
          </h4>
          <div className="space-y-1.5">
            {batches.slice(0, 4).map((batch) => (
              <div
                key={batch.batchId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <FileCheck className="size-3.5 text-muted-foreground" />
                  <span className="font-mono">{batch.batchId}</span>
                  <span className="hidden text-muted-foreground sm:inline">
                    {batch.sourceFilename}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Hash className="size-3" />
                    {batch.rowCount} rows
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="size-3" />
                    {format(new Date(batch.ingestedAt), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
