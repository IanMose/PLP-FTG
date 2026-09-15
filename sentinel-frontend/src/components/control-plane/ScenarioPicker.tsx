import { cn } from "@/lib/utils";
import type { ControlRoomScenario } from "@/lib/control-plane/types";

const OUTCOME_LABEL: Record<ControlRoomScenario["expectedOutcome"], string> = {
  REJECTED: "Expected: rejected at the gate",
  CORRECTED: "Expected: auto-corrected",
  NEEDS_REVIEW: "Expected: flagged for review",
  INTERLOCK_TRIGGERED: "Expected: full interlock sequence",
};

const OUTCOME_COLOR: Record<ControlRoomScenario["expectedOutcome"], string> = {
  REJECTED: "text-red-400",
  CORRECTED: "text-emerald-400",
  NEEDS_REVIEW: "text-amber-400",
  INTERLOCK_TRIGGERED: "text-orange-400",
};

interface ScenarioPickerProps {
  scenarios: ControlRoomScenario[];
  activeId: string | null;
  onRun: (id: string) => void;
  disabled?: boolean;
}

export function ScenarioPicker({
  scenarios,
  activeId,
  onRun,
  disabled,
}: ScenarioPickerProps) {
  const sorted = [...scenarios]
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .slice(0, 3);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {sorted.map((s) => {
        const isActive = activeId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            disabled={disabled}
            onClick={() => onRun(s.id)}
            className={cn(
              "rounded-md border p-4 text-left transition-colors",
              "border-[var(--console-border)] bg-[var(--console-panel)]",
              "hover:border-white/30 disabled:opacity-50 disabled:cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
              isActive && "border-[var(--risk-warning)] bg-amber-900/10",
            )}
          >
            <div className="font-medium text-[var(--console-text)] text-sm">
              {s.label}
            </div>
            <div
              className={cn(
                "mt-1 text-xs",
                OUTCOME_COLOR[s.expectedOutcome],
              )}
            >
              {OUTCOME_LABEL[s.expectedOutcome]}
            </div>
          </button>
        );
      })}
    </div>
  );
}
