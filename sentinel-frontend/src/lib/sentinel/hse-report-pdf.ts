/**
 * hse-report-pdf.ts
 *
 * Generates a professional HSE Incident & Sustainability Impact Report PDF
 * following the 15-section format defined in the Sentinel HSE Agent specification.
 *
 * Sections:
 *   1.  Executive Summary
 *   2.  Incident Overview
 *   3.  What Happened (Narrative)
 *   4.  HSE Risk Assessment
 *   5.  Incident Timeline
 *   6.  Root Cause Analysis
 *   7.  Corrective & Preventive Actions (CAPA)
 *   8.  Environmental Impact Assessment
 *   9.  Community & Social Impact
 *   10. HSE KPIs
 *   11. ESG Connection
 *   12. ESG Reporting Data Table
 *   13. Management Insights
 *   14. Early Warning Signals
 *   15. Reporting Confidence
 */

// Dynamic import — jsPDF is large, only load when user clicks download
async function getJsPDF() {
  const { jsPDF } = await import("jspdf");
  return jsPDF;
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const COLORS = {
  // Brand
  violet:     [88,  28, 135] as [number, number, number],
  violetLight:[237, 233, 254] as [number, number, number],

  // Pillars
  green:      [5,   150, 105] as [number, number, number],
  greenLight: [209, 250, 229] as [number, number, number],
  blue:       [37,  99,  235] as [number, number, number],
  blueLight:  [219, 234, 254] as [number, number, number],
  amber:      [180, 83,  9]   as [number, number, number],
  amberLight: [254, 243, 199] as [number, number, number],
  red:        [185, 28,  28]  as [number, number, number],
  redLight:   [254, 226, 226] as [number, number, number],
  orange:     [194, 65,  12]  as [number, number, number],
  orangeLight:[255, 237, 213] as [number, number, number],

  // Neutral
  dark:       [17,  24,  39]  as [number, number, number],
  mid:        [75,  85,  99]  as [number, number, number],
  light:      [156, 163, 175] as [number, number, number],
  surface:    [249, 250, 251] as [number, number, number],
  border:     [229, 231, 235] as [number, number, number],
  white:      [255, 255, 255] as [number, number, number],
};

// ── PDF layout constants ───────────────────────────────────────────────────────

const PAGE_W  = 210;  // A4 mm
const PAGE_H  = 297;
const MARGIN  = 18;
const CONTENT = PAGE_W - MARGIN * 2;

// ── PDF state ─────────────────────────────────────────────────────────────────

interface State {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  doc: any;
  y: number;
  page: number;
}

function newPage(s: State) {
  s.doc.addPage();
  s.page++;
  s.y = MARGIN + 8;
  // Subtle header line on continuation pages
  s.doc.setDrawColor(...COLORS.border);
  s.doc.setLineWidth(0.3);
  s.doc.line(MARGIN, 10, PAGE_W - MARGIN, 10);
  s.doc.setFontSize(7);
  s.doc.setTextColor(...COLORS.light);
  s.doc.text("SENTINEL AI — HSE INCIDENT & SUSTAINABILITY IMPACT REPORT  |  CONFIDENTIAL DRAFT", MARGIN, 8);
}

function checkY(s: State, needed = 12) {
  if (s.y + needed > PAGE_H - 20) newPage(s);
}

function gap(s: State, mm = 4) {
  s.y += mm;
}

// ── Typography helpers ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function h1(s: State, text: string) {
  checkY(s, 14);
  s.doc.setFontSize(18);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  s.doc.text(text, MARGIN, s.y);
  s.y += 8;
}

function h2(s: State, text: string, color = COLORS.dark) {
  checkY(s, 12);
  s.doc.setFontSize(12);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...color);
  s.doc.text(text, MARGIN, s.y);
  s.y += 6;
}

function h3(s: State, text: string, color = COLORS.mid) {
  checkY(s, 8);
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...color);
  s.doc.text(text.toUpperCase(), MARGIN, s.y);
  s.y += 5;
}

function body(s: State, text: string, indent = 0, color = COLORS.mid) {
  if (!text || text === "null" || text === "undefined") return;
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...color);
  const lines: string[] = s.doc.splitTextToSize(text, CONTENT - indent);
  for (const line of lines) {
    checkY(s, 5);
    s.doc.text(line, MARGIN + indent, s.y);
    s.y += 4.5;
  }
}

function bullet(s: State, text: string, indent = 4, dotColor = COLORS.violet) {
  if (!text) return;
  checkY(s, 5);
  s.doc.setFillColor(...dotColor);
  s.doc.circle(MARGIN + indent, s.y - 1.2, 0.8, "F");
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...COLORS.mid);
  const lines: string[] = s.doc.splitTextToSize(text, CONTENT - indent - 4);
  for (let i = 0; i < lines.length; i++) {
    checkY(s, 5);
    s.doc.text(lines[i], MARGIN + indent + 3, s.y);
    s.y += 4.5;
  }
}

