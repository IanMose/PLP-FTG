import { UserCog, AlertCircle } from "lucide-react";
import { getAuthToken } from "@/server/server-actions";
import { BackendError } from "@/components/backend-error";
import { Badge } from "@/components/ui/badge";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

interface Technician {
  id: number;
  appUserId: number;
  stationHomeId?: string;
  name?: string;
  email?: string;
  qualifications?: string[]; // just qualification type names from the API
}

async function fetchTechnicians(token: string | undefined): Promise<Technician[]> {
  const res = await fetch(`${API_BASE}/api/technicians`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const SITE_NAMES: Record<string, string> = {
  "site-001": "Nairobi Terminal",
  "site-002": "Mombasa Terminal",
  "site-003": "Makueni Pump Station",
  "site-004": "Nakuru Depot",
  "site-005": "Eldoret Depot",
  "site-006": "Sinendet Pump Station",
  "site-007": "Kisumu Terminal",
};

function QualBadge({ expiresAt }: { expiresAt?: string }) {
  if (!expiresAt) return <Badge variant="outline" className="text-xs">No expiry</Badge>;
  const exp = new Date(expiresAt);
  const now = new Date();
  const daysLeft = Math.floor((exp.getTime() - now.getTime()) / 86_400_000);
  if (daysLeft < 0)
    return <Badge variant="destructive" className="text-xs">Expired</Badge>;
  if (daysLeft < 30)
    return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-xs">Expires soon</Badge>;
  return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">Valid</Badge>;
}

export default async function TechniciansPage() {
  let technicians: Technician[] = [];
  let error: string | null = null;

  try {
    const token = await getAuthToken();
    technicians = await fetchTechnicians(token);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load technicians";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <UserCog className="size-6" /> Technicians
        </h1>
        <BackendError message={error} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <UserCog className="size-6" /> Technicians
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Field technicians, their home stations, and active qualifications.
        </p>
      </div>

      {technicians.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <AlertCircle className="size-10 mb-3 opacity-30" />
          <p className="font-medium">No technicians found</p>
          <p className="text-sm">Technicians are created when a Field Technician user account is linked to a station.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {technicians.map((tech) => (
            <div key={tech.id} className="rounded-lg border p-4 flex flex-col gap-3">
              <div>
                <p className="font-semibold text-sm">{tech.name ?? `Technician #${tech.id}`}</p>
                <p className="text-xs text-muted-foreground">{tech.email}</p>
              </div>
              {tech.stationHomeId && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Home station:</span>
                  {SITE_NAMES[tech.stationHomeId] ?? tech.stationHomeId}
                </div>
              )}
              {tech.qualifications && tech.qualifications.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Qualifications</p>
                  {tech.qualifications.map((q, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <span className="text-xs">{q}</span>
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs">
                        Active
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No qualifications on record</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
