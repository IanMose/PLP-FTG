"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";
const getToken = () => document.cookie.match(/sentinel-token=([^;]+)/)?.[1];

const BAND_STYLES: Record<string, string> = {
  uncertain: "text-red-600 bg-red-50 dark:bg-red-950/20",
  low:       "text-orange-600 bg-orange-50 dark:bg-orange-950/20",
  confident: "text-green-600 bg-green-50 dark:bg-green-950/20",
};

const RATING_STYLES: Record<string, string> = {
  accurate:   "border-green-500 bg-green-100 text-green-800",
  inaccurate: "border-red-500 bg-red-100 text-red-800",
  uncertain:  "border-gray-400 bg-gray-100 text-gray-700",
};

export default function FeedbackQueuePage() {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string | number, string>>({});

  useEffect(() => {
    fetch(`${API_BASE}/api/ml/predictions-for-review`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => r.json())
      .then((data) => {
        setPredictions(Array.isArray(data) ? data : []);
        // Pre-fill existing ratings
        const existing: Record<string | number, string> = {};
        data.forEach((p: any) => { if (p.existingRating) existing[p.predictionId] = p.existingRating; });
        setRatings(existing);
      })
      .catch(() => {});
  }, []);

  const rate = async (predictionId: number, siteId: string, rating: string) => {
    setRatings((r) => ({ ...r, [predictionId]: rating }));
    try {
      await fetch(`${API_BASE}/api/ml/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ predictionId, siteId, rating }),
      });
      toast.success(`Rated as ${rating}`);
    } catch {
      toast.error("Failed to save rating.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon-sm"><Link href="/dashboard/ml-admin"><ArrowLeft /></Link></Button>
        <div>
          <h1 className="text-2xl tracking-tight">Feedback Queue</h1>
          <p className="text-muted-foreground text-sm">Reviewing uncertain predictions first gives you the most signal per minute of review time.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {predictions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No predictions available for review.</div>
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
                    const current = ratings[p.predictionId];
                    return (
                      <tr key={p.predictionId} className="hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{p.siteId}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-mono">
                          {(Number(p.probability) * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium capitalize", BAND_STYLES[p.confidenceBand])}>
                            {p.confidenceBand}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {(["accurate", "inaccurate", "uncertain"] as const).map((r) => (
                              <button
                                key={r}
                                onClick={() => rate(p.predictionId, p.siteId, r)}
                                className={cn(
                                  "rounded border px-2 py-1 text-xs transition-all",
                                  current === r ? RATING_STYLES[r] + " border-2" : "border-muted-foreground/30 hover:bg-muted"
                                )}
                              >
                                {r === "accurate" ? <ThumbsUp className="size-3 inline mr-0.5" /> :
                                 r === "inaccurate" ? <ThumbsDown className="size-3 inline mr-0.5" /> :
                                 <Minus className="size-3 inline mr-0.5" />}
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
