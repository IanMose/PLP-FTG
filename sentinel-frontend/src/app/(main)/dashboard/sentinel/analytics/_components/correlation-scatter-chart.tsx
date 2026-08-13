"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip } from "@/components/ui/chart";
import type { CorrelationData } from "@/lib/sentinel/types";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, LabelList } from "recharts";

interface CorrelationScatterChartProps {
  data: CorrelationData;
}

const BAND_COLORS: Record<string, string> = {
  Critical: "var(--color-red-500)",
  High:     "var(--color-orange-500)",
  Medium:   "var(--color-yellow-500)",
  Low:      "var(--color-green-500)",
};

// Custom tooltip for scatter chart
function ScatterTooltipContent({ active, payload }: { active?: boolean; payload?: {payload?: {site_name?: string; rejection_rate_30d?: number; incident_count_30d?: number}}[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium">{d.site_name}</p>
      <p className="text-muted-foreground">
        Rejection rate: {((d.rejection_rate_30d ?? 0) * 100).toFixed(1)}%
      </p>
      <p className="text-muted-foreground">
        Incident count (30d avg): {(d.incident_count_30d ?? 0).toFixed(1)}
      </p>
    </div>
  );
}

const chartConfig = {
  incidents: { label: "Incidents (30d avg)" },
} satisfies ChartConfig;

export function CorrelationScatterChart({ data }: CorrelationScatterChartProps) {
  // Recharts ScatterChart needs {x, y} named consistently; map for it
  const points = data.scatter_points.map((p) => ({
    ...p,
    x: p.rejection_rate_30d,
    y: p.incident_count_30d,
    fill: BAND_COLORS[p.band] ?? "var(--color-slate-400)",
  }));

  const rAbs = Math.abs(data.pearson_r);
  const strength = rAbs >= 0.70 ? "strong" : rAbs >= 0.40 ? "moderate" : "weak";
  const direction = data.pearson_r > 0 ? "positive" : "negative";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Data Quality vs Incident Rate</CardTitle>
        <CardDescription className="text-xs">
          Rejection rate (30d) vs incident count (30d) — one point per site
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="x"
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
              label={{ value: "Rejection rate (%)", position: "insideBottom", offset: -10, fontSize: 11 }}
            />
            <YAxis
              dataKey="y"
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11 }}
              width={32}
              label={{ value: "Incidents", angle: -90, position: "insideLeft", fontSize: 11 }}
            />
            <ChartTooltip content={<ScatterTooltipContent />} />
            <Scatter
              data={points}
              shape={(props: React.SVGProps<SVGCircleElement> & { cx?: number; cy?: number; fill?: string }) => (
                <circle
                  cx={props.cx}
                  cy={props.cy}
                  r={7}
                  fill={props.fill}
                  fillOpacity={0.8}
                  stroke="white"
                  strokeWidth={1.5}
                />
              )}
            >
              <LabelList
                dataKey="site_id"
                position="top"
                style={{ fontSize: 9, fill: "currentColor" }}
              />
            </Scatter>
          </ScatterChart>
        </ChartContainer>

        {/* Stat */}
        <div className="rounded-md bg-muted px-3 py-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Pearson r</span>
            <span className="font-semibold tabular-nums">
              {data.pearson_r.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">p-value</span>
            <span className="font-semibold tabular-nums">{data.p_value.toFixed(3)}</span>
          </div>
          <p className="border-t pt-1 mt-1">
            <span className="capitalize">{strength}</span> {direction} correlation across {data.n_sites} sites
            {data.p_value >= 0.05 && (
              <span className="text-muted-foreground"> (n={data.n_sites} — interpret with caution)</span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
