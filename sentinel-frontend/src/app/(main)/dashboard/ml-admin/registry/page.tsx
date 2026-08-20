"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, GitCompare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import { fetchModelComparison, type FeatureImportanceDiffEntry } from "@/lib/sentinel/api";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";
const getToken = () => document.cookie.match(/sentinel-token=([^;]+)/)?.[1];

const STATUS_STYLES: Record<string, string> = {
  champion:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  challenger: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  archived:   "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  rejected:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function Delta({ a, b }: { a: number | null; b: number | null }) {
  if (a == null || b == null) return <span className="text-muted-foreground">—</span>;
  const diff = b - a;
  const sign = diff > 0 ? "▲" : diff < 0 ? "▼" : "—";
  return (
    <span className={cn("text-xs font-medium", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-muted-foreground")}>
      {sign} {Math.abs(diff * 100).toFixed(1)}pp
    </span>
  );
}

function FeatureImportanceDiff({ diff }: { diff: FeatureImportanceDiffEntry[] }) {
  if (!diff || diff.length === 0) return (
    <p className="text-sm text-muted-foreground p-4">
      Feature importance data not available — set <code className="text-xs bg-muted px-1 rounded">feature_importance</code> on both models via the training-run API.
    </p>
  );

  // Bar chart data: delta per feature
  const chartData = diff.slice(0, 10).map((d) => ({
    feature: d.feature.replace(/_/g, " ").slice(0, 22),
    delta: Math.round(d.delta * 1000) / 10, // as percentage points
    fill: d.delta >= 0 ? "#22c55e" : "#ef4444",
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Delta bar chart */}
      <div>
        <p className="text-xs text-muted-foreground mb-2">
          Δ = Challenger weight − Champion weight (positive = challenger weights this feature more)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" tickFormatter={(v) => `${v}pp`} tick={{ fontSize: 11 }} />
            <YAxis dataKey="feature" type="category" width={140} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v) => [`${v}pp`, "Δ weight"] as [string, string]} />
            <ReferenceLine x={0} stroke="hsl(var(--border))" />
            <Bar dataKey="delta" radius={[0, 3, 3, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detail table */}
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 text-left">Feature</th>
              <th className="px-4 py-2 text-right">Champion</th>
              <th className="px-4 py-2 text-right">Challenger</th>
              <th className="px-4 py-2 text-right">Δ</th>
              <th className="px-4 py-2 text-left">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {diff.map((d) => (
              <tr key={d.feature} className="hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{d.feature.replace(/_/g, " ")}</td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {d.championWeight > 0 ? `${(d.championWeight * 100).toFixed(1)}%` : "—"}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {d.challengerWeight > 0 ? `${(d.challengerWeight * 100).toFixed(1)}%` : "—"}
                </td>
                <td className={cn("px-4 py-2 text-right tabular-nums font-medium",
                  d.delta > 0.01 ? "text-green-600" : d.delta < -0.01 ? "text-red-600" : "text-muted-foreground"
                )}>
                  {d.delta > 0 ? "+" : ""}{(d.delta * 100).toFixed(1)}pp
                </td>
                <td className="px-4 py-2 text-xs text-muted-foreground">
                  {d.isNew ? "🆕 new in challenger" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ModelRegistryPage() {
  const [models, setModels] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  const load = () => {
    fetch(`${API_BASE}/api/ml/model-registry`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then(setModels)
      .catch(() => {});
  };

  const loadComparison = async () => {
    try {
      const result = await fetchModelComparison();
      setComparison(result);
      setShowCompare(true);
    } catch (e: any) {
      toast.error(`Comparison failed: ${e.message}`);
    }
  };

  useEffect(load, []);

  const promote = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ml/model-registry/${id}/promote`, {
        method: "PATCH",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Model promoted to champion. Live predictions will update on the next pipeline run.");
      load();
    } catch (e: any) { toast.error(`Promote failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const rollback = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ml/model-registry/${id}/rollback`, {
        method: "PATCH",
        headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Rolled back to previous champion.");
      load();
    } catch (e: any) { toast.error(`Rollback failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const reject = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/ml/model-registry/${id}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ notes: rejectNote }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Model rejected.");
      setRejectNote("");
      load();
    } catch (e: any) { toast.error(`Reject failed: ${e.message}`); }
    finally { setLoading(false); }
  };

  const champion  = models.find((m) => m.status === "champion");
  const challenger = models.find((m) => m.status === "challenger");
  const archived  = models.filter((m) => m.status === "archived");

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link href="/dashboard/ml-admin"><ArrowLeft /></Link>
          </Button>
          <h1 className="text-2xl tracking-tight">Model Registry</h1>
        </div>
        {champion && challenger && (
          <Button variant="outline" size="sm" onClick={loadComparison}>
            <GitCompare className="size-4 mr-1.5" />
            {showCompare ? "Refresh Compare" : "Compare Models"}
          </Button>
        )}
      </div>

      {/* Champion vs Challenger cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          { model: champion,   label: "Current Champion" },
          { model: challenger, label: "Latest Challenger" },
        ].map(({ model, label }) => (
          <Card key={label} className={label.includes("Champion") ? "border-amber-300 dark:border-amber-700" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              {!model ? (
                <p className="text-sm text-muted-foreground">
                  None — {label.includes("Champion") ? "no champion registered" : "run a retrain first"}
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold">{model.version}</p>
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", STATUS_STYLES[model.status])}>
                      {model.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {model.algorithm} · {model.trainedAt ? new Date(model.trainedAt).toLocaleDateString() : "—"}
                  </p>

                  {/* P / R / F1 metrics */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[
                      { label: "Precision", key: "precisionScore" },
                      { label: "Recall",    key: "recallScore" },
                      { label: "F1",        key: "f1Score" },
                    ].map(({ label: l, key }) => (
                      <div key={l} className="rounded border p-2">
                        <p className="text-xs text-muted-foreground">{l}</p>
                        <p className="text-base font-bold tabular-nums">
                          {model[key] ? Number(model[key]).toFixed(3) : "—"}
                        </p>
                        {label.includes("Challenger") && champion && (
                          <Delta
                            a={champion[key] ? Number(champion[key]) : null}
                            b={model[key] ? Number(model[key]) : null}
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Challenger actions */}
                  {model.status === "challenger" && (
                    <div className="flex gap-2 pt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" className="flex-1" disabled={loading}>
                            <CheckCircle className="mr-1 size-4" /> Approve & Promote
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Promote to Champion</AlertDialogTitle>
                            <AlertDialogDescription>
                              You are promoting <strong>{model.version}</strong> to champion.
                              {champion && <> <strong>{champion.version}</strong> will be archived.</>}{" "}
                              Live predictions will update on the next pipeline run.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => promote(model.id)}>
                              Confirm Promotion
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="flex-1" disabled={loading}>
                            <XCircle className="mr-1 size-4" /> Reject
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Reject Challenger</AlertDialogTitle>
                          </AlertDialogHeader>
                          <Textarea
                            placeholder="Optional notes..."
                            value={rejectNote}
                            onChange={(e) => setRejectNote(e.target.value)}
                            rows={3}
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => reject(model.id)}>
                              Confirm Rejection
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Feature importance diff — shown after Compare is clicked */}
      {showCompare && comparison && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <GitCompare className="size-4" />
              Feature Importance — Champion vs Challenger
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeatureImportanceDiff diff={comparison.featureImportanceDiff ?? []} />
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Version history with rollback */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Version History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 text-left">Version</th>
                  <th className="px-4 py-3 text-left">Algorithm</th>
                  <th className="px-4 py-3 text-right">Precision</th>
                  <th className="px-4 py-3 text-right">Recall</th>
                  <th className="px-4 py-3 text-right">F1</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Trained</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {models.map((m: any) => (
                  <tr key={m.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{m.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">{m.algorithm}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {m.precisionScore ? Number(m.precisionScore).toFixed(3) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {m.recallScore ? Number(m.recallScore).toFixed(3) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {m.f1Score ? Number(m.f1Score).toFixed(3) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", STATUS_STYLES[m.status] ?? "")}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {m.trainedAt ? new Date(m.trainedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {m.status === "archived" && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="ghost" disabled={loading}>
                              <RotateCcw className="size-3.5 mr-1" /> Rollback
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Rollback to {m.version}?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will restore <strong>{m.version}</strong> as the champion.
                                The current champion will be archived. Live predictions update on the next pipeline run.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => rollback(m.id)}>
                                Confirm Rollback
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
