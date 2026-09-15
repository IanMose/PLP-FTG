"use client";

import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function TrainingRunsPage() {
  const qc = useQueryClient();

  const { data: runs = [], isError } = useQuery<any[]>({
    queryKey: ["training-runs"],
    queryFn: () =>
      fetch("/api/proxy/ml/training-runs").then((r) => r.json()),
    staleTime: 30_000,
  });

  const retrainMutation = useMutation({
    mutationFn: () =>
      fetch("/api/proxy/ml/trigger-retrain", { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }),
    onMutate: () => toast.info("Retrain triggered — this may take a moment."),
    onSuccess: () => {
      toast.success(
        "Retrain complete. A new challenger model is in the registry.",
      );
      qc.invalidateQueries({ queryKey: ["training-runs"] });
      qc.invalidateQueries({ queryKey: ["model-registry"] });
    },
    onError: (e: Error) => toast.error(`Retrain failed: ${e.message}`),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link href="/dashboard/ml-admin">
              <ArrowLeft />
            </Link>
          </Button>
          <h1 className="text-2xl tracking-tight">Training Runs</h1>
        </div>
        <Button
          onClick={() => retrainMutation.mutate()}
          disabled={retrainMutation.isPending}
          size="sm"
        >
          <RefreshCw
            className={`mr-1 size-4 ${retrainMutation.isPending ? "animate-spin" : ""}`}
          />
          {retrainMutation.isPending ? "Retraining…" : "Retrain Now"}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Retraining uses all available feedback and the current feature set. The
        resulting model is a <strong>challenger</strong> — it will not affect
        live predictions until approved in the Model Registry.
      </p>

      {isError && (
        <p className="text-sm text-destructive">Failed to load training runs.</p>
      )}

      <Card>
        <CardContent className="p-0">
          {runs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No training runs yet. Click &ldquo;Retrain Now&rdquo; to start.
            </div>
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
                      <td className="px-4 py-3 font-mono text-xs">
                        {r.modelRegistryId?.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">{r.triggeredBy}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.rowsUsed}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.feedbackRowsUsed}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {r.startedAt
                          ? new Date(r.startedAt).toLocaleString()
                          : "—"}
                      </td>
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