function kv(s: State, label: string, value: unknown, indent = 0) {
  const val = String(value ?? "—");
  if (val === "null" || val === "undefined" || val === "") return;
  checkY(s, 5);
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  s.doc.text(label + ":", MARGIN + indent, s.y);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...COLORS.mid);
  const labelW = s.doc.getTextWidth(label + ":") + 2;
  const availW = CONTENT - indent - labelW;
  const lines: string[] = s.doc.splitTextToSize(val, availW);
  s.doc.text(lines[0], MARGIN + indent + labelW, s.y);
  s.y += 4.5;
  for (let i = 1; i < lines.length; i++) {
    checkY(s, 5);
    s.doc.text(lines[i], MARGIN + indent + labelW, s.y);
    s.y += 4.5;
  }
}

// ── Section header with coloured left bar ─────────────────────────────────────

function sectionHeader(
  s: State,
  number: string,
  title: string,
  color = COLORS.violet
) {
  checkY(s, 18);
  gap(s, 6);
  // Left accent bar
  s.doc.setFillColor(...color);
  s.doc.rect(MARGIN, s.y - 5, 3, 10, "F");
  // Section number
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...color);
  s.doc.text(number, MARGIN + 5, s.y - 1);
  // Title
  s.doc.setFontSize(13);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  s.doc.text(title, MARGIN + 5 + s.doc.getTextWidth(number) + 2, s.y - 1);
  s.y += 6;
  // Divider
  s.doc.setDrawColor(...COLORS.border);
  s.doc.setLineWidth(0.3);
  s.doc.line(MARGIN, s.y, PAGE_W - MARGIN, s.y);
  s.y += 4;
}

// ── Coloured info box ──────────────────────────────────────────────────────────

function infoBox(
  s: State,
  text: string,
  bgColor = COLORS.violetLight,
  textColor = COLORS.violet
) {
  if (!text) return;
  checkY(s, 14);
  const lines: string[] = s.doc.splitTextToSize(text, CONTENT - 8);
  const boxH = lines.length * 4.5 + 6;
  s.doc.setFillColor(...bgColor);
  s.doc.roundedRect(MARGIN, s.y, CONTENT, boxH, 2, 2, "F");
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...textColor);
  lines.forEach((line: string, i: number) => {
    s.doc.text(line, MARGIN + 4, s.y + 5 + i * 4.5);
  });
  s.y += boxH + 3;
}

function warningBox(s: State, text: string) {
  infoBox(s, "⚠  " + text, COLORS.amberLight, COLORS.amber);
}

function disclaimerBox(s: State, text: string) {
  infoBox(s, "ⓘ  " + text, COLORS.blueLight, COLORS.blue);
}

// ── Subsection card ───────────────────────────────────────────────────────────

function subCard(
  s: State,
  title: string,
  content: string,
  accentColor = COLORS.violet
) {
  if (!content) return;
  checkY(s, 16);
  const lines: string[] = s.doc.splitTextToSize(content, CONTENT - 10);
  const cardH = lines.length * 4.5 + 10;
  s.doc.setFillColor(...COLORS.surface);
  s.doc.roundedRect(MARGIN, s.y, CONTENT, cardH, 2, 2, "F");
  s.doc.setFillColor(...accentColor);
  s.doc.rect(MARGIN, s.y, 2.5, cardH, "F");
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...accentColor);
  s.doc.text(title.toUpperCase(), MARGIN + 5, s.y + 5);
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...COLORS.mid);
  lines.forEach((line: string, i: number) => {
    s.doc.text(line, MARGIN + 5, s.y + 10 + i * 4.5);
  });
  s.y += cardH + 3;
}

// ── CAPA table ────────────────────────────────────────────────────────────────

