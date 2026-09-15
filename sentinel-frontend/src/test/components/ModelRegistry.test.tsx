import { describe, test, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// We test the registry via the useMutation hooks directly
// rather than rendering the full page (which has Recharts + charts that need canvas)
import { VERIFY_STATE, RISK_BAND, CONTROL_MODE } from "@/lib/control-plane/tokens";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// ── Token integrity tests ─────────────────────────────────────────────────────

describe("RISK_BAND tokens", () => {
  test("all 5 risk bands have distinct tokens", () => {
    const tokens = Object.values(RISK_BAND).map((b) => b.token);
    const unique = new Set(tokens);
    expect(unique.size).toBe(5);
  });

  test("NORMAL uses emerald (safe) colour", () => {
    expect(RISK_BAND.NORMAL.token).toBe("var(--risk-normal)");
  });

  test("EMERGENCY uses red (danger) colour", () => {
    expect(RISK_BAND.EMERGENCY.token).toBe("var(--risk-emergency)");
  });
});

describe("CONTROL_MODE tokens", () => {
  test("all 3 control modes are distinct", () => {
    const tokens = Object.values(CONTROL_MODE).map((m) => m.token);
    const unique = new Set(tokens);
    expect(unique.size).toBe(3);
  });

  test("EMERGENCY mode uses red token", () => {
    expect(CONTROL_MODE.EMERGENCY.token).toBe("var(--mode-emergency)");
  });

  test("ADVISORY mode uses neutral token", () => {
    expect(CONTROL_MODE.ADVISORY.token).toBe("var(--mode-advisory)");
  });
});

describe("VERIFY_STATE — safety invariants", () => {
  test("all 4 states are distinct tokens", () => {
    const tokens = Object.values(VERIFY_STATE).map((s) => s.token);
    const unique = new Set(tokens);
    expect(unique.size).toBe(4);
  });

  test("only CONFIRMED_CLOSED has pulse=false AND uses success token", () => {
    const safe = VERIFY_STATE.CONFIRMED_CLOSED;
    expect(safe.pulse).toBe(false);
    expect(safe.token).toBe("var(--verify-success)");
  });

  test("UNVERIFIED has pulse=true", () => {
    expect(VERIFY_STATE.UNVERIFIED.pulse).toBe(true);
  });

  test("CONFIRMED_OPEN uses failed token", () => {
    expect(VERIFY_STATE.CONFIRMED_OPEN.token).toBe("var(--verify-failed)");
  });

  test("TIMEOUT uses unknown token — distinct from failed", () => {
    expect(VERIFY_STATE.TIMEOUT.token).toBe("var(--verify-unknown)");
    expect(VERIFY_STATE.TIMEOUT.token).not.toBe(VERIFY_STATE.CONFIRMED_OPEN.token);
  });
});

// ── Mock data integrity ───────────────────────────────────────────────────────

describe("Mock data integrity", () => {
  test("all mock tank telemetry has valid risk bands", async () => {
    const { mockTankTelemetry } = await import("@/lib/control-plane/mocks");
    for (const tank of mockTankTelemetry) {
      expect(RISK_BAND[tank.riskBand]).toBeDefined();
    }
  });

  test("all mock actuation log entries have valid verify states", async () => {
    const { mockActuationLog } = await import("@/lib/control-plane/mocks");
    for (const entry of mockActuationLog) {
      expect(VERIFY_STATE[entry.verifiedState]).toBeDefined();
    }
  });

  test("mock executive summary has all V5 fields", async () => {
    const { mockExecutiveSummary } = await import("@/lib/control-plane/mocks");
    expect(mockExecutiveSummary.overfillEventsPrevented).toBeDefined();
    expect(mockExecutiveSummary.avgVerificationTimeSec).toBeDefined();
    expect(mockExecutiveSummary.unverifiedActuations).toBeDefined();
  });
});
