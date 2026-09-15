import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { TtsCountdown } from "@/components/control-plane/TtsCountdown";

describe("TtsCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("renders 'No active trend' when initialSeconds is null", () => {
    render(<TtsCountdown initialSeconds={null} />);
    expect(screen.getByText("No active trend")).toBeTruthy();
  });

  test("formats 38 seconds as '38s'", () => {
    render(<TtsCountdown initialSeconds={38} />);
    expect(screen.getByText("38s")).toBeTruthy();
  });

  test("formats 72 seconds as '1m 12s'", () => {
    render(<TtsCountdown initialSeconds={72} />);
    expect(screen.getByText("1m 12s")).toBeTruthy();
  });

  test("formats 60 seconds as '1m'", () => {
    render(<TtsCountdown initialSeconds={60} />);
    expect(screen.getByText("1m")).toBeTruthy();
  });

  test("formats 0 seconds as '0s'", () => {
    render(<TtsCountdown initialSeconds={0} />);
    expect(screen.getByText("0s")).toBeTruthy();
  });

  test("counts down by 1 per second", () => {
    render(<TtsCountdown initialSeconds={10} />);
    expect(screen.getByText("10s")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByText("9s")).toBeTruthy();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(screen.getByText("7s")).toBeTruthy();
  });

  test("shows OVERDUE when countdown reaches zero", () => {
    render(<TtsCountdown initialSeconds={2} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText("OVERDUE")).toBeTruthy();
  });

  test("re-syncs when initialSeconds prop changes", () => {
    const { rerender } = render(<TtsCountdown initialSeconds={10} />);
    act(() => { vi.advanceTimersByTime(3000); });
    expect(screen.getByText("7s")).toBeTruthy();
    // Parent polls fresh telemetry and provides new value
    rerender(<TtsCountdown initialSeconds={38} />);
    expect(screen.getByText("38s")).toBeTruthy();
  });
});