function capaTable(s: State, capas: Record<string, unknown>[]) {
  if (!capas || capas.length === 0) return;
  checkY(s, 14);

  const cols = [
    { label: "Action",        w: 62 },
    { label: "Priority",      w: 18 },
    { label: "Role",          w: 35 },
    { label: "Deadline",      w: 20 },
    { label: "Verification",  w: 39 },
  ];

  // Header row
  s.doc.setFillColor(...COLORS.violet);
  s.doc.rect(MARGIN, s.y, CONTENT, 7, "F");
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  let cx = MARGIN + 2;
  cols.forEach((col) => {
    s.doc.text(col.label, cx, s.y + 4.8);
    cx += col.w;
  });
  s.y += 7;

  capas.forEach((capa, idx) => {
    const action   = String(capa.action   ?? capa.action   ?? "");
    const priority = String(capa.priority ?? "");
    const role     = String(capa.responsibleRole ?? capa.role ?? "");
    const deadline = capa.suggestedDeadlineDays ? `${capa.suggestedDeadlineDays}d` : "—";
    const verify   = String(capa.verificationMethod ?? capa.verification ?? "");

    const actionLines: string[] = s.doc.splitTextToSize(action, cols[0].w - 3);
    const rowH = Math.max(actionLines.length * 4 + 4, 8);

    checkY(s, rowH + 2);

    // Alternating row background
    if (idx % 2 === 0) {
      s.doc.setFillColor(...COLORS.surface);
      s.doc.rect(MARGIN, s.y, CONTENT, rowH, "F");
    }

    s.doc.setFontSize(8);
    cx = MARGIN + 2;

    // Action (multiline)
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.dark);
    actionLines.forEach((line: string, li: number) => {
      s.doc.text(line, cx, s.y + 5 + li * 4);
    });
    cx += cols[0].w;

    // Priority badge colour
    const priColor =
      priority === "CRITICAL" ? COLORS.red :
      priority === "HIGH"     ? COLORS.orange :
      priority === "MEDIUM"   ? COLORS.amber :
                                COLORS.light;
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...priColor);
    s.doc.text(priority, cx, s.y + 5);
    cx += cols[1].w;

    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.mid);
    s.doc.text(role.substring(0, 22), cx, s.y + 5);
    cx += cols[2].w;

    s.doc.text(deadline, cx, s.y + 5);
    cx += cols[3].w;

    const vLines: string[] = s.doc.splitTextToSize(verify, cols[4].w - 2);
    vLines.forEach((line: string, li: number) => {
      s.doc.text(line, cx, s.y + 5 + li * 4);
    });

    // Row border
    s.doc.setDrawColor(...COLORS.border);
    s.doc.setLineWidth(0.2);
    s.doc.line(MARGIN, s.y + rowH, PAGE_W - MARGIN, s.y + rowH);

    s.y += rowH;
  });
  s.y += 4;
}

// ── ESG data table ────────────────────────────────────────────────────────────

function esgDataTable(
  s: State,
  metrics: Array<{ area: string; metric: string; value: string; source: string; status: string }>
) {
  if (!metrics || metrics.length === 0) return;
  checkY(s, 14);

  const cols = [
    { label: "ESG Area",  w: 22 },
    { label: "Metric",    w: 60 },
    { label: "Value",     w: 30 },
    { label: "Source",    w: 30 },
    { label: "Status",    w: 32 },
  ];

  s.doc.setFillColor(...COLORS.dark);
  s.doc.rect(MARGIN, s.y, CONTENT, 7, "F");
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  let cx = MARGIN + 2;
  cols.forEach((col) => {
    s.doc.text(col.label, cx, s.y + 4.8);
    cx += col.w;
  });
  s.y += 7;

  metrics.forEach((m, idx) => {
    checkY(s, 9);
    const areaColor =
      m.area === "Environmental" ? COLORS.green :
      m.area === "Social"        ? COLORS.blue  :
                                   COLORS.violet;

    if (idx % 2 === 0) {
      s.doc.setFillColor(...COLORS.surface);
      s.doc.rect(MARGIN, s.y, CONTENT, 7, "F");
    }

    s.doc.setFontSize(8);
    cx = MARGIN + 2;

    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...areaColor);
    s.doc.text((m.area || "").substring(0, 12), cx, s.y + 4.8);
    cx += cols[0].w;

    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.dark);
    s.doc.text((m.metric || "").substring(0, 38), cx, s.y + 4.8);
    cx += cols[1].w;

    s.doc.setTextColor(...COLORS.mid);
    s.doc.text((m.value  || "").substring(0, 18), cx, s.y + 4.8);
    cx += cols[2].w;

    s.doc.text((m.source || "").substring(0, 18), cx, s.y + 4.8);
    cx += cols[3].w;

    const statusColor =
      m.status === "VERIFIED"            ? COLORS.green  :
      m.status === "CALCULATED"          ? COLORS.blue   :
      m.status === "PENDING_VERIFICATION"? COLORS.amber  :
                                           COLORS.light;
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...statusColor);
    s.doc.text((m.status || "").substring(0, 20), cx, s.y + 4.8);

    s.doc.setDrawColor(...COLORS.border);
    s.doc.setLineWidth(0.2);
    s.doc.line(MARGIN, s.y + 7, PAGE_W - MARGIN, s.y + 7);
    s.y += 7;
  });
  s.y += 4;
}

// ── KPI table ─────────────────────────────────────────────────────────────────

