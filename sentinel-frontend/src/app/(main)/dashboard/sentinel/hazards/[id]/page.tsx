import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BackendError } from "@/components/backend-error";
import { HazardStatusBadge, RiskRatingBadge } from "../_components/risk-rating-badge";
import { RiskAssessmentForm } from "./_components/risk-assessment-form";
import { getAuthToken } from "@/server/server-actions";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchHazard(id: string, token?: string) {
  const res = await fetch(`${API_BASE}/api/hazard-reports/${id}`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface PageProps { params: Promise<{ id: string }> }

export default async function HazardDetailPage({ params }: PageProps) {
  const { id } = await params;
  let hazard: any = null;
  let error: string | null = null;
  try {
    const token = await getAuthToken();
    hazard = await fetchHazard(id, token);
  } catch (e: any) {
    error = e.message;
  }

  if (error) return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="outline" size="icon-sm" className="w-fit"><Link href="/dashboard/sentinel/hazards"><ArrowLeft /></Link></Button>
      <BackendError message={error} />
    </div>
  );

  const canAssess = hazard.status === "open";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon-sm">
          <Link href="/dashboard/sentinel/hazards"><ArrowLeft /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{hazard.category} — {hazard.siteName}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <HazardStatusBadge status={hazard.status} />
            {hazard.riskRating && <RiskRatingBadge rating={hazard.riskRating} />}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Detail card */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Hazard Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Site" value={`${hazard.siteName} (${hazard.siteId})`} />
            <Row label="Category" value={hazard.category} />
            <Row label="Severity estimate" value={hazard.severityEstimate} />
            <Row label="Description" value={hazard.description} />
            <Row label="Reporter" value={hazard.reporterEmail} />
            <Row label="Submitted" value={hazard.createdAt ? new Date(hazard.createdAt).toLocaleString() : "—"} />
            {hazard.likelihoodRating && (
              <>
                <Row label="Likelihood" value={`${hazard.likelihoodRating}/5`} />
                <Row label="Severity rating" value={`${hazard.severityRating}/5`} />
                <Row label="Risk rating" value={<RiskRatingBadge rating={hazard.riskRating} />} />
                <Row label="Assessor" value={hazard.assessedByEmail ?? "—"} />
                {hazard.mitigationNote && <Row label="Mitigation note" value={hazard.mitigationNote} />}
              </>
            )}
            {hazard.linkedAlertId && (
              <div className="pt-2 border-t">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/sentinel/alerts`}>
                    <ExternalLink className="mr-1 size-3" /> View linked alert
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk assessment form — only if status is open */}
        {canAssess && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">Risk Assessment</CardTitle></CardHeader>
            <CardContent>
              <RiskAssessmentForm hazardId={hazard.id} />
            </CardContent>
          </Card>
        )}

        {!canAssess && hazard.status !== "open" && (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Risk assessment {hazard.status === "linked_to_alert" ? "complete — alert has been raised." : "complete."}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
