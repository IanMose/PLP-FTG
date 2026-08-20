import { ClipboardList, AlertCircle } from "lucide-react";
import { getAuthToken } from "@/server/server-actions";
import { BackendError } from "@/components/backend-error";
import { Badge } from "@/components/ui/badge";
import type { WorkOrder } from "@/lib/sentinel/api";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchClosedWorkOrders(token: string | undefined): Promise<WorkOrder[]> {
  const res = await fetch(`${API_BASE}/api/work-orders?status=verified`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function MaintenanceHistoryPage() {
  let orders: WorkOrder[] = [];
  let error: string | null = null;

  try {
    const token = await getAuthToken();
    orders = await fetchClosedWorkOrders(token);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load maintenance history";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <ClipboardList className="size-6" /> Maintenance History
        </h1>
        <BackendError message={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <ClipboardList className="size-6" /> Maintenance History
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Verified and completed work orders — the full maintenance audit trail.
        </p>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <AlertCircle className="size-10 mb-3 opacity-30" />
          <p className="font-medium">No completed work orders yet</p>
          <p className="text-sm">Verified work orders will appear here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((wo) => (
            <div key={wo.id} className="rounded-lg border p-4 flex items-start gap-4">
              {/* Timeline dot */}
              <div className="flex flex-col items-center gap-1 pt-1">
                <div className="size-3 rounded-full bg-green-500 shrink-0" />
                <div className="w-px flex-1 bg-border min-h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <p className="font-medium text-sm">{wo.title}</p>
                  <div className="flex gap-2 shrink-0">
                    <Badge className="bg-muted text-muted-foreground text-xs">{wo.siteId}</Badge>
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs">
                      verified
                    </Badge>
                  </div>
                </div>
                {wo.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{wo.description}</p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>Completed {wo.completedAt
                    ? new Date(wo.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                    : "—"}</span>
                  {wo.capaId && <span>CAPA: {wo.capaId}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
