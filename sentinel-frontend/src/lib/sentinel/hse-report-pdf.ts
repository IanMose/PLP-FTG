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
  s.doc.text("SENTINEL AI - HSE INCIDENT & SUSTAINABILITY IMPACT REPORT  |  CONFIDENTIAL DRAFT", MARGIN, 8);
}

function checkY(s: State, needed = 12) {
  if (s.y + needed > PAGE_H - 20) newPage(s);
}

function gap(s: State, mm = 4) {
  s.y += mm;
}

// ── Typography helpers ────────────────────────────────────────────────────────
// All helpers explicitly set font size + style + color before rendering.
// This prevents font state bleeding between sections.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function h1(s: State, text: string) {
  checkY(s, 14);
  s.doc.setFontSize(13);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  const lines: string[] = s.doc.splitTextToSize(text, CONTENT);
  lines.forEach((l: string, i: number) => {
    s.doc.text(l, MARGIN, s.y + i * 6);
  });
  s.y += lines.length * 6 + 2;
}

function h2(s: State, text: string, color = COLORS.dark) {
  checkY(s, 10);
  s.doc.setFontSize(10);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...color);
  const lines: string[] = s.doc.splitTextToSize(text, CONTENT);
  lines.forEach((l: string, i: number) => {
    s.doc.text(l, MARGIN, s.y + i * 5.5);
  });
  s.y += lines.length * 5.5 + 2;
}

function h3(s: State, text: string, color = COLORS.mid) {
  checkY(s, 8);
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...color);
  const lines: string[] = s.doc.splitTextToSize(text.toUpperCase(), CONTENT);
  lines.forEach((l: string, i: number) => {
    s.doc.text(l, MARGIN, s.y + i * 4.5);
  });
  s.y += lines.length * 4.5 + 2;
}

function body(s: State, text: string, indent = 0, color = COLORS.mid) {
  if (!text || text === "null" || text === "undefined") return;
  // Always reset to base body style
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...color);
  const maxW = CONTENT - indent;
  const lines: string[] = s.doc.splitTextToSize(text, maxW);
  for (const line of lines) {
    checkY(s, 5);
    s.doc.setFontSize(9);
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...color);
    s.doc.text(line, MARGIN + indent, s.y);
    s.y += 4.5;
  }
}

function bullet(s: State, text: string, indent = 4, dotColor = COLORS.violet) {
  if (!text) return;
  s.doc.setFontSize(9);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...COLORS.mid);
  const maxW = CONTENT - indent - 5;
  const lines: string[] = s.doc.splitTextToSize(text, maxW);
  for (let i = 0; i < lines.length; i++) {
    checkY(s, 5);
    if (i === 0) {
      s.doc.setFillColor(...dotColor);
      s.doc.circle(MARGIN + indent, s.y - 1.2, 0.8, "F");
    }
    s.doc.setFontSize(9);
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.mid);
    s.doc.text(lines[i], MARGIN + indent + 3, s.y);
    s.y += 4.5;
  }
}

function kv(s: State, label: string, value: unknown, indent = 0) {
  const val = String(value ?? "-");
  if (val === "null" || val === "undefined" || val === "" || val === "-") return;
  checkY(s, 5);
  // Fixed label column width (40mm) so values always start at the same x
  const labelColW = 42;
  s.doc.setFontSize(8.5);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  const labelLines: string[] = s.doc.splitTextToSize(label + ":", labelColW - 2);
  s.doc.text(labelLines[0], MARGIN + indent, s.y);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...COLORS.mid);
  const availW = CONTENT - indent - labelColW;
  const valLines: string[] = s.doc.splitTextToSize(val, availW);
  valLines.forEach((vl: string, vi: number) => {
    checkY(s, 5);
    s.doc.setFontSize(8.5);
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.mid);
    s.doc.text(vl, MARGIN + indent + labelColW, s.y + vi * 4.5);
  });
  s.y += Math.max(labelLines.length, valLines.length) * 4.5;
}

// ── Section header with coloured left bar + number badge ──────────────────────

function sectionHeader(
  s: State,
  number: string,
  title: string,
  color = COLORS.violet
) {
  checkY(s, 20);
  gap(s, 6);
  // Filled circle badge with number
  s.doc.setFillColor(...color);
  s.doc.circle(MARGIN + 4, s.y - 1, 4.5, "F");
  s.doc.setFontSize(7);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  // Center the number text in the circle
  const numW = s.doc.getTextWidth(number);
  s.doc.text(number, MARGIN + 4 - numW / 2, s.y + 0.8);
  // Title — wrap if needed, max width is content minus badge space
  s.doc.setFontSize(12);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  const titleW = CONTENT - 14;
  const titleLines2: string[] = s.doc.splitTextToSize(title, titleW);
  titleLines2.forEach((tl: string, ti: number) => {
    s.doc.text(tl, MARGIN + 11, s.y - 1 + ti * 5.5);
  });
  s.y += Math.max(6, (titleLines2.length - 1) * 5.5 + 6);
  // Full-width divider with colour fade — left portion colored, rest grey
  s.doc.setDrawColor(...color);
  s.doc.setLineWidth(0.6);
  s.doc.line(MARGIN, s.y, MARGIN + 40, s.y);
  s.doc.setDrawColor(...COLORS.border);
  s.doc.setLineWidth(0.3);
  s.doc.line(MARGIN + 40, s.y, PAGE_W - MARGIN, s.y);
  s.y += 5;
}

