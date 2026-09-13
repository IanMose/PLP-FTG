"use client";

import { ProvenanceBadge } from "./provenance-badge";

interface RoiResult {
  leadTimeDays: number;
  leadTimeSource: string;
  expectedAvoidedCostKes: number;
  netBenefitKes: number | null;
  roiPct: number | null;
  breakdown: Record<string, number>;
  disclaimer: string;
}

export function RoiResultDisplay({ result }: { result: RoiResult }) {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-KE", { style: "decimal" }).format(Math.round(n));

  return (
    <div className="space-y-4">
      {/* Lead time evidence */}
      <div className="rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 p-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-muted-foreground">EWMA Lead Time</span>
          <ProvenanceBadge type="SYNTHETIC" />
        </div>
        <p className="text-3xl font-bold tabular-nums">{result.leadTimeDays} days</p>
        <p className="text-xs text-muted-foreground mt-1">{result.leadTimeSource}</p>
      </div>

      {/* Calculation breakdown */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-semibold">Calculation Breakdown</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {Object.entries(result.breakdown).map(([key, val]) => (
                <tr key={key} className="hover:bg-muted/30">
                  <td className="py-1.5 pr-4 text-muted-foreground capitalize">
                    {key.replace(/_/g, " ").replace(/kes$/, " KES")}
                  </td>
                  <td className="py-1.5 text-right font-mono tabular-nums">
                    {typeof val === "number" ? (val < 1 ? val.toFixed(2) : fmt(val)) : String(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Main result */}
      <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-6">
        <p className="text-sm text-muted-foreground mb-1">Expected Avoided Cost</p>
        <p className="text-4xl font-bold tabular-nums">
          KES {fmt(result.expectedAvoidedCostKes)}
        </p>
        {result.netBenefitKes !== null && (
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Net Benefit</p>
              <p className="text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
                KES {fmt(result.netBenefitKes)}
              </p>
            </div>
            {result.roiPct !== null && (
              <div>
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className="text-xl font-semibold tabular-nums text-green-600 dark:text-green-400">
                  {result.roiPct.toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 p-4">
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Disclaimer:</strong> {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
