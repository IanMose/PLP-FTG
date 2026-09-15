/**
 * SAFETY-CRITICAL TEST FILE
 *
 * These tests enforce the colour-safety rule for VerificationBadge:
 *   UNVERIFIED must NEVER use the same token as CONFIRMED_CLOSED.
 *   TIMEOUT must NEVER use the same token as CONFIRMED_CLOSED.
 *
 * If any of these tests fail, the UI could display a dangerous-state
 * actuation as safe. Do not skip or disable these tests.
 */
import { describe, test, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerificationBadge } from "@/components/control-plane/badges/VerificationBadge";
import { VERIFY_STATE } from "@/lib/control-plane/tokens";

describe("VerificationBadge — safety-critical colour rules", () => {
  // CONFIRMED_CLOSED token (success green)
  const successToken = VERIFY_STATE.CONFIRMED_CLOSED.token;

  test("UNVERIFIED never uses the success (CONFIRMED_CLOSED) colour token", () => {
    expect(VERIFY_STATE.UNVERIFIED.token).not.toBe(successToken);
  });

  test("TIMEOUT never uses the success (CONFIRMED_CLOSED) colour token", () => {
    expect(VERIFY_STATE.TIMEOUT.token).not.toBe(successToken);
  });

  test("CONFIRMED_OPEN never uses the success (CONFIRMED_CLOSED) colour token", () => {
    expect(VERIFY_STATE.CONFIRMED_OPEN.token).not.toBe(successToken);
  });

  test("CONFIRMED_CLOSED renders with the success token", () => {
    const { container } = render(<VerificationBadge state="CONFIRMED_CLOSED" />);
    const dot = container.querySelector("[data-verify-state='CONFIRMED_CLOSED']");
    expect(dot).toBeTruthy();
    expect(dot?.getAttribute("data-verify-token")).toBe(successToken);
  });

  test("UNVERIFIED renders with the pending token (not success)", () => {
    const { container } = render(<VerificationBadge state="UNVERIFIED" />);
    const dot = container.querySelector("[data-verify-state='UNVERIFIED']");
    expect(dot).toBeTruthy();
    expect(dot?.getAttribute("data-verify-token")).toBe(VERIFY_STATE.UNVERIFIED.token);
    expect(dot?.getAttribute("data-verify-token")).not.toBe(successToken);
  });

  test("UNVERIFIED renders pulsing class", () => {
    const { container } = render(<VerificationBadge state="UNVERIFIED" />);
    const badge = container.querySelector("[data-verify-state='UNVERIFIED']");
    expect(badge?.className).toContain("verify-pending");
  });

  test("CONFIRMED_CLOSED does not render pulsing class", () => {
    const { container } = render(<VerificationBadge state="CONFIRMED_CLOSED" />);
    const badge = container.querySelector("[data-verify-state='CONFIRMED_CLOSED']");
    expect(badge?.className).not.toContain("verify-pending");
  });

  test("renders the human-readable label for CONFIRMED_CLOSED", () => {
    render(<VerificationBadge state="CONFIRMED_CLOSED" />);
    expect(screen.getByText("Confirmed closed")).toBeTruthy();
  });

  test("renders the human-readable label for UNVERIFIED", () => {
    render(<VerificationBadge state="UNVERIFIED" />);
    expect(screen.getByText("Verifying…")).toBeTruthy();
  });

  test("renders the human-readable label for TIMEOUT", () => {
    render(<VerificationBadge state="TIMEOUT" />);
    expect(screen.getByText("Could not confirm")).toBeTruthy();
  });
});