// ── Coloured info box ──────────────────────────────────────────────────────────

// Draws a small filled circle icon left of the label
function drawBoxIcon(s: State, type: "info" | "warning" | "check" | "alert", x: number, y: number) {
  const r = 2.2;
  if (type === "warning") {
    s.doc.setFillColor(...COLORS.amber);
    // Triangle-ish: draw filled rect as a simple diamond indicator
    s.doc.setDrawColor(...COLORS.amber);
    s.doc.setLineWidth(0.6);
    s.doc.line(x, y - r, x - r, y + r);
    s.doc.line(x - r, y + r, x + r, y + r);
    s.doc.line(x + r, y + r, x, y - r);
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(7);
    s.doc.setTextColor(...COLORS.amber);
    s.doc.text("!", x - 0.5, y + r - 0.5);
  } else if (type === "info") {
    s.doc.setFillColor(...COLORS.blue);
    s.doc.circle(x, y, r, "F");
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(7);
    s.doc.setTextColor(...COLORS.white);
    s.doc.text("i", x - 1, y + 1);
  } else if (type === "check") {
    s.doc.setFillColor(...COLORS.green);
    s.doc.circle(x, y, r, "F");
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(7);
    s.doc.setTextColor(...COLORS.white);
    s.doc.text("v", x - 1.2, y + 1);
  } else {
    s.doc.setFillColor(...COLORS.red);
    s.doc.circle(x, y, r, "F");
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(7);
    s.doc.setTextColor(...COLORS.white);
    s.doc.text("!", x - 0.5, y + 1);
  }
}

function infoBox(
  s: State,
  label: string,
  text: string,
  bgColor = COLORS.violetLight,
  textColor = COLORS.violet,
  iconType: "info" | "warning" | "check" | "alert" = "info"
) {
  if (!text) return;
  // textW: full content width minus left icon zone (14mm) minus right padding (6mm)
  const textW = CONTENT - 20;
  s.doc.setFontSize(8.5);
  s.doc.setFont("helvetica", "normal");
  const lines: string[] = s.doc.splitTextToSize(String(text), textW);
  const labelH = label ? 6 : 0;
  // Line height 4.5 + top padding 4 + label height + bottom padding 4
  const boxH = lines.length * 4.5 + labelH + 8;
  checkY(s, boxH + 4);
  // Background
  s.doc.setFillColor(...bgColor);
  s.doc.roundedRect(MARGIN, s.y, CONTENT, boxH, 2, 2, "F");
  // Left accent stripe
  s.doc.setFillColor(...textColor);
  s.doc.rect(MARGIN, s.y, 2.5, boxH, "F");
  // Icon at top-left of box
  drawBoxIcon(s, iconType, MARGIN + 7.5, s.y + 6);
  // Label (bold, same color as accent)
  if (label) {
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(8);
    s.doc.setTextColor(...textColor);
    s.doc.text(label, MARGIN + 13, s.y + 6);
  }
  // Body text — always 8.5pt normal, textColor
  s.doc.setFont("helvetica", "normal");
  s.doc.setFontSize(8.5);
  s.doc.setTextColor(...textColor);
  lines.forEach((line: string, i: number) => {
    s.doc.text(line, MARGIN + 13, s.y + 4 + labelH + i * 4.5);
  });
  s.y += boxH + 3;
}

function warningBox(s: State, text: string) {
  infoBox(s, "WARNING", text, COLORS.amberLight, COLORS.amber, "warning");
}

function disclaimerBox(s: State, text: string) {
  infoBox(s, "NOTE", text, COLORS.blueLight, COLORS.blue, "info");
}

function successBox(s: State, text: string) {
  infoBox(s, "VERIFIED", text, COLORS.greenLight, COLORS.green, "check");
}

function alertBox(s: State, text: string) {
  infoBox(s, "ALERT", text, COLORS.redLight, COLORS.red, "alert");
}

// ── Subsection card ───────────────────────────────────────────────────────────

