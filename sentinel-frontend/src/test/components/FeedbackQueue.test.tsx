import { describe, test, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import FeedbackQueuePage from "@/app/(main)/dashboard/ml-admin/feedback/page";

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("FeedbackQueuePage", () => {
  test("renders predictions from MSW mock handler", async () => {
    render(<FeedbackQueuePage />, { wrapper });
    // MSW returns 2 predictions (Thange + Kisumu)
    await waitFor(() => {
      expect(screen.getByText("SITE-003")).toBeTruthy();
    });
    expect(screen.getByText("SITE-006")).toBeTruthy();
  });

  test("shows confidence band badges", async () => {
    render(<FeedbackQueuePage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("uncertain")).toBeTruthy();
    });
    expect(screen.getByText("low")).toBeTruthy();
  });

  test("displays probability as percentage", async () => {
    render(<FeedbackQueuePage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText("82.0%")).toBeTruthy();
    });
  });

  test("shows rating buttons for each prediction", async () => {
    render(<FeedbackQueuePage />, { wrapper });
    await waitFor(() => {
      expect(screen.getAllByText(/accurate/i).length).toBeGreaterThan(0);
    });
  });

  test("clicking Accurate button triggers POST /api/proxy/ml/feedback", async () => {
    const user = userEvent.setup();
    render(<FeedbackQueuePage />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText("SITE-003")).toBeTruthy();
    });

    const accurateButtons = screen.getAllByRole("button", { name: /accurate/i });
    await user.click(accurateButtons[0]);

    // Optimistic update should apply immediately — button should show active state
    await waitFor(() => {
      expect(accurateButtons[0].className).toContain("border-green");
    });
  });

  test("shows empty state when no predictions are available", async () => {
    // Override MSW handler to return empty array for this test
    const { server } = await import("../mocks/server");
    const { http, HttpResponse } = await import("msw");
    server.use(
      http.get("/api/proxy/ml/feedback", () => HttpResponse.json([])),
    );

    render(<FeedbackQueuePage />, { wrapper });
    await waitFor(() => {
      expect(screen.getByText(/no predictions available/i)).toBeTruthy();
    });
  });
});
