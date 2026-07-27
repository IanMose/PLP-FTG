"use client";

import { useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Alert } from "@/lib/sentinel/types";

interface AlertTrendChartProps {
  alerts: Alert[];
}

type Period = "7d" | "30d" | "90d";

const periodDays: Record<Period, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const chartConfig = {
  critical: { color: "var(--color-red-500)", label: "Critical" },
  high: { color: "var(--color-orange-500)", label: "High" },
  medium: { color: "var(--color-yellow-500)", label: "Medium" },
  low: { color: "var(--color-green-500)", label: "Low" },
} satisfies ChartConfig;

export function AlertTrendChart({ alerts }: AlertTrendChartProps) {
  const [period, setPeriod] = useState<Period>("7d");
  const days = periodDays[period];

  const chartData = useMemo(() => {
    const cutoff = subDays(new Date(), days);
    const buckets = new Map<string, { critical: number; high: number; medium: number; low: number }>();

    // Pre-fill every day in the window so the chart has no gaps
    for (let i = days - 1; i >= 0; i--) {
      const label = format(subDays(new Date(), i), "MMM d");
      if (!buckets.has(label)) {
        buckets.set(label, { critical: 0, high: 0, medium: 0, low: 0 });
      }
    }

    // Accumulate real alert data from the API
    for (const alert of alerts) {
      const createdAt = new Date(alert.createdAt);
      if (createdAt < cutoff) continue;
      const label = format(createdAt, "MMM d");
      const bucket = buckets.get(label);
      if (!bucket) continue;
      const sev = alert.severity.toLowerCase() as "critical" | "high" | "medium" | "low";
      bucket[sev] += 1;
    }

    return Array.from(buckets.entries()).map(([date, counts]) => ({ date, ...counts }));
  }, [alerts, days]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-normal">Alert Trends</CardTitle>
        <CardAction>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
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
            <XAxis
              axisLine={false}
              dataKey="date"
              tickLine={false}
              tickMargin={10}
              tick={{ fontSize: 12 }}
              interval={days > 7 ? Math.floor(days / 7) - 1 : 0}
            />
            <YAxis hide axisLine={false} tickLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <Line dataKey="critical" dot={false} stroke="var(--color-red-500)" strokeLinecap="round" strokeWidth={2} type="monotone" />
            <Line dataKey="high" dot={false} stroke="var(--color-orange-500)" strokeLinecap="round" strokeWidth={2} type="monotone" />
            <Line dataKey="medium" dot={false} stroke="var(--color-yellow-500)" strokeLinecap="round" strokeWidth={2} type="monotone" />
            <Line dataKey="low" dot={false} stroke="var(--color-green-500)" strokeLinecap="round" strokeWidth={2} type="monotone" />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
