"use client";

import Link from "next/link";
import { ArrowLeft, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const BAND_STYLES: Record<string, string> = {
  uncertain: "text-red-600 bg-red-50 dark:bg-red-950/20",
  low: "text-orange-600 bg-orange-50 dark:bg-orange-950/20",
  confident: "text-green-600 bg-green-50 dark:bg-green-950/20",
};

const RATING_STYLES: Record<string, string> = {
  accurate: "border-green-500 bg-green-100 text-green-800",
  inaccurate: "border-red-500 bg-red-100 text-red-800",
  uncertain: "border-gray-400 bg-gray-100 text-gray-700",
};

export default function FeedbackQueuePage() {
  const qc = useQueryClient();

  const { data: predictions = [] } = useQuery<any[]>({
    queryKey: ["predictions-for-review"],
    queryFn: () => fetch("/api/proxy/ml/feedback").then((r) => r.json()),
    staleTime: 30_000,
  });

  const rateMutation = useMutation({
    mutationFn: ({
      predictionId,
      siteId,
      rating,
    }: {
      predictionId: number;
      siteId: string;
      rating: string;
    }) =>
      fetch("/api/proxy/ml/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ predictionId, siteId, rating }),
      }).then((r) => r.json()),
    onMutate: async ({ predictionId, rating }) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ["predictions-for-review"] });
      const prev = qc.getQueryData<any[]>(["predictions-for-review"]);
      qc.setQueryData<any[]>(["predictions-for-review"], (old = []) =>
        old.map((p) =>
          p.predictionId === predictionId ? { ...p, existingRating: rating } : p,
        ),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      qc.setQueryData(["predictions-for-review"], ctx?.prev);
      toast.error("Failed to save rating.");
    },
    onSuccess: (_data, { rating }) => {
      toast.success(`Rated as ${rating}`);
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon-sm">
          <Link href="/dashboard/ml-admin">
            <ArrowLeft />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl tracking-tight">Feedback Queue</h1>
          <p className="text-muted-foreground text-sm">
            Uncertain predictions first — most signal per minute of review time.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {predictions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No predictions available for review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 text-left">Site</th>
                    <th className="px-4 py-3 text-right">Probability</th>
                    <th className="px-4 py-3 text-left">Confidence</th>
                    <th className="px-4 py-3 text-left">Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {predictions.map((p: any) => {
                    const current = p.existingRating;
                    return (
                      <tr key={p.predictionId} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{p.siteId}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-mono">
                          {(Number(p.probability) * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-xs font-medium capitalize",
                              BAND_STYLES[p.confidenceBand],
                            )}
                          >
                            {p.confidenceBand}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {(["accurate", "inaccurate", "uncertain"] as const).map((r) => (
                              <button
                                key={r}
                                type="button"
                                disabled={rateMutation.isPending}
                                onClick={() =>
                                  rateMutation.mutate({
                                    predictionId: p.predictionId,
                                    siteId: p.siteId,
                                    rating: r,
                                  })
                                }
                                className={cn(
                                  "rounded border px-2 py-1 text-xs transition-all",
                                  current === r
                                    ? RATING_STYLES[r] + " border-2"
                                    : "border-muted-foreground/30 hover:bg-muted",
                                )}
                              >
                                {r === "accurate" ? (
                                  <ThumbsUp className="size-3 inline mr-0.5" />
                                ) : r === "inaccurate" ? (
                                  <ThumbsDown className="size-3 inline mr-0.5" />
                                ) : (
                                  <Minus className="size-3 inline mr-0.5" />
                                )}
                                {r}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
