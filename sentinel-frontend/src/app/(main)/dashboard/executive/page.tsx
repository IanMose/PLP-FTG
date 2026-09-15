"use client";

import { useExecutiveSummaryV5 } from "@/lib/control-plane/api";
import { KpiValue } from "@/components/control-plane/KpiValue";
import { BackendError } from "@/components/backend-error";
import { ThangeSummary } from "./_components/thange-summary";
import { DemoTriggerButton } from "./_components/demo-trigger-button";
import { EventFeed } from "./_components/event-feed";
import { Activity, Droplets, ShieldCheck, Clock, AlertTriangle, TrendingUp } from "lucide-react";

// ── KPI card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  icon: React.ReactNode;
  description?: string;
  highlight?: "amber" | "green" | "red";
}

function KpiCard({ label, value, suffix, prefix, decimals, icon, description, highlight }: KpiCardProps) {
  const borderClass =
    highlight === "amber"
      ? "border-l-amber-400"
      : highlight === "green"
        ? "border-l-emerald-500"
        : highlight === "red"
          ? "border-l-red-500"
          : "border-l-border";

  return (
    <div
      className={`rounded-lg border bg-card p-5 flex flex-col gap-3 border-l-4 ${borderClass} shadow-sm`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="text-muted-foreground/60">{icon}</span>
      </div>
      <KpiValue value={value} suffix={suffix} prefix={prefix} decimals={decimals} />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExecutiveDashboardPage() {
  const { data: summary, isLoading, isError } = useExecutiveSummaryV5();

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl tracking-tight font-semibold">Executive Control Plane</h1>
        <BackendError message="Could not load executive summary. The backend may be starting up." />
      </div>
    );
  }

  const period = summary?.period?.replace(/_/g, " ") ?? "last 30 days";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl tracking-tight font-semibold">Executive Control Plane</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Board-level KPIs —{" "}
            <span className="capitalize">{period}</span>
            {summary?.lastUpdated && (
              <>
                {" · "}Last updated{" "}
                {new Date(summary.lastUpdated).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </>
            )}
          </p>
        </div>
        <DemoTriggerButton />
      </div>

      {/* Live indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        Auto-refreshing every 15 seconds
      </div>

      {/* V4 KPI strip — 4 core metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Overfill Events Prevented"
          value={isLoading ? 0 : (summary?.overfillEventsPrevented ?? 0)}
          icon={<ShieldCheck className="h-5 w-5" />}
          description="Tank overfill interlock activations this period"
          highlight="green"
        />
        <KpiCard
          label="Estimated Litres Saved"
          value={isLoading ? 0 : (summary?.estimatedLitresSaved ?? 0)}
          suffix=" L"
          icon={<Droplets className="h-5 w-5" />}
          description="Based on avg spill volume per event"
          highlight="amber"
        />
        <KpiCard
          label="KES Exposure Avoided"
          value={isLoading ? 0 : (summary?.estimatedKesExposureAvoided ?? 0)}
          prefix="KES "
          icon={<TrendingUp className="h-5 w-5" />}
          description="Modelled avoided cost vs Kimeu v KPC reference case"
          highlight="amber"
        />
        <KpiCard
          label="System Uptime"
          value={isLoading ? 0 : (summary?.systemUptimePercent ?? 0)}
          suffix="%"
          decimals={1}
          icon={<Activity className="h-5 w-5" />}
          description="Pipeline monitoring availability"
          highlight="green"
        />
      </div>

      {/* V5 KPI strip — verification metrics */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Interlock Verification Metrics
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label="Avg Response Time"
            value={isLoading ? 0 : (summary?.avgResponseTimeSec ?? 0)}
            suffix="s"
            decimals={1}
            icon={<Clock className="h-5 w-5" />}
            description="From threshold breach to actuation"
          />
          <KpiCard
            label="Avg Verification Time"
            value={isLoading ? 0 : (summary?.avgVerificationTimeSec ?? 0)}
            suffix="s"
            decimals={1}
            icon={<Clock className="h-5 w-5" />}
            description="From actuation to verified_state confirmation"
            highlight="green"
          />
          <KpiCard
            label="Unverified Actuations"
            value={isLoading ? 0 : (summary?.unverifiedActuations ?? 0)}
            icon={<AlertTriangle className="h-5 w-5" />}
            description="Actuations still in UNVERIFIED state"
            highlight={(summary?.unverifiedActuations ?? 0) > 0 ? "red" : "green"}
          />
        </div>
      </div>

      {/* Event feed + Thange reference */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <EventFeed />
        </div>
        <div>
          <ThangeSummary />
        </div>
      </div>
    </div>
  );
}