function kpiTable(s: State, kpis: Record<string, unknown>[]) {
  if (!kpis || kpis.length === 0) return;
  checkY(s, 12);

  const cols = [
    { label: "KPI",     w: 80 },
    { label: "Value",   w: 30 },
    { label: "Period",  w: 25 },
    { label: "Trend",   w: 39 },
  ];

  s.doc.setFillColor(...COLORS.violet);
  s.doc.rect(MARGIN, s.y, CONTENT, 7, "F");
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  let cx = MARGIN + 2;
  cols.forEach((col) => {
    s.doc.text(col.label, cx, s.y + 4.8);
    cx += col.w;
  });
  s.y += 7;

  kpis.forEach((kpi, idx) => {
    checkY(s, 8);
    if (idx % 2 === 0) {
      s.doc.setFillColor(...COLORS.surface);
      s.doc.rect(MARGIN, s.y, CONTENT, 7, "F");
    }
    s.doc.setFontSize(8);
    cx = MARGIN + 2;

    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.dark);
    s.doc.text(String(kpi.kpi ?? "").substring(0, 48), cx, s.y + 4.8);
    cx += cols[0].w;

    s.doc.setTextColor(...COLORS.mid);
    s.doc.text(String(kpi.value ?? "—"), cx, s.y + 4.8);
    cx += cols[1].w;

    s.doc.text(String(kpi.period ?? "30d"), cx, s.y + 4.8);
    cx += cols[2].w;

    const trend = String(kpi.trend ?? "");
    const trendColor =
      trend === "STABLE"   ? COLORS.green :
      trend.includes("ATTENTION") ? COLORS.red :
      trend === "UP"       ? COLORS.orange :
                             COLORS.light;
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...trendColor);
    s.doc.text(trend.replace("_", " ").substring(0, 20), cx, s.y + 4.8);

    s.doc.setDrawColor(...COLORS.border);
    s.doc.setLineWidth(0.2);
    s.doc.line(MARGIN, s.y + 7, PAGE_W - MARGIN, s.y + 7);
    s.y += 7;
  });
  s.y += 4;
}

// ── Cover page ────────────────────────────────────────────────────────────────

function coverPage(s: State, reportTitle: string, reportType: string, generatedAt: string) {
  // Dark header band
  s.doc.setFillColor(...COLORS.dark);
  s.doc.rect(0, 0, PAGE_W, 60, "F");

  // Violet accent bar
  s.doc.setFillColor(...COLORS.violet);
  s.doc.rect(0, 58, PAGE_W, 4, "F");

  // Logo area text
  s.doc.setFontSize(10);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  s.doc.text("SENTINEL", MARGIN, 20);
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(180, 180, 200);
  s.doc.text("AI-Powered Pipeline Safety & ESG Monitoring", MARGIN, 26);
  s.doc.text("Kenya Pipeline Company", MARGIN, 31);

  // Report type badge
  s.doc.setFillColor(...COLORS.violet);
  s.doc.roundedRect(MARGIN, 38, 60, 9, 2, 2, "F");
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  s.doc.text(reportType, MARGIN + 4, 43.5);

  // Report title (large)
  s.doc.setFontSize(22);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  const titleLines: string[] = s.doc.splitTextToSize(reportTitle, CONTENT);
  titleLines.forEach((line: string, i: number) => {
    s.doc.text(line, MARGIN, 82 + i * 12);
  });
  s.y = 82 + titleLines.length * 12 + 6;

  // Divider
  s.doc.setDrawColor(...COLORS.violet);
  s.doc.setLineWidth(0.8);
  s.doc.line(MARGIN, s.y, MARGIN + 40, s.y);
  s.y += 8;

  // Metadata
  const meta = [
    ["Report Type",   reportType],
    ["Generated",     generatedAt],
    ["System",        "Sentinel AI HSE Reporting Agent"],
    ["Status",        "DRAFT — Requires HSE Professional Review"],
    ["Classification","Confidential"],
  ];
  meta.forEach(([label, value]) => {
    s.doc.setFontSize(9);
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...COLORS.dark);
    s.doc.text(label + ":", MARGIN, s.y);
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.mid);
    s.doc.text(value, MARGIN + 35, s.y);
    s.y += 6;
  });

  s.y += 8;

  // AI disclaimer box
  disclaimerBox(s,
    "This report was generated by Sentinel AI using live operational data. " +
    "It is a DRAFT for HSE professional review. Root cause analysis, environmental impact, " +
    "legal liability, injury/fatality confirmation, and community impact require human verification " +
    "before this report may be used externally or submitted to regulators."
  );

  // Sinai/Thange context
  s.y += 4;
  warningBox(s,
    "CONTEXT: The 2011 Nairobi Sinai pipeline fire (~100 lives) and the 2015 Thange River spill " +
    "(Kimeu & 3,074 others v. KPC, [2025] KEELC 5239 — KES 3.02 billion) both originated as " +
    "undetected valve/tank failures. Sentinel continuously monitors 7 KPC pipeline sites to close " +
    "exactly this gap. This report documents one such monitored event."
  );

  // Page number footer
  s.doc.setFontSize(7);
  s.doc.setTextColor(...COLORS.light);
  s.doc.text(`Page ${s.page}`, PAGE_W - MARGIN - 8, PAGE_H - 8);
}

