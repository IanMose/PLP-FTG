"use client";

import { useEffect, useState } from "react";
import { Timer, Play, Pause, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  fetchRetrainingStatus,
  enableRetrainingSchedule,
  disableRetrainingSchedule,
  type RetrainingSchedule,
} from "@/lib/sentinel/api";

function ScheduleStatusBadge({ status }: { status: RetrainingSchedule["status"] }) {
  const variants: Record<RetrainingSchedule["status"], { label: string; className: string }> = {
    disabled:         { label: "Disabled", className: "bg-muted text-muted-foreground" },
    scheduled:        { label: "Scheduled", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
    running:          { label: "Running", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
    completed:        { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
    failed:           { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
    awaiting_review:  { label: "Awaiting Review", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  };
  const v = variants[status] ?? variants.disabled;
  return <Badge className={v.className}>{v.label}</Badge>;
}

export default function RetrainingSchedulePage() {
  const [schedule, setSchedule] = useState<RetrainingSchedule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const s = await fetchRetrainingStatus();
      setSchedule(s);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleEnable = async () => {
    setActionLoading(true);
    try {
      const s = await enableRetrainingSchedule("weekly");
      setSchedule(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to enable schedule");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async () => {
    setActionLoading(true);
    try {
      const s = await disableRetrainingSchedule();
      setSchedule(s);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to disable schedule");
    } finally {
      setActionLoading(false);
    }
  };

  const isEnabled = schedule?.status !== "disabled";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight flex items-center gap-2">
            <Timer className="size-6" /> Auto Retraining
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Schedule weekly model retraining. All runs produce a challenger —
            human approval is always required before promotion.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {schedule && (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Schedule Config Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Schedule Configuration
                <ScheduleStatusBadge status={schedule.status} />
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cadence</p>
                  <p className="font-medium capitalize">{schedule.cadence}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Next Run</p>
                  <p className="font-medium">
                    {schedule.nextRunAt
                      ? new Date(schedule.nextRunAt).toLocaleString("en-GB", {
                          weekday: "short", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>
                {schedule.lastRunId && (
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Run ID</p>
                    <p className="font-mono text-xs truncate">{schedule.lastRunId}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex gap-2">
                {!isEnabled ? (
                  <Button onClick={handleEnable} disabled={actionLoading} className="flex-1">
                    <Play className="size-4 mr-2" />
                    {actionLoading ? "Enabling…" : "Enable Schedule"}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={handleDisable} disabled={actionLoading} className="flex-1">
                    <Pause className="size-4 mr-2" />
                    {actionLoading ? "Disabling…" : "Disable Schedule"}
                  </Button>
                )}
              </div>

              {schedule.status === "awaiting_review" && (
                <div className="rounded-md border border-purple-300 bg-purple-50/50 dark:bg-purple-950/20 p-3 text-sm">
                  <p className="font-semibold text-purple-800 dark:text-purple-300">Challenger ready for review</p>
                  <p className="text-purple-700 dark:text-purple-400 text-xs mt-0.5">
                    The last scheduled run produced a new challenger. Review it in the Model Registry before approving.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" asChild>
                    <a href="/dashboard/ml-admin/registry">Go to Registry →</a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Panel */}
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base">How Auto Retraining Works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 text-sm">
                {[
                  { icon: Clock, text: "Cron job fires every Sunday at 02:00 server time." },
                  { icon: CheckCircle2, text: "Checks that ≥25 new model_feedback rows exist since last run. Skips if below threshold." },
                  { icon: RefreshCw, text: "Runs training with the same logistic regression pipeline. Result is written as a challenger — never auto-promoted." },
                  { icon: CheckCircle2, text: "Status changes to 'Awaiting Review'. You compare champion vs challenger in the registry." },
                  { icon: Play, text: "Human clicks Promote or Reject. No automatic promotion under any circumstances." },
                  { icon: XCircle, text: "If training fails, status changes to 'Failed' and the schedule continues from the next Sunday." },
                ].map(({ icon: Icon, text }, i) => (
                  <li key={i} className="flex gap-3">
                    <div className="flex size-5 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                      {i + 1}
                    </div>
                    <p className="text-muted-foreground">{text}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
