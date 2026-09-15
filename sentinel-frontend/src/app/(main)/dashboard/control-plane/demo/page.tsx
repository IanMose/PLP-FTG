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
import { ExternalLink } from "lucide-react";

export default function ControlRoomPage() {
  const { data: scenarios = [] } = useControlRoomScenarios();
  const runScenario = useRunControlRoomScenario();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [steps, setSteps] = useState<ChainStep[]>(buildEmptyChain());

  function handleRun(id: string) {
    setActiveId(id);
    setSteps(buildEmptyChain());

    // Animate chain pending → active → done as scenario runs
    runScenario.mutate(id, {
      onSuccess: (result) => {
        // Animate each step in sequence for visual effect
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--console-text)]">
          Control Room
        </h1>
        <p className="text-sm text-[var(--console-text-dim)] mt-1">
          Trigger a rehearsed scenario to watch the full Sense → Verify → Learn loop in real time.
        </p>
      </div>

      {/* Scenario picker */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--console-text-dim)]">
          Choose a scenario
        </h2>
        <ScenarioPicker
          scenarios={scenarios}
          activeId={activeId}
          onRun={handleRun}
          disabled={runScenario.isPending}
        />
      </section>

      {/* Loading state */}
      {runScenario.isPending && (
        <div className="text-sm text-[var(--console-text-dim)] animate-pulse">
          Running scenario…
        </div>
      )}

      {/* Event chain */}
      <section className="rounded-md border border-[var(--console-border)] bg-[var(--console-panel)] p-5">
        <h2 className="mb-4 text-sm font-medium text-[var(--console-text-dim)]">
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

      {/* Disclaimer */}
      <div className="border-t border-[var(--console-border)] pt-4 text-xs text-[var(--console-text-dim)]">
        All actuations shown here use{" "}
        <code className="font-mono text-[var(--console-text)]">actuator: &quot;MOCK&quot;</code>.
        No real hardware is controlled.{" "}
        <a
          href="/dashboard/demo"
          className="underline underline-offset-2 hover:text-[var(--console-text)]"
        >
          Go to Live Demo page for the simpler one-click trigger.
        </a>
      </div>
    </div>
  );
}
