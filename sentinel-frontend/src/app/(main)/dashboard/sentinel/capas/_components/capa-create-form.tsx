"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Sparkles, Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? "";

interface AiDraft {
  description: string;
  rootCause: string;
  suggestedActions: string;
  aiGenerated: boolean;
}

interface Props {
  sourceAlertId?: string;
  sourceEventId?: string;
  sourceHazardId?: string;
  triggerLabel?: string;
}

export function CapaCreateForm({
  sourceAlertId,
  sourceEventId,
  sourceHazardId,
  triggerLabel = "Create CAPA",
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDraft, setAiDraft] = useState<AiDraft | null>(null);
  const [form, setForm] = useState({
    ownerId: "",
    dueDate: "",
    description: "",
    rootCause: "",
    suggestedActions: "",
    sourceAlertId: sourceAlertId ?? "",
    sourceHazardId: sourceHazardId ?? "",
  });

  // Load technicians when dialog opens
  useEffect(() => {
    if (!open) return;
    fetch("/api/proxy/capas/technicians", { cache: "no-store" })
      .catch(() => fetch(`${API_BASE}/api/technicians`))
      .then((r) => r.json())
      .then(setTechnicians)
      .catch(() => {});
  }, [open]);

  // Auto-fetch AI draft when dialog opens and we have a source alert/event
  useEffect(() => {
    if (!open) return;
    if (!sourceAlertId && !sourceEventId) return;
    fetchAiDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchAiDraft = async () => {
    setAiLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceAlertId) params.set("alertId", sourceAlertId);
      if (sourceEventId) params.set("eventId", sourceEventId);

      const res = await fetch(`/api/proxy/capas/ai-draft?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const draft: AiDraft = await res.json();

      setAiDraft(draft);
      // Pre-fill the form fields with the AI draft
      setForm((f) => ({
        ...f,
        description: draft.description || f.description,
        rootCause: draft.rootCause || f.rootCause,
        suggestedActions: draft.suggestedActions || f.suggestedActions,
      }));

      if (draft.aiGenerated) {
        toast.success("AI draft loaded — review and edit before submitting.");
      } else {
        toast.info("Template draft loaded — AI not available, review and edit.");
      }
    } catch (e) {
      // Silent — user can still fill manually
      toast.info("Could not load AI draft — fill in manually.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.ownerId || !form.dueDate || !form.description) {
      toast.error("Owner, due date, and description are required.");
      return;
    }
    setLoading(true);
    try {
      // Combine description + rootCause + suggestedActions into the description field
      // so the backend CAPA entity stores the full context
      const fullDescription = [
        form.description,
        form.rootCause ? `\nRoot Cause: ${form.rootCause}` : "",
        form.suggestedActions ? `\nSuggested Actions:\n${form.suggestedActions}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const res = await fetch("/api/proxy/capas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          description: fullDescription,
          ownerId: Number(form.ownerId),
        }),
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
        <Button size="sm" variant="outline">
          <Plus className="mr-1 size-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Create CAPA
            {aiDraft?.aiGenerated && (
              <Badge variant="secondary" className="text-xs font-normal gap-1">
                <Sparkles className="size-3" />
                AI Pre-filled
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Assign a corrective action to a qualified technician.
            {(sourceAlertId || sourceEventId) && (
              <span className="block mt-1 text-xs text-muted-foreground">
                {aiLoading
                  ? "Loading AI draft…"
                  : aiDraft?.aiGenerated
                    ? "Fields pre-filled by Sentinel AI — review before submitting."
                    : "Review and complete the fields below."}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Assign to */}
          <div className="space-y-1">
            <Label>Assign to *</Label>
            <Select
              value={form.ownerId}
              onValueChange={(v) => setForm((f) => ({ ...f, ownerId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select technician" />
              </SelectTrigger>
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

          {/* Due date */}
          <div className="space-y-1">
            <Label>Due date *</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>

          {/* Description — AI pre-filled */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              Description *
              {aiLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
              {aiDraft?.aiGenerated && !aiLoading && (
                <Sparkles className="size-3 text-violet-500" />
              )}
            </Label>
            <Textarea
              rows={3}
              placeholder="Describe the corrective action required…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* Root Cause — AI pre-filled */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              Root Cause Hypothesis
              {aiDraft?.aiGenerated && !aiLoading && (
                <Sparkles className="size-3 text-violet-500" />
              )}
            </Label>
            <Textarea
              rows={2}
              placeholder="What is the most likely root cause?"
              value={form.rootCause}
              onChange={(e) => setForm((f) => ({ ...f, rootCause: e.target.value }))}
            />
          </div>

          {/* Suggested Actions — AI pre-filled */}
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5">
              Suggested Corrective Actions
              {aiDraft?.aiGenerated && !aiLoading && (
                <Sparkles className="size-3 text-violet-500" />
              )}
            </Label>
            <Textarea
              rows={4}
              placeholder="List corrective actions (one per line)…"
              value={form.suggestedActions}
              onChange={(e) =>
                setForm((f) => ({ ...f, suggestedActions: e.target.value }))
              }
            />
          </div>

          {/* Manual AI regenerate button */}
          {(sourceAlertId || sourceEventId) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
              onClick={fetchAiDraft}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              {aiLoading ? "Generating AI draft…" : "Re-generate AI draft"}
            </Button>
          )}

          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create CAPA"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
