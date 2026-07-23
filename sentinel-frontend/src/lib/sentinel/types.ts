/** Severity bands — matches Stage 1 validate.py vocabulary exactly */
export type SeverityBand = "Low" | "Medium" | "High" | "Critical";

/** Decision outcomes from Stage 1 decide.py */
export type DecisionOutcome = "trusted" | "corrected" | "review" | "rejected";

/** Alert status */
export type AlertStatus = "active" | "acknowledged" | "resolved";

// ─── Risk Summary ───────────────────────────────────────────────────────────

export interface SiteRiskSummary {
  siteId: string;
  siteName: string;
  riskScore: number;
  severityBand: SeverityBand;
  incidentCount: number;
  lastAuditDate: string;
  daysSinceLastAudit: number;
  correctedRate: number;
  rejectedRate: number;
}

// ─── Alerts ─────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  siteId: string;
  siteName: string;
  severity: SeverityBand;
  status: AlertStatus;
  title: string;
  description: string;
  rule: string;
  recordIds: string[];
  createdAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

// ─── Data Quality ───────────────────────────────────────────────────────────

export interface DataQualitySummary {
  trusted: number;
  corrected: number;
  review: number;
  rejected: number;
  total: number;
  passRate: number;
  gateStatus: "passed" | "failed";
  threshold: number;
  lastBatchId: string;
  lastBatchDate: string;
}

export interface IngestBatch {
  batchId: string;
  sourceFilename: string;
  rowCount: number;
  sha256Checksum: string;
  ingestedAt: string;
  trustedCount: number;
  correctedCount: number;
  reviewCount: number;
  rejectedCount: number;
}

// ─── Site Detail ────────────────────────────────────────────────────────────

export interface Incident {
  incidentId: string;
  siteId: string;
  incidentDate: string;
  severity: SeverityBand;
  description: string;
  complianceScore: number;
  decision: DecisionOutcome;
  decisionReason: string;
  closedDate?: string;
}

export interface Audit {
  auditId: string;
  siteId: string;
  inspectionDate: string;
  auditor: string;
  findings: string;
  complianceScore: number;
  followUpRequired: boolean;
}

export interface SiteDetail {
  siteId: string;
  siteName: string;
  location: string;
  riskScore: number;
  severityBand: SeverityBand;
  incidents: Incident[];
  audits: Audit[];
}
