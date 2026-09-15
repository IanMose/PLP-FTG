"use client";

// KpiValue — displays formatted numbers for Executive KPI cards.
// NumberFlow animation is disabled due to Turbopack transpilation issues.
// Using plain formatted numbers instead — works reliably in test mode.

interface KpiValueProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
}

export function KpiValue({ value, suffix, prefix, decimals = 0 }: KpiValueProps) {
  const formatted = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

  return (
    <span className="tabular-nums text-3xl font-semibold text-[var(--console-text)]">
      {prefix}
      {formatted}
      {suffix && (
        <span className="ml-0.5 text-lg font-normal text-[var(--console-text-dim)]">
          {suffix}
        </span>
      )}
    </span>
  );
}
