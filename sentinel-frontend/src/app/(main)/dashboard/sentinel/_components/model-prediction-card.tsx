"use client";

import { Brain, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { PredictionDto } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface ModelPredictionCardProps {
  prediction: PredictionDto | null;
}

type RiskBand = "HIGH" | "MODERATE" | "LOW" | "UNKNOWN";

const bandStyles: Record<RiskBand, string> = {
  HIGH:     "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  MODERATE: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  LOW:      "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  UNKNOWN:  "bg-muted text-muted-foreground",
};

const bandBarColors: Record<RiskBand, string> = {
  HIGH:     "bg-red-500",
  MODERATE: "bg-yellow-500",
  LOW:      "bg-green-500",
  UNKNOWN:  "bg-muted-foreground",
};

function ProbabilityBar({ prob, band }: { prob: number; band: RiskBand }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold tabular-nums text-2xl">
          {Math.round(prob * 100)}%
        </span>
        <Badge className={cn("text-xs", bandStyles[band])}>
          {band}
        </Badge>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-500", bandBarColors[band])}
          style={{ width: `${Math.round(prob * 100)}%` }}
        />
      </div>
    </div>
  );
}

function TopFeatureMiniBar({ topFeatures }: { topFeatures: string | null }) {
  if (!topFeatures) return null;

  let features: { feature: string; contribution: number }[];
  try {
    features = JSON.parse(topFeatures);
  } catch {
    return null;
  }

  const FEATURE_LABELS: Record<string, string> = {
    audit_finding_open_count:    "Open audit findings",
    incident_severity_score_30d: "Severity score (30d)",
    incident_count_30d:          "Incident count (30d)",
    days_since_last_audit:       "Days since audit",
    rejection_rate_30d:          "Rejection rate (30d)",
    rejection_rate_7d:           "Rejection rate (7d)",
    pressure_anomaly_count_14d:  "Pressure anomalies",
  };

  const maxAbs = Math.max(...features.map((f) => Math.abs(f.contribution)));

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Top contributing features</p>
      {features.map((f) => {
        const barWidth = maxAbs > 0 ? Math.round((Math.abs(f.contribution) / maxAbs) * 100) : 0;
        const isPositive = f.contribution > 0;
        return (
          <div key={f.feature} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span>{FEATURE_LABELS[f.feature] ?? f.feature}</span>
              <span className={cn("tabular-nums", isPositive ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400")}>
                {isPositive ? "+" : ""}{f.contribution.toFixed(3)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full", isPositive ? "bg-red-400" : "bg-green-400")}
                style={{ width: `${barWidth}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ModelPredictionCard({ prediction }: ModelPredictionCardProps) {
  if (!prediction) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="size-4" />
            ML Model Prediction
          </CardTitle>
          <CardDescription className="text-xs">No prediction available — run model training first</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground py-4 text-center">
            Run <code className="bg-muted px-1 rounded">python -m src.predict --train</code> to generate predictions.
          </p>
        </CardContent>
      </Card>
    );
  }

  const band = (prediction.riskBand ?? "UNKNOWN") as RiskBand;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Brain className="size-4" />
          ML Model Prediction
        </CardTitle>
        <CardDescription className="text-xs">
          {prediction.modelVersion} — logistic regression, backtested · as of {prediction.asOfDate}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <TrendingUp className="size-3" />
            Critical incident probability (next 7 days)
          </p>
          <ProbabilityBar prob={prediction.probability} band={band} />
        </div>

        <TopFeatureMiniBar topFeatures={prediction.topFeatures} />

        <p className="text-[10px] text-muted-foreground border-t pt-2">
          Rule-based score (above) reflects current operational state.
          This model score reflects statistical risk based on 180-day feature history.
        </p>
      </CardContent>
    </Card>
  );
}
