"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceTrendPoint } from "@/lib/sentinel/types";

interface ComplianceTrendChartProps {
  trend: ComplianceTrendPoint[];
}

const LINES = [
  { key: "ocsScore",              label: "OCS",               color: "#6366f1", strokeWidth: 2.5 },
  { key: "safetyScore",           label: "Safety",            color: "#ef4444", strokeWidth: 1.5 },
  { key: "environmentalScore",    label: "Environmental",     color: "#22c55e", strokeWidth: 1.5 },
  { key: "assetIntegrityScore",   label: "Asset Integrity",   color: "#f59e0b", strokeWidth: 1.5 },
  { key: "regulatoryScore",       label: "Regulatory",        color: "#3b82f6", strokeWidth: 1.5 },
] as const;

export function ComplianceTrendChart({ trend }: ComplianceTrendChartProps) {
  const formatted = trend.map((p) => ({
    ...p,
    week: p.weekStart.slice(5), // "MM-DD" for axis label
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Compliance Trend</CardTitle>
        <CardDescription>12-week rolling OCS and domain scores — threshold bands at 75% and 90%</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="week"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              domain={[60, 100]}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(value: number | null, name: string) => [
                value != null ? `${value.toFixed(1)}%` : "—",
                name,
              ]}
              contentStyle={{ fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />

            {/* Threshold reference lines */}
            <ReferenceLine y={90} stroke="#22c55e" strokeDasharray="4 3" strokeOpacity={0.6}
              label={{ value: "90% Green", position: "insideTopRight", fontSize: 10, fill: "#22c55e" }} />
            <ReferenceLine y={75} stroke="#f59e0b" strokeDasharray="4 3" strokeOpacity={0.6}
              label={{ value: "75% Amber", position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }} />

            {LINES.map((l) => (
              <Line
                key={l.key}
                type="monotone"
                dataKey={l.key}
                name={l.label}
                stroke={l.color}
                strokeWidth={l.strokeWidth}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
