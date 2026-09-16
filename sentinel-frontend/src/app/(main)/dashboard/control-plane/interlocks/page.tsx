"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useActuationLog } from "@/lib/control-plane/api";
import { EventChain, buildEmptyChain } from "@/components/control-plane/EventChain";
import { ControlModeConfigPanel } from "@/components/control-plane/ControlModeConfigPanel";
import type { ChainStep, ChainStepKey } from "@/lib/control-plane/types";
import type { VerifyStateKey } from "@/lib/control-plane/tokens";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ── Derive event chain from latest actuation log entry ────────────────────────

function deriveChain(entry: {
  eventType: string;
  controlMode: string;
  actionRequested: string;
  verifiedState: VerifyStateKey;
} | null): ChainStep[] {
  const chain = buildEmptyChain();
  if (!entry) return chain;

  const completedKeys: ChainStepKey[] = ["sense", "understand", "predict", "decide", "interlock"];
  chain.forEach((s) => {
    if (completedKeys.includes(s.key)) s.status = "done";
  });

  const interlockStep = chain.find((s) => s.key === "interlock")!;
  interlockStep.detail = `${entry.actionRequested} (${entry.controlMode})`;

  const verifyStep = chain.find((s) => s.key === "verify")!;
  verifyStep.status =
    entry.verifiedState === "CONFIRMED_CLOSED"
      ? "done"
      : entry.verifiedState === "CONFIRMED_OPEN"
        ? "failed"
        : entry.verifiedState === "UNVERIFIED"
          ? "active"
          : "failed"; // TIMEOUT
  verifyStep.detail = entry.verifiedState;

  const learnStep = chain.find((s) => s.key === "learn")!;
  learnStep.status = verifyStep.status === "done" ? "done" : "pending";

  return chain;
}

// ── Inner page ────────────────────────────────────────────────────────────────

function InterlockInner() {
  const params = useSearchParams();
  const siteId = params.get("site") ?? "";

  const { data: recentEvents = [] } = useActuationLog({ siteId: siteId || undefined });
  const latestEvent = recentEvents[0] ?? null;
  const chainSteps = deriveChain(latestEvent);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/control-plane/tanks"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tank Monitor
        </Link>
        <span className="text-border">/</span>
        <h1 className="text-xl font-semibold text-foreground">
          Interlock Control Center
          {siteId && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              — {siteId}
            </span>
          )}
        </h1>
      </div>

      {!siteId && (
        <div className="rounded-md border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Select a site from the{" "}
          <Link
            href="/dashboard/control-plane/tanks"
            className="underline underline-offset-2 hover:text-foreground"
          >
            Live Tank Monitor
          </Link>{" "}
          to see its event chain and control-mode configuration.
        </div>
      )}

      {siteId && (
        <>
          {/* Latest event chain */}
          <section className="rounded-md border border-border bg-card p-5">
            <h2 className="mb-4 text-sm font-medium text-muted-foreground">
              Latest event chain
              {!latestEvent && (
                <span className="ml-2 text-muted-foreground font-normal">
                  (no events yet — chain shown in idle state)
                </span>
              )}
            </h2>
            <EventChain steps={chainSteps} />
          </section>

          {/* Control mode configuration */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">
              Control mode configuration
            </h2>
            <ControlModeConfigPanel siteId={siteId} />
          </section>

          {/* Recent log snippet */}
          {recentEvents.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Recent actuation events
              </h2>
              <div className="space-y-2">
                {recentEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="rounded-md border border-border bg-card px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="text-muted-foreground font-mono">
                      {new Date(e.timestampIso).toLocaleString()}
                    </span>
                    <span className="text-foreground">{e.eventType}</span>
                    <span
                      className={`font-mono ${
                        e.verifiedState === "CONFIRMED_CLOSED"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : e.verifiedState === "TIMEOUT"
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {e.verifiedState}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/control-plane/audit-log"
                className="mt-2 inline-block text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                View full audit log →
              </Link>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default function InterlockControlCenterPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <InterlockInner />
    </Suspense>
  );
}
