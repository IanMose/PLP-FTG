"use client";

import { useEffect, useState } from "react";
import { BackendError } from "@/components/backend-error";
import { KpiCard } from "./_components/kpi-card";
import { EventFeed } from "./_components/event-feed";
import { DemoTriggerButton } from "./_components/demo-trigger-button";
import { ThangeSummary } from "./_components/thange-summary";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

interface ExecutiveKPIs {
  eventsDetected: number;
  shutdownsTriggered: number;
  litresSaved: number;
  kesSaved: number;
  successRatePercent: number;
  periodHours: number;
  asOf: string;
}

interface EventSummary {
  eventId: string;
  eventType: string;
  severity: string;
  siteId: string;
  tankId: string;
  tankLevelPct: number;
  createdAt: string;
  actuationTriggered: boolean;
  notificationSent: boolean;
}

interface DashboardData {
  kpis: ExecutiveKPIs;
  recentEvents: EventSummary[];
  siteBreakdown: { siteId: string; eventCount: number }[];
  severityBreakdown: Record<string, number>;
}

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/executive/dashboard?hoursBack=24`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  const handleDemoComplete = () => {
    // Trigger refresh after demo
    setTimeout(() => {
      setRefreshKey((k) => k + 1);
    }, 1000);
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground text-sm">Loading control plane data...</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Executive Dashboard</h1>
        </div>
        <BackendError message={error} />
      </div>
    );
  }

  const kpis = data?.kpis;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Real-time control plane monitoring - overfill detection, automated response, and impact metrics.
          </p>
        </div>
        <DemoTriggerButton onDemoComplete={handleDemoComplete} />
      </div>

      {/* The 4 Big Numbers */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Events Detected"
          value={kpis?.eventsDetected ?? 0}
          subtitle="Overfill risks caught"
          icon="alert"
          color="blue"
        />
        <KpiCard
          title="Shutdowns Triggered"
          value={kpis?.shutdownsTriggered ?? 0}
          subtitle="Valve closures executed"
          icon="shield"
          color="green"
        />
        <KpiCard
          title="Litres Saved"
          value={kpis?.litresSaved ?? 0}
          subtitle="Fuel spill prevented"
          icon="droplet"
          format="number"
          color="cyan"
        />
        <KpiCard
          title="KES Avoided"
          value={kpis?.kesSaved ?? 0}
          subtitle="Financial loss prevented"
          icon="currency"
          format="currency"
          color="amber"
        />
      </div>

      {/* Thange Summary - ML to business value connection */}
      <ThangeSummary
        detections={kpis?.eventsDetected ?? 0}
        interventions={kpis?.shutdownsTriggered ?? 0}
        successRate={kpis?.successRatePercent ?? 0}
      />

      {/* Main Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Event Feed - 2/3 width */}
        <div className="lg:col-span-2">
          <EventFeed events={data?.recentEvents ?? []} />
        </div>

        {/* Side Panel - 1/3 width */}
        <div className="flex flex-col gap-4">
          {/* Site Breakdown */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Events by Site</h3>
            {data?.siteBreakdown && data.siteBreakdown.length > 0 ? (
              <div className="space-y-2">
                {data.siteBreakdown.map((site) => (
                  <div key={site.siteId} className="flex items-center justify-between">
                    <span className="text-sm">{site.siteId}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-sm font-medium">
                      {site.eventCount}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events in the last 24 hours</p>
            )}
          </div>

          {/* Severity Breakdown */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">Events by Severity</h3>
            {data?.severityBreakdown && Object.keys(data.severityBreakdown).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(data.severityBreakdown).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <span className={`text-sm ${getSeverityColor(severity)}`}>{severity}</span>
                    <span className="rounded bg-muted px-2 py-0.5 text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No events to categorize</p>
            )}
          </div>

          {/* System Status */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="mb-3 font-semibold">System Status</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>Control Plane Active</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>Actuation Service Ready</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                <span>Slack Integration Active</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Last updated: {kpis?.asOf ? new Date(kpis.asOf).toLocaleTimeString() : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "Critical":
      return "text-red-600 font-semibold";
    case "High":
      return "text-orange-500 font-medium";
    case "Medium":
      return "text-yellow-600";
    default:
      return "text-gray-600";
  }
}
