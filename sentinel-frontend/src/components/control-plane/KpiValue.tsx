"use client";

// KpiValue — displays formatted numbers for Executive KPI cards.
// Uses theme-aware colors that work in both light and dark modes.

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
    <span className="tabular-nums text-3xl font-semibold text-foreground">
      {prefix}
      {formatted}
      {suffix && (
        <span className="ml-0.5 text-lg font-normal text-muted-foreground">
          {suffix}
        </span>
      )}
    </span>
  );
}
