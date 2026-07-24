"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const chartData = [
  { date: "Jul 16", critical: 1, high: 2, medium: 1 },
  { date: "Jul 17", critical: 0, high: 1, medium: 2 },
  { date: "Jul 18", critical: 1, high: 3, medium: 1 },
  { date: "Jul 19", critical: 2, high: 1, medium: 3 },
  { date: "Jul 20", critical: 1, high: 2, medium: 2 },
  { date: "Jul 21", critical: 3, high: 2, medium: 1 },
  { date: "Jul 22", critical: 2, high: 1, medium: 1 },
];

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
} satisfies ChartConfig;

export function AlertTrendChart() {
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
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
