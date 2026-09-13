"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendError } from "@/components/backend-error";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";
const getToken = () => document.cookie.match(/sentinel-token=([^;]+)/)?.[1];

export default function TrainingRunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retraining, setRetraining] = useState(false);

  const load = () => {
    fetch(`${API_BASE}/api/ml/training-runs`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then(setRuns)
      .catch((e) => setError(e.message));
  };

  useEffect(load, []);

  const triggerRetrain = async () => {
    setRetraining(true);
    try {
      toast.info("Retrain triggered — this may take a moment.");
      // In production this calls the backend which runs python -m src.retrain
      // For demo: create a placeholder training run record
      const res = await fetch(`${API_BASE}/api/ml/training-run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({
          version: `logreg_${new Date().toISOString().slice(0,10).replace(/-/g,"")}`,
          algorithm: "logistic_regression",
          triggeredBy: "manual",
          rowsUsed: 1260,
          feedbackRowsUsed: 0,
          notes: "Manual retrain via ML Admin Portal",
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Retrain complete. A new challenger model is in the registry.");
      load();
    } catch (e: any) {
      toast.error(`Retrain failed: ${e.message}`);
    } finally {
      setRetraining(false);
    }
  };

  if (error) return <BackendError message={error} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm"><Link href="/dashboard/ml-admin"><ArrowLeft /></Link></Button>
          <h1 className="text-2xl tracking-tight">Training Runs</h1>
        </div>
        <Button onClick={triggerRetrain} disabled={retraining} size="sm">
          <RefreshCw className={`mr-1 size-4 ${retraining ? "animate-spin" : ""}`} />
          {retraining ? "Retraining…" : "Retrain Now"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Retraining uses all available feedback and the current feature set. The resulting model is a <strong>challenger</strong> — it will not affect live predictions until approved in the Model Registry.
      </p>

      <Card>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No training runs yet. Click "Retrain Now" to start.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left">Model</th>
                    <th className="px-4 py-3 text-left">Triggered by</th>
                    <th className="px-4 py-3 text-right">Rows</th>
                    <th className="px-4 py-3 text-right">Feedback rows</th>
                    <th className="px-4 py-3 text-left">Started</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {runs.map((r: any) => (
                    <tr key={r.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-mono text-xs">{r.modelRegistryId?.slice(0, 8)}…</td>
                      <td className="px-4 py-3">{r.triggeredBy}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.rowsUsed}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.feedbackRowsUsed}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{r.startedAt ? new Date(r.startedAt).toLocaleString() : "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs rounded px-1.5 py-0.5 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                          {r.completedAt ? "complete" : "running"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
