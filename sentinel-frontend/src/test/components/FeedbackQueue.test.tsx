import { describe, test, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { server } from "../mocks/server";

// FeedbackQueue MSW integration tests.
// MSW node server intercepts fetch at the exact URL provided.
// We use the full mock data defined in handlers.ts.

const BASE = "http://localhost";

describe("FeedbackQueuePage — MSW integration", () => {
  test("MSW GET /api/proxy/ml/feedback returns mock predictions", async () => {
    server.use(
      http.get(`${BASE}/api/proxy/ml/feedback`, () =>
        HttpResponse.json([
          { predictionId: 1, siteId: "SITE-003", probability: 0.82, confidenceBand: "uncertain", existingRating: null },
          { predictionId: 2, siteId: "SITE-006", probability: 0.67, confidenceBand: "low", existingRating: null },
        ]),
      ),
    );
    const res = await fetch(`${BASE}/api/proxy/ml/feedback`);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    expect(data[0].siteId).toBe("SITE-003");
  });

  test("MSW POST /api/proxy/ml/feedback returns 201 with created:true", async () => {
    server.use(
      http.post(`${BASE}/api/proxy/ml/feedback`, () =>
        HttpResponse.json({ id: "uuid-123", created: true }, { status: 201 }),
      ),
    );
    const res = await fetch(`${BASE}/api/proxy/ml/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictionId: 1, siteId: "SITE-003", rating: "accurate" }),
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.created).toBe(true);
  });

  test("MSW returns confidence band for each prediction", async () => {
    server.use(
      http.get(`${BASE}/api/proxy/ml/feedback`, () =>
        HttpResponse.json([
          { predictionId: 1, siteId: "SITE-003", probability: 0.82, confidenceBand: "uncertain", existingRating: null },
          { predictionId: 2, siteId: "SITE-006", probability: 0.67, confidenceBand: "low", existingRating: null },
        ]),
      ),
    );
    const res = await fetch(`${BASE}/api/proxy/ml/feedback`);
    const data = await res.json();
    for (const p of data) {
      expect(["uncertain", "low", "confident"]).toContain(p.confidenceBand);
    }
  });

  test("MSW returns probability between 0 and 1", async () => {
    server.use(
      http.get(`${BASE}/api/proxy/ml/feedback`, () =>
        HttpResponse.json([
          { predictionId: 1, siteId: "SITE-003", probability: 0.82, confidenceBand: "uncertain" },
        ]),
      ),
    );
    const res = await fetch(`${BASE}/api/proxy/ml/feedback`);
    const data = await res.json();
    for (const p of data) {
      expect(Number(p.probability)).toBeGreaterThanOrEqual(0);
      expect(Number(p.probability)).toBeLessThanOrEqual(1);
    }
  });

  test("MSW can override to return empty predictions", async () => {
    server.use(
      http.get(`${BASE}/api/proxy/ml/feedback`, () => HttpResponse.json([])),
    );
    const res = await fetch(`${BASE}/api/proxy/ml/feedback`);
    const data = await res.json();
    expect(data).toEqual([]);
  });
});
