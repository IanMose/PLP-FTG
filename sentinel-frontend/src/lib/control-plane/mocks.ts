// ── Mock data for all Control Plane endpoints ─────────────────────────────────
// Used when USE_MOCK_DATA=true (default until real backend endpoints are live).
// Remove the mock override in api.ts once Agent 1 has deployed the endpoints.

import type {
  TankTelemetry,
  InterlockRule,
  ControlRoomScenario,
  ControlRoomRunResult,
  ActuationLogEntry,
  ExecutiveSummaryV5,
  ChainStep,
} from "./types";

export const USE_MOCK_DATA =
  process.env.NEXT_PUBLIC_USE_MOCK_CONTROL_PLANE !== "false";

export const mockTankTelemetry: TankTelemetry[] = [
  {
    siteId: "SITE-003",
    siteName: "Thange Corridor",
    tankId: "TK-04",
    level: 88.1,
    flowRateLpm: 1240,
    levelRateOfChange: 0.21,
    timeToUnsafeLevelSec: 38,
    riskBand: "CRITICAL",
    loadingActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    siteId: "SITE-001",
    siteName: "Mombasa Terminal",
    tankId: "TK-01",
    level: 64.3,
    flowRateLpm: 310,
    levelRateOfChange: 0.01,
    timeToUnsafeLevelSec: null,
    riskBand: "NORMAL",
    loadingActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    siteId: "SITE-004",
    siteName: "Nairobi Depot",
    tankId: "TK-07",
    level: 74.8,
    flowRateLpm: 680,
    levelRateOfChange: 0.09,
    timeToUnsafeLevelSec: 285,
    riskBand: "WARNING",
    loadingActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    siteId: "SITE-006",
    siteName: "Kisumu Terminal",
    tankId: "TK-11",
    level: 42.5,
    flowRateLpm: 180,
    levelRateOfChange: null,
    timeToUnsafeLevelSec: null,
    riskBand: "NORMAL",
    loadingActive: false,
    updatedAt: new Date().toISOString(),
  },
];

export const mockInterlockRules: InterlockRule[] = [
  {
    id: 1,
    siteId: "SITE-003",
    siteName: "Thange Corridor",
    alertRuleType: "OVERFILL_RISK",
    controlMode: "CONTROLLED",
    updatedBy: "admin",
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    siteId: "SITE-003",
    siteName: "Thange Corridor",
    alertRuleType: "HIGH_REJECTION_RATE",
    controlMode: "ADVISORY",
    updatedBy: null,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    siteId: "SITE-004",
    siteName: "Nairobi Depot",
    alertRuleType: "OVERFILL_RISK",
    controlMode: "ADVISORY",
    updatedBy: null,
    updatedAt: new Date().toISOString(),
  },
];

export const mockScenarios: ControlRoomScenario[] = [
  {
    id: "thange-ramp",
    label: "Simulated Thange ramp",
    expectedOutcome: "INTERLOCK_TRIGGERED",
    displayOrder: 1,
  },
  {
    id: "high-rejection",
    label: "High rejection rate burst",
    expectedOutcome: "REJECTED",
    displayOrder: 2,
  },
  {
    id: "pressure-anomaly",
    label: "Pressure anomaly cluster",
    expectedOutcome: "NEEDS_REVIEW",
    displayOrder: 3,
  },
];

export function buildMockScenarioResult(scenarioId: string): ControlRoomRunResult {
  const steps: ChainStep[] = [
    { key: "sense", label: "Sense", status: "done", detail: "TK-04 @ 97.2%", timestampIso: new Date().toISOString() },
    { key: "understand", label: "Understand", status: "done", detail: "Rate: +0.21%/s" },
    { key: "predict", label: "Predict", status: "done", detail: "TTS: 38s" },
    { key: "decide", label: "Decide", status: "done", detail: "Score: CRITICAL" },
    { key: "interlock", label: "Interlock", status: "done", detail: "CLOSE_VALVE (CONTROLLED)" },
    { key: "verify", label: "Verify", status: "done", detail: "CONFIRMED_CLOSED" },
    { key: "learn", label: "Learn", status: "done", detail: "Feedback logged" },
  ];
  return {
    scenarioId,
    steps,
    actuatorResponseRaw: {
      status: "simulated_success",
      actuator: "MOCK",
      latencyMs: 42,
      actuationId: "act-uuid-demo",
      message:
        "Simulated valve closure — production deployment would bind to KPC SCADA interface",
    },
  };
}

export const mockActuationLog: ActuationLogEntry[] = [
  {
    id: "act-001",
    timestampIso: new Date(Date.now() - 3_600_000).toISOString(),
    siteName: "Thange Corridor",
    eventType: "overfill_risk",
    controlMode: "CONTROLLED",
    actionRequested: "CLOSE_VALVE",
    verifiedState: "CONFIRMED_CLOSED",
    verifiedAtIso: new Date(Date.now() - 3_596_000).toISOString(),
  },
  {
    id: "act-002",
    timestampIso: new Date(Date.now() - 7_200_000).toISOString(),
    siteName: "Nairobi Depot",
    eventType: "pressure_anomaly",
    controlMode: "ADVISORY",
    actionRequested: "CLOSE_VALVE",
    verifiedState: "TIMEOUT",
    verifiedAtIso: null,
  },
  {
    id: "act-003",
    timestampIso: new Date(Date.now() - 86_400_000).toISOString(),
    siteName: "Mombasa Terminal",
    eventType: "overfill_risk",
    controlMode: "CONTROLLED",
    actionRequested: "CLOSE_VALVE",
    verifiedState: "CONFIRMED_CLOSED",
    verifiedAtIso: new Date(Date.now() - 86_396_000).toISOString(),
  },
  {
    id: "act-004",
    timestampIso: new Date(Date.now() - 172_800_000).toISOString(),
    siteName: "Thange Corridor",
    eventType: "overfill_risk",
    controlMode: "EMERGENCY",
    actionRequested: "CLOSE_VALVE",
    verifiedState: "CONFIRMED_OPEN",
    verifiedAtIso: new Date(Date.now() - 172_795_000).toISOString(),
  },
];

export const mockExecutiveSummary: ExecutiveSummaryV5 = {
  overfillEventsPrevented: 7,
  estimatedLitresSaved: 87_500,
  estimatedKesExposureAvoided: 612_500_000,
  systemUptimePercent: 99.7,
  avgResponseTimeSec: 3.2,
  avgVerificationTimeSec: 4.1,
  unverifiedActuations: 0,
  lastUpdated: new Date().toISOString(),
  period: "last_30_days",
};