function subCard(
  s: State,
  title: string,
  content: string,
  accentColor = COLORS.violet
) {
  if (!content) return;
  // textW: content width minus left accent (2.5mm) minus left padding (5mm) minus right padding (5mm)
  const textW = CONTENT - 12;
  s.doc.setFontSize(8.5);
  s.doc.setFont("helvetica", "normal");
  const lines: string[] = s.doc.splitTextToSize(content, textW);
  const cardH = lines.length * 4.5 + 14;
  checkY(s, cardH + 4);
  s.doc.setFillColor(...COLORS.surface);
  s.doc.roundedRect(MARGIN, s.y, CONTENT, cardH, 2, 2, "F");
  s.doc.setFillColor(...accentColor);
  s.doc.rect(MARGIN, s.y, 2.5, cardH, "F");
  s.doc.setFontSize(7.5);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...accentColor);
  s.doc.text(title.toUpperCase(), MARGIN + 5, s.y + 6);
  s.doc.setFontSize(8.5);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...COLORS.mid);
  lines.forEach((line: string, i: number) => {
    s.doc.text(line, MARGIN + 5, s.y + 12 + i * 4.5);
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
    const deadline = capa.suggestedDeadlineDays ? `${capa.suggestedDeadlineDays}d` : "-";
    const verify   = String(capa.verificationMethod ?? capa.verification ?? "");

    const actionLines: string[] = s.doc.splitTextToSize(action, cols[0].w - 3);
    const vLines: string[] = s.doc.splitTextToSize(verify, cols[4].w - 2);
    const roleLines: string[] = s.doc.splitTextToSize(role, cols[2].w - 2);
    // Row height driven by whichever column wraps the most
    const rowH = Math.max(
      actionLines.length * 4 + 4,
      vLines.length * 4 + 4,
      roleLines.length * 4 + 4,
      8
    );

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
    roleLines.forEach((line: string, li: number) => {
      s.doc.text(line, cx, s.y + 5 + li * 4);
    });
    cx += cols[2].w;

    s.doc.text(deadline, cx, s.y + 5);
    cx += cols[3].w;

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
    { label: "ESG Area",  w: 28 },
    { label: "Metric",    w: 56 },
    { label: "Value",     w: 28 },
    { label: "Source",    w: 28 },
    { label: "Status",    w: 34 },
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
    // Pre-calculate line wrapping for all columns that can wrap
    s.doc.setFontSize(8);
    const areaLines: string[]   = s.doc.splitTextToSize(m.area   || "", cols[0].w - 2);
    const metricLines: string[] = s.doc.splitTextToSize(m.metric || "", cols[1].w - 3);
    const valueLines: string[]  = s.doc.splitTextToSize(m.value  || "", cols[2].w - 2);
    const rowH = Math.max(
      areaLines.length * 4 + 3,
      metricLines.length * 4 + 3,
      valueLines.length * 4 + 3,
      7
    );

    checkY(s, rowH + 2);
    const areaColor =
      (m.area || "").startsWith("Environ") ? COLORS.green :
      m.area === "Social"                  ? COLORS.blue  :
                                             COLORS.violet;

    if (idx % 2 === 0) {
      s.doc.setFillColor(...COLORS.surface);
      s.doc.rect(MARGIN, s.y, CONTENT, rowH, "F");
    }

    s.doc.setFontSize(8);
    cx = MARGIN + 2;

    // Area — multiline, colored bold
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...areaColor);
    areaLines.forEach((line: string, li: number) => {
      s.doc.text(line, cx, s.y + 4.8 + li * 4);
    });
    cx += cols[0].w;

    // Metric — multiline, no hard cut
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.dark);
    metricLines.forEach((line: string, li: number) => {
      s.doc.text(line, cx, s.y + 4.8 + li * 4);
    });
    cx += cols[1].w;

    s.doc.setTextColor(...COLORS.mid);
    valueLines.forEach((line: string, li: number) => {
      s.doc.text(line, cx, s.y + 4.8 + li * 4);
    });
    cx += cols[2].w;

    s.doc.text((m.source || "").substring(0, 20), cx, s.y + 4.8);
    cx += cols[3].w;

    const statusColor =
      m.status === "VERIFIED"             ? COLORS.green  :
      m.status === "CALCULATED"           ? COLORS.blue   :
      m.status === "PENDING_VERIFICATION" ? COLORS.amber  :
                                            COLORS.light;
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...statusColor);
    // Shorten status display text to fit column
    const statusDisplay = (m.status || "")
      .replace("PENDING_VERIFICATION", "PENDING")
      .replace("CALCULATED", "CALC.")
      .substring(0, 18);
    s.doc.text(statusDisplay, cx, s.y + 4.8);

    s.doc.setDrawColor(...COLORS.border);
    s.doc.setLineWidth(0.2);
    s.doc.line(MARGIN, s.y + rowH, PAGE_W - MARGIN, s.y + rowH);
    s.y += rowH;
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
    s.doc.setFontSize(8);
    const kpiLines: string[] = s.doc.splitTextToSize(String(kpi.kpi ?? ""), cols[0].w - 3);
    const rowH = Math.max(kpiLines.length * 4 + 3, 7);
    checkY(s, rowH + 2);
    if (idx % 2 === 0) {
      s.doc.setFillColor(...COLORS.surface);
      s.doc.rect(MARGIN, s.y, CONTENT, rowH, "F");
    }
    s.doc.setFontSize(8);
    cx = MARGIN + 2;

    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.dark);
    kpiLines.forEach((line: string, li: number) => {
      s.doc.text(line, cx, s.y + 4.8 + li * 4);
    });
    cx += cols[0].w;

    s.doc.setTextColor(...COLORS.mid);
    s.doc.text(String(kpi.value ?? "-"), cx, s.y + 4.8);
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
    s.doc.line(MARGIN, s.y + rowH, PAGE_W - MARGIN, s.y + rowH);
    s.y += rowH;
  });
  s.y += 4;
}

