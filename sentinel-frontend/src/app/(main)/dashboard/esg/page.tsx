"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Leaf,
  Users,
  ShieldCheck,
  TrendingUp,
  Droplets,
  AlertTriangle,
  ClipboardCheck,
  Activity,
  Clock,
  Building2,
  FileText,
  Download,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ─────────────────────────────────────────────────────────────────────

interface EnvironmentalMetrics {
  overfillEventsPrevented: number;
  automatedValveClosures: number;
  estimatedLitresSaved: number;
  estimatedKesValueSaved: number;
  sitesMonitored: number;
  pipelineKmMonitored: number;
  totalTelemetryReadings: number;
  criticalIncidentsAtHighRiskSites: number;
  assumption: string;
}

interface SocialMetrics {
  spillIncidentsPrevented: number;
  estimatedCommunityLiabilityAvoided: number;
  sinaiClassEventsMonitored: number;
  communitiesProtected: number;
  totalAlertsGenerated: number;
  sinaiThangeContext: string;
  thangeAwardReferenceKes: number;
}

interface GovernanceMetrics {
  capaActionsCreated: number;
  capaActionsClosed: number;
  capaActionsOverdue: number;
  avgCapaClosureDays: number;
  capaOnTimeClosureRate: number;
  dataQualityPassRate: number;
  dataQualityGateStatus: string;
  totalRecordsProcessed: number;
  avgAutomatedResponseTimeSec: number;
  alertAcknowledgementRate: number;
  openAlerts: number;
}

interface EsgReport {
  period: string;
  periodStart: string;
  generatedAt: string;
  environmental: EnvironmentalMetrics;
  social: SocialMetrics;
  governance: GovernanceMetrics;
  disclaimer: string;
}

// ── Fetch ─────────────────────────────────────────────────────────────────────

