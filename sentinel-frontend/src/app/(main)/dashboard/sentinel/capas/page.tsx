import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BackendError } from "@/components/backend-error";
import { Card, CardContent } from "@/components/ui/card";
import { CapaStatusBadge } from "./_components/capa-status-badge";
import { CapaCreateForm } from "./_components/capa-create-form";
import { getAuthToken } from "@/server/server-actions";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

async function fetchCapas(token?: string) {
  const res = await fetch(`${API_BASE}/api/capas`, {
    cache: "no-store",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export default async function CapasPage() {
  let capas: any[] = [];
  let error: string | null = null;
  try {
    const token = await getAuthToken();
    capas = await fetchCapas(token);
  } catch (e: any) { error = e.message; }

  if (error) return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl tracking-tight">CAPAs</h1><CapaCreateForm /></div>
      <BackendError message={error} />
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl tracking-tight">Corrective & Preventive Actions</h1>
          <p className="text-muted-foreground text-sm">{capas.length} CAPA{capas.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <CapaCreateForm />
      </div>

      <Card>
        <CardContent className="p-0">
          {capas.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No CAPAs yet.</div>
          ) : (
            <>
              <div className="divide-y sm:hidden">
                {capas.map((c: any) => (
                  <Link key={c.id} href={`/dashboard/sentinel/capas/${c.id}`} className="block px-4 py-3 hover:bg-muted/50">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm truncate mr-2">{c.description}</span>
                      <CapaStatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Owner: {c.ownerName} · Due: {c.dueDate}
                    </p>
                  </Link>
                ))}
              </div>
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3 text-left">Description</th>
                      <th className="px-4 py-3 text-left">Owner</th>
                      <th className="px-4 py-3 text-left">Due</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {capas.map((c: any) => {
                      const isOverdue = c.dueDate && new Date(c.dueDate) < new Date() && !["verified","closed"].includes(c.status);
                      return (
                        <tr key={c.id} className="group hover:bg-muted/40">
                          <td className="px-4 py-3 max-w-xs truncate">{c.description}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.ownerName}</td>
                          <td className={cn("px-4 py-3 tabular-nums", isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "")}>
                            {c.dueDate}{isOverdue ? " ⚠" : ""}
                          </td>
                          <td className="px-4 py-3"><CapaStatusBadge status={c.status} /></td>
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/sentinel/capas/${c.id}`} className="opacity-0 group-hover:opacity-100">
                              <ArrowUpRight className="size-4 text-muted-foreground" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
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
