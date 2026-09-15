import { http, HttpResponse } from "msw";

// ── ML Admin ─────────────────────────────────────────────────────────────────

const mockChampion = {
  id: "1",
  version: "logreg_v1",
  algorithm: "logistic_regression",
  trainedAt: "2026-09-01T00:00:00Z",
  precisionScore: 0.619,
  recallScore: 0.677,
  f1Score: 0.647,
  status: "champion",
  featureImportance: [
    { feature: "days_since_last_audit", weight: 0.312 },
    { feature: "incident_count_30d", weight: 0.285 },
    { feature: "rejection_rate_30d", weight: 0.198 },
    { feature: "pressure_anomaly_count_14d", weight: 0.121 },
    { feature: "rejection_rate_7d", weight: 0.084 },
  ],
};

export const handlers = [
  // ML overview
  http.get("/api/proxy/ml/overview", () =>
    HttpResponse.json({ champion: mockChampion, challenger: null }),
  ),

  // ML model registry
  http.get("/api/proxy/ml/model-registry", () =>
    HttpResponse.json([
      { ...mockChampion, promotedAt: "2026-09-01T00:00:00Z" },
    ]),
  ),

  // ML predictions for review
  http.get("/api/proxy/ml/predictions-for-review", () =>
    HttpResponse.json([
      {
        predictionId: 1,
        siteId: "SITE-003",
        siteName: "Thange Corridor",
        probability: 0.82,
        confidenceBand: "uncertain",
        asOfDate: "2026-09-13",
        existingRating: null,
      },
      {
        predictionId: 2,
        siteId: "SITE-006",
        siteName: "Kisumu Terminal",
        probability: 0.67,
        confidenceBand: "low",
        asOfDate: "2026-09-13",
        existingRating: null,
      },
    ]),
  ),

  // ML feedback submission
  http.post("/api/proxy/ml/feedback", () =>
    HttpResponse.json({ id: "uuid-123", created: true }, { status: 201 }),
  ),

  // ML retrain trigger
  http.post("/api/proxy/ml/trigger-retrain", () =>
    HttpResponse.json({ message: "Retrain triggered", triggeredAt: new Date().toISOString() }),
  ),

  // ML promote / reject / rollback
  http.patch("/api/proxy/ml/model-registry/:id/promote", () =>
    HttpResponse.json({ message: "Model promoted successfully" }),
  ),
  http.patch("/api/proxy/ml/model-registry/:id/reject", () =>
    HttpResponse.json({ message: "Model rejected" }),
  ),
  http.patch("/api/proxy/ml/model-registry/:id/rollback", () =>
    HttpResponse.json({ message: "Model rolled back" }),
  ),

  // ── Executive ──────────────────────────────────────────────────────────────
  http.get("/api/proxy/executive/summary", () =>
    HttpResponse.json({
      overfillEventsPrevented: 7,
      estimatedLitresSaved: 87500,
      estimatedKesExposureAvoided: 612500000,
      systemUptimePercent: 99.7,
      avgResponseTimeSec: 3.2,
      avgVerificationTimeSec: 4.1,
      unverifiedActuations: 0,
      lastUpdated: new Date().toISOString(),
      period: "last_30_days",
    }),
  ),

  // ── Demo trigger ───────────────────────────────────────────────────────────
  http.post("/api/proxy/demo/trigger-overfill", () =>
    HttpResponse.json({
      message: "Overfill event seeded for SITE-003",
      tankLevelPct: 97.2,
      alertId: "alert-uuid-001",
      eventId: "event-uuid-001",
      actuationId: "act-uuid-001",
      slackSent: true,
    }),
  ),

  // ── Control Plane ──────────────────────────────────────────────────────────
  http.get("/api/proxy/tank-telemetry/live", () =>
    HttpResponse.json([
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
    ]),
  ),

  http.get("/api/proxy/interlock/rules", () =>
    HttpResponse.json([
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
    ]),
  ),

  http.put("/api/proxy/interlock/rules/:siteId/:ruleType", () =>
    HttpResponse.json({ message: "Control mode updated" }),
  ),

  http.get("/api/proxy/control-room/scenarios", () =>
    HttpResponse.json([
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
    ]),
  ),

  http.post("/api/proxy/control-room/run/:scenarioId", ({ params }) => {
    const { scenarioId } = params;
    return HttpResponse.json({
      scenarioId,
      steps: [
        { key: "sense", label: "Sense", status: "done", detail: "TK-04 @ 97.2%", timestampIso: new Date().toISOString() },
        { key: "understand", label: "Understand", status: "done", detail: "Rate: +0.21%/s" },
        { key: "predict", label: "Predict", status: "done", detail: "TTS: 38s" },
        { key: "decide", label: "Decide", status: "done", detail: "Score: CRITICAL" },
        { key: "interlock", label: "Interlock", status: "done", detail: "CLOSE_VALVE (CONTROLLED)" },
        { key: "verify", label: "Verify", status: "done", detail: "CONFIRMED_CLOSED" },
        { key: "learn", label: "Learn", status: "done", detail: "Feedback logged" },
      ],
      actuatorResponseRaw: {
        status: "simulated_success",
        actuator: "MOCK",
        latencyMs: 42,
        actuationId: "act-uuid-demo",
        message: "Simulated valve closure — production deployment would bind to KPC SCADA interface",
      },
    });
  }),

  http.get("/api/proxy/actuation-log", () =>
    HttpResponse.json([
      {
        id: "act-001",
        timestampIso: new Date(Date.now() - 3600000).toISOString(),
        siteName: "Thange Corridor",
        eventType: "overfill_risk",
        controlMode: "CONTROLLED",
        actionRequested: "CLOSE_VALVE",
        verifiedState: "CONFIRMED_CLOSED",
        verifiedAtIso: new Date(Date.now() - 3596000).toISOString(),
      },
      {
        id: "act-002",
        timestampIso: new Date(Date.now() - 7200000).toISOString(),
        siteName: "Nairobi Depot",
        eventType: "pressure_anomaly",
        controlMode: "ADVISORY",
        actionRequested: "CLOSE_VALVE",
        verifiedState: "TIMEOUT",
        verifiedAtIso: null,
      },
    ]),
  ),

  // ── Actuate ────────────────────────────────────────────────────────────────
  http.post("/api/proxy/actuate/close-valve", () =>
    HttpResponse.json({
      status: "simulated_success",
      actuator: "MOCK",
      latencyMs: 42,
      actuationId: "act-uuid-manual",
      message: "Simulated valve closure — production deployment would bind to KPC SCADA interface",
    }),
  ),

  // ── Event log ──────────────────────────────────────────────────────────────
  http.get("/api/proxy/event-log", () =>
    HttpResponse.json([
      {
        id: "evt-001",
        siteId: "SITE-003",
        tankId: "TK-04",
        signalType: "overfill_risk",
        severity: "CRITICAL",
        value: 97.2,
        threshold: 95.0,
        alertId: "alert-001",
        firedAt: new Date(Date.now() - 3600000).toISOString(),
      },
    ]),
  ),
];
