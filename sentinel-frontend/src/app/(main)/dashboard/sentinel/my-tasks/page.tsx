"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CapaStatusBadge } from "../capas/_components/capa-status-badge";
import { BackendError } from "@/components/backend-error";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export default function MyTasksPage() {
  const [capas, setCapas] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = document.cookie.match(/sentinel-token=([^;]+)/)?.[1];
    fetch(`${API_BASE}/api/capas`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setCapas)
      .catch((e) => setError(e.message));
  }, []);

  const active = capas.filter((c) => ["open", "in_progress"].includes(c.status));
  const pending = capas.filter((c) => c.status === "completed");
  const closed = capas.filter((c) => ["verified", "closed"].includes(c.status));

  if (error) return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl tracking-tight">My Tasks</h1>
      <BackendError message={error} />
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl tracking-tight">My Tasks</h1>
        <p className="text-muted-foreground text-sm">{active.length} active · {pending.length} pending verification</p>
      </div>

      <Section title="Active Tasks" items={active} emptyMsg="No active tasks." />
      <Section title="Awaiting Verification" items={pending} emptyMsg="None awaiting verification." />
      <Section title="Completed" items={closed} emptyMsg="None completed yet." />
    </div>
  );
}

function Section({ title, items, emptyMsg }: { title: string; items: any[]; emptyMsg: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground pl-1">{emptyMsg}</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((c: any) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="pt-4 pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight line-clamp-2">{c.description}</p>
                  <CapaStatusBadge status={c.status} />
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>Due: {c.dueDate}</p>
                  {c.sourceAlertId && <p>Alert: {c.sourceAlertId}</p>}
                </div>
                <Button asChild size="sm" variant="outline" className="w-full mt-1">
                  <Link href={`/dashboard/sentinel/capas/${c.id}`}>View / Update</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
