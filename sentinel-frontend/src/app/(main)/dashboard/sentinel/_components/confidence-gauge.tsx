"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DataQualitySummary } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface ConfidenceGaugeProps {
  summary: DataQualitySummary;
}

// Semicircular gauge showing data confidence as a percentage of trusted + corrected records.
function GaugeSvg({ value }: { value: number }) {
  const totalSegments = 30;
  const filledSegments = Math.round((value / 100) * totalSegments);
  const radius = 80;
  const strokeWidth = 8;
  const gap = 2.5; // degrees between segments
  const totalArc = 180; // semicircle
  const segmentArc = (totalArc - gap * (totalSegments - 1)) / totalSegments;

  const segments = Array.from({ length: totalSegments }, (_, i) => {
    const startAngle = 180 + i * (segmentArc + gap);
    const endAngle = startAngle + segmentArc;
    const isFilled = i < filledSegments;
    const isRed = i >= filledSegments && i < totalSegments;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = 100 + radius * Math.cos(startRad);
    const y1 = 100 + radius * Math.sin(startRad);
    const x2 = 100 + radius * Math.cos(endRad);
    const y2 = 100 + radius * Math.sin(endRad);

    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;

    // Use CSS classes for theming instead of hardcoded RGBA
    let className: string;
    if (isFilled) {
      className = "stroke-green-600 dark:stroke-white";
    } else if (isRed) {
      className = "stroke-red-500";
    } else {
      className = "stroke-muted-foreground/20";
    }

    // Opacity still varies for filled segments for the gradient effect
    const opacity = isFilled ? 0.4 + (i / filledSegments) * 0.6 : isRed ? 0.8 : 1;

    return (
      <path
        key={i}
        d={path}
        fill="none"
        className={className}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        style={{ opacity }}
      />
    );
  });

  return (
    <svg viewBox="0 0 200 115" className="mx-auto w-full max-w-[240px]">
      {segments}
      <text
        x="100"
        y="95"
        textAnchor="middle"
        className="fill-foreground font-bold text-[28px]"
      >
        {value.toFixed(0)}%
      </text>
      <text
        x="100"
        y="112"
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        Confidence
      </text>
    </svg>
  );
}

export function ConfidenceGauge({ summary }: ConfidenceGaugeProps) {
  const confidenceRate = summary.passRate * 100;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-normal text-muted-foreground">Data Confidence</CardTitle>
            <p className="font-semibold text-xl">{confidenceRate.toFixed(1)}% reliable</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <GaugeSvg value={confidenceRate} />

        <div className="grid grid-cols-3 divide-x border-t pt-4">
          <div className="flex flex-col items-center gap-1.5 px-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <CheckCircle2 className="size-4 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground text-xs">Trusted</span>
            <span className="font-semibold text-sm tabular-nums">{summary.trusted}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <AlertTriangle className="size-4 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground text-xs">Review</span>
            <span className="font-semibold text-sm tabular-nums">{summary.review}</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 px-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
              <XCircle className="size-4 text-muted-foreground" />
            </div>
            <span className="text-muted-foreground text-xs">Rejected</span>
            <span className="font-semibold text-sm tabular-nums">{summary.rejected}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
