"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Plus } from "lucide-react";

const CATEGORIES = ["Corrosion", "Flood Exposure", "Pressure Anomaly", "Third-Party Interference", "Structural", "Other"];
const SITES = [
  { id: "site-001", name: "Nairobi Terminal" },
  { id: "site-002", name: "Mombasa Terminal" },
  { id: "site-003", name: "Makueni Pump Station" },
  { id: "site-004", name: "Nakuru Depot" },
  { id: "site-005", name: "Eldoret Depot" },
  { id: "site-006", name: "Sinendet Pump Station" },
  { id: "site-007", name: "Kisumu Terminal" },
];

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

export function HazardReportForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    siteId: "", category: "", description: "", severityEstimate: "Medium", photoUrl: "",
    reportType: "hazard" as "hazard" | "near_miss",
  });

  const handleSubmit = async () => {
    if (!form.siteId || !form.category || !form.description) {
      toast.error("Site, category, and description are required.");
      return;
    }
    setLoading(true);
    try {
      const token = document.cookie.match(/sentinel-token=([^;]+)/)?.[1];
      const res = await fetch(`${API_BASE}/api/hazard-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Hazard report submitted.");
      setOpen(false);
      router.refresh();
    } catch (e: any) {
      toast.error(`Failed to submit: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm"><Plus className="mr-1 size-4" /> Report Hazard</Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Report a Hazard / Near-Miss</SheetTitle>
          <SheetDescription>Submit a new hazard or near-miss report for HSE Officer review.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {/* Report type toggle */}
          <div className="space-y-1">
            <Label>Report Type *</Label>
            <div className="flex rounded-lg border overflow-hidden">
              {([
                { value: "hazard",   label: "⚠ Hazard" },
                { value: "near_miss", label: "🔶 Near-Miss" },
              ] as const).map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, reportType: value }))}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    form.reportType === value
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Site *</Label>
            <Select value={form.siteId} onValueChange={(v) => setForm((f) => ({ ...f, siteId: v }))}>
              <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
              <SelectContent>
                {SITES.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Description *</Label>
            <Textarea
              rows={3}
              placeholder="Describe the hazard or near-miss..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Severity Estimate *</Label>
            <Select value={form.severityEstimate} onValueChange={(v) => setForm((f) => ({ ...f, severityEstimate: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Photo URL (optional)</Label>
            <Input
              placeholder="https://..."
              value={form.photoUrl}
              onChange={(e) => setForm((f) => ({ ...f, photoUrl: e.target.value }))}
            />
          </div>
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Submitting…" : "Submit Report"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
