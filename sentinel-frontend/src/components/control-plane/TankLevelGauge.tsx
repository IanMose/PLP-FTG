"use client";

import { Label, PolarGrid, RadialBar, RadialBarChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { RISK_BAND, type RiskBandKey } from "@/lib/control-plane/tokens";

interface TankLevelGaugeProps {
  level: number; // 0–100
  riskBand: RiskBandKey;
}

export function TankLevelGauge({ level, riskBand }: TankLevelGaugeProps) {
  const color = RISK_BAND[riskBand].token;
  const chartConfig = {
    level: { label: "Level", color },
  } satisfies ChartConfig;

  const data = [{ name: "level", value: level, fill: color }];

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[120px]">
      <RadialBarChart
        data={data}
        startAngle={90}
        endAngle={90 - (level / 100) * 360}
        innerRadius={42}
        outerRadius={56}
      >
        <PolarGrid gridType="circle" radialLines={false} stroke="none" className="opacity-20" />
        <RadialBar dataKey="value" background cornerRadius={4} />
        <Label
          content={({ viewBox }) => {
            if (!viewBox || !("cx" in viewBox)) return null;
            const { cx, cy } = viewBox as { cx: number; cy: number };
            return (
              <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                <tspan
                  className="tabular-readout fill-[var(--console-text)] text-xl font-semibold"
                  x={cx}
                  dy="-0.1em"
                  fontSize={18}
                  fontWeight={600}
                  fill="var(--console-text)"
                >
                  {level.toFixed(0)}%
                </tspan>
              </text>
            );
          }}
        />
      </RadialBarChart>
    </ChartContainer>
  );
}
