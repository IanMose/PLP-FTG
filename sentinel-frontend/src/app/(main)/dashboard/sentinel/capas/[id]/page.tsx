"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CapaStatusBadge, CapaStatusStepper } from "../_components/capa-status-badge";
import { BackendError } from "@/components/backend-error";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

function getToken() { return document.cookie.match(/sentinel-token=([^;]+)/)?.[1]; }

export default function CapaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [capa, setCapa] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/capas/${params.id}`, {
      headers: getToken() ? { Authorization: `Bearer ${getToken()}` } : {},
    })
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setCapa)
      .catch((e) => setError(e.message));
  }, [params.id]);

  const transition = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/capas/${params.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
        },
        body: JSON.stringify({ status, evidenceUrl: evidence }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      const updated = await res.json();
      setCapa(updated);
      toast.success(`CAPA status updated to: ${status.replace(/_/g, " ")}`);
      if (status === "closed") {
        toast.info("CAPA closed — feedback recorded for ML retraining.");
      }
    } catch (e: any) {
      toast.error(`Update failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (error) return (
    <div className="flex flex-col gap-4">
      <Button asChild variant="outline" size="icon-sm" className="w-fit"><Link href="/dashboard/sentinel/capas"><ArrowLeft /></Link></Button>
      <BackendError message={error} />
    </div>
  );

  if (!capa) return <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="icon-sm">
          <Link href="/dashboard/sentinel/capas"><ArrowLeft /></Link>
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">CAPA Detail</h1>
          <div className="flex items-center gap-3 mt-0.5">
            <CapaStatusBadge status={capa.status} />
            <CapaStatusStepper status={capa.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Description" value={capa.description} />
            <Row label="Owner" value={`${capa.ownerName} (${capa.ownerEmail})`} />
            <Row label="Due date" value={capa.dueDate} />
            <Row label="Status" value={<CapaStatusBadge status={capa.status} />} />
            {capa.sourceAlertId && <Row label="Source alert" value={capa.sourceAlertId} />}
            {capa.sourceHazardId && <Row label="Source hazard" value={capa.sourceHazardId} />}
            {capa.evidenceUrl && <Row label="Evidence" value={<a href={capa.evidenceUrl} className="text-primary underline" target="_blank">{capa.evidenceUrl}</a>} />}
            {capa.verifiedByEmail && <Row label="Verified by" value={capa.verifiedByEmail} />}
            {capa.closedAt && <Row label="Closed at" value={new Date(capa.closedAt).toLocaleString()} />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {capa.status === "open" && (
              <Button onClick={() => transition("in_progress")} disabled={loading} className="w-full">Mark In Progress</Button>
            )}
            {capa.status === "in_progress" && (
              <>
                <div className="space-y-1">
                  <Label className="text-xs">Evidence URL (optional)</Label>
                  <Input placeholder="https://..." value={evidence} onChange={(e) => setEvidence(e.target.value)} />
                </div>
                <Button onClick={() => transition("completed")} disabled={loading} className="w-full">Mark Completed</Button>
              </>
            )}
            {capa.status === "completed" && (
              <Button onClick={() => transition("verified")} disabled={loading} className="w-full">Verify</Button>
            )}
            {capa.status === "verified" && (
              <Button onClick={() => transition("closed")} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white">Close CAPA</Button>
            )}
            {capa.status === "closed" && (
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">✓ CAPA is closed and verified.</p>
            )}
          </CardContent>
        </Card>
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
