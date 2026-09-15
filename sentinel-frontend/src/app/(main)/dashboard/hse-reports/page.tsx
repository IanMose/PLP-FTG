"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Leaf,
  Users,
  ShieldCheck,
  Zap,
  TrendingUp,
  ClipboardList,
  Info,
  Download,
  RefreshCw,
  Bot,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// ── Types ──────────────────────────────────────────────────────────────────────

interface HseReport {
  reportId: string;
  sourceEventId: string;
  siteId: string;
  severity: string;
  status: "DRAFT" | "APPROVED" | "REJECTED";
  headline: string;
  reportJson: string;
  aiGenerated: boolean;
  generatedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  humanNotes?: string;
  esgPromoted: boolean;
}

interface ReportContent {
  executiveSummary?: {
    headline?: string;
    whatHappened?: string;
    severity?: string;
    immediateRisk?: string;
    environmentalImpactOccurred?: boolean;
    sentinelResponse?: string;
    responseTimeSeconds?: number;
    currentStatus?: string;
    keyActions?: string[];
  };
  narrative?: {
    whatSystemDetected?: string;
    whyConditionWasAbnormal?: string;
    whatRiskItCreated?: string;
    whatSentinelDid?: string;
    whatHappenedAfterIntervention?: string;
  };
  hseRiskAssessment?: {
    healthAndSafety?: string;
    environmental?: string;
    community?: string;
    operational?: string;
    legalAndCompliance?: string;
  };
  rootCauseAnalysis?: {
    disclaimer?: string;
    confirmedFacts?: string[];
    aiHypotheses?: string[];
    requiresInvestigation?: string[];
  };
  capaRecommendations?: Array<{
    action?: string;
    reason?: string;
    responsibleRole?: string;
    priority?: string;
    suggestedDeadlineDays?: number;
    verificationMethod?: string;
  }>;
  environmentalImpactAssessment?: string;
  communityAndSocialImpact?: string;
  managementInsights?: string[];
  earlyWarningSignals?: string[];
  esgConnection?: {
    environmental?: string[];
    social?: string[];
    governance?: string[];
  };
}

// ── API helpers ────────────────────────────────────────────────────────────────

async function fetchReports(status?: string): Promise<HseReport[]> {
  const url = status
    ? `/api/proxy/hse-reports?status=${status}`
    : `/api/proxy/hse-reports`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchReport(reportId: string): Promise<HseReport> {
  const res = await fetch(`/api/proxy/hse-reports/${reportId}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function approveReport(
  reportId: string,
  reviewedBy: string,
  notes: string
) {
  const res = await fetch(`/api/proxy/hse-reports/${reportId}/approve`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewedBy, notes }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function rejectReport(
  reportId: string,
  reviewedBy: string,
  notes: string
) {
  const res = await fetch(`/api/proxy/hse-reports/${reportId}/reject`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reviewedBy, notes }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity?: string }) {
  const s = severity?.toUpperCase();
  const cls =
    s === "CRITICAL"
      ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200"
      : s === "HIGH"
        ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200"
        : s === "MEDIUM"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200"
          : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200";
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-semibold ${cls}`}
    >
      {s ?? "UNKNOWN"}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200">
        <CheckCircle2 className="mr-1 size-3" /> Approved
      </Badge>
    );
  if (status === "REJECTED")
    return (
      <Badge className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200">
        <XCircle className="mr-1 size-3" /> Rejected
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-amber-600 border-amber-400">
      <Clock className="mr-1 size-3" /> Draft
    </Badge>
  );
}

function Section({
  title,
  icon,
  children,
  defaultOpen = false,
  accent = "border-l-border",
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`rounded-lg border bg-card border-l-4 ${accent} shadow-sm`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t px-4 pb-4 pt-3">{children}</div>}
    </div>
  );
}

