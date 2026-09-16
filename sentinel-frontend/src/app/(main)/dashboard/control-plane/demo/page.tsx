"use client";

import { useState } from "react";
import {
  useControlRoomScenarios,
  useRunControlRoomScenario,
} from "@/lib/control-plane/api";
import { EventChain, buildEmptyChain } from "@/components/control-plane/EventChain";
import { ScenarioPicker } from "@/components/control-plane/ScenarioPicker";
import { ActuatorResponseCard } from "@/components/control-plane/ActuatorResponseCard";
import type { ChainStep } from "@/lib/control-plane/types";
import { ArrowRight, ExternalLink, MonitorPlay, ShieldAlert } from "lucide-react";

// ── Scenario metadata (copy for the pitch) ────────────────────────────────────

const SCENARIO_DESCRIPTIONS: Record<string, { what: string; expect: string }> = {
  "thange-ramp": {
    what:
      "Simulates a tank at SITE-003 (Thange Corridor) rising from 87% → 97% at +0.21%/s with the valve open and loading active — replicating the conditions of the Kimeu v KPC 2015 event.",
    expect:
      "TTS countdown, CRITICAL risk score, CONTROLLED mode interlock fires, mock valve closure sent, CONFIRMED_CLOSED verified within ~5 s.",
  },
  "high-rejection": {
    what:
      "Injects a burst of out-of-range telemetry records (level > 100%, negative flow) to exercise the data-quality gate and rejection quarantine.",
    expect:
      "Batch quarantined, ingest_log updated, alert raised with ADVISORY mode — no actuation since no hardware threat.",
  },
  "pressure-anomaly": {
    what:
      "Fires a cluster of pressure readings 2σ above baseline across three corridor assets to test the anomaly-detection and risk-scoring path.",
    expect:
      "Risk score rises to WARNING, human review flag raised, event chain stops at DECIDE — no automated actuation in ADVISORY mode.",
  },
};

// ── Pitch intro panel ─────────────────────────────────────────────────────────

function PitchIntroPanel() {
  return (
    <div className="rounded-lg border border-[var(--console-border)] bg-[var(--console-panel)] p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-orange-500/10">
          <ShieldAlert className="h-4 w-4 text-orange-400" aria-hidden />
        </div>
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-[var(--console-text)]">
            What this demonstrates
          </h2>
          <p className="text-xs text-[var(--console-text-dim)] leading-relaxed max-w-2xl">
            HSE Sentinel doesn&apos;t just detect unsafe conditions — it closes the loop
            between detection, intervention, and verification. Each scenario below runs
            the full <span className="text-[var(--console-text)]">Sense → Understand → Predict → Decide → Interlock → Verify → Learn</span> chain
            in real time, using the same production code path as a live event.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {(["Sense","Understand","Predict","Decide","Interlock","Verify","Learn"] as const).map((s, i, arr) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-[var(--console-text)]">{s}</span>
                {i < arr.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-[var(--console-border)]" aria-hidden />
                )}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-[var(--console-text-dim)] border-t border-[var(--console-border)] pt-2 mt-1">
            All actuations use <code className="font-mono text-[var(--console-text)]">actuator: &quot;MOCK&quot;</code>.
            No real hardware is controlled. A production deployment would bind to the KPC SCADA interface.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ControlRoomPage() {
  const { data: scenarios = [] } = useControlRoomScenarios();
  const runScenario = useRunControlRoomScenario();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ChainStep[]>(buildEmptyChain());

  function handleRun(id: string) {
    setActiveId(id);
    setSteps(buildEmptyChain());

    runScenario.mutate(id, {
      onSuccess: (result) => {
        result.steps.forEach((step, i) => {
          setTimeout(() => {
            setSteps((prev) =>
              prev.map((s, idx) => {
                if (idx < i) return { ...s, status: "done" };
                if (idx === i) return { ...step, status: "active" };
                return s;
              }),
            );
          }, i * 350);
          setTimeout(() => {
            setSteps((prev) =>
              prev.map((s, idx) => {
                if (idx <= i) return { ...result.steps[idx], status: "done" };
                return s;
              }),
            );
          }, i * 350 + 300);
        });
      },
    });
  }

  const activeDescription = activeId ? SCENARIO_DESCRIPTIONS[activeId] : null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <MonitorPlay className="h-5 w-5 text-[var(--console-text-dim)]" aria-hidden />
        <div>
          <h1 className="text-xl font-semibold text-[var(--console-text)]">
            Control Room
          </h1>
          <p className="text-xs text-[var(--console-text-dim)] mt-0.5">
            Trigger a rehearsed scenario and watch the full Sense → Verify → Learn loop execute in real time.
          </p>
        </div>
      </div>

      {/* Pitch intro */}
      <PitchIntroPanel />

      {/* Scenario picker */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--console-text-dim)]">
          Choose a scenario
        </h2>
        <ScenarioPicker
          scenarios={scenarios}
          activeId={activeId}
          onRun={handleRun}
          disabled={runScenario.isPending}
        />
      </section>

      {/* Active scenario description */}
      {activeDescription && (
        <div className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] px-5 py-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--console-text-dim)]">
            What this simulates
          </h3>
          <p className="text-xs text-[var(--console-text)] leading-relaxed">
            {activeDescription.what}
          </p>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--console-text-dim)] pt-1">
            Expected outcome
          </h3>
          <p className="text-xs text-[var(--console-text)] leading-relaxed">
            {activeDescription.expect}
          </p>
        </div>
      )}

      {/* Running state */}
      {runScenario.isPending && (
        <div className="text-sm text-[var(--console-text-dim)] animate-pulse">
          Running scenario…
        </div>
      )}

      {/* Event chain */}
      <section className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--console-text-dim)]">
          {activeId ? "Live event chain" : "Event chain — select a scenario above"}
        </h2>
        <EventChain steps={steps} />
      </section>

      {/* Actuator response */}
      {runScenario.isSuccess && runScenario.data?.actuatorResponseRaw && (
        <ActuatorResponseCard response={runScenario.data.actuatorResponseRaw} />
      )}

      {/* Post-run links */}
      {runScenario.isSuccess && (
        <div className="flex flex-wrap gap-4 text-xs text-[var(--console-text-dim)]">
          <a
            href="/dashboard/control-plane/audit-log"
            className="flex items-center gap-1 underline underline-offset-2 hover:text-[var(--console-text)]"
          >
            View full audit log <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="/dashboard/executive"
            className="flex items-center gap-1 underline underline-offset-2 hover:text-[var(--console-text)]"
          >
            Executive KPIs <ExternalLink className="h-3 w-3" />
          </a>
          <span>Check #sentinel-alerts Slack channel for the corresponding notification.</span>
        </div>
      )}
    </div>
  );
}
