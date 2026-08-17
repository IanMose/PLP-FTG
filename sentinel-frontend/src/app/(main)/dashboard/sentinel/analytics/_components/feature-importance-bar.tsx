"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { FeatureImportanceData } from "@/lib/sentinel/types";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";

interface FeatureImportanceBarProps {
  data: FeatureImportanceData;
}

// Human-readable feature name mapping
const FEATURE_LABELS: Record<string, string> = {
  audit_finding_open_count:       "Open Audit Findings",
  incident_severity_score_30d:    "Severity Score (30d)",
  incident_count_30d:             "Incident Count (30d)",
  days_since_last_audit:          "Days Since Last Audit",
  rejection_rate_30d:             "Rejection Rate (30d)",
  rejection_rate_7d:              "Rejection Rate (7d)",
  pressure_anomaly_count_14d:     "Pressure Anomalies (14d)",
};

const chartConfig = {
  importance: { label: "Importance", color: "var(--color-blue-500)" },
} satisfies ChartConfig;

export function FeatureImportanceBar({ data }: FeatureImportanceBarProps) {
  const sorted = [...data.features].sort((a, b) => b.importance - a.importance);

  const chartData = sorted.map((f, i) => ({
    name: FEATURE_LABELS[f.name] ?? f.name,
    importance: Math.round(f.importance * 1000) / 10, // as percentage
    isTop: i === 0,
    direction: f.direction,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">ML Feature Importance</CardTitle>
        <CardDescription className="text-xs">
          {data.model_version} — standardised logistic regression coefficients
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ChartContainer config={chartConfig} className="h-52 w-full">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 4, right: 48, bottom: 0, left: 4 }}
          >
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}%`}
              domain={[0, 100]}
            />
            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10 }}
              width={130}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v) => [`${v}%`, "Importance"]}
                />
              }
            />
            <Bar dataKey="importance" radius={[0, 3, 3, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.isTop
                      ? "var(--color-amber-500)"
                      : "var(--color-blue-500)"
                  }
                  fillOpacity={entry.isTop ? 1 : 0.65}
                />
              ))}
              <LabelList
                dataKey="importance"
                position="right"
                formatter={(v: unknown) => typeof v === "number" ? `${v.toFixed(1)}%` : ""}
                style={{ fontSize: 10, fill: "currentColor" }}
              />
            </Bar>
          </BarChart>
        </ChartContainer>

        <p className="text-xs text-muted-foreground border-t pt-2">
          Label:{" "}
          <span className="text-foreground font-medium">{data.label_definition}</span>
        </p>
      </CardContent>
    </Card>
  );
}
