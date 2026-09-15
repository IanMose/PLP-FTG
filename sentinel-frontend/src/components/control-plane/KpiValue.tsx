"use client";

// NumberFlow wrapper — used ONLY for Executive KPI animated counters.
// Deliberately NOT used for TtsCountdown (plain digit-swap conveys urgency better).
// Falls back gracefully if number-flow is not yet installed.

interface KpiValueProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

let NumberFlow: React.ComponentType<{
  value: number;
  format?: Intl.NumberFormatOptions;
}> | null = null;

try {
  // Lazy require — avoids hard crash if package not yet installed
  // biome-ignore lint/suspicious/noExplicitAny: dynamic import fallback
  NumberFlow = (require("number-flow") as any).default ?? (require("number-flow") as any).NumberFlow ?? null;
} catch {
  NumberFlow = null;
}

export function KpiValue({ value, suffix, prefix, decimals = 0 }: KpiValueProps) {
  const formatted =
    decimals > 0 ? value.toFixed(decimals) : value.toLocaleString();

  return (
    <span className="tabular-readout text-3xl font-semibold text-[var(--console-text)]">
      {prefix}
      {NumberFlow ? (
        <NumberFlow
          value={value}
          format={{
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
          }}
        />
      ) : (
        formatted
      )}
      {suffix && (
        <span className="ml-0.5 text-lg font-normal text-[var(--console-text-dim)]">
          {suffix}
        </span>
      )}
    </span>
  );
}
