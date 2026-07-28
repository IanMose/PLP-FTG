import type { RagStatus } from "@/lib/sentinel/types";
import {
  fetchComplianceNetwork,
  fetchComplianceTrend,
  fetchComplianceViolations,
} from "@/lib/sentinel/api";

import { AiInsightsPanel } from "./_components/ai-insights-panel";
import { ComplianceGauge } from "./_components/compliance-gauge";
import { ComplianceHeatmap } from "./_components/compliance-heatmap";
import { ComplianceKpiStrip } from "./_components/compliance-kpi-strip";
import { ComplianceTrendChart } from "./_components/compliance-trend-chart";
import { ViolationsTable } from "./_components/violations-table";

function scoreToRag(score: number): RagStatus {
  if (score >= 90) return "GREEN";
  if (score >= 75) return "AMBER";
  return "RED";
}

export default async function Page() {
  const [network, violations, trend] = await Promise.all([
    fetchComplianceNetwork(),
    fetchComplianceViolations(),
    fetchComplianceTrend(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="space-y-1">
        <h1 className="text-3xl tracking-tight">Compliance Intelligence</h1>
        <p className="text-muted-foreground text-sm">
          KPC HSE compliance scores across Safety, Environmental, Asset Integrity, and Regulatory domains.
        </p>
      </div>

      {/* Row 1: KPI strip */}
      <ComplianceKpiStrip network={network} />

      {/* Row 2: OCS gauge + 4 domain gauges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <ComplianceGauge
          label="Overall Compliance Score"
          score={network.networkOcs}
          rag={network.networkRag}
          subtitle="All KPC stations — last 30 days"
          size="lg"
        />
        <ComplianceGauge label="Safety"          score={network.networkSafetyScore}         rag={scoreToRag(network.networkSafetyScore)}         size="sm" />
        <ComplianceGauge label="Environmental"   score={network.networkEnvironmentalScore}  rag={scoreToRag(network.networkEnvironmentalScore)}  size="sm" />
        <ComplianceGauge label="Asset Integrity" score={network.networkAssetIntegrityScore} rag={scoreToRag(network.networkAssetIntegrityScore)} size="sm" />
        <ComplianceGauge label="Regulatory"      score={network.networkRegulatoryScore}     rag={scoreToRag(network.networkRegulatoryScore)}     size="sm" />
      </div>

      {/* Row 3: Trend + AI Insights */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <div className="xl:col-span-7">
          <ComplianceTrendChart trend={trend} />
        </div>
        <div className="xl:col-span-5">
          <AiInsightsPanel network={network} violations={violations} trend={trend} />
        </div>
      </div>

      {/* Row 4: Heat map */}
      <ComplianceHeatmap sites={network.sites} />

      {/* Row 5: Violations table */}
      <ViolationsTable violations={violations} />
    </div>
  );
}
