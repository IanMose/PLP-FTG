import { Wrench, Plus, AlertCircle } from "lucide-react";
import { getAuthToken } from "@/server/server-actions";
import { BackendError } from "@/components/backend-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WorkOrder } from "@/lib/sentinel/api";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchWorkOrders(token: string | undefined): Promise<WorkOrder[]> {
  const res = await fetch(`${API_BASE}/api/work-orders`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const STATUS_VARIANTS: Record<WorkOrder["status"], string> = {
  open:        "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed:   "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  verified:    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const PRIORITY_VARIANTS: Record<WorkOrder["priority"], string> = {
  low:      "bg-muted text-muted-foreground",
  medium:   "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
  high:     "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  critical: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

function WorkOrderStatusBadge({ status }: { status: WorkOrder["status"] }) {
  return (
    <Badge className={STATUS_VARIANTS[status]}>
      {status.replace("_", " ")}
    </Badge>
  );
}

function WorkOrderPriorityBadge({ priority }: { priority: WorkOrder["priority"] }) {
  return (
    <Badge className={PRIORITY_VARIANTS[priority]}>
      {priority}
    </Badge>
  );
}

export default async function WorkOrdersPage() {
  let workOrders: WorkOrder[] = [];
  let error: string | null = null;

  try {
    const token = await getAuthToken();
    workOrders = await fetchWorkOrders(token);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load work orders";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <Wrench className="size-6" /> Work Orders
        </h1>
        <BackendError message={error} />
      </div>
    );
  }

  const open       = workOrders.filter((w) => w.status === "open").length;
  const inProgress = workOrders.filter((w) => w.status === "in_progress").length;
  const completed  = workOrders.filter((w) => w.status === "completed").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight flex items-center gap-2">
            <Wrench className="size-6" /> Work Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Maintenance work orders raised from CAPA findings.
          </p>
        </div>
        {/* Create button — client action, wired via a dialog component in a future iteration */}
        <Button size="sm" disabled>
          <Plus className="size-4 mr-1" /> New Work Order
        </Button>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Open", value: open,       color: "text-blue-600" },
          { label: "In Progress", value: inProgress, color: "text-amber-600" },
          { label: "Completed", value: completed,  color: "text-green-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold tabular-nums mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {workOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <AlertCircle className="size-10 mb-3 opacity-30" />
          <p className="font-medium">No work orders yet</p>
          <p className="text-sm">Work orders are created when a CAPA finding requires scheduled maintenance.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>CAPA</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((wo) => (
                <TableRow key={wo.id}>
                  <TableCell className="font-medium max-w-[200px] truncate">{wo.title}</TableCell>
                  <TableCell className="text-sm">{wo.siteId}</TableCell>
                  <TableCell><WorkOrderPriorityBadge priority={wo.priority} /></TableCell>
                  <TableCell><WorkOrderStatusBadge status={wo.status} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {wo.dueDate
                      ? new Date(wo.dueDate).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short",
                        })
                      : "—"}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">
                    {wo.capaId ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(wo.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
