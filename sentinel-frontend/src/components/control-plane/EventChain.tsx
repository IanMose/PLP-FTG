"use client";

import { Check, Loader2, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChainStep, ChainStepStatus, ChainStepKey } from "@/lib/control-plane/types";

// ── Labels ────────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<ChainStepKey, string> = {
  sense: "Sense",
  understand: "Understand",
  predict: "Predict",
  decide: "Decide",
  interlock: "Interlock",
  verify: "Verify",
  learn: "Learn",
};

// ── Status helpers ────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: ChainStepStatus }) {
  if (status === "done") return <Check className="h-3.5 w-3.5" />;
  if (status === "active") return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  if (status === "failed") return <X className="h-3.5 w-3.5" />;
  return <Circle className="h-2.5 w-2.5" />;
}

function statusColor(status: ChainStepStatus): string {
  switch (status) {
    case "done":
      return "var(--verify-success)";
    case "active":
      return "var(--risk-warning)";
    case "failed":
      return "var(--verify-failed)";
    default:
      return "hsl(var(--muted-foreground))";
  }
}

// ── EventChain component ──────────────────────────────────────────────────────

interface EventChainProps {
  steps: ChainStep[];
}

export function EventChain({ steps }: EventChainProps) {
  return (
    <ol
      className="flex flex-col gap-0 md:flex-row md:items-start"
      aria-label="Sentinel safety loop progress"
    >
      {steps.map((step, i) => {
        const color = statusColor(step.status);
        return (
          <li key={step.key} className="flex md:flex-1 md:flex-col">
            <div className="flex items-start md:flex-col md:items-center gap-3 md:gap-2 py-1 md:py-0">
              {/* Circle */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: color, color }}
                aria-hidden
              >
                <StatusIcon status={step.status} />
              </div>

              {/* Label + detail */}
              <div className="md:text-center">
                <div
                  className={cn(
                    "text-sm font-medium",
                    step.status === "pending"
                      ? "text-muted-foreground"
                      : "text-foreground",
                  )}
                >
                  {STEP_LABELS[step.key]}
                </div>
                {step.detail && (
                  <div className="tabular-readout font-mono text-xs text-muted-foreground mt-0.5">
                    {step.detail}
                  </div>
                )}
                {step.timestampIso && (
                  <div className="font-mono text-xs text-muted-foreground opacity-60">
                    {new Date(step.timestampIso).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Connector */}
            {i < steps.length - 1 && (
              <div
                className="ml-3.5 h-4 w-px bg-border md:ml-0 md:mt-2 md:h-px md:w-full md:self-start md:mt-3.5"
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ── Factory ───────────────────────────────────────────────────────────────────

export function buildEmptyChain(): ChainStep[] {
  const keys: ChainStepKey[] = [
    "sense", "understand", "predict", "decide", "interlock", "verify", "learn",
  ];
  return keys.map((key) => ({
    key,
    label: STEP_LABELS[key],
    status: "pending" as const,
  }));
}