// ── Main export function ───────────────────────────────────────────────────────

export async function downloadHseReportPdf(
  reportType: string,
  reportTitle: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: Record<string, any>
) {
  const JsPDF = await getJsPDF();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const s: State = { doc, y: MARGIN, page: 1 };
  const generatedAt = String(report._generatedAt ?? new Date().toLocaleString());
  const generatedBy = String(report._generatedBy ?? "Sentinel AI");

  // ── COVER PAGE ─────────────────────────────────────────────────────────────
  coverPage(s, reportTitle, reportType.replace("_", " ").toUpperCase(), generatedAt);

  // ── New page for content ───────────────────────────────────────────────────
  newPage(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 1: EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "01", "Executive Summary", COLORS.red);

  const exec = report.executiveSummary ?? {};
  const headline = report.headline ?? exec.headline ?? exec.whatHappened ?? "";
  if (headline) infoBox(s, String(headline), COLORS.blueLight, COLORS.blue);

  if (exec.whatHappened) {
    h3(s, "What Happened");
    body(s, String(exec.whatHappened));
    gap(s);
  }
  if (report.executiveSummary && typeof report.executiveSummary === "string") {
    body(s, report.executiveSummary);
    gap(s);
  }

  const execGrid = [
    ["Severity",              exec.severity       ?? report.riskAssessment?.overallRisk ?? "—"],
    ["Immediate Risk",        exec.immediateRisk   ?? "—"],
    ["Environmental Impact",  exec.environmentalImpactOccurred === true ? "Confirmed — requires field verification" : "No confirmed release"],
    ["Sentinel Response",     exec.sentinelResponse ?? "—"],
    ["Response Time",         exec.responseTimeSeconds ? `${exec.responseTimeSeconds}s` : "—"],
    ["Current Status",        exec.currentStatus   ?? "—"],
  ];
  execGrid.forEach(([label, value]) => kv(s, label, value, 2));
  gap(s);

  if (exec.keyActions?.length || report.recommendations) {
    h3(s, "Key Recommended Actions");
    const actions = exec.keyActions ?? [];
    actions.forEach((a: string) => bullet(s, String(a), 4, COLORS.red));
    gap(s);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 2: INCIDENT OVERVIEW
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "02", "Incident Overview", COLORS.orange);

  const inc = report.incidentOverview ?? {};
  const incFields: [string, unknown][] = [
    ["Total Events (30d)",         inc.totalEvents30d      ?? "—"],
    ["Overfill Events (30d)",      inc.overfillEvents30d   ?? "—"],
    ["High-Risk Site Events",      inc.highRiskSiteEvents  ?? "—"],
    ["Critical Events",            inc.criticalEvents      ?? "—"],
    ["System Status",              inc.status              ?? "—"],
    ["Period",                     report.period           ?? "Last 30 days"],
  ];
  incFields.forEach(([l, v]) => kv(s, l, v, 2));
  gap(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3: WHAT HAPPENED — NARRATIVE
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "03", "What Happened — Incident Narrative", COLORS.blue);

  const narrative = report.narrative ?? {};
  const narFields = [
    { label: "What the system detected",      key: "whatSystemDetected"          },
    { label: "Why the condition was abnormal", key: "whyConditionWasAbnormal"     },
    { label: "What risk it created",          key: "whatRiskItCreated"            },
    { label: "What Sentinel did",             key: "whatSentinelDid"              },
    { label: "What happened after intervention", key: "whatHappenedAfterIntervention" },
  ];
  let hasNarrative = false;
  narFields.forEach(({ label, key }) => {
    if (narrative[key]) {
      hasNarrative = true;
      subCard(s, label, String(narrative[key]), COLORS.blue);
    }
  });
  if (!hasNarrative) {
    // For reports that embed narrative in executiveSummary
    if (exec.whatHappened) subCard(s, "Incident narrative", String(exec.whatHappened), COLORS.blue);
    else body(s, "Narrative not available in this report type. Generate a Full HSE Report for complete narrative.", 2, COLORS.light);
  }
  gap(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 4: HSE RISK ASSESSMENT
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "04", "HSE Risk Assessment", COLORS.amber);

  const risk = report.riskAssessment ?? report.hseRiskAssessment ?? {};

  if (risk.overallRisk) {
    checkY(s, 10);
    const riskColor =
      risk.overallRisk === "CRITICAL" ? COLORS.red :
      risk.overallRisk === "HIGH"     ? COLORS.orange :
      risk.overallRisk === "MEDIUM"   ? COLORS.amber : COLORS.green;
    s.doc.setFontSize(11);
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...riskColor);
    s.doc.text(`Overall Risk Level: ${risk.overallRisk}`, MARGIN, s.y);
    s.y += 7;
  }

  const riskAreas = [
    { label: "🦺  Health & Safety", key: "healthSafety",       color: COLORS.orange },
    { label: "🌿  Environmental",   key: "environmental",      color: COLORS.green  },
    { label: "👥  Community",       key: "community",          color: COLORS.blue   },
    { label: "⚙️  Operational",     key: "operational",        color: COLORS.mid    },
    { label: "⚖️  Legal & Compliance", key: "legalAndCompliance", color: COLORS.violet },
    { label: "⚖️  Legal & Compliance", key: "legalCompliance", color: COLORS.violet },
  ];
  const seen = new Set<string>();
  riskAreas.forEach(({ label, key, color }) => {
    if (risk[key] && !seen.has(String(risk[key]))) {
      seen.add(String(risk[key]));
      subCard(s, label, String(risk[key]), color);
    }
  });

  if (risk.topRisks?.length) {
    h3(s, "Top Identified Risks");
    (risk.topRisks as string[]).forEach((r: string) => bullet(s, r, 4, COLORS.red));
    gap(s);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 5: INCIDENT TIMELINE (if present)
  // ══════════════════════════════════════════════════════════════════
  const timeline = report.timeline ?? report.incidentTimeline;
  if (timeline && Array.isArray(timeline) && timeline.length > 0) {
    sectionHeader(s, "05", "Incident Timeline", COLORS.blue);
    timeline.forEach((entry: Record<string, unknown>) => {
      checkY(s, 7);
      s.doc.setFontSize(8);
      s.doc.setFont("helvetica", "bold");
      s.doc.setTextColor(...COLORS.violet);
      s.doc.text(String(entry.time ?? entry.t ?? ""), MARGIN + 2, s.y);
      s.doc.setFont("helvetica", "normal");
      s.doc.setTextColor(...COLORS.mid);
      s.doc.text(String(entry.event ?? entry.description ?? ""), MARGIN + 25, s.y);
      s.y += 5;
    });
    gap(s);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 6: ROOT CAUSE ANALYSIS
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "06", "Root Cause Analysis", COLORS.violet);

  const rca = report.rootCauseAnalysis ?? {};
  if (rca.disclaimer) {
    disclaimerBox(s, String(rca.disclaimer));
  } else {
    disclaimerBox(s,
      "AI-generated hypothesis only. Does not constitute a confirmed root cause finding. " +
      "Human HSE investigation is required before any official determination."
    );
  }
  gap(s, 2);

  if (rca.confirmedFacts?.length) {
    h3(s, "Confirmed Facts", COLORS.green);
    (rca.confirmedFacts as string[]).forEach((f: string) => bullet(s, f, 4, COLORS.green));
    gap(s);
  }
  if (rca.aiHypotheses?.length) {
    h3(s, "AI Hypotheses — Requires Investigation", COLORS.blue);
    (rca.aiHypotheses as string[]).forEach((h: string) => bullet(s, h, 4, COLORS.blue));
    gap(s);
  }
  if (rca.requiresInvestigation?.length) {
    h3(s, "Items Requiring Investigation", COLORS.amber);
    (rca.requiresInvestigation as string[]).forEach((i: string) => bullet(s, i, 4, COLORS.amber));
    gap(s);
  }
  if (!rca.confirmedFacts && !rca.aiHypotheses) {
    body(s,
      "Root cause analysis requires a dedicated HSE investigation. " +
      "Generate a Full HSE Report for an event-specific root cause hypothesis.",
      2, COLORS.light
    );
    gap(s);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 7: CAPA
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "07", "Corrective & Preventive Actions (CAPA)", COLORS.violet);

  const capaSection = report.capaStatus ?? {};
  kv(s, "CAPAs Created (30d)", capaSection.created30d,    2);
  kv(s, "CAPAs Closed",        capaSection.closedTotal ?? capaSection.closed, 2);
  kv(s, "CAPAs Overdue",       capaSection.overdue,       2);
  kv(s, "Avg Closure Time",    capaSection.avgClosureDays ?? capaSection.avgClosureTime, 2);
  if (capaSection.governanceNote) {
    gap(s, 2);
    infoBox(s, String(capaSection.governanceNote), COLORS.violetLight, COLORS.violet);
  }
  gap(s, 2);

  // CAPA recommendations table
  const capaRecs = report.capaRecommendations ?? report.recommendations;
  if (Array.isArray(capaRecs) && capaRecs.length > 0) {
    h3(s, "CAPA Recommendations");
    capaTable(s, capaRecs as Record<string, unknown>[]);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 8: ENVIRONMENTAL IMPACT ASSESSMENT
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "08", "Environmental Impact Assessment", COLORS.green);

  const envText =
    typeof report.environmentalImpactAssessment === "string"
      ? report.environmentalImpactAssessment
      : risk.environmental ?? "";
  if (envText) {
    body(s, String(envText), 2);
    gap(s);
  }

  // E metrics from ESG connection
  const esgConn = report.esgRelevance ?? report.esgConnection ?? {};
  if (esgConn.environmental?.length) {
    h3(s, "Environmental ESG Findings", COLORS.green);
    (esgConn.environmental as string[]).forEach((e: string) => bullet(s, e, 4, COLORS.green));
    gap(s);
  }
  if (!envText && !esgConn.environmental) {
    warningBox(s,
      "Environmental impact assessment requires field verification by an environmental officer. " +
      "No confirmed release reported at this stage."
    );
    gap(s);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 9: COMMUNITY & SOCIAL IMPACT
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "09", "Community & Social Impact", COLORS.blue);

  const communityText =
    typeof report.communityAndSocialImpact === "string"
      ? report.communityAndSocialImpact
      : risk.community ?? "";
  if (communityText) {
    body(s, String(communityText), 2);
    gap(s);
  }
  if (esgConn.social?.length) {
    h3(s, "Social ESG Findings", COLORS.blue);
    (esgConn.social as string[]).forEach((e: string) => bullet(s, e, 4, COLORS.blue));
    gap(s);
  }
  if (!communityText && !esgConn.social) {
    body(s,
      "No confirmed community impact at this stage. Community impact assessment requires " +
      "field verification and community liaison officer assessment.",
      2, COLORS.light
    );
    gap(s);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 10: HSE KPIs
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "10", "HSE KPIs", COLORS.violet);

  const kpis = report.hseKpis ?? [];
  if (kpis.length > 0) {
    kpiTable(s, kpis as Record<string, unknown>[]);
  } else {
    // Build KPI table from automation performance
    const auto = report.automationPerformance ?? {};
    const autoKpis = [
      { kpi: "Automated valve closures (30d)", value: auto.valveClosures30d ?? "—", period: "30d", trend: "—" },
      { kpi: "Avg automated response time",    value: auto.avgResponseTimeSec ?? "—", period: "30d", trend: "—" },
      { kpi: "Automation success rate",        value: auto.successRate ?? "—", period: "30d", trend: "—" },
      { kpi: "Estimated litres saved",         value: auto.litresSaved ?? "—", period: "30d", trend: "—" },
    ].filter(k => String(k.value) !== "—");
    if (autoKpis.length > 0) kpiTable(s, autoKpis);
    else body(s, "KPI data not available for this report type. Generate a Full HSE Report for complete KPIs.", 2, COLORS.light);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 11: ESG CONNECTION
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "11", "ESG Connection", COLORS.violet);

  const pillars = [
    { key: "environmental", label: "E — Environmental", color: COLORS.green  },
    { key: "social",        label: "S — Social",        color: COLORS.blue   },
    { key: "governance",    label: "G — Governance",    color: COLORS.violet },
  ];
  pillars.forEach(({ key, label, color }) => {
    const items = (esgConn[key] as string[]) ?? [];
    // Also check governance from governance section
    const govItems = key === "governance" ? (report.esgConnection?.governance ?? esgConn.governance ?? []) as string[] : items;
    const allItems = key === "governance" ? [...new Set([...items, ...govItems])] : items;
    if (allItems.length > 0) {
      h3(s, label, color);
      allItems.forEach((item: string) => bullet(s, item, 4, color));
      gap(s, 2);
    }
  });

  // ══════════════════════════════════════════════════════════════════
  // SECTION 12: ESG REPORTING DATA TABLE
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "12", "ESG Reporting Data Table", COLORS.dark);

  // Build rows from available E/S/G metrics
  const esgRows: Array<{ area: string; metric: string; value: string; source: string; status: string }> = [];

  // From ESG summary metrics
  const esgSummary = report.environmental ?? report.social ?? report.governance;

  // E metrics
  if (report.environmental?.metrics) {
    (report.environmental.metrics as Record<string, unknown>[]).forEach((m) => {
      esgRows.push({
        area:   "Environmental",
        metric: String(m.metric ?? ""),
        value:  String(m.value  ?? ""),
        source: String(m.source ?? "Sentinel"),
        status: String(m.status ?? "SYSTEM_GENERATED"),
      });
    });
  }
  if (report.social?.metrics) {
    (report.social.metrics as Record<string, unknown>[]).forEach((m) => {
      esgRows.push({
        area:   "Social",
        metric: String(m.metric ?? ""),
        value:  String(m.value  ?? ""),
        source: String(m.source ?? "Sentinel"),
        status: String(m.status ?? "SYSTEM_GENERATED"),
      });
    });
  }
  if (report.governance?.metrics) {
    (report.governance.metrics as Record<string, unknown>[]).forEach((m) => {
      esgRows.push({
        area:   "Governance",
        metric: String(m.metric ?? ""),
        value:  String(m.value  ?? ""),
        source: String(m.source ?? "Sentinel"),
        status: String(m.status ?? "SYSTEM_GENERATED"),
      });
    });
  }

  // Fallback from automation/incidents if no metrics
  if (esgRows.length === 0) {
    const auto = report.automationPerformance ?? {};
    const inc2  = report.incidentOverview ?? {};
    const capa2 = report.capaStatus ?? {};
    const fallbackRows = [
      { area: "Environmental", metric: "Automated valve closures",       value: String(auto.valveClosures30d ?? "—"),   source: "Sentinel", status: "VERIFIED" },
      { area: "Environmental", metric: "Litres saved (estimate)",        value: String(auto.litresSaved ?? "—"),        source: "Calculated", status: "ESTIMATED" },
      { area: "Social",        metric: "Overfill events prevented",      value: String(inc2.overfillEvents30d ?? "—"),  source: "Sentinel", status: "VERIFIED" },
      { area: "Social",        metric: "High-risk site events",          value: String(inc2.highRiskSiteEvents ?? "—"), source: "Sentinel", status: "VERIFIED" },
      { area: "Governance",    metric: "CAPAs created (30d)",            value: String(capa2.created30d ?? "—"),        source: "Sentinel", status: "VERIFIED" },
      { area: "Governance",    metric: "CAPAs overdue",                  value: String(capa2.overdue ?? "—"),           source: "Sentinel", status: "VERIFIED" },
      { area: "Governance",    metric: "Avg automated response time",    value: String(auto.avgResponseTimeSec ?? "—"), source: "Sentinel", status: "CALCULATED" },
    ].filter(r => r.value !== "—" && r.value !== "undefined" && r.value !== "null");
    esgRows.push(...fallbackRows);
  }

  if (esgRows.length > 0) {
    esgDataTable(s, esgRows);
  } else {
    body(s, "ESG data table requires operational data. Trigger a demo event and regenerate.", 2, COLORS.light);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 13: MANAGEMENT INSIGHTS
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "13", "Management Insights", COLORS.dark);

  const insights = report.managementInsights ?? [];
  if (insights.length > 0) {
    (insights as string[]).forEach((insight: string) => {
      bullet(s, insight, 4, COLORS.violet);
      gap(s, 1);
    });
  } else {
    body(s, "Insufficient data for management insights in this reporting period.", 2, COLORS.light);
  }
  gap(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 14: EARLY WARNING SIGNALS
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "14", "Early Warning Signals", COLORS.amber);

  const signals = report.earlyWarningSignals ?? [];
  if (signals.length > 0) {
    (signals as string[]).forEach((signal: string) => {
      bullet(s, signal, 4, COLORS.amber);
      gap(s, 1);
    });
  } else {
    body(s, "Insufficient historical data for reliable predictive analysis.", 2, COLORS.light);
  }
  gap(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 15: REPORTING CONFIDENCE
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "15", "Reporting Confidence", COLORS.violet);

  const conf = report.reportingConfidence ?? {};
  if (typeof conf === "object" && !Array.isArray(conf)) {
    subCard(s, "High Confidence",
      String(conf.highConfidence ?? "Directly supported by Sentinel system telemetry and verified records."),
      COLORS.green
    );
    subCard(s, "Medium Confidence",
      String(conf.mediumConfidence ?? "Calculated or strongly inferred from available operational data."),
      COLORS.amber
    );
    subCard(s, "Requires Verification",
      String(conf.requiresVerification ?? "Root cause determination, environmental impact, community impact, legal/regulatory exposure, injury/fatality confirmation."),
      COLORS.red
    );
  } else if (typeof conf === "string") {
    body(s, String(conf), 2);
  }
  gap(s, 4);

  // ── FOOTER ─────────────────────────────────────────────────────────────────
  disclaimerBox(s,
    "IMPORTANT: This report was generated by Sentinel AI. It supports HSE decision-making " +
    "and does not replace professional HSE judgment. The workflow is: " +
    "Detect → Analyze → Draft → Review → Verify → Approve → Report. " +
    "This is the DRAFT stage. An HSE professional must review and approve before external use."
  );

  // Page numbers on all pages
  const totalPages = s.doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    s.doc.setPage(i);
    s.doc.setFontSize(7);
    s.doc.setTextColor(...COLORS.light);
    s.doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN - 16, PAGE_H - 8);
    s.doc.text(`SENTINEL AI — ${reportType.toUpperCase()} — ${generatedAt} — CONFIDENTIAL DRAFT`, MARGIN, PAGE_H - 8);
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const filename = `Sentinel-HSE-Report-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