function FactsList({
  label,
  items,
  variant = "default",
}: {
  label: string;
  items?: string[];
  variant?: "default" | "warning" | "hypothesis";
}) {
  if (!items || items.length === 0) return null;
  const dot =
    variant === "warning"
      ? "bg-amber-500"
      : variant === "hypothesis"
        ? "bg-blue-400"
        : "bg-emerald-500";
  return (
    <div className="mb-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <span
              className={`mt-1.5 size-1.5 flex-shrink-0 rounded-full ${dot}`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CapaTable({
  capas,
}: {
  capas?: ReportContent["capaRecommendations"];
}) {
  if (!capas || capas.length === 0)
    return (
      <p className="text-sm text-muted-foreground">
        No CAPA recommendations generated.
      </p>
    );
  const priorityColor = (p?: string) => {
    switch (p?.toUpperCase()) {
      case "CRITICAL":
        return "text-red-600 dark:text-red-400 font-bold";
      case "HIGH":
        return "text-orange-600 dark:text-orange-400 font-semibold";
      case "MEDIUM":
        return "text-amber-600 dark:text-amber-400";
      default:
        return "text-muted-foreground";
    }
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="pb-2 text-left font-medium pr-4">Action</th>
            <th className="pb-2 text-left font-medium pr-4">Priority</th>
            <th className="pb-2 text-left font-medium pr-4">Role</th>
            <th className="pb-2 text-left font-medium pr-4">Deadline</th>
            <th className="pb-2 text-left font-medium">Verification</th>
          </tr>
        </thead>
        <tbody>
          {capas.map((c, i) => (
            <tr key={i} className="border-b last:border-0">
              <td className="py-2 pr-4 max-w-[220px]">
                <p className="font-medium text-foreground">{c.action}</p>
                {c.reason && (
                  <p className="text-muted-foreground mt-0.5">{c.reason}</p>
                )}
              </td>
              <td className={`py-2 pr-4 ${priorityColor(c.priority)}`}>
                {c.priority}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {c.responsibleRole}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {c.suggestedDeadlineDays
                  ? `${c.suggestedDeadlineDays}d`
                  : "—"}
              </td>
              <td className="py-2 text-muted-foreground">
                {c.verificationMethod}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EsgPillar({
  icon,
  label,
  items,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  items?: string[];
  color: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs flex items-start gap-1.5">
            <span className="mt-1 size-1 rounded-full bg-current flex-shrink-0 opacity-60" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Approve / Reject Dialog ────────────────────────────────────────────────────

function ApprovalPanel({
  report,
  onDone,
}: {
  report: HseReport;
  onDone: () => void;
}) {
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [reviewedBy, setReviewedBy] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => approveReport(report.reportId, reviewedBy, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hse-reports"] });
      queryClient.invalidateQueries({ queryKey: ["hse-report", report.reportId] });
      onDone();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectReport(report.reportId, reviewedBy, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hse-reports"] });
      queryClient.invalidateQueries({ queryKey: ["hse-report", report.reportId] });
      onDone();
    },
  });

  if (report.status !== "DRAFT") return null;

  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
      <div className="flex items-start gap-3">
        <UserCheck className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
            HSE Professional Review Required
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
            This report was generated by Sentinel AI. Review all sections, then
            approve or reject below. Only approved reports feed into ESG
            reporting.
          </p>

          {!action && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-emerald-400 text-emerald-700 hover:bg-emerald-50"
                onClick={() => setAction("approve")}
              >
                <CheckCircle2 className="size-3" />
                Approve Report
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs border-red-400 text-red-700 hover:bg-red-50"
                onClick={() => setAction("reject")}
              >
                <XCircle className="size-3" />
                Reject Report
              </Button>
            </div>
          )}

          {action && (
            <div className="space-y-2 mt-1">
              <input
                type="text"
                placeholder="Your name (required)"
                value={reviewedBy}
                onChange={(e) => setReviewedBy(e.target.value)}
                className="w-full rounded border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <textarea
                placeholder={
                  action === "reject"
                    ? "Rejection notes (required) — state why the report needs revision"
                    : "Approval notes (optional) — any amendments or observations"
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className={`text-xs gap-1.5 ${action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
                  disabled={
                    !reviewedBy.trim() ||
                    (action === "reject" && !notes.trim()) ||
                    approveMutation.isPending ||
                    rejectMutation.isPending
                  }
                  onClick={() =>
                    action === "approve"
                      ? approveMutation.mutate()
                      : rejectMutation.mutate()
                  }
                >
                  {action === "approve" ? (
                    <CheckCircle2 className="size-3" />
                  ) : (
                    <XCircle className="size-3" />
                  )}
                  {approveMutation.isPending || rejectMutation.isPending
                    ? "Submitting..."
                    : action === "approve"
                      ? "Confirm Approval"
                      : "Confirm Rejection"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => {
                    setAction(null);
                    setNotes("");
                    setReviewedBy("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Report Detail View ─────────────────────────────────────────────────────────

function ReportDetail({
  report,
  onBack,
}: {
  report: HseReport;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: fresh } = useQuery({
    queryKey: ["hse-report", report.reportId],
    queryFn: () => fetchReport(report.reportId),
    initialData: report,
    staleTime: 5000,
  });

  const r = fresh ?? report;
  let content: ReportContent = {};
  try {
    content = JSON.parse(r.reportJson);
  } catch {}

  const exec = content.executiveSummary;
  const narrative = content.narrative;
  const risk = content.hseRiskAssessment;
  const rca = content.rootCauseAnalysis;
  const env = content.environmentalImpactAssessment;
  const community = content.communityAndSocialImpact;
  const esg = content.esgConnection;

  return (
    <div className="flex flex-col gap-4 pb-10">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          ← All Reports
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-lg font-semibold tracking-tight">
              {r.reportId}
            </h2>
            <StatusBadge status={r.status} />
            <SeverityBadge severity={r.severity} />
            {r.aiGenerated && (
              <Badge variant="outline" className="text-xs gap-1">
                <Bot className="size-3" /> AI Generated
              </Badge>
            )}
            {r.esgPromoted && (
              <Badge
                variant="outline"
                className="text-xs gap-1 border-emerald-400 text-emerald-700"
              >
                <Leaf className="size-3" /> ESG Promoted
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{r.headline}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Generated {new Date(r.generatedAt).toLocaleString()}
            {r.reviewedBy && (
              <>
                {" "}
                · {r.status === "APPROVED" ? "Approved" : "Reviewed"} by{" "}
                {r.reviewedBy}
              </>
            )}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5 flex-shrink-0"
          onClick={() => window.print()}
        >
          <Download className="size-3" />
          Export
        </Button>
      </div>

      {/* Human-in-the-loop disclaimer */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-3 flex gap-2">
        <Info className="size-4 text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700 dark:text-blue-400">
          <span className="font-semibold">AI-generated report — </span>
          This report supports HSE decision-making and does not replace
          professional HSE judgment. Root cause analysis, environmental damage,
          legal liability, and community impact determinations require human
          verification before external use.
        </p>
      </div>

      {/* Approval panel — only shows for DRAFT */}
      <ApprovalPanel
        report={r}
        onDone={() =>
          queryClient.invalidateQueries({
            queryKey: ["hse-report", r.reportId],
          })
        }
      />

      {/* Human notes (if approved/rejected) */}
      {r.humanNotes && (
        <div className="rounded-lg border bg-muted/40 p-3 flex gap-2">
          <UserCheck className="size-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-0.5">
              HSE Reviewer Notes — {r.reviewedBy}
            </p>
            <p className="text-sm">{r.humanNotes}</p>
          </div>
        </div>
      )}

      {/* 1. Executive Summary — always open */}
      <Section
        title="1. Executive Summary"
        icon={<ShieldAlert className="size-4" />}
        defaultOpen
        accent="border-l-red-500"
      >
        {exec ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{exec.whatHappened}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  Immediate Risk
                </p>
                <p className="text-sm">{exec.immediateRisk}</p>
              </div>
              <div className="rounded bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  Sentinel Response
                </p>
                <p className="text-sm">
                  {exec.sentinelResponse}
                  {exec.responseTimeSeconds
                    ? ` (${exec.responseTimeSeconds}s)`
                    : ""}
                </p>
              </div>
              <div className="rounded bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  Environmental Impact
                </p>
                <p className="text-sm">
                  {exec.environmentalImpactOccurred
                    ? "⚠ Confirmed — requires field verification"
                    : "No confirmed release"}
                </p>
              </div>
              <div className="rounded bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-1">
                  Current Status
                </p>
                <p className="text-sm">{exec.currentStatus}</p>
              </div>
            </div>
            {exec.keyActions && exec.keyActions.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Key Recommended Actions
                </p>
                <ul className="space-y-1">
                  {exec.keyActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 size-1.5 rounded-full bg-foreground flex-shrink-0" />
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Executive summary not available.
          </p>
        )}
      </Section>

      {/* 2. Narrative */}
      <Section
        title="2. What Happened — Incident Narrative"
        icon={<FileText className="size-4" />}
        defaultOpen
        accent="border-l-orange-400"
      >
        {narrative ? (
          <div className="space-y-3">
            {[
              { label: "What the system detected", value: narrative.whatSystemDetected },
              { label: "Why the condition was abnormal", value: narrative.whyConditionWasAbnormal },
              { label: "What risk it created", value: narrative.whatRiskItCreated },
              { label: "What Sentinel did", value: narrative.whatSentinelDid },
              { label: "What happened after intervention", value: narrative.whatHappenedAfterIntervention },
            ].map(
              ({ label, value }) =>
                value && (
                  <div key={label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                      {label}
                    </p>
                    <p className="text-sm leading-relaxed">{value}</p>
                  </div>
                )
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Narrative not available.
          </p>
        )}
      </Section>

      {/* 3. HSE Risk Assessment — inspired by Sasini's ESG Risk Table (p.27) */}
      <Section
        title="3. HSE Risk Assessment"
        icon={<ShieldAlert className="size-4" />}
        accent="border-l-amber-500"
      >
        {risk ? (
          <div className="space-y-3">
            {[
              { label: "Health & Safety", value: risk.healthAndSafety, icon: "🦺" },
              { label: "Environmental", value: risk.environmental, icon: "🌿" },
              { label: "Community", value: risk.community, icon: "👥" },
              { label: "Operational", value: risk.operational, icon: "⚙️" },
              { label: "Legal & Compliance", value: risk.legalAndCompliance, icon: "⚖️" },
            ].map(
              ({ label, value, icon }) =>
                value && (
                  <div
                    key={label}
                    className="border-l-2 border-muted pl-3"
                  >
                    <p className="text-xs font-semibold mb-1">
                      {icon} {label}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {value}
                    </p>
                  </div>
                )
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not available.</p>
        )}
      </Section>

      {/* 4. Root Cause Analysis */}
      <Section
        title="4. Root Cause Analysis"
        icon={<TrendingUp className="size-4" />}
        accent="border-l-blue-500"
      >
        {rca ? (
          <div className="space-y-3">
            {rca.disclaimer && (
              <div className="rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3">
                <p className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-2">
                  <Bot className="size-3 mt-0.5 flex-shrink-0" />
                  {rca.disclaimer}
                </p>
              </div>
            )}
            <FactsList
              label="Confirmed facts"
              items={rca.confirmedFacts}
              variant="default"
            />
            <FactsList
              label="AI hypotheses (requires investigation)"
              items={rca.aiHypotheses}
              variant="hypothesis"
            />
            <FactsList
              label="Items requiring investigation"
              items={rca.requiresInvestigation}
              variant="warning"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Not available.</p>
        )}
      </Section>

      {/* 5. CAPA Recommendations — inspired by Sasini's SDG/pillar commitment table (p.47-48) */}
      <Section
        title="5. Corrective & Preventive Actions (CAPA)"
        icon={<ClipboardList className="size-4" />}
        accent="border-l-violet-500"
      >
        <CapaTable capas={content.capaRecommendations} />
      </Section>

      {/* 6. Environmental Impact */}
      <Section
        title="6. Environmental Impact Assessment"
        icon={<Leaf className="size-4" />}
        accent="border-l-emerald-500"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {typeof env === "string"
            ? env
            : "Environmental impact assessment requires HSE/environmental verification."}
        </p>
      </Section>

      {/* 7. Community & Social Impact */}
      <Section
        title="7. Community & Social Impact"
        icon={<Users className="size-4" />}
        accent="border-l-cyan-500"
      >
        <p className="text-sm leading-relaxed text-muted-foreground">
          {typeof community === "string"
            ? community
            : "Community impact assessment requires HSE verification."}
        </p>
      </Section>

      {/* 8. ESG Connection — inspired by Sasini's 5-pillar ESG framework (p.46-48) */}
      <Section
        title="8. ESG Connection"
        icon={<ShieldCheck className="size-4" />}
        accent="border-l-teal-500"
      >
        {esg ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <EsgPillar
              icon={<Leaf className="size-3.5 text-emerald-600" />}
              label="E — Environmental"
              items={esg.environmental}
              color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
            />
            <EsgPillar
              icon={<Users className="size-3.5 text-blue-600" />}
              label="S — Social"
              items={esg.social}
              color="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300"
            />
            <EsgPillar
              icon={<ShieldCheck className="size-3.5 text-violet-600" />}
              label="G — Governance"
              items={esg.governance}
              color="bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300"
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            ESG connection data not available.
          </p>
        )}
        {r.status === "APPROVED" && r.esgPromoted && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-3">
            <CheckCircle2 className="size-3" />
            ESG metrics from this report have been promoted to the ESG
            dashboard.
          </p>
        )}
        {r.status === "APPROVED" && !r.esgPromoted && (
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-3">
            <Clock className="size-3" />
            ESG promotion pending.
          </p>
        )}
      </Section>

      {/* 9. Management Insights — inspired by Sasini's trend analysis sections */}
      <Section
        title="9. Management Insights"
        icon={<TrendingUp className="size-4" />}
        accent="border-l-rose-500"
      >
        {content.managementInsights && content.managementInsights.length > 0 ? (
          <ul className="space-y-2">
            {content.managementInsights.map((insight, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 size-1.5 rounded-full bg-rose-400 flex-shrink-0" />
                {insight}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Insufficient data for management insights.
          </p>
        )}
      </Section>

      {/* 10. Early Warning Signals */}
      <Section
        title="10. Early Warning Signals"
        icon={<Zap className="size-4" />}
        accent="border-l-yellow-500"
      >
        {content.earlyWarningSignals &&
        content.earlyWarningSignals.length > 0 ? (
          <ul className="space-y-2">
            {content.earlyWarningSignals.map((signal, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-amber-800 dark:text-amber-300"
              >
                <AlertTriangle className="size-3.5 mt-0.5 flex-shrink-0 text-amber-500" />
                {signal}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Insufficient historical data for reliable predictive analysis.
          </p>
        )}
      </Section>

      {/* Reporting Confidence — inspired by Sasini's data methodology transparency */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
          Reporting Confidence
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <p className="font-medium text-emerald-600 dark:text-emerald-400 mb-1">
              High Confidence
            </p>
            <p className="text-muted-foreground">
              Telemetry readings, detection timestamps, response times, valve
              actuation status — directly from Sentinel system records.
            </p>
          </div>
          <div>
            <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">
              Medium Confidence
            </p>
            <p className="text-muted-foreground">
              KPI calculations based on available period data. ESG metric
              estimates derived from operational data.
            </p>
          </div>
          <div>
            <p className="font-medium text-red-500 dark:text-red-400 mb-1">
              Requires Verification
            </p>
            <p className="text-muted-foreground">
              Root cause determination, environmental impact, community impact,
              legal/regulatory exposure, injury or fatality confirmation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Report List ────────────────────────────────────────────────────────────────

function ReportList({
  reports,
  onSelect,
  isLoading,
}: {
  reports?: HseReport[];
  onSelect: (r: HseReport) => void;
  isLoading: boolean;
}) {
  if (isLoading)
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  if (!reports || reports.length === 0)
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <ShieldAlert className="size-8 mx-auto mb-2 text-muted-foreground opacity-40" />
        <p className="text-sm text-muted-foreground">
          No HSE reports yet. Generate a report from an incident event.
        </p>
      </div>
    );

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <button
          key={r.reportId}
          type="button"
          onClick={() => onSelect(r)}
          className="w-full rounded-lg border bg-card p-4 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-sm font-semibold">{r.reportId}</span>
                <StatusBadge status={r.status} />
                <SeverityBadge severity={r.severity} />
                {r.aiGenerated && (
                  <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                    <Bot className="size-3" /> AI
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {r.headline}
              </p>
            </div>
            <span className="text-xs text-muted-foreground flex-shrink-0 mt-0.5">
              {new Date(r.generatedAt).toLocaleDateString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type FilterStatus = "ALL" | "DRAFT" | "APPROVED" | "REJECTED";

export default function HseReportsPage() {
  const [selected, setSelected] = useState<HseReport | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hse-reports", filter],
    queryFn: () =>
      fetchReports(filter === "ALL" ? undefined : filter),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  if (selected) {
    return (
      <ReportDetail report={selected} onBack={() => setSelected(null)} />
    );
  }

  const filters: { label: string; value: FilterStatus }[] = [
    { label: "All", value: "ALL" },
    { label: "Draft", value: "DRAFT" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              HSE Reports
            </h1>
            <Badge variant="secondary" className="text-xs">
              AI Agent
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-xl">
            AI-generated HSE Incident & Sustainability Impact Reports. Each
            report covers executive summary, risk assessment, root cause
            analysis, CAPA recommendations, and ESG connection. Approved
            reports feed the ESG reporting layer automatically.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="text-xs gap-1.5 flex-shrink-0"
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["hse-reports"] })
          }
        >
          <RefreshCw className="size-3" />
          Refresh
        </Button>
      </div>

      {/* Sasini-style context callout */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 mb-1">
              Sinai 2011 · Thange 2015 — The incidents Sentinel is built to
              prevent
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed">
              Both incidents share the same root pattern: a physical failure
              went undetected because no system was continuously monitoring tank
              level, flow rate, and valve status. These HSE reports document
              Sentinel{"'"}s detection, response, and corrective action — the
              organisational learning loop that was absent in both incidents.
            </p>
          </div>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load reports. Check that the backend is running on port
          8080.
        </div>
      )}

      {/* Filter bar */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-md border overflow-hidden text-xs">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`px-3 py-1.5 transition-colors ${
                filter === f.value
                  ? "bg-foreground text-background font-medium"
                  : "hover:bg-muted text-muted-foreground"
              }`}
            >
              {f.label}
              {f.value !== "ALL" && data && (
                <span className="ml-1 opacity-60">
                  (
                  {
                    data.filter(
                      (r) =>
                        f.value === "ALL" || r.status === f.value
                    ).length
                  }
                  )
                </span>
              )}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {data ? `${data.length} report${data.length !== 1 ? "s" : ""}` : ""}
        </span>
      </div>

      <ReportList
        reports={data}
        onSelect={setSelected}
        isLoading={isLoading}
      />
    </div>
  );
}
