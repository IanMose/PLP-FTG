"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RagStatus } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface ComplianceGaugeProps {
  label: string;
  score: number;
  rag: RagStatus;
  subtitle?: string;
  size?: "lg" | "sm";
}

const RAG_COLORS: Record<RagStatus, { fill: string; text: string; bg: string }> = {
  GREEN: { fill: "rgba(34,197,94,",  text: "text-green-600 dark:text-green-400",  bg: "bg-green-500/10" },
  AMBER: { fill: "rgba(234,179,8,",  text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500/10" },
  RED:   { fill: "rgba(239,68,68,",  text: "text-red-600 dark:text-red-400",       bg: "bg-red-500/10" },
};

function ComplianceGaugeSvg({ value, rag, size }: { value: number; rag: RagStatus; size: "lg" | "sm" }) {
  const totalSegments = size === "lg" ? 30 : 20;
  const filledSegments = Math.round((value / 100) * totalSegments);
  const radius = size === "lg" ? 80 : 54;
  const strokeWidth = size === "lg" ? 8 : 6;
  const gap = 2.5;
  const totalArc = 180;
  const segmentArc = (totalArc - gap * (totalSegments - 1)) / totalSegments;
  const { fill } = RAG_COLORS[rag];
  const viewBox = size === "lg" ? "0 0 200 115" : "0 0 130 75";
  const cx = size === "lg" ? 100 : 65;
  const cy = size === "lg" ? 100 : 68;
  const textY1 = size === "lg" ? 95 : 62;
  const textY2 = size === "lg" ? 112 : 74;
  const fontSize1 = size === "lg" ? "28px" : "18px";
  const fontSize2 = size === "lg" ? "10px" : "8px";

  const segments = Array.from({ length: totalSegments }, (_, i) => {
    const startAngle = 180 + i * (segmentArc + gap);
    const endAngle = startAngle + segmentArc;
    const isFilled = i < filledSegments;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const x1 = cx + radius * Math.cos(startRad);
    const y1 = cy + radius * Math.sin(startRad);
    const x2 = cx + radius * Math.cos(endRad);
    const y2 = cy + radius * Math.sin(endRad);
    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;

    let color: string;
    if (isFilled) {
      const opacity = 0.4 + (i / Math.max(filledSegments, 1)) * 0.6;
      color = `${fill}${opacity})`;
    } else {
      color = "rgba(120,120,120,0.15)";
    }

    return <path key={i} d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />;
  });

  return (
    <svg viewBox={viewBox} className={cn("mx-auto w-full", size === "lg" ? "max-w-[240px]" : "max-w-[160px]")}>
      {segments}
      <text x={cx} y={textY1} textAnchor="middle" className="fill-foreground font-bold" style={{ fontSize: fontSize1 }}>
        {value.toFixed(0)}%
      </text>
      <text x={cx} y={textY2} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: fontSize2 }}>
        Compliance
      </text>
    </svg>
  );
}

export function ComplianceGauge({ label, score, rag, subtitle, size = "lg" }: ComplianceGaugeProps) {
  const { text, bg } = RAG_COLORS[rag];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", bg, text)}>
            {rag}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <ComplianceGaugeSvg value={score} rag={rag} size={size} />
      </CardContent>
    </Card>
  );
}