// ── Risk level badge ──────────────────────────────────────────────────────────

function riskBadge(s: State, level: string, x = MARGIN, y = s.y) {
  const color =
    level === "CRITICAL" ? COLORS.red :
    level === "HIGH"     ? COLORS.orange :
    level === "MEDIUM"   ? COLORS.amber :
                           COLORS.green;
  const w = 28;
  s.doc.setFillColor(...color);
  s.doc.roundedRect(x, y - 4, w, 6, 1.5, 1.5, "F");
  s.doc.setFontSize(7.5);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  const lw = s.doc.getTextWidth(level);
  s.doc.text(level, x + (w - lw) / 2, y + 0.2);
}

// ── Cover page ────────────────────────────────────────────────────────────────

function coverPage(s: State, reportTitle: string, reportType: string, generatedAt: string) {
  // Full-height dark sidebar (left 55mm) — KPC brand identity
  s.doc.setFillColor(...COLORS.dark);
  s.doc.rect(0, 0, 55, PAGE_H, "F");

  // Violet accent stripe on the sidebar
  s.doc.setFillColor(...COLORS.violet);
  s.doc.rect(0, 0, 6, PAGE_H, "F");

  // Sidebar: "KPC" subtle large letters — use dark-on-dark instead of opacity (more reliable)
  s.doc.setFontSize(48);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(42, 38, 68); // slightly lighter than sidebar dark to create depth
  s.doc.text("KPC", 5, 125, { angle: 90 });

  // Sidebar: SENTINEL branding (top)
  s.doc.setFontSize(13);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  s.doc.text("SENTINEL", 10, 28);

  s.doc.setFontSize(6.5);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(160, 160, 200);
  s.doc.text("AI PIPELINE SAFETY", 10, 34);
  s.doc.text("& ESG MONITORING", 10, 39);

  // Sidebar: KPC label (bottom)
  s.doc.setFontSize(7);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.violet);
  s.doc.text("KENYA PIPELINE", 10, PAGE_H - 30);
  s.doc.text("COMPANY", 10, PAGE_H - 25);
  s.doc.setFontSize(6);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(120, 120, 160);
  s.doc.text("KPC | Sentinel AI", 10, PAGE_H - 19);

  // Right content area starts at x=65
  const RX = 65; // right zone left edge
  const RW = PAGE_W - RX - MARGIN; // right zone width

  // Top accent bar (right side only)
  s.doc.setFillColor(...COLORS.violet);
  s.doc.rect(55, 0, PAGE_W - 55, 3, "F");

  // Report type badge (top right)
  const badgeW = Math.min(RW, 75);
  s.doc.setFillColor(...COLORS.violet);
  s.doc.roundedRect(RX, 12, badgeW, 8, 2, 2, "F");
  s.doc.setFontSize(7.5);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  s.doc.text(reportType.toUpperCase(), RX + 4, 17.5);

  // CONFIDENTIAL DRAFT badge (beside report type)
  s.doc.setFillColor(...COLORS.amberLight);
  s.doc.roundedRect(RX + badgeW + 3, 12, 35, 8, 2, 2, "F");
  s.doc.setFontSize(6.5);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.amber);
  s.doc.text("CONFIDENTIAL DRAFT", RX + badgeW + 5, 17.5);

  // Report title — large, dark, left-aligned to right zone
  s.doc.setFontSize(15);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.dark);
  const titleLines: string[] = s.doc.splitTextToSize(reportTitle, RW);
  let ty = 38;
  titleLines.forEach((line: string, i: number) => {
    s.doc.text(line, RX, ty + i * 8);
  });
  let metaY = ty + titleLines.length * 8 + 4;

  // Coloured divider under title
  s.doc.setFillColor(...COLORS.violet);
  s.doc.rect(RX, metaY, 35, 1.5, "F");
  s.doc.setFillColor(...COLORS.border);
  s.doc.rect(RX + 35, metaY, RW - 35, 0.5, "F");
  metaY += 6;

  // Metadata grid
  const meta: [string, string, [number,number,number]][] = [
    ["Report Type",    reportType,                              COLORS.violet],
    ["Generated",      generatedAt,                            COLORS.mid],
    ["System",         "Sentinel AI HSE Reporting Agent",      COLORS.mid],
    ["Status",         "DRAFT - Requires HSE Professional Review", COLORS.amber],
    ["Classification", "Confidential",                         COLORS.red],
  ];
  meta.forEach(([label, value, valColor]) => {
    s.doc.setFontSize(7.5);
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...COLORS.dark);
    s.doc.text(label + ":", RX, metaY);
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...valColor);
    const valLines: string[] = s.doc.splitTextToSize(value, RW - 32);
    s.doc.text(valLines[0], RX + 32, metaY);
    metaY += 5.5;
  });
  metaY += 6;

  // Update state y for boxes below
  s.y = metaY;

  // AI disclaimer box (right zone only — reuse infoBox but positioned manually)
  s.doc.setFontSize(8);
  s.doc.setFont("helvetica", "normal");
  const disclaimText =
    "This report was generated by Sentinel AI using live operational data. " +
    "It is a DRAFT for HSE professional review. Root cause analysis, environmental impact, " +
    "legal liability, injury/fatality confirmation, and community impact require human " +
    "verification before this report may be used externally or submitted to regulators.";
  const disclaimLines: string[] = s.doc.splitTextToSize(disclaimText, RW - 8);
  const disclaimH = disclaimLines.length * 4 + 8;
  s.doc.setFillColor(...COLORS.blueLight);
  s.doc.roundedRect(RX, s.y, RW, disclaimH, 2, 2, "F");
  s.doc.setFillColor(...COLORS.blue);
  s.doc.rect(RX, s.y, 2.5, disclaimH, "F");
  drawBoxIcon(s, "info", RX + 7, s.y + 5);
  s.doc.setFont("helvetica", "bold");
  s.doc.setFontSize(7.5);
  s.doc.setTextColor(...COLORS.blue);
  s.doc.text("NOTE", RX + 12, s.y + 5);
  s.doc.setFont("helvetica", "normal");
  s.doc.setFontSize(8);
  disclaimLines.forEach((line: string, i: number) => {
    s.doc.text(line, RX + 12, s.y + 10 + i * 4);
  });
  s.y += disclaimH + 5;

  // Sinai/Thange context warning box (right zone)
  const warnText =
    "CONTEXT: The 2011 Nairobi Sinai pipeline fire (~100 lives) and the 2015 Thange River spill " +
    "(Kimeu & 3,074 others v. KPC, [2025] KEELC 5239 - KES 3.02 billion) both originated as " +
    "undetected valve/tank failures. Sentinel continuously monitors 7 KPC pipeline sites to close " +
    "exactly this gap. This report documents one such monitored event.";
  const warnLines: string[] = s.doc.splitTextToSize(warnText, RW - 8);
  const warnH = warnLines.length * 4 + 8;
  if (s.y + warnH < PAGE_H - 20) {
    s.doc.setFillColor(...COLORS.amberLight);
    s.doc.roundedRect(RX, s.y, RW, warnH, 2, 2, "F");
    s.doc.setFillColor(...COLORS.amber);
    s.doc.rect(RX, s.y, 2.5, warnH, "F");
    drawBoxIcon(s, "warning", RX + 7, s.y + 5);
    s.doc.setFont("helvetica", "bold");
    s.doc.setFontSize(7.5);
    s.doc.setTextColor(...COLORS.amber);
    s.doc.text("WARNING", RX + 12, s.y + 5);
    s.doc.setFont("helvetica", "normal");
    s.doc.setFontSize(8);
    warnLines.forEach((line: string, i: number) => {
      s.doc.text(line, RX + 12, s.y + 10 + i * 4);
    });
  }
  // Note: page numbers are added by the post-render footer loop — don't add here
}

