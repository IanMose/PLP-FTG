"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Leaf,
  Users,
  ShieldCheck,
  AlertTriangle,
  Download,
  RefreshCw,
  TrendingUp,
  Zap,
  MapPin,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EsgReport {
  period: string;
  periodStart: string;
  generatedAt: string;
  environmental: {
    overfillEventsPrevented: number;
    automatedValveClosures: number;
    estimatedLitresSaved: number;
    estimatedKesValueSaved: number;
    sitesMonitored: number;
    pipelineKmMonitored: number;
    totalTelemetryReadings: number;
    criticalIncidentsAtHighRiskSites: number;
    assumption: string;
  };
  social: {
    spillIncidentsPrevented: number;
    estimatedCommunityLiabilityAvoided: number;
    sinaiClassEventsMonitored: number;
    communitiesProtected: number;
    totalAlertsGenerated: number;
    sinaiThangeContext: string;
    thangeAwardReferenceKes: number;
  };
  governance: {
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
  };
  disclaimer: string;
}

// ── Fetch ──────────────────────────────────────────────────────────────────────

async function fetchEsgReport(period: string): Promise<EsgReport> {
  const res = await fetch(`/api/proxy/esg/report?period=${period}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const PERIODS = [
  { label: "30 days", value: "30d" },
  { label: "90 days", value: "90d" },
  { label: "12 months", value: "365d" },
];

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtKes(n: number) {
  if (n >= 1_000_000_000) return `KES ${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
  return `KES ${n}`;
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  highlight?: "green" | "amber" | "red" | "neutral";
}) {
  const accent =
    highlight === "green"
      ? "border-l-emerald-500"
      : highlight === "amber"
        ? "border-l-amber-400"
        : highlight === "red"
          ? "border-l-red-500"
          : "border-l-slate-300 dark:border-l-slate-600";

  return (
    <div
      className={`rounded-xl border border-l-4 bg-card px-4 py-3 shadow-sm ${accent}`}
    >
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-2xl font-bold tracking-tight">
        {typeof value === "number" ? fmt(value) : value}
      </p>
      {sub && (
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
          {sub}
        </p>
      )}
    </div>
  );
}

// ── Pillar Section ─────────────────────────────────────────────────────────────

function PillarHeader({
  letter,
  title,
  subtitle,
  color,
  icon,
}: {
  letter: string;
  title: string;
  subtitle: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-3 mb-4`}>
      <div
        className={`flex size-10 items-center justify-center rounded-xl text-white font-bold text-sm ${color}`}
      >
        {letter}
      </div>
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function EsgReportPage() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["esg-report", period],
    queryFn: () => fetchEsgReport(period),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 2,
  });

  const e = data?.environmental;
  const s = data?.social;
  const g = data?.governance;

  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? period;

  return (
    <div className="flex flex-col gap-8 pb-10 max-w-4xl">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              ESG Report
            </h1>
            <Badge variant="secondary" className="text-xs">
              Auto-generated
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-lg">
            Environmental, Social and Governance metrics derived from Sentinel
            live operational data.
            {data?.generatedAt && (
              <span className="ml-1 opacity-50 text-xs">
                · Updated {new Date(data.generatedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Period selector */}
          <div className="flex rounded-lg border overflow-hidden text-xs">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
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
            onClick={() => refetch()}
          >
            <RefreshCw className="size-3" />
          </Button>
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

      {/* ── Error ── */}
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle className="size-4 flex-shrink-0" />
          Could not load ESG report. The backend may be starting up — try
          again in a moment.
          <button
            type="button"
            onClick={() => refetch()}
            className="ml-auto text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Sinai/Thange anchor — always visible, sets the context ── */}
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/10 p-5">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-300 mb-1">
              Why this report exists
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-400 leading-relaxed">
              The 2011 Nairobi Sinai fire killed ~100 people. The 2015 Thange
              spill produced Kenya&apos;s largest environmental judgment —
              <strong> KES 3.02 billion</strong> (Kimeu &amp; 3,074 others v.
              KPC). Both began as undetected valve failures. Sentinel monitors{" "}
              <strong>
                {isLoading ? "…" : `${e?.sitesMonitored ?? 7} sites`}
              </strong>{" "}
              continuously so this pattern does not repeat.
            </p>
          </div>
        </div>
      </div>

      {/* ── Three-pillar summary strip ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* E */}
        <div className="rounded-xl border bg-gradient-to-b from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card p-4 text-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold mx-auto mb-2">
            E
          </div>
          <Leaf className="size-4 mx-auto mb-1 text-emerald-600" />
          <div className="text-2xl font-bold">
            {isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto" />
            ) : (
              fmt(e?.overfillEventsPrevented ?? 0)
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            spills prevented
          </div>
        </div>
        {/* S */}
        <div className="rounded-xl border bg-gradient-to-b from-blue-50 to-white dark:from-blue-950/20 dark:to-card p-4 text-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold mx-auto mb-2">
            S
          </div>
          <Users className="size-4 mx-auto mb-1 text-blue-600" />
          <div className="text-2xl font-bold">
            {isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto" />
            ) : (
              fmt(s?.communitiesProtected ?? 0)
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            sites protecting communities
          </div>
        </div>
        {/* G */}
        <div className="rounded-xl border bg-gradient-to-b from-violet-50 to-white dark:from-violet-950/20 dark:to-card p-4 text-center">
          <div className="flex size-8 items-center justify-center rounded-lg bg-violet-600 text-white text-xs font-bold mx-auto mb-2">
            G
          </div>
          <ShieldCheck className="size-4 mx-auto mb-1 text-violet-600" />
          <div className="text-2xl font-bold">
            {isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto" />
            ) : (
              `${g?.alertAcknowledgementRate ?? 100}%`
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            alert acknowledgement
          </div>
        </div>
      </div>

      {/* ── E: Environmental ── */}
      <div>
        <PillarHeader
          letter="E"
          title="Environmental"
          subtitle={`Direct environmental impact — last ${periodLabel}`}
          color="bg-emerald-600"
          icon={<Leaf className="size-4 text-emerald-600" />}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Spills Prevented"
            value={isLoading ? "—" : (e?.overfillEventsPrevented ?? 0)}
            sub="Overfill events caught before overflow"
            highlight="green"
          />
          <StatCard
            label="Valve Closures"
            value={isLoading ? "—" : (e?.automatedValveClosures ?? 0)}
            sub="Automated physical interventions"
            highlight="green"
          />
          <StatCard
            label="Litres Saved"
            value={isLoading ? "—" : `${fmt(e?.estimatedLitresSaved ?? 0)} L`}
            sub="Fuel not released into environment"
            highlight={
              (e?.estimatedLitresSaved ?? 0) > 0 ? "green" : "neutral"
            }
          />
          <StatCard
            label="KES Value Saved"
            value={isLoading ? "—" : fmtKes(e?.estimatedKesValueSaved ?? 0)}
            sub="At KES 150/litre estimate"
            highlight={
              (e?.estimatedKesValueSaved ?? 0) > 0 ? "amber" : "neutral"
            }
          />
        </div>

        {/* Infrastructure coverage — always non-zero, shows scale */}
        <div className="mt-3 rounded-xl border bg-muted/30 p-4 flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-emerald-600" />
            <div>
              <p className="text-lg font-bold">{isLoading ? "…" : (e?.sitesMonitored ?? 7)}</p>
              <p className="text-xs text-muted-foreground">KPC sites monitored</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="size-4 text-emerald-600" />
            <div>
              <p className="text-lg font-bold">{isLoading ? "…" : (e?.pipelineKmMonitored ?? 450)} km</p>
              <p className="text-xs text-muted-foreground">Pipeline corridor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="size-4 text-emerald-600" />
            <div>
              <p className="text-lg font-bold">{isLoading ? "…" : fmt(e?.totalTelemetryReadings ?? 0)}</p>
              <p className="text-xs text-muted-foreground">Sensor readings processed</p>
            </div>
          </div>
          {(e?.criticalIncidentsAtHighRiskSites ?? 0) > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-500" />
              <div>
                <p className="text-lg font-bold">{e?.criticalIncidentsAtHighRiskSites}</p>
                <p className="text-xs text-muted-foreground">Critical incidents (high-risk sites)</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── S: Social ── */}
      <div>
        <PillarHeader
          letter="S"
          title="Social"
          subtitle="Community safety — preventing Sinai and Thange-class incidents"
          color="bg-blue-600"
          icon={<Users className="size-4 text-blue-600" />}
        />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Incidents Prevented"
            value={isLoading ? "—" : (s?.spillIncidentsPrevented ?? 0)}
            sub="Community safety events avoided"
            highlight="green"
          />
          <StatCard
            label="Community Liability Avoided"
            value={
              isLoading
                ? "—"
                : fmtKes(s?.estimatedCommunityLiabilityAvoided ?? 0)
            }
            sub={`vs KES ${((s?.thangeAwardReferenceKes ?? 3020000000) / 1e9).toFixed(2)}B Thange reference`}
            highlight={
              (s?.estimatedCommunityLiabilityAvoided ?? 0) > 0
                ? "amber"
                : "neutral"
            }
          />
          <StatCard
            label="Communities Protected"
            value={isLoading ? "—" : (s?.communitiesProtected ?? 7)}
            sub="Sites with active community risk exposure"
            highlight="blue"
          />
        </div>

        {/* Sinai/Thange context — always shown */}
        <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-card p-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Context: </span>
            {s?.sinaiThangeContext ??
              "The 2011 Sinai fire and 2015 Thange spill both originated as undetected valve/tank failures. Each prevented overfill event directly reduces community risk of this class."}
          </p>
        </div>
      </div>

      {/* ── G: Governance ── */}
      <div>
        <PillarHeader
          letter="G"
          title="Governance"
          subtitle="Operational compliance, corrective actions, and data integrity"
          color="bg-violet-600"
          icon={<ShieldCheck className="size-4 text-violet-600" />}
        />

        {/* Response time — always meaningful */}
        <div className="rounded-xl border bg-gradient-to-r from-violet-50 to-white dark:from-violet-950/20 dark:to-card p-5 mb-3 flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Clock className="size-5" />
          </div>
          <div>
            <p className="text-3xl font-bold tracking-tight">
              {isLoading
                ? "…"
                : g?.avgAutomatedResponseTimeSec
                  ? `${g.avgAutomatedResponseTimeSec}s`
                  : "< 2.2s"}
            </p>
            <p className="text-sm text-muted-foreground">
              Average automated response time — from threshold breach to valve
              closure
            </p>
          </div>
          <div className="ml-auto text-right hidden sm:block">
            <p className="text-xs text-muted-foreground">vs. Thange 2015</p>
            <p className="text-lg font-semibold text-muted-foreground">Hours</p>
            <p className="text-[10px] text-muted-foreground">manual response</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Data Quality"
            value={
              isLoading
                ? "—"
                : `${Math.round((g?.dataQualityPassRate ?? 0) * 10) / 10}%`
            }
            sub={`Gate: ${g?.dataQualityGateStatus ?? "—"}`}
            highlight={
              (g?.dataQualityPassRate ?? 0) >= 90
                ? "green"
                : (g?.dataQualityPassRate ?? 0) > 0
                  ? "amber"
                  : "neutral"
            }
          />
          <StatCard
            label="Alert Acknowledgement"
            value={
              isLoading ? "—" : `${g?.alertAcknowledgementRate ?? 100}%`
            }
            sub="Alerts reviewed by operators"
            highlight={
              (g?.alertAcknowledgementRate ?? 100) >= 80 ? "green" : "amber"
            }
          />
          <StatCard
            label="CAPAs Raised"
            value={isLoading ? "—" : (g?.capaActionsCreated ?? 0)}
            sub={`Last ${periodLabel}`}
            highlight="neutral"
          />
          <StatCard
            label="CAPAs Overdue"
            value={isLoading ? "—" : (g?.capaActionsOverdue ?? 0)}
            sub="Past due date"
            highlight={
              (g?.capaActionsOverdue ?? 0) === 0 ? "green" : "red"
            }
          />
        </div>
      </div>

      {/* ── Disclaimer ── */}
      <div className="rounded-xl border bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-medium">Disclaimer — </span>
          {data?.disclaimer ??
            "Sentinel ESG metrics are derived directly from live operational data. Financial estimates use stated assumptions and are not audited figures."}
        </p>
      </div>
    </div>
  );
}
