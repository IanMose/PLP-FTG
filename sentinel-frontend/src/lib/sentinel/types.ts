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

// ─── Compliance Intelligence ─────────────────────────────────────────────────

export type RagStatus = "GREEN" | "AMBER" | "RED";

export interface IndicatorScore {
  indicatorId: string;
  indicatorName: string;
  domainId: string;
  indicatorWeight: number;
  score: number;
  ragStatus: RagStatus;
  indicatorType: "LEADING" | "LAGGING" | "MIXED";
  numerator: number | null;
  denominator: number | null;
  greenThreshold: number;
  amberThreshold: number;
}

export interface DomainScore {
  domainId: string;
  domainName: string;
  domainWeight: number;
  score: number;
  ragStatus: RagStatus;
  displayOrder: number;
  indicators: IndicatorScore[];
}

export interface ComplianceSummary {
  siteId: string;
  siteName: string;
  overallScore: number;
  overallRag: RagStatus;
  domains: DomainScore[];
  openViolationCount: number;
  criticalViolationCount: number;
  periodStart: string;
  periodEnd: string;
  calculatedAt: string;
}

export interface SiteComplianceCard {
  siteId: string;
  siteName: string;
  region: string | null;
  criticality: string | null;
  overallScore: number;
  overallRag: RagStatus;
  safetyScore: number;
  safetyRag: RagStatus;
  environmentalScore: number;
  environmentalRag: RagStatus;
  assetIntegrityScore: number;
  assetIntegrityRag: RagStatus;
  regulatoryScore: number;
  regulatoryRag: RagStatus;
  openViolations: number;
}

export interface ComplianceNetworkSummary {
  sites: SiteComplianceCard[];
  networkOcs: number;
  networkSafetyScore: number;
  networkEnvironmentalScore: number;
  networkAssetIntegrityScore: number;
  networkRegulatoryScore: number;
  networkRag: RagStatus;
  totalOpenViolations: number;
  totalCriticalViolations: number;
  calculatedAt: string;
}

export interface ComplianceViolation {
  id: number;
  ruleId: string;
  ruleName: string;
  indicatorId: string;
  domainId: string;
  siteId: string;
  siteName: string;
  assetReference: string | null;
  severity: SeverityBand;
  violationDate: string;
  description: string;
  recommendedAction: string | null;
  status: string;
  closedDate: string | null;
  createdAt: string;
}

export interface ComplianceTrendPoint {
  weekStart: string;
  ocsScore: number | null;
  safetyScore: number | null;
  environmentalScore: number | null;
  assetIntegrityScore: number | null;
  regulatoryScore: number | null;
}
