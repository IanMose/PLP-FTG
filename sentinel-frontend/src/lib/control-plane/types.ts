import type { RISK_BAND, CONTROL_MODE, VERIFY_STATE } from "./tokens";

// ── Tank telemetry ────────────────────────────────────────────────────────────

export interface TankTelemetry {
  siteId: string;
  siteName: string;
  tankId: string;
  level: number; // percent 0–100
  flowRateLpm: number;
  levelRateOfChange: number | null; // percent per second; null when flat/decreasing
  timeToUnsafeLevelSec: number | null; // null when no active ramp
  riskBand: keyof typeof RISK_BAND;
  loadingActive: boolean;
  updatedAt: string; // ISO timestamp
}

// ── Interlock rules ───────────────────────────────────────────────────────────

export interface InterlockRule {
  id: number;
  siteId: string;
  siteName: string;
  alertRuleType: string; // e.g. "OVERFILL_RISK"
  controlMode: keyof typeof CONTROL_MODE;
  updatedBy: string | null;
  updatedAt: string;
}

// ── Event chain ───────────────────────────────────────────────────────────────

export type ChainStepKey =
  | "sense"
  | "understand"
  | "predict"
  | "decide"
  | "interlock"
  | "verify"
  | "learn";

export type ChainStepStatus = "pending" | "active" | "done" | "failed";

export interface ChainStep {
  key: ChainStepKey;
  label: string;
  status: ChainStepStatus;
  detail?: string; // "TTS: 38s", "actuator: MOCK", "CONFIRMED_CLOSED"
  timestampIso?: string;
}

// ── Control Room ──────────────────────────────────────────────────────────────

export interface ControlRoomScenario {
  id: string;
  label: string;
  expectedOutcome: "REJECTED" | "CORRECTED" | "NEEDS_REVIEW" | "INTERLOCK_TRIGGERED";
  displayOrder: number;
}

export interface ControlRoomRunResult {
  scenarioId: string;
  steps: ChainStep[];
  actuatorResponseRaw: Record<string, unknown> | null;
}

// ── Actuation log ─────────────────────────────────────────────────────────────

export interface ActuationLogEntry {
  id: string;
  timestampIso: string;
  siteName: string;
  eventType: string;
  controlMode: keyof typeof CONTROL_MODE;
  actionRequested: string;
  verifiedState: keyof typeof VERIFY_STATE;
  verifiedAtIso: string | null;
}

// ── Executive summary V5 ──────────────────────────────────────────────────────

export interface ExecutiveSummaryV5 {
  overfillEventsPrevented: number;
  estimatedLitresSaved: number;
  estimatedKesExposureAvoided: number;
  systemUptimePercent: number;
  avgResponseTimeSec: number;
  avgVerificationTimeSec: number;
  unverifiedActuations: number;
  lastUpdated: string;
  period: string;
}
