"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  X,
  Send,
  Loader2,
  ChevronDown,
  Sparkles,
  FileText,
  Leaf,
  Users,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  ClipboardList,
  CheckCircle2,
  TrendingUp,
  Zap,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Message {
  role: "user" | "ai";
  text?: string;
  report?: ReportPayload;
}

interface ReportPayload {
  reportType: string;
  reportTitle: string;
  report: Record<string, unknown>;
}

// ── Quick report buttons ───────────────────────────────────────────────────────

const REPORT_BUTTONS = [
  {
    label: "ESG Summary",
    icon: <Leaf className="size-3" />,
    question: "Generate an ESG summary report",
    color: "border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30",
  },
  {
    label: "Site Risk",
    icon: <MapPin className="size-3" />,
    question: "Generate a site risk report",
    color: "border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/30",
  },
  {
    label: "CAPA Status",
    icon: <ClipboardList className="size-3" />,
    question: "Generate a CAPA status report",
    color: "border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-700 dark:text-violet-400 dark:hover:bg-violet-950/30",
  },
  {
    label: "Full HSE Report",
    icon: <FileText className="size-3" />,
    question: "Generate a full HSE report",
    color: "border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30",
  },
] as const;

const SUGGESTIONS = [
  "What happened recently?",
  "Which sites are most at risk?",
  "What CAPAs are overdue?",
  "Tell me about the Sinai 2011 fire",
  "Tell me about the Thange judgment",
];

// ── Report card renderers ──────────────────────────────────────────────────────

function ReportSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-lg overflow-hidden mb-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 bg-muted/40 hover:bg-muted/60 transition-colors text-left"
      >
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        <ChevronDown
          className={cn(
            "size-3 text-muted-foreground transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && <div className="px-3 py-2 text-xs space-y-1.5">{children}</div>}
    </div>
  );
}

function KvRow({ label, value }: { label: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex gap-2 items-start">
      <span className="text-muted-foreground shrink-0 min-w-[110px]">{label}:</span>
      <span className="font-medium text-foreground">{String(value)}</span>
    </div>
  );
}

function BulletList({ items }: { items: unknown[] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <ul className="space-y-1 mt-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-1.5 items-start text-xs">
          <span className="mt-1 size-1.5 rounded-full bg-muted-foreground/60 flex-shrink-0" />
          <span>{String(item)}</span>
        </li>
      ))}
    </ul>
  );
}