// ── Table of contents ─────────────────────────────────────────────────────────

function tableOfContents(s: State, report: Record<string, unknown>) {
  newPage(s);

  // TOC header
  s.doc.setFillColor(...COLORS.dark);
  s.doc.rect(0, 0, PAGE_W, 18, "F");
  s.doc.setFillColor(...COLORS.violet);
  s.doc.rect(0, 0, 6, 18, "F");
  s.doc.setFontSize(11);
  s.doc.setFont("helvetica", "bold");
  s.doc.setTextColor(...COLORS.white);
  s.doc.text("TABLE OF CONTENTS", MARGIN, 12);

  s.y = 28;

  const sections = [
    { num: "01", title: "Executive Summary",                    color: COLORS.red    },
    { num: "02", title: "Incident Overview",                    color: COLORS.orange },
    { num: "03", title: "What Happened - Incident Narrative",   color: COLORS.blue   },
    { num: "04", title: "HSE Risk Assessment",                  color: COLORS.amber  },
    { num: "05", title: "Incident Timeline",                    color: COLORS.blue,
      note: report.timeline ? "" : "Derived from event data" },
    { num: "06", title: "Root Cause Analysis",                  color: COLORS.violet },
    { num: "07", title: "Corrective & Preventive Actions (CAPA)", color: COLORS.violet },
    { num: "08", title: "Environmental Impact Assessment",      color: COLORS.green  },
    { num: "09", title: "Community & Social Impact",            color: COLORS.blue   },
    { num: "10", title: "HSE KPIs",                             color: COLORS.violet },
    { num: "11", title: "ESG Connection",                       color: COLORS.violet },
    { num: "12", title: "ESG Reporting Data Table",             color: COLORS.dark   },
    { num: "13", title: "Management Insights",                  color: COLORS.dark   },
    { num: "14", title: "Early Warning Signals",                color: COLORS.amber  },
    { num: "15", title: "Reporting Confidence",                 color: COLORS.violet },
  ];

  sections.forEach((sec, i) => {
    const rowH = sec.note ? 10 : 7;
    checkY(s, rowH + 2);
    const isEven = i % 2 === 0;
    if (isEven) {
      s.doc.setFillColor(...COLORS.surface);
      s.doc.rect(MARGIN, s.y - 3, CONTENT, rowH, "F");
    }

    // Number badge
    s.doc.setFillColor(...sec.color);
    s.doc.circle(MARGIN + 5, s.y + 0.5, 3.5, "F");
    s.doc.setFontSize(6.5);
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...COLORS.white);
    const nw = s.doc.getTextWidth(sec.num);
    s.doc.text(sec.num, MARGIN + 5 - nw / 2, s.y + 1.3);

    // Title — truncate to fit before the dotted line
    const maxTitleW = CONTENT - 30;
    s.doc.setFontSize(9);
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.dark);
    const titleLines = s.doc.splitTextToSize(sec.title, maxTitleW);
    s.doc.text(titleLines[0], MARGIN + 12, s.y + 1);

    // Note on second line (never same line as title)
    if (sec.note) {
      s.doc.setFontSize(7);
      s.doc.setFont("helvetica", "normal");
      s.doc.setTextColor(...COLORS.light);
      s.doc.text(`(${sec.note})`, MARGIN + 13, s.y + 5.5);
    }

    // Dotted leader line — to the right of the title on the title line
    const titleEndX = MARGIN + 12 + s.doc.getTextWidth(titleLines[0]) + 2;
    s.doc.setDrawColor(...COLORS.border);
    s.doc.setLineWidth(0.2);
    s.doc.setLineDashPattern([0.5, 1], 0);
    s.doc.line(titleEndX, s.y + 0.5, PAGE_W - MARGIN - 8, s.y + 0.5);
    s.doc.setLineDashPattern([], 0);

    s.y += rowH;
  });

  // Note at bottom
  s.y += 6;
  s.doc.setFontSize(7.5);
  s.doc.setFont("helvetica", "normal");
  s.doc.setTextColor(...COLORS.light);
  s.doc.text("AI-generated report - DRAFT status. HSE professional review required before external use.", MARGIN, s.y);
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

  // ── TABLE OF CONTENTS ──────────────────────────────────────────────────────
  tableOfContents(s, report);

  // ── Content starts on a new page after ToC ────────────────────────────────
  newPage(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 1: EXECUTIVE SUMMARY
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "01", "Executive Summary", COLORS.red);

  const exec = report.executiveSummary ?? {};
  const headline = report.headline ?? exec.headline ?? exec.whatHappened ?? "";
  if (headline) infoBox(s, "", String(headline), COLORS.blueLight, COLORS.blue, "info");

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
    ["Severity",              exec.severity       ?? report.riskAssessment?.overallRisk ?? "-"],
    ["Immediate Risk",        exec.immediateRisk   ?? "-"],
    ["Environmental Impact",  exec.environmentalImpactOccurred === true ? "Confirmed - requires field verification" : "No confirmed release"],
    ["Sentinel Response",     exec.sentinelResponse ?? "-"],
    ["Response Time",         exec.responseTimeSeconds ? `${exec.responseTimeSeconds}s` : "-"],
    ["Current Status",        exec.currentStatus   ?? "-"],
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
    ["Total Events (30d)",         inc.totalEvents30d      ?? "-"],
    ["Overfill Events (30d)",      inc.overfillEvents30d   ?? "-"],
    ["High-Risk Site Events",      inc.highRiskSiteEvents  ?? "-"],
    ["Critical Events",            inc.criticalEvents      ?? "-"],
    ["System Status",              inc.status              ?? "-"],
    ["Period",                     report.period           ?? "Last 30 days"],
  ];
  incFields.forEach(([l, v]) => kv(s, l, v, 2));
  gap(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 3: WHAT HAPPENED — NARRATIVE
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "03", "What Happened - Incident Narrative", COLORS.blue);

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
    checkY(s, 12);
    s.doc.setFontSize(9);
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...COLORS.dark);
    s.doc.text("Overall Risk Level:", MARGIN, s.y);
    riskBadge(s, String(risk.overallRisk), MARGIN + 38, s.y);
    s.y += 9;
  }

  const riskAreas = [
    { label: "HEALTH & SAFETY",     key: "healthSafety",       color: COLORS.orange },
    { label: "ENVIRONMENTAL",       key: "environmental",      color: COLORS.green  },
    { label: "COMMUNITY",           key: "community",          color: COLORS.blue   },
    { label: "OPERATIONAL",         key: "operational",        color: COLORS.mid    },
    { label: "LEGAL & COMPLIANCE",  key: "legalAndCompliance", color: COLORS.violet },
    { label: "LEGAL & COMPLIANCE",  key: "legalCompliance",    color: COLORS.violet },
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
  // SECTION 5: INCIDENT TIMELINE
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "05", "Incident Timeline", COLORS.blue);

  // Use LLM-provided timeline if present, otherwise derive from event data in the report
  const rawTimeline = report.timeline ?? report.incidentTimeline;
  type TimelineEntry = { time: string; event: string; type?: "detect" | "response" | "action" | "status" };
  let timelineEntries: TimelineEntry[] = [];

  if (rawTimeline && Array.isArray(rawTimeline) && rawTimeline.length > 0) {
    timelineEntries = (rawTimeline as Record<string, unknown>[]).map(e => ({
      time:  String(e.time ?? e.t ?? ""),
      event: String(e.event ?? e.description ?? ""),
      type:  (e.type as TimelineEntry["type"]) ?? "status",
    }));
  } else {
    // Derive timeline from structured report data
    const exec2    = (report.executiveSummary ?? {}) as Record<string, unknown>;
    const narrative2 = (report.narrative ?? {}) as Record<string, unknown>;
    const rca2     = (report.rootCauseAnalysis ?? {}) as Record<string, unknown>;
    const detectedAt = String(report._generatedAt ?? generatedAt ?? "");

    if (exec2.responseTimeSeconds && Number(exec2.responseTimeSeconds) > 0) {
      const rtSec = Number(exec2.responseTimeSeconds);
      timelineEntries.push({ time: "T+0s",           event: "Sentinel detected overfill threshold breach via continuous telemetry monitoring.", type: "detect" });
      timelineEntries.push({ time: `T+${rtSec}s`,    event: exec2.sentinelResponse ? String(exec2.sentinelResponse) : "Automated valve shutdown command issued by Sentinel control plane.", type: "response" });
      timelineEntries.push({ time: "T+immediate",    event: "Incident recorded with full audit trail. HSE notification issued.", type: "action" });
    } else {
      // Build from narrative fields
      if (narrative2.whatSystemDetected)
        timelineEntries.push({ time: detectedAt || "Detection", event: String(narrative2.whatSystemDetected), type: "detect" });
      if (narrative2.whatSentinelDid)
        timelineEntries.push({ time: "Automated response", event: String(narrative2.whatSentinelDid), type: "response" });
      if (narrative2.whatHappenedAfterIntervention)
        timelineEntries.push({ time: "Post-intervention", event: String(narrative2.whatHappenedAfterIntervention), type: "status" });
    }

    // Add CAPA as next action
    const capaRecs2 = report.capaRecommendations ?? report.recommendations;
    if (Array.isArray(capaRecs2) && capaRecs2.length > 0) {
      const firstCapa = (capaRecs2[0] as Record<string, unknown>);
      const deadline  = firstCapa.suggestedDeadlineDays ? `Within ${firstCapa.suggestedDeadlineDays}d` : "Pending";
      timelineEntries.push({ time: deadline, event: String(firstCapa.action ?? "CAPA investigation and corrective action required."), type: "action" });
    }

    // Root cause investigation
    if ((rca2.requiresInvestigation as string[] | undefined)?.length) {
      timelineEntries.push({ time: "Pending investigation", event: "Root cause investigation required - see Section 6.", type: "action" });
    }

    if (timelineEntries.length === 0) {
      timelineEntries.push({ time: detectedAt || "Recorded", event: "Incident detected and recorded by Sentinel. Full investigation timeline requires HSE officer input.", type: "status" });
    }
  }

  // Render timeline as a visual vertical track
  timelineEntries.forEach((entry, i) => {
    checkY(s, 12);
    const dotColor: [number,number,number] =
      entry.type === "detect"   ? COLORS.red    :
      entry.type === "response" ? COLORS.green  :
      entry.type === "action"   ? COLORS.violet :
                                  COLORS.mid;

    // Vertical connecting line (except last)
    if (i < timelineEntries.length - 1) {
      s.doc.setDrawColor(...COLORS.border);
      s.doc.setLineWidth(0.5);
      s.doc.line(MARGIN + 5, s.y + 1, MARGIN + 5, s.y + 11);
    }

    // Circle marker
    s.doc.setFillColor(...dotColor);
    s.doc.circle(MARGIN + 5, s.y, 2.5, "F");

    // Time label
    s.doc.setFontSize(7.5);
    s.doc.setFont("helvetica", "bold");
    s.doc.setTextColor(...dotColor);
    s.doc.text(entry.time, MARGIN + 11, s.y + 1);

    // Event description (wrapping)
    const eventLines: string[] = s.doc.splitTextToSize(entry.event, CONTENT - 35);
    s.doc.setFontSize(8.5);
    s.doc.setFont("helvetica", "normal");
    s.doc.setTextColor(...COLORS.mid);
    const timeW = s.doc.getTextWidth(entry.time) + 4;
    eventLines.forEach((line: string, li: number) => {
      if (li === 0) {
        s.doc.text(line, MARGIN + 11 + timeW, s.y + 1);
      } else {
        checkY(s, 5);
        s.doc.text(line, MARGIN + 11, s.y + 4 + li * 4.5);
      }
    });
    s.y += Math.max(eventLines.length * 4.5 + 2, 10);
  });
  gap(s);

  // ══════════════════════════════════════════════════════════════════
  // SECTION 6: ROOT CAUSE ANALYSIS
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "06", "Root Cause Analysis", COLORS.violet);

  const rca = report.rootCauseAnalysis ?? {};
  if (rca.disclaimer) {
    alertBox(s, String(rca.disclaimer));
  } else {
    alertBox(s,
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
    h3(s, "AI Hypotheses - Requires Investigation", COLORS.blue);
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
    infoBox(s, "NOTE", String(capaSection.governanceNote), COLORS.violetLight, COLORS.violet, "info");
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
    successBox(s,
      "No confirmed environmental release reported at this stage. " +
      "Environmental impact assessment requires field verification by an environmental officer."
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
      { kpi: "Automated valve closures (30d)", value: auto.valveClosures30d ?? "-", period: "30d", trend: "-" },
      { kpi: "Avg automated response time",    value: auto.avgResponseTimeSec ?? "-", period: "30d", trend: "-" },
      { kpi: "Automation success rate",        value: auto.successRate ?? "-", period: "30d", trend: "-" },
      { kpi: "Estimated litres saved",         value: auto.litresSaved ?? "-", period: "30d", trend: "-" },
    ].filter(k => String(k.value) !== "-");
    if (autoKpis.length > 0) kpiTable(s, autoKpis);
    else body(s, "KPI data not available for this report type. Generate a Full HSE Report for complete KPIs.", 2, COLORS.light);
  }

  // ══════════════════════════════════════════════════════════════════
  // SECTION 11: ESG CONNECTION
  // ══════════════════════════════════════════════════════════════════
  sectionHeader(s, "11", "ESG Connection", COLORS.violet);

  const pillars = [
    { key: "environmental", label: "E - Environmental", color: COLORS.green  },
    { key: "social",        label: "S - Social",        color: COLORS.blue   },
    { key: "governance",    label: "G - Governance",    color: COLORS.violet },
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
      { area: "Environmental", metric: "Automated valve closures",       value: String(auto.valveClosures30d ?? "-"),   source: "Sentinel", status: "VERIFIED" },
      { area: "Environmental", metric: "Litres saved (estimate)",        value: String(auto.litresSaved ?? "-"),        source: "Calculated", status: "ESTIMATED" },
      { area: "Social",        metric: "Overfill events prevented",      value: String(inc2.overfillEvents30d ?? "-"),  source: "Sentinel", status: "VERIFIED" },
      { area: "Social",        metric: "High-risk site events",          value: String(inc2.highRiskSiteEvents ?? "-"), source: "Sentinel", status: "VERIFIED" },
      { area: "Governance",    metric: "CAPAs created (30d)",            value: String(capa2.created30d ?? "-"),        source: "Sentinel", status: "VERIFIED" },
      { area: "Governance",    metric: "CAPAs overdue",                  value: String(capa2.overdue ?? "-"),           source: "Sentinel", status: "VERIFIED" },
      { area: "Governance",    metric: "Avg automated response time",    value: String(auto.avgResponseTimeSec ?? "-"), source: "Sentinel", status: "CALCULATED" },
    ].filter(r => r.value !== "-" && r.value !== "undefined" && r.value !== "null");
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
    "Detect > Analyze > Draft > Review > Verify > Approve > Report. " +
    "This is the DRAFT stage. An HSE professional must review and approve before external use."
  );

  // Page numbers on all pages
  const totalPages = s.doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    s.doc.setPage(i);
    s.doc.setFontSize(7);
    s.doc.setTextColor(...COLORS.light);
    s.doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN - 16, PAGE_H - 8);
    s.doc.text(`SENTINEL AI - ${reportType.toUpperCase()} - ${generatedAt} - CONFIDENTIAL DRAFT`, MARGIN, PAGE_H - 8);
  }

  // ── Save ────────────────────────────────────────────────────────────────────
  const filename = `Sentinel-HSE-Report-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
