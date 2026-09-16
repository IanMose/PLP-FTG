"use client";

import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Bell,
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Leaf,
  Loader2,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Users,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Alert, SeverityBand } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

// ─── Severity configuration ────────────────────────────────────────────────
// Design principle: clean white/dark card with a single strong left border
// accent. No tinted backgrounds — professional operations console aesthetic
// for enterprise use (KPC HSE leadership audience).

const SEVERITY_CONFIG: Record<
  SeverityBand,
  {
    border: string;          // left accent bar colour
    headerBorder: string;    // top border of the card
    iconBg: string;
    iconColor: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dot: string;             // pulse dot colour
    label: string;
    labelColor: string;      // severity label text colour
    Icon: typeof Shield;
  }
> = {
  Critical: {
    border:       "border-l-red-600",
    headerBorder: "border-red-200 dark:border-red-900/60",
    iconBg:       "bg-red-100 dark:bg-red-900/30",
    iconColor:    "text-red-600 dark:text-red-400",
    badgeBg:      "bg-red-600",
    badgeText:    "text-white",
    badgeBorder:  "border-transparent",
    dot:          "bg-red-600",
    label:        "CRITICAL",
    labelColor:   "text-red-600 dark:text-red-400",
    Icon: ShieldAlert,
  },
  High: {
    border:       "border-l-orange-500",
    headerBorder: "border-orange-200 dark:border-orange-900/60",
    iconBg:       "bg-orange-100 dark:bg-orange-900/30",
    iconColor:    "text-orange-600 dark:text-orange-400",
    badgeBg:      "bg-orange-500",
    badgeText:    "text-white",
    badgeBorder:  "border-transparent",
    dot:          "bg-orange-500",
    label:        "HIGH",
    labelColor:   "text-orange-600 dark:text-orange-400",
    Icon: AlertTriangle,
  },
  Medium: {
    border:       "border-l-amber-400",
    headerBorder: "border-amber-200 dark:border-amber-900/60",
    iconBg:       "bg-amber-100 dark:bg-amber-900/30",
    iconColor:    "text-amber-600 dark:text-amber-400",
    badgeBg:      "bg-amber-500",
    badgeText:    "text-white",
    badgeBorder:  "border-transparent",
    dot:          "bg-amber-400",
    label:        "MEDIUM",
    labelColor:   "text-amber-600 dark:text-amber-400",
    Icon: Bell,
  },
  Low: {
    border:       "border-l-emerald-500",
    headerBorder: "border-emerald-200 dark:border-emerald-900/60",
    iconBg:       "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor:    "text-emerald-600 dark:text-emerald-400",
    badgeBg:      "bg-emerald-600",
    badgeText:    "text-white",
    badgeBorder:  "border-transparent",
    dot:          "bg-emerald-500",
    label:        "LOW",
    labelColor:   "text-emerald-600 dark:text-emerald-400",
    Icon: Shield,
  },
};

// ─── Status configuration ─────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string }> = {
  active: {
    label: "ACTIVE",
    dot:   "bg-red-500",
    text:  "text-red-600 dark:text-red-400",
  },
  acknowledged: {
    label: "ACKNOWLEDGED",
    dot:   "bg-amber-400",
    text:  "text-amber-600 dark:text-amber-400",
  },
  resolved: {
    label: "RESOLVED",
    dot:   "bg-emerald-500",
    text:  "text-emerald-600 dark:text-emerald-400",
  },
};

// ─── Segment type labels ──────────────────────────────────────────────────
// Maps each emoji anchor to a short section label so safety officers can
// scan to the section they need without reading the full narrative.

const SEGMENT_LABELS: Record<string, string> = {
  "⚠":  "Risk Signal",
  "🚨": "Incident Alert",
  "🔴": "Critical Incident",
  "📋": "Compliance Status",
  "⚑":  "Legal / Watch List",
  "⚡": "Telemetry Corroboration",
  "•":  "Context",
};

// ─── Segment accent styles ────────────────────────────────────────────────