function MetricGrid({ metrics }: { metrics: unknown[] }) {
  if (!Array.isArray(metrics)) return null;
  return (
    <div className="space-y-1.5 mt-1">
      {metrics.map((m: unknown, i) => {
        const metric = m as Record<string, unknown>;
        return (
          <div
            key={i}
            className="flex items-center justify-between rounded bg-muted/40 px-2 py-1"
          >
            <span className="text-muted-foreground">{String(metric.metric ?? "")}</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{String(metric.value ?? "")}</span>
              {metric.status && (
                <span
                  className={cn(
                    "text-[9px] rounded px-1 py-0.5 font-medium",
                    String(metric.status) === "VERIFIED"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
                      : String(metric.status) === "ESTIMATED"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                        : "bg-slate-100 text-slate-500"
                  )}
                >
                  {String(metric.status)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── ESG Summary Report Card ────────────────────────────────────────────────────

function EsgReportCard({ report }: { report: Record<string, unknown> }) {
  const e = report.environmental as Record<string, unknown> | undefined;
  const s = report.social as Record<string, unknown> | undefined;
  const g = report.governance as Record<string, unknown> | undefined;

  return (
    <div>
      {report.headline && (
        <p className="text-xs font-medium mb-3 p-2 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300">
          {String(report.headline)}
        </p>
      )}

      {e && (
        <ReportSection title="E — Environmental" icon={<Leaf className="size-3 text-emerald-600" />}>
          {e.headline && <p className="text-muted-foreground mb-1">{String(e.headline)}</p>}
          <MetricGrid metrics={e.metrics as unknown[]} />
          {e.keyFinding && (
            <p className="mt-1.5 text-xs border-l-2 border-emerald-400 pl-2 text-emerald-800 dark:text-emerald-300">
              {String(e.keyFinding)}
            </p>
          )}
        </ReportSection>
      )}

      {s && (
        <ReportSection title="S — Social" icon={<Users className="size-3 text-blue-600" />}>
          {s.headline && <p className="text-muted-foreground mb-1">{String(s.headline)}</p>}
          <MetricGrid metrics={s.metrics as unknown[]} />
          {s.keyFinding && (
            <p className="mt-1.5 text-xs border-l-2 border-blue-400 pl-2 text-blue-800 dark:text-blue-300">
              {String(s.keyFinding)}
            </p>
          )}
          {s.sinaiThangeContext && (
            <p className="mt-1.5 text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded p-1.5">
              ⚠ {String(s.sinaiThangeContext)}
            </p>
          )}
        </ReportSection>
      )}

      {g && (
        <ReportSection title="G — Governance" icon={<ShieldCheck className="size-3 text-violet-600" />}>
          {g.headline && <p className="text-muted-foreground mb-1">{String(g.headline)}</p>}
          <MetricGrid metrics={g.metrics as unknown[]} />
          {g.keyFinding && (
            <p className="mt-1.5 text-xs border-l-2 border-violet-400 pl-2 text-violet-800 dark:text-violet-300">
              {String(g.keyFinding)}
            </p>
          )}
        </ReportSection>
      )}

      {report.managementInsights && (
        <ReportSection title="Management Insights" icon={<TrendingUp className="size-3" />}>
          <BulletList items={report.managementInsights as unknown[]} />
        </ReportSection>
      )}
    </div>
  );
}

// ── Site Risk Report Card ──────────────────────────────────────────────────────

function SiteRiskCard({ report }: { report: Record<string, unknown> }) {
  const highRisk = report.highRiskSites as Record<string, unknown>[] | undefined;
  const allSites = report.allSites as Record<string, unknown>[] | undefined;

  const riskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL": return "text-red-600 dark:text-red-400 font-bold";
      case "HIGH":     return "text-orange-600 dark:text-orange-400 font-semibold";
      case "MEDIUM":   return "text-amber-600 dark:text-amber-400";
      default:         return "text-slate-500";
    }
  };

  return (
    <div>
      {report.headline && (
        <p className="text-xs font-medium mb-3 p-2 rounded bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300">
          {String(report.headline)}
        </p>
      )}

      {highRisk && highRisk.length > 0 && (
        <ReportSection title="High-Risk Sites" icon={<AlertTriangle className="size-3 text-red-500" />}>
          {highRisk.map((site, i) => (
            <div key={i} className="rounded border-l-2 border-red-400 pl-2 py-1 mb-2">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-foreground">{String(site.siteName ?? site.siteId ?? "")}</span>
                <span className={riskColor(String(site.riskLevel ?? ""))}>{String(site.riskLevel ?? "")}</span>
              </div>
              {site.keyRisk && <p className="text-muted-foreground">{String(site.keyRisk)}</p>}
              {site.thangeContext && site.thangeContext !== "N/A" && (
                <p className="mt-1 text-[10px] text-amber-700 dark:text-amber-400">⚖ {String(site.thangeContext)}</p>
              )}
              {site.recommendedAction && (
                <p className="mt-1 text-xs text-blue-700 dark:text-blue-400">→ {String(site.recommendedAction)}</p>
              )}
            </div>
          ))}
        </ReportSection>
      )}

      {allSites && allSites.length > 0 && (
        <ReportSection title="All Sites" icon={<MapPin className="size-3" />}>
          <div className="space-y-1">
            {allSites.map((site, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-muted last:border-0">
                <span className="text-muted-foreground">{String(site.siteName ?? site.siteId ?? "")}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{String(site.incidentsLast30d ?? 0)} incidents</span>
                  <span className={riskColor(String(site.riskLevel ?? ""))}>{String(site.riskLevel ?? "")}</span>
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {report.managementInsights && (
        <ReportSection title="Management Insights" icon={<TrendingUp className="size-3" />}>
          <BulletList items={report.managementInsights as unknown[]} />
        </ReportSection>
      )}
    </div>
  );
}

// ── CAPA Status Report Card ────────────────────────────────────────────────────

function CapaStatusCard({ report }: { report: Record<string, unknown> }) {
  const summary = report.summary as Record<string, unknown> | undefined;

  return (
    <div>
      {report.headline && (
        <p className={cn(
          "text-xs font-medium mb-3 p-2 rounded border",
          String(report.headline).includes("overdue")
            ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
            : "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300"
        )}>
          {String(report.headline)}
        </p>
      )}

      {summary && (
        <ReportSection title="CAPA Summary" icon={<ClipboardList className="size-3 text-violet-600" />}>
          <KvRow label="Created (30d)" value={summary.created30d} />
          <KvRow label="Closed (total)" value={summary.closedTotal} />
          <KvRow label="Overdue" value={summary.overdue} />
          <KvRow label="Avg closure time" value={summary.avgClosureDays} />
        </ReportSection>
      )}

      {report.governanceInsights && (
        <ReportSection title="Governance Insights" icon={<ShieldCheck className="size-3 text-violet-600" />}>
          <BulletList items={report.governanceInsights as unknown[]} />
        </ReportSection>
      )}

      {report.recommendations && (
        <ReportSection title="Recommendations" icon={<CheckCircle2 className="size-3 text-emerald-600" />}>
          {(report.recommendations as Record<string, unknown>[]).map((r, i) => (
            <div key={i} className="rounded bg-muted/40 p-2 mb-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-foreground">{String(r.action ?? "")}</span>
                <span className={cn(
                  "text-[9px] rounded px-1 py-0.5 font-bold shrink-0",
                  String(r.priority) === "HIGH"
                    ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400"
                    : "bg-slate-100 text-slate-500"
                )}>
                  {String(r.priority ?? "")}
                </span>
              </div>
              {r.reason && <p className="text-muted-foreground mt-0.5">{String(r.reason)}</p>}
            </div>
          ))}
        </ReportSection>
      )}
    </div>
  );
}

// ── Full HSE Report Card ───────────────────────────────────────────────────────

function HseFullCard({ report }: { report: Record<string, unknown> }) {
  const exec    = report.incidentOverview as Record<string, unknown> | undefined;
  const auto    = report.automationPerformance as Record<string, unknown> | undefined;
  const risk    = report.riskAssessment as Record<string, unknown> | undefined;
  const kpis    = report.hseKpis as Record<string, unknown>[] | undefined;
  const esg     = report.esgRelevance as Record<string, unknown> | undefined;
  const conf    = report.reportingConfidence as Record<string, unknown> | undefined;

  return (
    <div>
      {/* Executive summary banner */}
      {report.headline && (
        <p className="text-xs font-semibold mb-2 p-2 rounded bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300">
          {String(report.headline)}
        </p>
      )}
      {report.executiveSummary && (
        <p className="text-xs leading-relaxed text-muted-foreground mb-3 border-l-2 border-blue-400 pl-2">
          {String(report.executiveSummary)}
        </p>
      )}

      {/* AI draft disclaimer */}
      <div className="flex gap-1.5 items-start text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 rounded p-1.5 mb-3 border border-blue-200 dark:border-blue-800">
        <Info className="size-3 mt-0.5 flex-shrink-0" />
        AI-generated report. Requires HSE professional review before external use.
      </div>

      {exec && (
        <ReportSection title="Incident Overview" icon={<AlertTriangle className="size-3 text-orange-500" />}>
          <KvRow label="Events (30d)" value={exec.totalEvents30d} />
          <KvRow label="Overfill events" value={exec.overfillEvents30d} />
          <KvRow label="High-risk site events" value={exec.highRiskSiteEvents} />
          <KvRow label="Status" value={exec.status} />
        </ReportSection>
      )}

      {auto && (
        <ReportSection title="Automation Performance" icon={<Zap className="size-3 text-emerald-500" />}>
          <KvRow label="Valve closures" value={auto.valveClosures30d} />
          <KvRow label="Avg response time" value={auto.avgResponseTimeSec} />
          <KvRow label="Success rate" value={auto.successRate} />
          <KvRow label="Litres saved" value={auto.litresSaved} />
          {auto.interpretation && (
            <p className="mt-1 text-muted-foreground border-l-2 border-emerald-400 pl-2">
              {String(auto.interpretation)}
            </p>
          )}
        </ReportSection>
      )}

      {kpis && kpis.length > 0 && (
        <ReportSection title="HSE KPIs" icon={<TrendingUp className="size-3" />}>
          <div className="space-y-1">
            {kpis.map((kpi, i) => (
              <div key={i} className="flex items-center justify-between text-xs py-0.5">
                <span className="text-muted-foreground">{String(kpi.kpi ?? "")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{String(kpi.value ?? "")}</span>
                  {kpi.trend && String(kpi.trend) !== "INSUFFICIENT_DATA" && (
                    <span className={cn(
                      "text-[9px] rounded px-1 font-medium",
                      String(kpi.trend) === "REQUIRES_ATTENTION"
                        ? "text-red-500"
                        : String(kpi.trend) === "STABLE"
                          ? "text-emerald-500"
                          : "text-slate-400"
                    )}>
                      {String(kpi.trend)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ReportSection>
      )}

      {risk && (
        <ReportSection title="Risk Assessment" icon={<AlertTriangle className="size-3 text-amber-500" />}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Overall risk</span>
            <span className={cn(
              "text-xs font-bold rounded px-2 py-0.5",
              String(risk.overallRisk) === "CRITICAL" ? "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" :
              String(risk.overallRisk) === "HIGH" ? "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" :
              "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
            )}>
              {String(risk.overallRisk ?? "MEDIUM")}
            </span>
          </div>
          {[
            { label: "🦺 Health & Safety", key: "healthSafety" },
            { label: "🌿 Environmental",   key: "environmental" },
            { label: "👥 Community",       key: "community" },
          ].map(({ label, key }) => risk[key] && (
            <div key={key} className="border-l-2 border-muted pl-2 mb-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground mb-0.5">{label}</p>
              <p className="text-muted-foreground">{String(risk[key])}</p>
            </div>
          ))}
          {risk.topRisks && <BulletList items={risk.topRisks as unknown[]} />}
        </ReportSection>
      )}

      {esg && (
        <ReportSection title="ESG Connection" icon={<Leaf className="size-3 text-emerald-500" />}>
          {["environmental", "social", "governance"].map((pillar) =>
            esg[pillar] && (Array.isArray(esg[pillar])) ? (
              <div key={pillar} className="mb-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  {pillar === "environmental" ? "E" : pillar === "social" ? "S" : "G"} — {pillar}
                </p>
                <BulletList items={esg[pillar] as unknown[]} />
              </div>
            ) : null
          )}
        </ReportSection>
      )}

      {report.managementInsights && (
        <ReportSection title="Management Insights" icon={<TrendingUp className="size-3" />}>
          <BulletList items={report.managementInsights as unknown[]} />
        </ReportSection>
      )}

      {report.earlyWarningSignals && (
        <ReportSection title="Early Warning Signals" icon={<Zap className="size-3 text-amber-500" />}>
          <BulletList items={report.earlyWarningSignals as unknown[]} />
        </ReportSection>
      )}

      {conf && (
        <ReportSection title="Reporting Confidence" icon={<Info className="size-3" />}>
          <KvRow label="High" value={conf.highConfidence} />
          <KvRow label="Medium" value={conf.mediumConfidence} />
          <KvRow label="Requires verification" value={conf.requiresVerification} />
        </ReportSection>
      )}
    </div>
  );
}

// ── Report card dispatcher ─────────────────────────────────────────────────────

function ReportCard({ payload }: { payload: ReportPayload }) {
  return (
    <div className="mt-1 rounded-xl border bg-background shadow-sm overflow-hidden w-full max-w-[310px]">
      {/* Report header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-violet-600 to-violet-700 text-white">
        <FileText className="size-3.5 flex-shrink-0" />
        <div>
          <p className="text-[11px] font-bold">{payload.reportTitle}</p>
          <p className="text-[9px] opacity-70">Sentinel AI · requires HSE review</p>
        </div>
      </div>

      <div className="p-3 max-h-[360px] overflow-y-auto">
        {payload.reportType === "esg_summary" && <EsgReportCard report={payload.report} />}
        {payload.reportType === "site_risk"   && <SiteRiskCard  report={payload.report} />}
        {payload.reportType === "capa_status" && <CapaStatusCard report={payload.report} />}
        {payload.reportType === "hse_full"    && <HseFullCard   report={payload.report} />}

        {payload.report._generatedBy && (
          <p className="text-[9px] text-muted-foreground mt-3 border-t pt-2">
            {String(payload.report._generatedBy)} · {String(payload.report._generatedAt ?? "")}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main AiChatBot component ───────────────────────────────────────────────────

export function AiChatBot() {
  const [open, setOpen]       = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hi — I'm Sentinel AI. Ask me anything, or use the report buttons below to generate a formatted summary.",
    },
  ]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef<HTMLDivElement>(null);
  const inputRef              = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/proxy/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();

      if (data.type === "report") {
        setMessages((m) => [
          ...m,
          {
            role: "ai",
            report: {
              reportType:  data.reportType,
              reportTitle: data.reportTitle,
              report:      data.report,
            },
          },
        ]);
      } else {
        setMessages((m) => [
          ...m,
          { role: "ai", text: data.answer ?? "No response received." },
        ]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Could not reach the backend. Make sure Sentinel is running." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const showSuggestions = messages.length === 1;

  return (
    <>
      {/* ── Floating button ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex size-14 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          "bg-violet-600 hover:bg-violet-700 text-white",
          open && "scale-95"
        )}
        aria-label="Open Sentinel AI"
      >
        {open ? <ChevronDown className="size-5" /> : <Bot className="size-6" />}
        {!open && (
          <span className="absolute size-14 rounded-full border-2 border-violet-400 animate-ping opacity-30" />
        )}
      </button>

      {/* ── Chat panel ── */}
      {open && (
        <div
          className={cn(
            "fixed bottom-24 right-6 z-50 flex flex-col",
            "w-[340px] sm:w-[380px] h-[560px]",
            "rounded-2xl border bg-background shadow-2xl overflow-hidden",
            "animate-in slide-in-from-bottom-4 fade-in duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-violet-600 text-white flex-shrink-0">
            <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
              <Sparkles className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Sentinel AI</p>
              <p className="text-[10px] opacity-70">Ask anything · Generate reports</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 hover:bg-white/20 transition-colors"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Quick report buttons — always visible at top */}
          <div className="px-3 pt-2 pb-1 flex-shrink-0 border-b">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold mb-1.5">
              Generate a report
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {REPORT_BUTTONS.map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => send(btn.question)}
                  disabled={loading}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40",
                    btn.color
                  )}
                >
                  {btn.icon}
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  m.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {m.role === "ai" && (
                  <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30 mt-0.5">
                    <Bot className="size-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                )}

                {m.report ? (
                  <ReportCard payload={m.report} />
                ) : (
                  <div
                    className={cn(
                      "max-w-[82%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      m.role === "user"
                        ? "bg-violet-600 text-white rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    )}
                  >
                    {m.text}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2">
                <div className="flex size-6 flex-shrink-0 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-900/30">
                  <Bot className="size-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-3 py-2 flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggestion chips */}
          {showSuggestions && (
            <div className="px-3 pb-2 flex-shrink-0">
              <p className="text-[9px] text-muted-foreground mb-1 font-semibold uppercase tracking-wide">
                Ask a question
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-full border bg-muted px-2.5 py-1 text-[10px] hover:bg-muted/80 transition-colors text-muted-foreground hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t px-3 py-2 flex-shrink-0 flex items-center gap-2 bg-background">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(input)}
              placeholder="Ask about incidents, alerts, ESG..."
              className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground py-1.5"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => send(input)}
              disabled={!input.trim() || loading}
              className="flex size-7 items-center justify-center rounded-full bg-violet-600 text-white disabled:opacity-40 hover:bg-violet-700 transition-colors flex-shrink-0"
            >
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
