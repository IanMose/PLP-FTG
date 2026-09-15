// ── V5 Control Plane design tokens ──────────────────────────────────────────
// Typed accessors so components never hardcode a hex value.
// All colour values mirror the CSS custom properties in globals.css.

export const RISK_BAND = {
  NORMAL: { token: "var(--risk-normal)", label: "Normal", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  WATCH: { token: "var(--risk-watch)", label: "Watch", bg: "bg-sky-500/10", text: "text-sky-400" },
  WARNING: { token: "var(--risk-warning)", label: "Warning", bg: "bg-amber-500/10", text: "text-amber-400" },
  CRITICAL: { token: "var(--risk-critical)", label: "Critical", bg: "bg-orange-500/10", text: "text-orange-400" },
  EMERGENCY: { token: "var(--risk-emergency)", label: "Emergency", bg: "bg-red-500/10", text: "text-red-400" },
} as const;

export type RiskBandKey = keyof typeof RISK_BAND;

export const CONTROL_MODE = {
  ADVISORY: { token: "var(--mode-advisory)", label: "Advisory", bg: "bg-gray-500/10", text: "text-gray-400" },
  CONTROLLED: { token: "var(--mode-controlled)", label: "Controlled", bg: "bg-amber-500/10", text: "text-amber-400" },
  EMERGENCY: { token: "var(--mode-emergency)", label: "Emergency", bg: "bg-red-500/10", text: "text-red-400" },
} as const;

export type ControlModeKey = keyof typeof CONTROL_MODE;

// SAFETY-CRITICAL: UNVERIFIED must NEVER use the same colour as CONFIRMED_CLOSED.
// This mapping is tested in VerificationBadge.test.tsx.
export const VERIFY_STATE = {
  UNVERIFIED: {
    token: "var(--verify-pending)",
    label: "Verifying…",
    pulse: true,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
  },
  CONFIRMED_CLOSED: {
    token: "var(--verify-success)",
    label: "Confirmed closed",
    pulse: false,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
  },
  CONFIRMED_OPEN: {
    token: "var(--verify-failed)",
    label: "Action did not take effect",
    pulse: false,
    bg: "bg-red-500/10",
    text: "text-red-400",
  },
  TIMEOUT: {
    token: "var(--verify-unknown)",
    label: "Could not confirm",
    pulse: false,
    bg: "bg-orange-700/10",
    text: "text-orange-600",
  },
} as const;

export type VerifyStateKey = keyof typeof VERIFY_STATE;
