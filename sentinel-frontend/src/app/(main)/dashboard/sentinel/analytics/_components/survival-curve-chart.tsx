"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { SurvivalCurveData } from "@/lib/sentinel/types";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";

interface SurvivalCurveChartProps {
  data: SurvivalCurveData;
}

const chartConfig = {
  fleet: { color: "var(--color-blue-500)", label: "Fleet (all sites)" },
  high_risk: { color: "var(--color-red-500)", label: "High-Risk (SITE-003, SITE-006)" },
} satisfies ChartConfig;

export function SurvivalCurveChart({ data }: SurvivalCurveChartProps) {
  // Merge the two curve arrays into [{t, fleet, high_risk}]
  const chartData = data.curves.fleet.map((pt, i) => ({
    t: pt.t,
    fleet: pt.survival != null ? Math.round(pt.survival * 1000) / 10 : null,
    high_risk: data.curves.high_risk[i]?.survival != null
      ? Math.round((data.curves.high_risk[i].survival ?? 0) * 1000) / 10
      : null,
  }));

  const fleetMedian = Math.round(data.fleet_median_days);
  const hrMedian = Math.round(data.high_risk_median_days);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Audit Closure Time — Fleet vs High-Risk Sites</CardTitle>
        <CardDescription className="text-xs">
          Kaplan-Meier survival curve. Y-axis = fraction of findings still open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="t"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              label={{ value: "Days", position: "insideBottomRight", offset: -4, fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
              width={36}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent formatter={(v) => `${v}%`} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            {/* Fleet median reference */}
            <ReferenceLine
              x={fleetMedian}
              stroke="var(--color-blue-500)"
              strokeDasharray="4 2"
              strokeOpacity={0.6}
            />
            {/* High-risk median reference */}
            <ReferenceLine
              x={hrMedian}
              stroke="var(--color-red-500)"
              strokeDasharray="4 2"
              strokeOpacity={0.6}
            />
            <Line
              dataKey="fleet"
              stroke="var(--color-blue-500)"
              strokeWidth={2}
              dot={false}
              connectNulls
              type="stepAfter"
            />
            <Line
              dataKey="high_risk"
              stroke="var(--color-red-500)"
              strokeWidth={2}
              dot={false}
              connectNulls
              type="stepAfter"
            />
          </LineChart>
        </ChartContainer>

        {/* Quotable stat */}
        <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Fleet median closure</span>
            <span className="font-semibold tabular-nums text-blue-600 dark:text-blue-400">{fleetMedian}d</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">High-risk median closure</span>
            <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">{hrMedian}d</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">High-risk closure rate</span>
            <span className="font-semibold tabular-nums text-red-600 dark:text-red-400">
              {Math.round(data.high_risk_closure_rate * 100)}% vs {Math.round(data.fleet_closure_rate * 100)}%
            </span>
          </div>
          {data.ratio && (
            <p className="border-t pt-1 mt-1 font-medium">
              High-risk sites take <span className="text-red-600 dark:text-red-400">{data.ratio}×</span> longer to close findings
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
