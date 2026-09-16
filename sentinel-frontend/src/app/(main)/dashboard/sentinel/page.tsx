import { BackendError } from "@/components/backend-error";
import { fetchAlerts, fetchBatches, fetchQualitySummary, fetchRiskSummary } from "@/lib/sentinel/api";
import { mockExecutiveSummary } from "@/lib/control-plane/mocks";

import { AlertTimeline } from "./_components/alert-timeline";
import { AlertTrendChart } from "./_components/alert-trend-chart";
import { ConfidenceGauge } from "./_components/confidence-gauge";
import { ControlPlaneHeroBanner } from "./_components/control-plane-hero-banner";
import { DataQualityPanel } from "./_components/data-quality-panel";
import { RiskHeatmap } from "./_components/risk-heatmap";
import { SentinelKpiStrip } from "./_components/sentinel-kpi-strip";
import { SpiPanel } from "./_components/spi-panel";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchSpi() {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/spi`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/** Fetch live executive summary — falls back to mock if backend unavailable */
async function fetchExecutiveSummary() {
  try {
    const res = await fetch(`${API_BASE}/api/proxy/executive/summary`, {
      cache: "no-store",
      next: { revalidate: 30 },
    });
    if (!res.ok) return mockExecutiveSummary;
    return res.json();
  } catch {
    return mockExecutiveSummary;
  }
}

export default async function Page() {
  try {
    const [sites, alerts, quality, batches, spi, executive] = await Promise.all([
      fetchRiskSummary(),
      fetchAlerts(),
      fetchQualitySummary(),
      fetchBatches(),
      fetchSpi(),
      fetchExecutiveSummary(),
    ]);

    return (
      <div className="flex flex-col gap-4">
        {/* ── Hero banner: Predict → Interlock → Prevent → Learn ─────────── */}
        <ControlPlaneHeroBanner
          overfillEventsPrevented={executive?.overfillEventsPrevented}
          avgResponseTimeSec={executive?.avgResponseTimeSec}
        />

        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Sentinel</h1>
          <p className="text-muted-foreground text-sm">
            Real-time spill &amp; overfill prevention — risk scoring, alert management,
            and interlock control across all KPC pipeline sites.
          </p>
        </div>

        <SentinelKpiStrip sites={sites} alerts={alerts} quality={quality} />

        <SpiPanel spi={spi} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="flex flex-col gap-4 md:col-span-7 xl:col-span-8">
            <RiskHeatmap sites={sites} />
            <AlertTrendChart alerts={alerts} />
            <AlertTimeline alerts={alerts} />
          </div>
          <div className="flex flex-col gap-4 md:col-span-5 xl:col-span-4">
            <ConfidenceGauge summary={quality} />
            <DataQualityPanel summary={quality} batches={batches} />
          </div>
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Sentinel</h1>
        </div>
        <BackendError message={err instanceof Error ? err.message : "Failed to load dashboard data"} />
      </div>
    );
  }
}
