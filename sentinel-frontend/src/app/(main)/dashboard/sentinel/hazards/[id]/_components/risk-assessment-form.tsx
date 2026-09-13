"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { RiskRatingBadge } from "../../_components/risk-rating-badge";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export function RiskAssessmentForm({ hazardId }: { hazardId: string }) {
  const router = useRouter();
  const [likelihood, setLikelihood] = useState(3);
  const [severity, setSeverity] = useState(3);
  const [mitigationNote, setMitigationNote] = useState("");
  const [loading, setLoading] = useState(false);

  const riskRating = likelihood * severity;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const token = document.cookie.match(/sentinel-token=([^;]+)/)?.[1];
      const res = await fetch(`${API_BASE}/api/hazard-reports/${hazardId}/risk-assessment`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ likelihoodRating: likelihood, severityRating: severity, mitigationNote }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.status === "linked_to_alert") {
        toast.success(`Risk rating ${riskRating}/25 — alert raised for ${data.siteName}`);
      } else {
        toast.success(`Risk assessment saved. Rating: ${riskRating}/25`);
      }
      router.refresh();
    } catch (e: any) {
      toast.error(`Assessment failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Likelihood (1–5)</Label>
          <span className="text-lg font-bold tabular-nums">{likelihood}</span>
        </div>
        <Slider min={1} max={5} step={1} value={[likelihood]} onValueChange={([v]) => setLikelihood(v)} />
        <p className="text-xs text-muted-foreground">1 = Rare, 5 = Almost certain</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Severity (1–5)</Label>
          <span className="text-lg font-bold tabular-nums">{severity}</span>
        </div>
        <Slider min={1} max={5} step={1} value={[severity]} onValueChange={([v]) => setSeverity(v)} />
        <p className="text-xs text-muted-foreground">1 = Negligible, 5 = Catastrophic</p>
      </div>

      <div className="rounded-lg border p-3 flex items-center justify-between">
        <span className="text-sm font-medium">Risk Rating</span>
        <RiskRatingBadge rating={riskRating} />
      </div>

      {riskRating >= 10 && (
        <div className="rounded-lg border border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 p-3 text-xs text-orange-800 dark:text-orange-300">
          Risk rating ≥ 10 will trigger an alert in the existing alert feed.
          {riskRating >= 15 && " Rating ≥ 15 will create a Critical alert."}
        </div>
      )}

      <div className="space-y-1">
        <Label>Mitigation Note</Label>
        <Textarea
          rows={2}
          placeholder="Describe proposed mitigation actions..."
          value={mitigationNote}
          onChange={(e) => setMitigationNote(e.target.value)}
        />
      </div>

      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? "Saving…" : "Submit Assessment"}
      </Button>
    </div>
  );
}