const SEGMENT_STYLES: Record<string, { bar: string; labelColor: string; bg: string }> = {
  "⚠":  { bar: "bg-orange-500", labelColor: "text-orange-600 dark:text-orange-400", bg: "" },
  "🚨": { bar: "bg-red-600",    labelColor: "text-red-600 dark:text-red-400",       bg: "" },
  "🔴": { bar: "bg-red-600",    labelColor: "text-red-600 dark:text-red-400",       bg: "" },
  "📋": { bar: "bg-amber-400",  labelColor: "text-amber-600 dark:text-amber-400",   bg: "" },
  "⚑":  { bar: "bg-violet-500", labelColor: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-950/20 border border-violet-200/60 dark:border-violet-800/40" },
  "⚡": { bar: "bg-sky-500",    labelColor: "text-sky-600 dark:text-sky-400",       bg: "bg-sky-50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-800/40" },
  "•":  { bar: "bg-slate-300 dark:bg-slate-600", labelColor: "text-muted-foreground", bg: "" },
};

// ─── Segment icons ────────────────────────────────────────────────────────

const SEGMENT_ICONS: Record<string, React.ReactNode> = {
  "⚠":  <AlertTriangle className="size-3.5 shrink-0" />,
  "🚨": <Siren         className="size-3.5 shrink-0" />,
  "🔴": <ShieldAlert   className="size-3.5 shrink-0" />,
  "📋": <FileText      className="size-3.5 shrink-0" />,
  "⚑":  <BookOpen      className="size-3.5 shrink-0" />,
  "⚡": <Zap           className="size-3.5 shrink-0" />,
  "•":  <Activity      className="size-3.5 shrink-0" />,
};

// ─── Narrative parser ─────────────────────────────────────────────────────

function parseNarrativeSegments(
  narrative: string,
): Array<{ icon: string; text: string }> {
  if (!narrative) return [];
  const raw = narrative
    .replace(/(⚠|🚨|🔴|📋|⚑|⚡)/g, "\n$1")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return raw.map((segment) => {
    const firstChar = segment.charAt(0);
    const isAnchor = ["⚠", "🚨", "🔴", "📋", "⚑", "⚡"].includes(firstChar);
    return {
      icon: isAnchor ? firstChar : "•",
      text: isAnchor ? segment.slice(1).trim() : segment,
    };
  });
}

// ─── AI HSE Analysis Panel ────────────────────────────────────────────────
// Embedded directly in the alert — no separate page needed.
// One button generates the full AI analysis and shows it inline.

interface ReportContent {
  executiveSummary?: {
    whatHappened?: string;
    severity?: string;
    immediateRisk?: string;
    sentinelResponse?: string;
    responseTimeSeconds?: number;
    currentStatus?: string;
    keyActions?: string[];
  };
  hseRiskAssessment?: {
    healthAndSafety?: string;
    environmental?: string;
    community?: string;
    legalAndCompliance?: string;
  };
  rootCauseAnalysis?: {
    disclaimer?: string;
    confirmedFacts?: string[];
    aiHypotheses?: string[];
  };
  capaRecommendations?: Array<{
    action?: string;
    priority?: string;
    responsibleRole?: string;
    suggestedDeadlineDays?: number;
    verificationMethod?: string;
  }>;
  esgConnection?: {
    environmental?: string[];
    social?: string[];
    governance?: string[];
  };
  managementInsights?: string[];
}

function AiAnalysisPanel({ alertId }: { alertId: string }) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [report, setReport] = useState<ReportContent | null>(null);
  const [section, setSection] = useState<"summary" | "risk" | "rca" | "capa" | "esg">("summary");

  async function generate() {
    setState("loading");
    try {
      const res = await fetch(`/api/proxy/hse-reports/generate-from-alert/${alertId}`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const content: ReportContent = JSON.parse(data.reportJson ?? "{}");
      setReport(content);
      setState("done");
    } catch {
      setState("error");
    }
  }

  // ── Idle state — just the button ─────────────────────────────────────────
  if (state === "idle") {
    return (
      <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        <button
          type="button"
          onClick={generate}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 dark:border-slate-700 py-2.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:border-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
        >
          <Bot className="size-3.5" />
          Ask AI — What happened and what do I do?
        </button>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (state === "loading") {
    return (
      <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex items-center justify-center gap-2 py-4 text-xs text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Sentinel AI is analysing the incident...
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (state === "error") {
    return (
      <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
        <p className="text-xs text-red-500 text-center py-2">
          Could not generate analysis. Make sure the backend is running.{" "}
          <button type="button" onClick={generate} className="underline">Retry</button>
        </p>
      </div>
    );
  }

  if (!report) return null;

  const exec = report.executiveSummary;
  const risk = report.hseRiskAssessment;
  const rca  = report.rootCauseAnalysis;
  const capas = report.capaRecommendations ?? [];
  const esg  = report.esgConnection;

  const tabs = [
    { key: "summary", label: "Summary",   icon: <FileText className="size-3" /> },
    { key: "risk",    label: "Risk",      icon: <ShieldAlert className="size-3" /> },
    { key: "rca",     label: "Root Cause",icon: <AlertTriangle className="size-3" /> },
    { key: "capa",    label: "Actions",   icon: <CheckCircle2 className="size-3" /> },
    { key: "esg",     label: "ESG",       icon: <Leaf className="size-3" /> },
  ] as const;

  return (
    <div className="mt-3 border-t border-slate-100 dark:border-slate-800 pt-3">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase text-violet-600 dark:text-violet-400">
          <Bot className="size-3.5" />
          Sentinel AI Analysis
        </div>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-[9px] text-slate-400 uppercase tracking-wider">AI draft · requires HSE review</span>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSection(t.key)}
            className={cn(
              "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
              section === t.key
                ? "bg-violet-600 text-white"
                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Summary tab ── */}
      {section === "summary" && exec && (
        <div className="space-y-2">
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
            {exec.whatHappened}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded bg-slate-50 dark:bg-slate-800 p-2">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Immediate Risk</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">{exec.immediateRisk}</p>
            </div>
            <div className="rounded bg-slate-50 dark:bg-slate-800 p-2">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Sentinel Did</p>
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {exec.sentinelResponse}
                {exec.responseTimeSeconds ? ` (${exec.responseTimeSeconds}s)` : ""}
              </p>
            </div>
          </div>
          {exec.keyActions && exec.keyActions.length > 0 && (
            <div className="rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-2">
              <p className="text-[9px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-semibold mb-1.5">
                Do This Now
              </p>
              <ul className="space-y-1">
                {exec.keyActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-amber-800 dark:text-amber-300">
                    <span className="mt-1 size-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Risk tab ── */}
      {section === "risk" && risk && (
        <div className="space-y-2">
          {[
            { label: "🦺 Health & Safety", value: risk.healthAndSafety },
            { label: "🌿 Environmental",   value: risk.environmental },
            { label: "👥 Community",       value: risk.community },
            { label: "⚖️ Legal",           value: risk.legalAndCompliance },
          ].map(({ label, value }) => value && (
            <div key={label} className="border-l-2 border-slate-200 dark:border-slate-700 pl-2">
              <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 mb-0.5">{label}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Root cause tab ── */}
      {section === "rca" && rca && (
        <div className="space-y-2">
          {rca.disclaimer && (
            <div className="rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-2">
              <p className="text-[10px] text-blue-700 dark:text-blue-400 flex gap-1.5">
                <Bot className="size-3 flex-shrink-0 mt-0.5" />
                {rca.disclaimer}
              </p>
            </div>
          )}
          {rca.confirmedFacts && rca.confirmedFacts.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider font-semibold text-emerald-600 mb-1">Confirmed Facts</p>
              {rca.confirmedFacts.map((f, i) => (
                <p key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-1.5 mb-0.5">
                  <span className="mt-1 size-1.5 rounded-full bg-emerald-500 flex-shrink-0" />{f}
                </p>
              ))}
            </div>
          )}
          {rca.aiHypotheses && rca.aiHypotheses.length > 0 && (
            <div>
              <p className="text-[9px] uppercase tracking-wider font-semibold text-blue-500 mb-1">AI Hypotheses</p>
              {rca.aiHypotheses.map((h, i) => (
                <p key={i} className="text-xs text-slate-600 dark:text-slate-400 flex gap-1.5 mb-0.5">
                  <span className="mt-1 size-1.5 rounded-full bg-blue-400 flex-shrink-0" />{h}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CAPA tab ── */}
      {section === "capa" && (
        <div className="space-y-2">
          {capas.length === 0 ? (
            <p className="text-xs text-muted-foreground">No CAPA recommendations generated.</p>
          ) : capas.map((c, i) => {
            const priorityColor = c.priority === "CRITICAL"
              ? "text-red-600 dark:text-red-400"
              : c.priority === "HIGH"
                ? "text-orange-600 dark:text-orange-400"
                : "text-amber-600 dark:text-amber-400";
            return (
              <div key={i} className="rounded bg-slate-50 dark:bg-slate-800 p-2 border-l-2 border-slate-300 dark:border-slate-600">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{c.action}</p>
                  <span className={`text-[10px] font-bold flex-shrink-0 ${priorityColor}`}>{c.priority}</span>
                </div>
                <div className="flex gap-3 mt-1 text-[10px] text-muted-foreground">
                  {c.responsibleRole && <span>👤 {c.responsibleRole}</span>}
                  {c.suggestedDeadlineDays && <span>⏱ {c.suggestedDeadlineDays}d</span>}
                  {c.verificationMethod && <span>✓ {c.verificationMethod}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ESG tab ── */}
      {section === "esg" && esg && (
        <div className="grid grid-cols-1 gap-2">
          {esg.environmental && esg.environmental.length > 0 && (
            <div className="rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-2">
              <p className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Leaf className="size-3" /> E — Environmental
              </p>
              {esg.environmental.map((e, i) => (
                <p key={i} className="text-xs text-emerald-800 dark:text-emerald-300 flex gap-1.5 mb-0.5">
                  <span className="mt-1 size-1 rounded-full bg-emerald-500 flex-shrink-0" />{e}
                </p>
              ))}
            </div>
          )}
          {esg.social && esg.social.length > 0 && (
            <div className="rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-2">
              <p className="text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Users className="size-3" /> S — Social
              </p>
              {esg.social.map((s, i) => (
                <p key={i} className="text-xs text-blue-800 dark:text-blue-300 flex gap-1.5 mb-0.5">
                  <span className="mt-1 size-1 rounded-full bg-blue-400 flex-shrink-0" />{s}
                </p>
              ))}
            </div>
          )}
          {esg.governance && esg.governance.length > 0 && (
            <div className="rounded bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 p-2">
              <p className="text-[9px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ShieldCheck className="size-3" /> G — Governance
              </p>
              {esg.governance.map((g, i) => (
                <p key={i} className="text-xs text-violet-800 dark:text-violet-300 flex gap-1.5 mb-0.5">
                  <span className="mt-1 size-1 rounded-full bg-violet-400 flex-shrink-0" />{g}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────

interface NarrativeAlertCardProps {
  alert: Alert;
  compact?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export function NarrativeAlertCard({
  alert,
  compact = false,
}: NarrativeAlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = SEVERITY_CONFIG[alert.severity];
  const statusConfig = STATUS_CONFIG[alert.status] ?? STATUS_CONFIG.active;
  const SeverityIcon = config.Icon;
  const segments = parseNarrativeSegments(alert.narrative ?? "");
  const hasNarrative = segments.length > 0;
  const visibleSegments = compact && !expanded ? segments.slice(0, 2) : segments;
  const hasMore = compact && segments.length > 2;

  return (
    <div
      className={cn(
        // Clean card — white in light mode, dark surface in dark mode
        "relative overflow-hidden rounded-lg border border-l-4 bg-white dark:bg-slate-900",
        "border-slate-200 dark:border-slate-700/60",
        config.border,
        "transition-shadow duration-200 hover:shadow-sm",
      )}
    >
      {/* Active pulse dot — top-right corner */}
      {alert.status === "active" && (
        <span className="absolute right-3 top-3 flex size-2">
          <span className={cn("absolute inline-flex h-full w-full animate-ping rounded-full opacity-60", config.dot)} />
          <span className={cn("relative inline-flex size-2 rounded-full", config.dot)} />
        </span>
      )}

      <div className="px-4 py-3.5">

        {/* ── Header ── */}
        <div className="flex items-start gap-3">

          {/* Severity icon box */}
          <div className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md mt-0.5",
            config.iconBg,
          )}>
            <SeverityIcon className={cn("size-4", config.iconColor)} />
          </div>

          {/* Title block */}
          <div className="min-w-0 flex-1 pr-6">
            {/* Severity + status inline */}
            <div className="flex flex-wrap items-center gap-1.5 mb-1">
              <span className={cn("text-[10px] font-bold tracking-widest uppercase", config.labelColor)}>
                {config.label}
              </span>
              <span className="text-slate-300 dark:text-slate-600 text-xs">|</span>
              <span className={cn("flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase", statusConfig.text)}>
                <span className={cn("inline-flex size-1.5 rounded-full", statusConfig.dot,
                  alert.status === "active" && "animate-pulse"
                )} />
                {statusConfig.label}
              </span>
            </div>

            {/* Title */}
            <p className="font-semibold text-sm leading-snug text-slate-900 dark:text-slate-100">
              {alert.title}
            </p>

            {/* Site + rule + time */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <MapPin className="size-3 shrink-0" />
                {alert.siteName}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span className="flex items-center gap-1">
                <Shield className="size-3 shrink-0" />
                {alert.rule}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <span
                className="flex items-center gap-1"
                title={format(new Date(alert.createdAt), "PPpp")}
              >
                <Clock className="size-3 shrink-0" />
                {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </span>
              {alert.recordIds.length > 0 && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>
                    {alert.recordIds.length} linked record{alert.recordIds.length !== 1 ? "s" : ""}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Narrative body ── */}
        {hasNarrative && (
          <div className="mt-3.5 min-w-0 overflow-hidden">

            {/* Section header */}
            <div className="flex items-center gap-2 mb-2.5">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-bold tracking-[0.15em] text-slate-400 dark:text-slate-500 uppercase">
                  Sentinel Intelligence Report
                </span>
                {alert.narrativeUpdatedAt && (
                  <span
                    className="text-[9px] text-slate-400 dark:text-slate-500"
                    title={format(new Date(alert.narrativeUpdatedAt), "PPpp")}
                  >
                    · updated {formatDistanceToNow(new Date(alert.narrativeUpdatedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* Segments */}
            <div className="space-y-1.5">
              {visibleSegments.map((segment, idx) => {
                const style = SEGMENT_STYLES[segment.icon] ?? SEGMENT_STYLES["•"];
                const icon  = SEGMENT_ICONS[segment.icon] ?? SEGMENT_ICONS["•"];
                const label = SEGMENT_LABELS[segment.icon] ?? "Context";

                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex gap-3 rounded-md px-3 py-2.5 min-w-0",
                      style.bg || "bg-slate-50 dark:bg-slate-800/50",
                    )}
                  >
                    {/* Left accent bar */}
                    <div className={cn("w-0.5 rounded-full shrink-0 self-stretch", style.bar)} />

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {/* Section label */}
                      <div className={cn(
                        "flex items-center gap-1.5 mb-1",
                        style.labelColor,
                      )}>
                        {icon}
                        <span className="text-[9px] font-bold tracking-widest uppercase">
                          {label}
                        </span>
                      </div>
                      {/* Narrative text */}
                      <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300 break-words whitespace-pre-wrap min-w-0">
                        {segment.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expand / collapse */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className={cn(
                  "mt-2 flex w-full items-center justify-center gap-1.5 rounded-md py-1.5",
                  "text-[11px] font-medium text-slate-500 dark:text-slate-400",
                  "hover:text-slate-700 dark:hover:text-slate-200",
                  "bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700",
                  "border border-slate-200 dark:border-slate-700 transition-colors",
                )}
              >
                {expanded ? (
                  <><ChevronUp className="size-3" /> Show less</>
                ) : (
                  <><ChevronDown className="size-3" /> {segments.length - 2} more section{segments.length - 2 !== 1 ? "s" : ""}</>
                )}
              </button>
            )}

            {/* Acknowledged footer */}
            {alert.status === "acknowledged" && alert.acknowledgedBy && (
              <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
                <CheckCircle2 className="size-3 text-amber-500" />
                <span>
                  Acknowledged by{" "}
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {alert.acknowledgedBy}
                  </span>
                </span>
                {alert.acknowledgedAt && (
                  <span className="text-slate-400">
                    · {formatDistanceToNow(new Date(alert.acknowledgedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Fallback: plain description for pre-narrative alerts */}
        {!hasNarrative && alert.description && (
          <p className="mt-2.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2.5">
            {alert.description}
          </p>
        )}

        {/* ── AI Analysis Panel — embedded, no separate page needed ── */}
        {(alert.severity === "Critical" || alert.severity === "High") && (
          <AiAnalysisPanel alertId={alert.id} />
        )}
      </div>
    </div>
  );
}
