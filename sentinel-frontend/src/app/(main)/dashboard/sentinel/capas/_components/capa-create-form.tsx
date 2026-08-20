"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

interface Props {
  sourceAlertId?: string;
  sourceHazardId?: string;
  triggerLabel?: string;
}

export function CapaCreateForm({ sourceAlertId, sourceHazardId, triggerLabel = "Create CAPA" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    ownerId: "", dueDate: "", description: "",
    sourceAlertId: sourceAlertId ?? "",
    sourceHazardId: sourceHazardId ?? "",
  });

  useEffect(() => {
    if (!open) return;
    const token = document.cookie.match(/sentinel-token=([^;]+)/)?.[1];
    fetch(`${API_BASE}/api/technicians`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then(setTechnicians)
      .catch(() => {});
  }, [open]);

  const handleSubmit = async () => {
    if (!form.ownerId || !form.dueDate || !form.description) {
      toast.error("Owner, due date, and description are required.");
      return;
    }
    setLoading(true);
    try {
      const token = document.cookie.match(/sentinel-token=([^;]+)/)?.[1];
      const res = await fetch(`${API_BASE}/api/capas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...form, ownerId: Number(form.ownerId) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `HTTP ${res.status}`);
      }
      toast.success("CAPA created.");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1 size-4" />{triggerLabel}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create CAPA</DialogTitle>
          <DialogDescription>Assign a corrective action to a qualified technician.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="space-y-1">
            <Label>Assign to *</Label>
            <Select value={form.ownerId} onValueChange={(v) => setForm((f) => ({ ...f, ownerId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select technician" /></SelectTrigger>
              <SelectContent>
                {technicians.map((t: any) => (
                  <SelectItem key={t.appUserId} value={String(t.appUserId)}>
                    {t.name} — {t.qualifications?.join(", ") || "no qualifications"}
                  </SelectItem>
                ))}
                {technicians.length === 0 && (
                  <SelectItem value="1">Admin (fallback)</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Due date *</Label>
            <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
          </div>
          <div className="space-y-1">
            <Label>Description *</Label>
            <Textarea rows={3} placeholder="Describe the corrective action required..." value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create CAPA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