async function fetchEsgReport(period: string): Promise<EsgReport> {
  const res = await fetch(`/api/proxy/esg/report?period=${period}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  subtitle,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  color: string;
}) {
  return (
    <div className={`flex items-start gap-3 p-4 rounded-lg border-l-4 ${color} bg-card`}>
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  suffix,
  prefix,
  description,
  highlight,
  loading,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  prefix?: string;
  description?: string;
  highlight?: "green" | "amber" | "red" | "blue";
  loading?: boolean;
}) {
  const borderColor =
    highlight === "green"
      ? "border-l-emerald-500"
      : highlight === "amber"
        ? "border-l-amber-400"
        : highlight === "red"
          ? "border-l-red-500"
          : highlight === "blue"
            ? "border-l-blue-500"
            : "border-l-border";

  return (
    <div className={`rounded-lg border bg-card p-4 flex flex-col gap-2 border-l-4 ${borderColor} shadow-sm`}>
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <span className="text-2xl font-bold tracking-tight">
          {prefix}{typeof value === "number" ? value.toLocaleString() : value}{suffix}
        </span>
      )}
      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      )}
    </div>
  );
}

function PillarBadge({ letter, label }: { letter: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
        {letter}
      </span>
      {label}
    </span>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "Last 30 days", value: "30d" },
  { label: "Last 90 days", value: "90d" },
  { label: "Last 12 months", value: "365d" },
];

export default function EsgReportPage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["esg-report", period],
    queryFn: () => fetchEsgReport(period),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const e = data?.environmental;
  const s = data?.social;
  const g = data?.governance;

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? period;

  return (
    <div className="flex flex-col gap-6 pb-10">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl tracking-tight font-semibold">ESG Report</h1>
            <Badge variant="secondary" className="text-xs">Auto-generated</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            Environmental, Social, and Governance metrics derived automatically from
            Sentinel live operational data. No manual compilation required.
            {data?.generatedAt && (
              <span className="ml-1 opacity-60">
                Generated {new Date(data.generatedAt).toLocaleString()}
              </span>
            )}
          </p>
        </div>

        {/* Period selector + export */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex rounded-md border overflow-hidden text-xs">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 transition-colors ${
                  period === p.value
                    ? "bg-foreground text-background font-medium"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-xs"
            onClick={() => window.print()}
          >
            <Download className="size-3" />
            Export
          </Button>
        </div>
      </div>

      {/* ESG Pillar Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 p-4 text-center">
          <Leaf className="size-5 mx-auto mb-1 text-emerald-600" />
          <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Environmental</div>
          <div className="text-lg font-bold mt-1">
            {isLoading ? "—" : (e?.overfillEventsPrevented ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">spills prevented</div>
        </div>
        <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 p-4 text-center">
          <Users className="size-5 mx-auto mb-1 text-blue-600" />
          <div className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Social</div>
          <div className="text-lg font-bold mt-1">
            {isLoading ? "—" : (s?.communitiesProtected ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">sites protecting communities</div>
        </div>
        <div className="rounded-lg border bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 p-4 text-center">
          <ShieldCheck className="size-5 mx-auto mb-1 text-violet-600" />
          <div className="text-xs font-semibold text-violet-700 dark:text-violet-400 uppercase tracking-wide">Governance</div>
          <div className="text-lg font-bold mt-1">
            {isLoading ? "—" : `${g?.dataQualityPassRate ?? 0}%`}
          </div>
          <div className="text-xs text-muted-foreground">data quality pass rate</div>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load ESG report. The backend may be starting up — try again in a moment.
        </div>
      )}

      {/* ── E: Environmental ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <SectionHeader
          icon={<Leaf className="size-5" />}
          title="E — Environmental"
          subtitle="Direct environmental impact from pipeline spill prevention and continuous monitoring"
          color="border-l-emerald-500"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Overfill Events Prevented"
            value={e?.overfillEventsPrevented ?? 0}
            description="Tank-level breaches caught before becoming spills"
            highlight="green"
            loading={isLoading}
          />
          <MetricCard
            label="Estimated Litres Saved"
            value={e?.estimatedLitresSaved ?? 0}
            suffix=" L"
            description="Fuel not released into the environment"
            highlight="green"
            loading={isLoading}
          />
          <MetricCard
            label="Automated Valve Closures"
            value={e?.automatedValveClosures ?? 0}
            description="Physical interventions triggered by Sentinel"
            highlight="amber"
            loading={isLoading}
          />
          <MetricCard
            label="KES Value Saved"
            value={e?.estimatedKesValueSaved ?? 0}
            prefix="KES "
            description="Estimated environmental cost avoided"
            highlight="amber"
            loading={isLoading}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard
            label="Pipeline Sites Monitored"
            value={e?.sitesMonitored ?? 0}
            description="Active KPC facilities under continuous watch"
            highlight="blue"
            loading={isLoading}
          />
          <MetricCard
            label="Pipeline Corridor"
            value={e?.pipelineKmMonitored ?? 0}
            suffix=" km"
            description="Mombasa–Nairobi corridor monitored"
            highlight="blue"
            loading={isLoading}
          />
          <MetricCard
            label="Telemetry Readings"
            value={e?.totalTelemetryReadings ?? 0}
            description={`Sensor readings processed in ${periodLabel}`}
            loading={isLoading}
          />
        </div>
        {e?.assumption && (
          <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-3">
            Assumption: {e.assumption}
          </p>
        )}
      </div>

      {/* ── S: Social ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <SectionHeader
          icon={<Users className="size-5" />}
          title="S — Social"
          subtitle="Community safety impact — preventing Sinai and Thange-class incidents"
          color="border-l-blue-500"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Spill Incidents Prevented"
            value={s?.spillIncidentsPrevented ?? 0}
            description="Direct community safety events avoided"
            highlight="green"
            loading={isLoading}
          />
          <MetricCard
            label="Community Liability Avoided"
            value={s?.estimatedCommunityLiabilityAvoided ?? 0}
            prefix="KES "
            description={`Modelled vs KES ${((s?.thangeAwardReferenceKes ?? 3020000000) / 1e9).toFixed(2)}B Thange judgment`}
            highlight="amber"
            loading={isLoading}
          />
          <MetricCard
            label="Sinai-Class Events Watched"
            value={s?.sinaiClassEventsMonitored ?? 0}
            description="Overfill events at Thange & Sinendet — highest risk sites"
            highlight="red"
            loading={isLoading}
          />
          <MetricCard
            label="Communities Protected"
            value={s?.communitiesProtected ?? 0}
            description="Pipeline sites with active community risk exposure"
            highlight="blue"
            loading={isLoading}
          />
        </div>

        {/* Sinai/Thange context box */}
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">
                Sinai 2011 · Thange 2015 — The incidents Sentinel is built to prevent
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
                {s?.sinaiThangeContext ??
                  "The 2011 Nairobi Sinai fire (~100 lives) and the 2015 Thange spill (Kimeu v. KPC, KES 3.02B judgment) both originated as undetected valve/tank failures. Each prevented overfill event directly reduces community risk of this class."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── G: Governance ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4">
        <SectionHeader
          icon={<ShieldCheck className="size-5" />}
          title="G — Governance"
          subtitle="Operational compliance, corrective action follow-through, and data integrity"
          color="border-l-violet-500"
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Data Quality Pass Rate"
            value={`${g?.dataQualityPassRate ?? 0}%`}
            description={`Gate status: ${g?.dataQualityGateStatus ?? "—"} (threshold: 90%)`}
            highlight={(g?.dataQualityPassRate ?? 0) >= 90 ? "green" : "red"}
            loading={isLoading}
          />
          <MetricCard
            label="Avg Automated Response"
            value={`${g?.avgAutomatedResponseTimeSec ?? 0}s`}
            description="From threshold breach to valve actuation"
            highlight="green"
            loading={isLoading}
          />
          <MetricCard
            label="Alert Acknowledgement Rate"
            value={`${g?.alertAcknowledgementRate ?? 0}%`}
            description="Alerts reviewed and acknowledged by operators"
            highlight={(g?.alertAcknowledgementRate ?? 0) >= 80 ? "green" : "amber"}
            loading={isLoading}
          />
          <MetricCard
            label="Open Alerts"
            value={g?.openAlerts ?? 0}
            description="Unacknowledged alerts requiring operator review"
            highlight={(g?.openAlerts ?? 0) === 0 ? "green" : "red"}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="CAPAs Raised"
            value={g?.capaActionsCreated ?? 0}
            description={`Corrective actions initiated in ${periodLabel}`}
            highlight="blue"
            loading={isLoading}
          />
          <MetricCard
            label="CAPAs Closed"
            value={g?.capaActionsClosed ?? 0}
            description="Corrective actions fully verified and closed"
            highlight="green"
            loading={isLoading}
          />
          <MetricCard
            label="CAPAs Overdue"
            value={g?.capaActionsOverdue ?? 0}
            description="Past due date and still open"
            highlight={(g?.capaActionsOverdue ?? 0) === 0 ? "green" : "red"}
            loading={isLoading}
          />
          <MetricCard
            label="On-Time CAPA Closure"
            value={`${g?.capaOnTimeClosureRate ?? 0}%`}
            description="CAPAs closed before due date"
            highlight={(g?.capaOnTimeClosureRate ?? 0) >= 80 ? "green" : "amber"}
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricCard
            label="Avg CAPA Closure Time"
            value={`${g?.avgCapaClosureDays ?? 0} days`}
            description="Average days from CAPA creation to closure"
            loading={isLoading}
          />
          <MetricCard
            label="Total Records Processed"
            value={g?.totalRecordsProcessed ?? 0}
            description="Pipeline telemetry records through data quality gates"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Disclaimer */}
      <div className="rounded-lg border bg-muted/40 p-4 flex items-start gap-3">
        <FileText className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium">Disclaimer: </span>
          {data?.disclaimer ??
            "Sentinel ESG metrics are derived directly from live operational data. Financial estimates use stated assumptions and are not audited figures."}
        </p>
      </div>
    </div>
  );
}
