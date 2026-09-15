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
          className="flex items-center gap-1.5 text-xs text-[var(--console-text-dim)] hover:text-[var(--console-text)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Tank Monitor
        </Link>
        <span className="text-[var(--console-border)]">/</span>
        <h1 className="text-xl font-semibold text-[var(--console-text)]">
          Interlock Control Center
          {siteId && (
            <span className="ml-2 text-sm font-normal text-[var(--console-text-dim)]">
              — {siteId}
            </span>
          )}
        </h1>
      </div>

      {!siteId && (
        <div className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] p-6 text-center text-sm text-[var(--console-text-dim)]">
          Select a site from the{" "}
          <Link
            href="/dashboard/control-plane/tanks"
            className="underline underline-offset-2 hover:text-[var(--console-text)]"
          >
            Live Tank Monitor
          </Link>{" "}
          to see its event chain and control-mode configuration.
        </div>
      )}

      {siteId && (
        <>
          {/* Latest event chain */}
          <section className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] p-5">
            <h2 className="mb-4 text-sm font-medium text-[var(--console-text-dim)]">
              Latest event chain
              {!latestEvent && (
                <span className="ml-2 text-[var(--console-text-dim)] font-normal">
                  (no events yet — chain shown in idle state)
                </span>
              )}
            </h2>
            <EventChain steps={chainSteps} />
          </section>

          {/* Control mode configuration */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-[var(--console-text-dim)]">
              Control mode configuration
            </h2>
            <ControlModeConfigPanel siteId={siteId} />
          </section>

          {/* Recent log snippet */}
          {recentEvents.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-medium text-[var(--console-text-dim)]">
                Recent actuation events
              </h2>
              <div className="space-y-2">
                {recentEvents.slice(0, 3).map((e) => (
                  <div
                    key={e.id}
                    className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] px-4 py-2.5 flex items-center justify-between text-xs"
                  >
                    <span className="text-[var(--console-text-dim)] font-mono">
                      {new Date(e.timestampIso).toLocaleString()}
                    </span>
                    <span className="text-[var(--console-text)]">{e.eventType}</span>
                    <span
                      className={`font-mono ${
                        e.verifiedState === "CONFIRMED_CLOSED"
                          ? "text-emerald-400"
                          : e.verifiedState === "TIMEOUT"
                            ? "text-orange-400"
                            : "text-amber-400"
                      }`}
                    >
                      {e.verifiedState}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/dashboard/control-plane/audit-log"
                className="mt-2 inline-block text-xs text-[var(--console-text-dim)] hover:text-[var(--console-text)] underline underline-offset-2"
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
    <Suspense fallback={<div className="p-6 text-sm text-[var(--console-text-dim)]">Loading…</div>}>
      <InterlockInner />
    </Suspense>
  );
}
