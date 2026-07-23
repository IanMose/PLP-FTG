"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Alert } from "@/lib/sentinel/types";

interface AlertTrendChartProps {
  alerts: Alert[];
}

function buildTrendData(alerts: Alert[]) {
  // Group alerts by date and severity
  const dateMap = new Map<string, { critical: number; high: number; medium: number; low: number }>();

  // Generate last 7 days
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dateMap.set(key, { critical: 0, high: 0, medium: 0, low: 0 });
  }

  for (const alert of alerts) {
    const d = new Date(alert.createdAt);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const entry = dateMap.get(key);
    if (entry) {
      const sev = alert.severity.toLowerCase() as "critical" | "high" | "medium" | "low";
      entry[sev] = (entry[sev] || 0) + 1;
    }
  }

  return Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));
}

const chartConfig = {
  critical: {
    color: "var(--color-red-500)",
    label: "Critical",
  },
  high: {
    color: "var(--color-orange-500)",
    label: "High",
  },
  medium: {
    color: "var(--color-yellow-500)",
    label: "Medium",
  },
  low: {
    color: "var(--color-green-500)",
    label: "Low",
  },
} satisfies ChartConfig;

export function AlertTrendChart({ alerts }: AlertTrendChartProps) {
  const chartData = buildTrendData(alerts);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Alert Trends</CardTitle>
        <CardAction>
          <Select defaultValue="7d">
            <SelectTrigger className="w-28" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
                <SelectItem value="90d">90 days</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>

      <CardContent>
        <ChartContainer config={chartConfig} className="h-50 w-full">
          <LineChart accessibilityLayer data={chartData} margin={{ bottom: 0, left: 0, right: 0, top: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis axisLine={false} dataKey="date" tickLine={false} tickMargin={10} tick={{ fontSize: 12 }} />
            <YAxis hide axisLine={false} tickLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line
              dataKey="critical"
              dot={false}
              stroke="var(--color-red-500)"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="high"
              dot={false}
              stroke="var(--color-orange-500)"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="medium"
              dot={false}
              stroke="var(--color-yellow-500)"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
            <Line
              dataKey="low"
              dot={false}
              stroke="var(--color-green-500)"
              strokeLinecap="round"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
