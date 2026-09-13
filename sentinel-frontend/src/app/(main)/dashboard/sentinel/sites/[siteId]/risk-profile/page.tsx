import Link from "next/link";
import { ArrowLeft, AlertTriangle, ClipboardCheck, Wrench, Users, Activity } from "lucide-react";
import { BackendError } from "@/components/backend-error";
import { getAuthToken } from "@/server/server-actions";
import { fetchSiteDetail, fetchSitePrediction, fetchAlerts, fetchWorkOrders } from "@/lib/sentinel/api";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

const SITE_NAMES: Record<string, string> = {
  "site-001": "Nairobi Terminal",
  "site-002": "Mombasa Terminal",
  "site-003": "Makueni Pump Station",
  "site-004": "Nakuru Depot",
  "site-005": "Eldoret Depot",
  "site-006": "Sinendet Pump Station",
  "site-007": "Kisumu Terminal",
};

const RISK_BAND_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300",
  High:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-300",
  Medium:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300",
  Low:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300",
};

async function fetchCAPAs(token: string | undefined, siteId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/capas`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    const all = await res.json();
    // Filter by siteId via linked hazard_report or alert — best effort
    return all.filter((c: any) =>
      c.siteId === siteId ||
      (c.sourceAlertId && c.sourceAlertId.includes(siteId))
    );
  } catch {
    return [];
  }
}

async function fetchTechnicians(token: string | undefined) {
  try {
    const res = await fetch(`${API_BASE}/api/technicians`, {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ siteId: string }>;
}

export default async function StationRiskProfilePage({ params }: PageProps) {
  const { siteId } = await params;
  const siteName = SITE_NAMES[siteId] ?? siteId;

  try {
    const token = await getAuthToken();

    const [site, prediction, allAlerts, workOrders, technicians] = await Promise.all([
      fetchSiteDetail(siteId),
      fetchSitePrediction(siteId).catch(() => null),
      fetchAlerts().catch(() => []),
      fetchWorkOrders({ siteId }).catch(() => []),
      fetchTechnicians(token),
    ]);

    const siteAlerts = allAlerts.filter((a) => a.siteId === siteId && a.status === "active");
    const openCAPAs  = 0; // best effort — no site-scoped CAPA endpoint yet
    const openWOs    = workOrders.filter((w) => w.status !== "verified").length;
    const assignedTechs = technicians.filter((t: any) => t.stationHomeId === siteId);

    // Risk band from ML prediction probability
    const prob = prediction?.probability ?? 0;
    const riskBand =
      prob >= 0.75 ? "Critical" :
      prob >= 0.55 ? "High" :
      prob >= 0.35 ? "Medium" : "Low";

    return (
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/sentinel/sites/${siteId}`}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" /> Site Detail
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl tracking-tight">{siteName}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Station Risk Profile · {siteId}</p>
          </div>
          <Badge className={`text-sm px-3 py-1 border ${RISK_BAND_STYLES[riskBand]}`}>
            {riskBand} Risk
          </Badge>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Active Alerts",
              value: siteAlerts.length,
              icon: AlertTriangle,
              color: siteAlerts.length > 0 ? "text-red-600" : "text-green-600",
            },
            {
              label: "Open Work Orders",
              value: openWOs,
              icon: Wrench,
              color: openWOs > 0 ? "text-amber-600" : "text-green-600",
            },
            {
              label: "ML Risk Score",
              value: prediction ? `${(prob * 100).toFixed(0)}%` : "—",
              icon: Activity,
              color: prob >= 0.55 ? "text-orange-600" : "text-green-600",
            },
            {
              label: "Assigned Techs",
              value: assignedTechs.length,
              icon: Users,
              color: "text-foreground",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardHeader className="pb-1">
                <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Icon className="size-3.5" /> {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold tabular-nums ${color}`}>{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Active alerts list */}
        {siteAlerts.length > 0 && (
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="size-4 text-red-600" />
                Active Alerts ({siteAlerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {siteAlerts.slice(0, 5).map((alert) => (
                  <div key={alert.id} className="px-4 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{alert.description}</p>
                    </div>
                    <Badge className={
                      alert.severity === "Critical" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 shrink-0" :
                      alert.severity === "High" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 shrink-0" :
                      "shrink-0"
                    }>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Work orders */}
        {workOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="size-4" />
                Work Orders ({workOrders.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {workOrders.slice(0, 5).map((wo) => (
                  <div key={wo.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <p className="font-medium text-sm truncate">{wo.title}</p>
                    <Badge className={
                      wo.status === "open" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                      wo.status === "in_progress" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                    }>
                      {wo.status.replace("_", " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Assigned technicians */}
        {assignedTechs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="size-4" />
                Assigned Technicians ({assignedTechs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {assignedTechs.map((t: any) => (
                  <div key={t.id} className="rounded-lg border px-3 py-2">
                    <p className="text-sm font-medium">{t.name ?? `Tech #${t.id}`}</p>
                    <p className="text-xs text-muted-foreground">{t.email}</p>
                    {t.qualifications?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t.qualifications.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs: incidents and audits from site detail */}
        <Tabs defaultValue="incidents">
          <TabsList>
            <TabsTrigger value="incidents">Recent Incidents</TabsTrigger>
            <TabsTrigger value="audits">Recent Audits</TabsTrigger>
          </TabsList>
          <TabsContent value="incidents">
            <Card>
              <CardContent className="p-0">
                {site.incidents?.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No incidents recorded.</p>
                ) : (
                  <div className="divide-y">
                    {(site.incidents ?? []).slice(0, 8).map((inc: any) => (
                      <div key={inc.incidentId} className="px-4 py-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{inc.description ?? inc.incidentId}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {inc.incidentDate ? new Date(inc.incidentDate).toLocaleDateString("en-GB") : "—"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">{inc.severity}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="audits">
            <Card>
              <CardContent className="p-0">
                {site.audits?.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">No audits recorded.</p>
                ) : (
                  <div className="divide-y">
                    {(site.audits ?? []).slice(0, 8).map((audit: any) => (
                      <div key={audit.auditId} className="px-4 py-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{audit.findings ?? audit.auditId}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {audit.inspectionDate
                              ? new Date(audit.inspectionDate).toLocaleDateString("en-GB")
                              : "—"}{" "}
                            · Score: {audit.complianceScore ?? "—"}
                          </p>
                        </div>
                        {audit.followUpRequired && (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs shrink-0">
                            Follow-up
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (err) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href={`/dashboard/sentinel/sites/${siteId}`}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back
        </Link>
        <BackendError
          message={err instanceof Error ? err.message : `Failed to load risk profile for ${siteId}`}
        />
      </div>
    );
  }
}
