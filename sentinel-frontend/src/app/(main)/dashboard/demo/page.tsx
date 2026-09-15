"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Zap, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActuatorResponseCard } from "@/components/control-plane/ActuatorResponseCard";
import { useExecutiveSummaryV5 } from "@/lib/control-plane/api";

// ── 5-step event feed ─────────────────────────────────────────────────────────

type StepStatus = "pending" | "active" | "done" | "failed";

interface DemoStep {
  key: string;
  label: string;
  description: string;
  status: StepStatus;
}

function buildSteps(): DemoStep[] {
  return [
    { key: "threshold", label: "Threshold breach", description: "Tank TK-04 at 97.2% — overfill rule fires", status: "pending" },
    { key: "event", label: "Event logged", description: "event_log row written with signal_type=overfill_risk", status: "pending" },
    { key: "valve", label: "Valve closure triggered", description: "ActuationTriggerService → actuator: MOCK", status: "pending" },
    { key: "slack", label: "Slack notified", description: "SlackNotificationService → #sentinel-alerts channel", status: "pending" },
    { key: "dashboard", label: "Dashboard updated", description: "Executive KPIs and actuation log refreshed", status: "pending" },
  ];
}

function stepColor(status: StepStatus): string {
  switch (status) {
    case "done": return "text-emerald-500 border-emerald-500";
    case "active": return "text-amber-500 border-amber-500 animate-pulse";
    case "failed": return "text-red-500 border-red-500";
    default: return "text-muted-foreground border-muted-foreground/30";
  }
}

function StepIcon({ status }: { status: StepStatus }) {
  if (status === "done") return <span className="text-base">✓</span>;
  if (status === "active") return <span className="text-base">⋯</span>;
  if (status === "failed") return <span className="text-base">✗</span>;
  return <span className="text-base">○</span>;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LiveDemoPage() {
  const qc = useQueryClient();
  const [steps, setSteps] = useState<DemoStep[]>(buildSteps());
  const [actuatorResponse, setActuatorResponse] = useState<Record<string, unknown> | null>(null);
  const [triggered, setTriggered] = useState(false);

  // After trigger, poll executive summary every 3s for 30s
  const { data: summary } = useExecutiveSummaryV5();

  const triggerMutation = useMutation({
    mutationFn: () =>
      fetch("/api/proxy/demo/trigger-overfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: "SITE-003" }),
      }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    onMutate: () => {
      setTriggered(true);
      setActuatorResponse(null);
      // Animate steps sequentially
      const delays = [200, 600, 1200, 1900, 2600];
      const freshSteps = buildSteps();
      setSteps(freshSteps.map((s) => ({ ...s, status: "pending" })));

      delays.forEach((delay, i) => {
        // Mark as active
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((s, idx) => ({ ...s, status: idx === i ? "active" : idx < i ? "done" : "pending" })),
          );
        }, delay);
        // Mark as done
        setTimeout(() => {
          setSteps((prev) =>
            prev.map((s, idx) => ({ ...s, status: idx <= i ? "done" : "pending" })),
          );
        }, delay + 300);
      });
    },
    onSuccess: (data) => {
      setActuatorResponse(data);
      toast.success("Overfill scenario complete — all 5 steps confirmed.");
      qc.invalidateQueries({ queryKey: ["executive-summary-v5"] });
      qc.invalidateQueries({ queryKey: ["actuation-log"] });
    },
    onError: (e: Error) => {
      toast.error(`Demo trigger failed: ${e.message}`);
      setSteps(buildSteps());
      setTriggered(false);
    },
  });

  const isRunning = triggerMutation.isPending;
  const allDone = steps.every((s) => s.status === "done");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl tracking-tight font-semibold">Live Demo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Trigger a simulated tank overfill at Thange Corridor and watch the full
          detect → act → notify loop run in real time.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="rounded-md border border-amber-300/40 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
        <strong>Simulated environment:</strong> All actuations use{" "}
        <code className="font-mono">actuator: &quot;MOCK&quot;</code>. No real hardware is
        controlled. The Slack notification goes to the configured webhook only if
        <code className="font-mono"> SLACK_WEBHOOK_URL</code> is set in production.
      </div>

      {/* Trigger button */}
      <div className="flex items-center gap-4">
        <Button
          size="lg"
          className="gap-2"
          disabled={isRunning}
          onClick={() => triggerMutation.mutate()}
        >
          <Zap className={`h-5 w-5 ${isRunning ? "animate-pulse" : ""}`} />
          {isRunning ? "Running scenario…" : "Simulate Tank Overfill at SITE-003"}
        </Button>

        {allDone && triggered && (
          <span className="text-sm text-emerald-600 font-medium">
            ✓ All 5 steps complete
          </span>
        )}
      </div>

      {/* 5-step event feed */}
      {triggered && (
        <div className="rounded-lg border bg-card p-5">
          <h2 className="text-sm font-semibold mb-4">Event sequence</h2>
          <ol className="space-y-0">
            {steps.map((step, i) => (
              <li key={step.key} className="flex gap-4">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 font-mono text-sm ${stepColor(step.status)}`}
                  >
                    <StepIcon status={step.status} />
                  </div>
                  {i < steps.length - 1 && (
                    <div className="w-px flex-1 bg-border my-1" />
                  )}
                </div>

                {/* Content */}
                <div className="pb-5 pt-1">
                  <div className={`text-sm font-medium ${step.status !== "pending" ? "" : "text-muted-foreground"}`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Actuator response */}
      {actuatorResponse && (
        <ActuatorResponseCard response={actuatorResponse} />
      )}

      {/* Post-trigger KPI update */}
      {allDone && summary && (
        <div className="rounded-md border border-emerald-300/40 bg-emerald-500/5 px-4 py-3">
          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
            Executive KPIs updated — {summary.overfillEventsPrevented} overfill events prevented this period.
          </p>
          <a
            href="/dashboard/executive"
            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            View Executive Control Plane <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* Link to full Control Plane */}
      <div className="border-t pt-4">
        <p className="text-xs text-muted-foreground">
          For the full interlock management experience, visit the{" "}
          <a href="/dashboard/control-plane/demo" className="underline underline-offset-2 hover:text-foreground">
            Control Room
          </a>{" "}
          where you can run rehearsed scenarios with the live event chain visualisation.
        </p>
      </div>
    </div>
  );
}
