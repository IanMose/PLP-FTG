"use client";

import { useEffect, useState } from "react";

interface TtsCountdownProps {
  /** Seconds until unsafe level; null = no active ramp */
  initialSeconds: number | null;
  /** Called on every tick — parent can use to trigger re-sync on next poll */
  onTick?: (remaining: number) => void;
}

function formatTts(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function TtsCountdown({ initialSeconds, onTick }: TtsCountdownProps) {
  const [remaining, setRemaining] = useState<number | null>(initialSeconds);

  // Resync whenever the parent polls fresh telemetry
  useEffect(() => {
    setRemaining(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (remaining === null || remaining <= 0) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev === null) return null;
        const next = prev - 1;
        onTick?.(next);
        return next <= 0 ? 0 : next;
      });
    }, 1_000);
    return () => clearInterval(id);
  }, [remaining, onTick]);

  if (remaining === null) {
    return (
      <p className="text-xs text-muted-foreground">No active trend</p>
    );
  }

  const isCritical = remaining <= 60;
  const isEmpty = remaining <= 0;

  return (
    <div className="mt-1 flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">TTS</span>
      <span
        className={`tabular-readout font-mono text-sm font-semibold ${
          isEmpty
            ? "text-[var(--risk-emergency)]"
            : isCritical
              ? "text-[var(--risk-critical)]"
              : "text-foreground"
        }`}
      >
        {isEmpty ? "OVERDUE" : formatTts(remaining)}
      </span>
    </div>
  );
}
