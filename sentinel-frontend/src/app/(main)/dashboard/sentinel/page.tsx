import { fetchAlerts, fetchBatches, fetchQualitySummary, fetchRiskSummary } from "@/lib/sentinel/api";

import { AlertFeed } from "./_components/alert-feed";
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
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Sentinel</h1>
        <p className="text-muted-foreground text-sm">
          Data quality monitoring, risk scoring, and alert management across all sites.
        </p>
      </div>

      <SentinelKpiStrip sites={sites} alerts={alerts} quality={quality} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <RiskHeatmap sites={sites} />
        </div>
        <div className="flex flex-col gap-4 xl:col-span-5">
          <ConfidenceGauge summary={quality} />
          <DataQualityPanel summary={quality} batches={batches} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <AlertTrendChart alerts={alerts} />
        </div>
        <div className="xl:col-span-5">
          <AlertTimeline alerts={alerts} />
        </div>
      </div>

      <AlertFeed alerts={alerts} limit={5} showViewAll />
    </div>
  );
}
