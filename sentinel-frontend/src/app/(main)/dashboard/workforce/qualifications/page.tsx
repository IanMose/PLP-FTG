import { Award, AlertCircle } from "lucide-react";
import { getAuthToken } from "@/server/server-actions";
import { BackendError } from "@/components/backend-error";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

interface Qualification {
  technicianName: string;
  qualificationType: string;
}

async function fetchAllQualifications(token: string | undefined): Promise<Qualification[]> {
  const res = await fetch(`${API_BASE}/api/technicians`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const techs: Array<{
    id: number;
    name?: string;
    qualifications?: string[];
  }> = await res.json();

  return techs.flatMap((t) =>
    (t.qualifications ?? []).map((q) => ({
      qualificationType: q,
      technicianName: t.name ?? `Technician #${t.id}`,
    })),
  );
}

export default async function QualificationsPage() {
  let qualifications: Qualification[] = [];
  let error: string | null = null;

  try {
    const token = await getAuthToken();
    qualifications = await fetchAllQualifications(token);
  } catch (e: unknown) {
    error = e instanceof Error ? e.message : "Failed to load qualifications";
  }

  if (error) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <Award className="size-6" /> Qualifications
        </h1>
        <BackendError message={error} />
      </div>
    );
  }

  const expiringSoon: Qualification[] = [];
  const expired: Qualification[] = [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl tracking-tight flex items-center gap-2">
          <Award className="size-6" /> Qualifications
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          All technician qualifications — certificate types, expiry status, and holders.
        </p>
      </div>

      {/* Alert banners for expiry issues */}
      {(expired.length > 0 || expiringSoon.length > 0) && (
        <div className="flex flex-col gap-2">
          {expired.length > 0 && (
            <div className="rounded-lg border border-red-300 bg-red-50/50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-300">
              ⚠ {expired.length} qualification{expired.length > 1 ? "s" : ""} expired —
              affected technicians cannot be assigned to matching CAPAs.
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-300">
              {expiringSoon.length} qualification{expiringSoon.length > 1 ? "s" : ""} expiring within 30 days.
            </div>
          )}
        </div>
      )}

      {qualifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center text-muted-foreground">
          <AlertCircle className="size-10 mb-3 opacity-30" />
          <p className="font-medium">No qualifications on record</p>
          <p className="text-sm">Qualifications are added to technician profiles by HSE Managers.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Technician</TableHead>
                <TableHead>Qualification Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {qualifications.map((q, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium text-sm">{q.technicianName}</TableCell>
                  <TableCell className="text-sm">{q.qualificationType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
