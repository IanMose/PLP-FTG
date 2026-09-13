import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BackendError } from "@/components/backend-error";
import { Card, CardContent } from "@/components/ui/card";
import { HazardReportForm } from "./_components/hazard-report-form";
import { HazardStatusBadge, RiskRatingBadge } from "./_components/risk-rating-badge";
import { getAuthToken } from "@/server/server-actions";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchHazards(token?: string) {
  const res = await fetch(`${API_BASE}/api/hazard-reports`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function HazardsPage() {
  let hazards: any[] = [];
  let error: string | null = null;
  try {
    const token = await getAuthToken();
    hazards = await fetchHazards(token);
  } catch (e: any) {
    error = e.message;
  }

  const hazardCount   = hazards.filter((h) => !h.reportType || h.reportType === "hazard").length;
  const nearMissCount = hazards.filter((h) => h.reportType === "near_miss").length;

  if (error) return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl tracking-tight">Hazard Reports</h1>
        <HazardReportForm />
      </div>
      <BackendError message={error} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight">Hazard Reports</h1>
          <p className="text-muted-foreground text-sm">
            {hazards.length} report{hazards.length !== 1 ? "s" : ""} — proactive HSE reporting channel
          </p>
        </div>
        <HazardReportForm />
      </div>

      {/* Report type summary chips */}
      <div className="flex gap-2 flex-wrap">
        <span className="rounded-full border px-3 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
          All ({hazards.length})
        </span>
        <span className="rounded-full border border-orange-300 px-3 py-0.5 text-xs font-medium bg-orange-50 text-orange-800 dark:bg-orange-950/20 dark:text-orange-300">
          ⚠ Hazards ({hazardCount})
        </span>
        <span className="rounded-full border border-amber-300 px-3 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
          🔶 Near-Misses ({nearMissCount})
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {hazards.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No hazard reports yet. Submit the first one using the button above.
            </div>
          ) : (
            <>
              {/* Mobile: stacked */}
              <div className="divide-y sm:hidden">
                {hazards.map((h: any) => (
                  <Link
                    key={h.id}
                    href={`/dashboard/sentinel/hazards/${h.id}`}
                    className="block px-4 py-3 hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{h.siteName}</span>
                      <HazardStatusBadge status={h.status} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        h.reportType === "near_miss"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                          : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                      }`}>
                        {h.reportType === "near_miss" ? "Near-Miss" : "Hazard"}
                      </span>
                      <p className="text-xs text-muted-foreground">{h.category} · {h.severityEstimate}</p>
                    </div>
                    {h.riskRating && <RiskRatingBadge rating={h.riskRating} />}
                  </Link>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 text-left">Site</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Category</th>
                      <th className="px-4 py-3 text-left">Severity</th>
                      <th className="px-4 py-3 text-left">Risk Rating</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Reporter</th>
                      <th className="px-4 py-3 text-right">Date</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hazards.map((h: any) => (
                      <tr key={h.id} className="group hover:bg-muted/40">
                        <td className="px-4 py-3 font-medium">{h.siteName}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            h.reportType === "near_miss"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                              : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300"
                          }`}>
                            {h.reportType === "near_miss" ? "Near-Miss" : "Hazard"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{h.category}</td>
                        <td className="px-4 py-3">{h.severityEstimate}</td>
                        <td className="px-4 py-3"><RiskRatingBadge rating={h.riskRating} /></td>
                        <td className="px-4 py-3"><HazardStatusBadge status={h.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{h.reporterEmail}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                          {h.createdAt ? new Date(h.createdAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/dashboard/sentinel/hazards/${h.id}`}
                            className="opacity-0 group-hover:opacity-100"
                          >
                            <ArrowUpRight className="size-4 text-muted-foreground" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
