import Link from "next/link";
import { ArrowRight, Brain, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackendError } from "@/components/backend-error";
import { getAuthToken } from "@/server/server-actions";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchOverview(token: string | undefined) {
  const res = await fetch(`${API_BASE}/api/ml/overview`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchDrift(token: string | undefined) {
  try {
    const res = await fetch(`${API_BASE}/api/ml/drift`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function ModelCard({ model, label }: { model: any; label: string }) {
  return (
    <Card className={label === "Champion" ? "border-amber-300 dark:border-amber-700" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{label}</CardTitle>
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${
            model.status === "champion" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
            "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
          }`}>{model.status}</span>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold">{model.version}</p>
        <p className="text-xs text-muted-foreground mb-3">{model.algorithm} · {model.trainedAt ? new Date(model.trainedAt).toLocaleDateString() : "—"}</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Precision", value: model.precisionScore },
            { label: "Recall", value: model.recallScore },
            { label: "F1", value: model.f1Score },
          ].map(({ label: l, value }) => (
            <div key={l} className="rounded border p-2">
              <p className="text-xs text-muted-foreground">{l}</p>
              <p className="text-base font-bold tabular-nums">{value ? Number(value).toFixed(3) : "—"}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default async function MlAdminOverview() {
  let overview: any = null;
  let drift: any = null;
  let error: string | null = null;
  try {
    const token = await getAuthToken();
    [overview, drift] = await Promise.all([fetchOverview(token), fetchDrift(token)]);
  } catch (e: any) { error = e.message; }

  if (error) return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl tracking-tight flex items-center gap-2"><Brain className="size-6" /> ML Admin Portal</h1>
      <BackendError message={error} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight flex items-center gap-2"><Brain className="size-6" /> ML Admin Portal</h1>
          <p className="text-muted-foreground text-sm">Human-in-the-loop model governance — approve new versions before they affect live predictions.</p>
        </div>
      </div>

      {/* Drift banner — shown when warning or critical */}
      {drift && (drift.driftStatus === "warning" || drift.driftStatus === "critical") && (
        <div className={`rounded-lg border p-4 flex items-center justify-between gap-3 ${
          drift.driftStatus === "critical"
            ? "border-red-300 bg-red-50/50 dark:bg-red-950/20"
            : "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20"
        }`}>
          <div className="flex items-center gap-3">
            <TrendingDown className={`size-5 shrink-0 ${
              drift.driftStatus === "critical" ? "text-red-600" : "text-amber-600"
            }`} />
            <div>
              <p className={`font-semibold text-sm ${
                drift.driftStatus === "critical"
                  ? "text-red-800 dark:text-red-300"
                  : "text-amber-800 dark:text-amber-300"
              }`}>
                ⚠ Performance Drift Detected — {drift.driftStatus === "critical" ? "Critical" : "Warning"}
              </p>
              <p className="text-xs text-muted-foreground">
                Baseline {drift.baselineAccuracy != null ? Math.round(drift.baselineAccuracy * 100) : "—"}% →
                Recent {drift.recentAccuracy != null ? Math.round(drift.recentAccuracy * 100) : "—"}%.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/ml-admin/drift">View Drift <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
        </div>
      )}

      {overview?.challenger && (
        <div className="rounded-lg border border-orange-300 bg-orange-50/50 dark:bg-orange-950/20 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-orange-800 dark:text-orange-300">⚠ A new model is ready for review</p>
            <p className="text-xs text-orange-700 dark:text-orange-400 mt-0.5">
              Challenger {overview.challenger.version} — review before promoting to production.
            </p>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/dashboard/ml-admin/registry">Review <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {overview?.champion && <ModelCard model={overview.champion} label="Champion" />}
        {overview?.challenger ? (
          <ModelCard model={overview.challenger} label="Challenger" />
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground text-sm text-center">
              <Brain className="size-8 mb-2 opacity-30" />
              <p>No challenger model yet.</p>
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link href="/dashboard/ml-admin/training-runs">Trigger Retrain</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Feedback Queue",    href: "/dashboard/ml-admin/feedback",              desc: "Rate predictions" },
          { label: "Training Runs",     href: "/dashboard/ml-admin/training-runs",         desc: "History + retrain" },
          { label: "Model Registry",    href: "/dashboard/ml-admin/registry",              desc: "Compare & approve" },
          { label: "Drift Monitor",     href: "/dashboard/ml-admin/drift",                 desc: "Performance trends" },
          { label: "Auto Retraining",   href: "/dashboard/ml-admin/retraining-schedule",   desc: "Schedule & manage" },
        ].map(({ label, href, desc }) => (
          <Link key={href} href={href} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
            <p className="font-medium text-sm">{label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
