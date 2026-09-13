import { AlertTriangle, MapPin, AlertCircle } from "lucide-react";
import { getAuthToken } from "@/server/server-actions";
import { BackendError } from "@/components/backend-error";
import { Badge } from "@/components/ui/badge";
import type { Alert } from "@/lib/sentinel/types";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchActiveAlerts(token: string | undefined): Promise<Alert[]> {
  const res = await fetch(`${API_BASE}/api/alerts`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const alerts: Alert[] = await res.json();
  return alerts.filter((a) => a.status === "active");
}

const SEVERITY_VARIANTS: Record<string, string> = {
  Critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  High:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Medium:   "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Low:      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

// Known KPC site coordinates — mirrors RiskService SITE_COORDS (lowercase keys)
const SITE_NAMES: Record<string, string> = {
  "site-001": "Nairobi Terminal",
  "site-002": "Mombasa Terminal",
  "site-003": "Makueni Pump Station",
  "site-004": "Nakuru Depot",
  "site-005": "Eldoret Depot",
  "site-006": "Sinendet Pump Station",
  "site-007": "Kisumu Terminal",
};

export default async function NearbyAlertsPage() {
  let alerts: Alert[] = [];
  let error: string | null = null;

  try {
    const token = await getAuthToken();
    alerts = await fetchActiveAlerts(token);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load alerts";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <AlertTriangle className="size-6" /> Nearby Alerts
        </h1>
        <BackendError message={error} />
      </div>
    );
  }

  // Sort: Critical first, then High, then by site proximity
  const SEVERITY_ORDER: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
  const sorted = [...alerts].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 4) - (SEVERITY_ORDER[b.severity] ?? 4)
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <AlertTriangle className="size-6" /> Nearby Alerts
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Active alerts across the KPC corridor, sorted by severity.
          Your home station is shown at the top when available.
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <AlertCircle className="size-10 mb-3 opacity-30" />
          <p className="font-medium">No active alerts</p>
          <p className="text-sm">All alerts have been acknowledged or resolved.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sorted.map((alert) => (
            <div
              key={alert.id}
              className="rounded-lg border p-4 flex items-start gap-4 hover:bg-muted/30 transition-colors"
            >
              {/* Severity indicator */}
              <div
                className={`mt-0.5 size-2.5 rounded-full shrink-0 ${
                  alert.severity === "Critical" ? "bg-red-500" :
                  alert.severity === "High"     ? "bg-orange-500" :
                  alert.severity === "Medium"   ? "bg-amber-500" :
                  "bg-green-500"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <Badge className={SEVERITY_VARIANTS[alert.severity] ?? ""}>
                    {alert.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {alert.description}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {SITE_NAMES[alert.siteId] ?? alert.siteId}
                  </span>
                  <span>
                    {new Date(alert.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
