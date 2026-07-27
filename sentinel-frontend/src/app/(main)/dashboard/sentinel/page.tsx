import { fetchAlerts, fetchBatches, fetchQualitySummary, fetchRiskSummary } from "@/lib/sentinel/api";

import { AlertTimeline } from "./_components/alert-timeline";
import { AlertTrendChart } from "./_components/alert-trend-chart";
import { ConfidenceGauge } from "./_components/confidence-gauge";
import { DataQualityPanel } from "./_components/data-quality-panel";
import { RiskHeatmap } from "./_components/risk-heatmap";
import { SentinelKpiStrip } from "./_components/sentinel-kpi-strip";

export default async function Page() {
  const [sites, alerts, quality, batches] = await Promise.all([
    fetchRiskSummary(),
    fetchAlerts(),
    fetchQualitySummary(),
    fetchBatches(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Sentinel</h1>
        <p className="text-muted-foreground text-sm">
          Data quality monitoring, risk scoring, and alert management across all sites.
        </p>
      </div>

      {/* KPI strip — full width, 5 cards */}
      <SentinelKpiStrip sites={sites} alerts={alerts} quality={quality} />

      {/*
       * Main grid
       *
       * Mobile  (< md)  : single column, components stack vertically
       * Tablet  (md–xl) : 2-col — left 7/12, right 5/12
       * Desktop (≥ xl)  : 2-col — left 8/12, right 4/12
       *
       * Left  : RiskHeatmap → AlertTrendChart → AlertTimeline
       * Right : ConfidenceGauge → DataQualityPanel (sticks at top, fills height)
       */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        {/* ── Left column ── */}
        <div className="flex flex-col gap-4 md:col-span-7 xl:col-span-8">
          <RiskHeatmap sites={sites} />
          <AlertTrendChart alerts={alerts} />
          <AlertTimeline alerts={alerts} />
        </div>

        {/* ── Right column ── */}
        <div className="flex flex-col gap-4 md:col-span-5 xl:col-span-4">
          <ConfidenceGauge summary={quality} />
          <DataQualityPanel summary={quality} batches={batches} />
        </div>
      </div>
    </div>
  );
}
