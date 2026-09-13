"use client";

import { useEffect, useState } from "react";
import { TrendingDown, AlertTriangle, CheckCircle, RefreshCw, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { DriftSummary } from "@/lib/sentinel/api";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function getDrift(): Promise<DriftSummary> {
  const res = await fetch(`${API_BASE}/api/ml/drift`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function DriftStatusBadge({ status }: { status: DriftSummary["driftStatus"] }) {
  if (status === "critical")
    return <Badge variant="destructive" className="gap-1"><AlertTriangle className="size-3" /> Critical</Badge>;
  if (status === "warning")
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 gap-1">
      <AlertTriangle className="size-3" /> Warning
    </Badge>;
  if (status === "normal")
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 gap-1">
      <CheckCircle className="size-3" /> Normal
    </Badge>;
  return <Badge variant="outline">Insufficient Data</Badge>;
}

export default function DriftMonitorPage() {
  const [drift, setDrift] = useState<DriftSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const d = await getDrift();
      setDrift(d);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load drift data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const trendData = drift?.trend?.map((t) => ({
    date: new Date(t.computedAt).toLocaleDateString("en-GB", { month: "short", day: "numeric" }),
    accuracy: Math.round((t.accuracy ?? 0) * 100),
    sampleSize: t.sampleSize,
  })) ?? [];

  const baselinePct = drift?.baselineAccuracy != null
    ? Math.round(drift.baselineAccuracy * 100) : null;
  const recentPct = drift?.recentAccuracy != null
    ? Math.round(drift.recentAccuracy * 100) : null;
  const deltaPct = drift?.deltaPercentagePoints != null
    ? Math.round(Number(drift.deltaPercentagePoints) * 100) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight flex items-center gap-2">
            <TrendingDown className="size-6" /> Drift Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Daily comparison of baseline vs recent model accuracy.
            Warning at −5pp, Critical at −10pp or below 70%.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`size-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {drift && (
        <>
          {/* Drift Banner — shown only when not normal */}
          {(drift.driftStatus === "warning" || drift.driftStatus === "critical") && (
            <div className={`rounded-lg border p-4 flex items-start gap-3 ${
              drift.driftStatus === "critical"
                ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
            }`}>
              <AlertTriangle className={`size-5 mt-0.5 shrink-0 ${
                drift.driftStatus === "critical" ? "text-red-600" : "text-amber-600"
              }`} />
              <div className="flex-1">
                <p className={`font-semibold ${
                  drift.driftStatus === "critical" ? "text-red-800 dark:text-red-300" : "text-amber-800 dark:text-amber-300"
                }`}>
                  {drift.driftStatus === "critical"
                    ? "Critical Performance Degradation Detected"
                    : "Performance Drift Warning"}
                </p>
                <p className="text-sm mt-0.5 text-muted-foreground">
                  Baseline {baselinePct}% → Recent {recentPct}%
                  {deltaPct != null && ` (−${Math.abs(deltaPct)}pp drop)`}.
                  Consider retraining the model.
                </p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <a href="/dashboard/ml-admin/retraining-schedule">Retrain Now</a>
              </Button>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Model</CardTitle></CardHeader>
              <CardContent><p className="font-semibold text-sm truncate">{drift.championVersion ?? "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Baseline Accuracy</CardTitle></CardHeader>
              <CardContent><p className="text-2xl font-bold tabular-nums">{baselinePct != null ? `${baselinePct}%` : "—"}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Recent Accuracy</CardTitle></CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold tabular-nums ${
                  drift.driftStatus === "critical" ? "text-red-600"
                    : drift.driftStatus === "warning" ? "text-amber-600" : ""
                }`}>
                  {recentPct != null ? `${recentPct}%` : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">Status</CardTitle></CardHeader>
              <CardContent className="pt-1">
                <DriftStatusBadge status={drift.driftStatus} />
              </CardContent>
            </Card>
          </div>

          {/* Trend Chart */}
          {trendData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Accuracy Trend (recent window, last 14 snapshots)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[50, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Accuracy"]} />
                    {/* Baseline reference line */}
                    {baselinePct != null && (
                      <ReferenceLine y={baselinePct} stroke="#f59e0b" strokeDasharray="4 2"
                        label={{ value: "Baseline", position: "insideTopRight", fontSize: 10 }} />
                    )}
                    {/* Warning threshold */}
                    {baselinePct != null && (
                      <ReferenceLine y={baselinePct - 5} stroke="#ef4444" strokeDasharray="2 2"
                        label={{ value: "−5pp", position: "insideTopRight", fontSize: 10 }} />
                    )}
                    <Line type="monotone" dataKey="accuracy" stroke="hsl(var(--primary))"
                      dot={{ r: 3 }} strokeWidth={2} name="Accuracy %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm text-center gap-2">
                <Info className="size-8 opacity-30" />
                <p>No snapshot history yet.</p>
                <p className="text-xs">The drift job runs daily at 03:00. It needs ≥30 feedback rows to compute.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
