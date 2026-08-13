/** Severity bands — matches Stage 1 validate.py vocabulary exactly */
export type SeverityBand = "Low" | "Medium" | "High" | "Critical";

/** Decision outcomes from Stage 1 decide.py */
export type DecisionOutcome = "trusted" | "corrected" | "review" | "rejected";

/** Alert status */
export type AlertStatus = "active" | "acknowledged" | "resolved";

// Risk Summary

export interface SiteRiskSummary {
  siteId: string;
  siteName: string;
  latitude: number;
  longitude: number;
  riskScore: number;
  severityBand: SeverityBand;
  incidentCount: number;
  pressureSpikeCount: number;
  lastAuditDate: string;
  daysSinceLastAudit: number;
  correctedRate: number;
  rejectedRate: number;
}

// Alerts

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

// Data Quality

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

// Telemetry

export interface TelemetryReading {
  readingId: string;
  timestamp: string;
  site: string;
  pipelineSection: string;
  pressurePsi: number | null;
  flowRateBph: number | null;
  temperatureCelsius: number | null;
  valveStatus: string;
  sensorId: string;
}

export interface TelemetrySummary {
  totalReadings: number;
  pressureSpikeCount: number;
  sensorDropoutCount: number;
  avgPressure: number;
  avgFlowRate: number;
  avgTemperature: number;
}

// Site Detail

export interface Incident {
  incidentId: string;
  siteId: string;
  latitude?: number;
  longitude?: number;
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
  latitude: number;
  longitude: number;
  riskScore: number;
  severityBand: SeverityBand;
  pressureSpikeCount: number;
  // Risk formula inputs — used by breakdown panel and what-if slider
  incidentCount: number;
  critHighCount: number;
  daysSinceAudit: number;
  rejectedRate: number;
  incidents: Incident[];
  audits: Audit[];
  telemetryReadings: TelemetryReading[];
}

// What-If Simulation

export interface WhatIfRequest {
  incidentCountOverride?: number;
  critHighPercentOverride?: number;  // 0-100 percentage
  daysSinceAuditOverride?: number;
  rejectionRateOverride?: number;    // 0.0-1.0 fraction
  pressureSpikesOverride?: number;
}

export interface WhatIfResponse {
  currentScore: number;
  currentBand: SeverityBand;
  simulatedScore: number;
  simulatedBand: SeverityBand;
  scoreDelta: number;
  incidentFrequencyContrib: number;  // max 30.0
  severityMixContrib: number;        // max 30.0
  auditRecencyContrib: number;       // max 20.0
  rejectionRateContrib: number;      // max 10.0
  pressureSpikesContrib: number;     // max 10.0
  liveDaysSinceAudit: number;
  liveIncidentCount: number;
  liveCritHighPercent: number;
  liveRejectionRate: number;
  livePressureSpikes: number;
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
