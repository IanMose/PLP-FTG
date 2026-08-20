"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendError } from "@/components/backend-error";
import { ProvenanceBadge } from "./_components/provenance-badge";
import { RoiAssumptionsTable } from "./_components/roi-assumptions-table";
import { RoiResultDisplay } from "./_components/roi-result-display";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchReferenceCase() {
  const res = await fetch(`${API_BASE}/api/analytics/roi/reference-cases`, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function calculateRoi(assumptions: Record<string, number>) {
  const res = await fetch(`${API_BASE}/api/analytics/roi/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      interventionProbability: assumptions["interventionProbability"] ?? 0.70,
      incidentExposureKes: assumptions["incidentExposureKes"] ?? 150_000_000,
      nHighRiskAlerts: assumptions["nHighRiskAlerts"] ?? 3,
      annualPlatformCostKes: assumptions["annualPlatformCostKes"] ?? null,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default function RoiPage() {
  const [referenceData, setReferenceData] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchReferenceCase()
      .then((data) => {
        setReferenceData(data);
        // Auto-calculate with defaults on load
        const defaults = Object.fromEntries(
          (data.default_assumptions ?? []).map((a: any) => [a.key, a.value])
        );
        return calculateRoi(defaults);
      })
      .then(setResult)
      .catch((e) => setError(e.message));
  }, []);

  const handleRecalculate = async (values: Record<string, number>) => {
    setIsLoading(true);
    try {
      const r = await calculateRoi(values);
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon-sm">
            <Link href="/dashboard/sentinel"><ArrowLeft /></Link>
          </Button>
          <h1 className="text-2xl tracking-tight">ROI Calculator</h1>
        </div>
        <BackendError message={error} />
      </div>
    );
  }

  const ref = referenceData;
  const assumptions = ref?.default_assumptions ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon-sm">
          <Link href="/dashboard/sentinel"><ArrowLeft /></Link>
        </Button>
        <div>
          <h1 className="text-2xl tracking-tight sm:text-3xl">ROI Calculator</h1>
          <p className="text-muted-foreground text-sm">
            Quantify the financial value of early warning under explicit, traceable assumptions.
          </p>
        </div>
      </div>

      {/* Reference case header */}
      {ref && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <ProvenanceBadge type="COURT_RECORD" />
              <CardTitle className="text-base">Reference Benchmark</CardTitle>
            </div>
            <CardDescription className="text-xs leading-relaxed mt-1">
              This case is displayed as a reference benchmark for the scale of consequence.
              It does not claim Sentinel could have predicted the 2015 incident.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Case</p>
                <p className="font-medium leading-tight">{ref.case_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ref.citation}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Incident date</p>
                <p className="font-medium">{ref.incident_date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross award (reference only)</p>
                <p className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-400">
                  KES {ref.gross_award_kes?.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assumptions + Result — two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* Left column — Assumptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assumptions</CardTitle>
            <CardDescription>
              Edit any ESTIMATE row and click Recalculate. Court Record and Synthetic values are fixed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RoiAssumptionsTable
              assumptions={assumptions}
              onRecalculate={handleRecalculate}
              isLoading={isLoading}
            />
          </CardContent>
        </Card>

        {/* Right column — Result */}
        {result ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Result</CardTitle>
            </CardHeader>
            <CardContent>
              <RoiResultDisplay result={result} />
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Loading calculation…
          </div>
        )}
      </div>
    </div>
  );
}
