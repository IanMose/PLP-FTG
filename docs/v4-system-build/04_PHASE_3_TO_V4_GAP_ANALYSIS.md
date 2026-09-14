# 04 — Phase 3 to V4 Gap Analysis

> Compares: **Existing implementation → Stage 3 plan → Desired V4 system**
> Source documents: `Sentinel-Stage3-Build-Plan.docx`, `ML-HITL-Portal-Build-Plan.md`, repository inspection.

---

## 1. Stage 3 Plan vs. Current Implementation

### Feature 1 — Tank-Level / Loading Telemetry Extension

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| New telemetry schema | `reading_id, timestamp, site, tank_id, tank_level_pct, flow_rate_bph, valve_status` | **Not implemented** | Full gap |
| Seeded overfill case | One/two sites with rising `tank_level_pct` > 95% and `valve_status = Open` | **Not implemented** | Full gap |
| Pipeline integration | Run through existing ingest → transform → validate → decide → load unchanged | **Not implemented** | Full gap |
| Validation rule | `tank_level_pct ∈ [0, 100]`, high-level flag (not rejection) | **Not implemented** | Full gap |
| DB migration | New table in Flyway | **Not implemented** | Full gap |

**Status: Not implemented. Entire feature is missing.**

---

### Feature 2 — Event-Driven Alert-to-Action Wrapper

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| Event schema | `{site, tank_id, signal_type, severity, value, threshold, timestamp}` | **Not implemented** | Full gap |
| Event publishing on High/Critical overfill | Internal call to `ActuationTriggerService` | **Not implemented** | Full gap |
| `event_log` table | New Flyway migration | **Not implemented** | Full gap |
| Automatic trigger (no manual step) | On alert evaluation if severity High+ and type overfill_risk | **Not implemented** | Full gap |

**Status: Not implemented. No event schema, no event_log table, no publishing.**

---

### Feature 3 — Simulated Actuation Endpoint

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| `POST /api/actuate/close-valve` | Returns `{status: "simulated_success", latency_ms, actuator: "MOCK"}` | **Not implemented** | Full gap |
| Automatic call from Feature 2 | Event wrapper calls actuation when threshold crossed | **Not implemented** (Feature 2 itself missing) | Full gap |
| `actuation_log` table | Flyway migration: `(event_id, action, result, timestamp)` | **Not implemented** | Full gap |
| Honest labelling | "MOCK" actuator clearly indicated in response | **Not implemented** | Full gap |

**Status: Not implemented. No endpoint, no log table.**

---

### Feature 4 — Slack Alerting Integration

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| Slack incoming webhook setup | Slack workspace + webhook URL | **Not implemented** | Full gap |
| NarrativeService → Slack | POST narrative text on High/Critical severity | **Not implemented** | Full gap |
| Actuation reference in message | Include `ref ACT-XXXXX` in Slack message | **Not implemented** (actuation doesn't exist yet) | Full gap |

**Status: Not implemented. No Slack integration anywhere in the codebase.**

---

### Feature 5 — CI/CD Deploy Pipeline + Health Monitoring

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| Deploy job in `ci.yml` | On merge to main: build + push to Render/Railway/Fly.io | **Not implemented** (deploy via Render webhook, not GH Actions) | Partial gap |
| `/health` endpoint | `GET /actuator/health` | **Fully implemented** | No gap |
| External uptime monitor | UptimeRobot or scheduled GH Action | **Not implemented** | Full gap |
| Monitor → Slack on failure | Health check failure posts to Slack channel | **Not implemented** | Full gap |

**Status: Health endpoint exists. Deploy job, uptime monitor, and failure alert are missing.**

---

### Feature 6 — Executive Control Plane Dashboard

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| New top-level page | Overfill events auto-prevented, litres saved, KES exposure avoided, system uptime | **Not implemented** | Full gap |
| Data source | Existing risk-score + alert data as translation layer | **Not implemented** | Full gap |
| Board-level reader UX | Large type, less density, plain-language | **Not implemented** | Full gap |

**Status: Not implemented.**

---

### Feature 7 — ROI Case Extension (Overfill-Specific)

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| New ROI calculator line | `P(shutdown prevents spill) × avg_litres_per_event × n_high_risk_alerts` | **Not implemented** | Partial gap |
| Existing ROI calculator | Interactive Kimeu reference case + assumptions table | **Fully implemented** | No gap |
| Honest labelling | Estimate clearly labelled | Existing calculator already does this | No gap |

**Status: ROI calculator exists and works. The overfill-specific line is missing.**

---

### Feature 8 — Live "Trigger It" Demo

| Criterion | Stage 3 Plan | Current State | Gap |
|---|---|---|---|
| Demo button on dashboard | "Simulate tank overfill at Site X" button | **Not implemented** | Full gap |
| Trigger endpoint | Injects seeded telemetry crossing threshold | **Not implemented** | Full gap |
| End-to-end loop | event fires → actuation logs → Slack arrives → counters update | **Not implemented** (all sub-components missing) | Full gap |

**Status: Not implemented. Requires Features 1–6 to exist first.**

---

## 2. HITL Build Plan vs. Current Implementation

The `ML-HITL-Portal-Build-Plan.md` defined a 10-day build sequence. Current status:

| Day | Task | Status |
|---|---|---|
| 1 | Create 3 new tables (`model_feedback`, `model_registry`, `training_run`) | **Done** (V16) |
| 2 | "Rate this prediction" widget + `POST /api/ml/feedback` | **Done** |
| 3 | CAPA closure → writes `model_feedback` row | **Done** |
| 4–5 | `src/retrain.py` — pulls feedback + features, retrains, saves challenger | **Not implemented** |
| 6 | `src/predict.py` loads champion from `model_registry` | **Partially done** — predict.py uses hardcoded `logreg_v1.pkl`; does not query `model_registry` |
| 7 | ML Admin Portal scaffold + Overview + Training Runs | **Done** |
| 8 | Feedback Queue page | **Done** |
| 9 | Model Registry / Compare & Approve | **Done** |
| 10 | End-to-end test: feedback → retrain → review → approve → predictions update | **Not possible** — retrain.py missing |

**Critical gap:** Day 4–6 (the actual ML loop) is not built. The portal UI is complete but there is nothing for it to govern because the retraining pipeline does not exist.

---

## 3. Outdated Assumptions in Stage 3 Plan

| Assumption | Reality Found in Repository | Impact |
|---|---|---|
| "Foundation/architecture lock on Day 1 (Wed 9)" | The architecture has significant debt (file handoff, duplicate Flyway versions, no retrain.py) that was not locked | V4 must address this debt before building Stage 3 features |
| "The current pipeline_telemetry table only carries pressure, flow, temperature" | `fact_environmental` exists and carries these + rainfall; `dim_asset` has 160+ monitoring points + pump stations + depots | Tank-level telemetry needs a new table (`fact_tank_telemetry`), not an extension of `fact_environmental` |
| "Stage 3 is not about writing new models" | `src/retrain.py` doesn't exist — the model loop is incomplete and must be built | This is strictly needed for a credible ML platform claim |
| "Existing CI gate tests" | CI gate has zero backend tests; Python tests cover only 3 of 8 pipeline modules | CI gate is weaker than assumed; test coverage is a precondition for safe V4 builds |
| "NarrativeService (built in Stage 2) to also POST to Slack" | NarrativeService exists and works; Slack integration has not been added | Low-effort add; no redesign needed |

---

## 4. Features to Remove

None. All existing features are working (analytics degradation noted but the frontend degrades gracefully). No feature should be removed in V4.

---

## 5. Features to Redesign

| Feature | Current | Redesign Required |
|---|---|---|
| ETL integration | File-based JSON poll | Replace with direct psycopg2 writes from Python to PostgreSQL |
| AnalyticsService | File proxy (fails in prod) | Replace with DB-computed queries |
| `src/predict.py` champion selection | Hardcoded `logreg_v1.pkl` | Read champion `artifact_path` from `model_registry` where `status = 'champion'` |
| Flyway migrations V14/V15 | Duplicate version numbers | Renumber to `V14.1`, `V14.2`, `V15.1`, `V15.2` |

---

## 6. Features to Add in V4

Ordered by priority:

| Priority | Feature | Source |
|---|---|---|
| P0 | Fix duplicate Flyway versions | Architecture debt |
| P0 | Remove hardcoded JWT secret | Security |
| P0 | Replace file-based ETL with psycopg2 direct writes | Architecture |
| P0 | Implement `src/retrain.py` | ML HITL plan |
| P0 | Fix `src/predict.py` to read champion from `model_registry` | ML HITL plan |
| P0 | Replace AnalyticsService file proxy with DB queries | Architecture |
| P1 | Tank-level telemetry schema + data generation | Stage 3 Feature 1 |
| P1 | Event-driven wrapper + `event_log` table | Stage 3 Feature 2 |
| P1 | Simulated actuation endpoint + `actuation_log` | Stage 3 Feature 3 |
| P1 | Slack webhook integration in NarrativeService | Stage 3 Feature 4 |
| P1 | CI/CD deploy job + UptimeRobot | Stage 3 Feature 5 |
| P1 | Executive Control Plane dashboard page | Stage 3 Feature 6 |
| P1 | Add `POST /api/ml/training-run` + `POST /api/ml/model-registry` endpoints | ML HITL plan |
| P1 | Backend unit tests (AlertRulesEngine, RiskService, etc.) | Architecture debt |
| P2 | ROI overfill-specific calculator line | Stage 3 Feature 7 |
| P2 | Live "Trigger It" demo button | Stage 3 Feature 8 |
| P2 | Frontend: replace `document.cookie` regex with Route Handler BFF | Security |
| P2 | Add TanStack Query client-side polling | Frontend quality |
| P3 | Frontend tests (Vitest + Playwright) | Testing |
| P3 | Disaster Recovery Plan document | Stage 3 Feature 9 |
| P3 | Ops Manual + Support Handover document | Stage 3 Feature 10 |

---

## 7. Features to Postpone to V5

| Feature | Reason |
|---|---|
| Real SCADA/valve integration | Not available; explicitly flagged in Stage 3 plan as honest future work |
| Kafka/event broker | Out of scale; psycopg2 direct writes solve the integration problem |
| Grafana + Prometheus stack | Health check + Slack covers Stage 3 monitoring requirement |
| Automated model promotion | Requires trusted manual history first |
| SHAP per-prediction explainability | Requires model scoring at inference time; batch scoring is sufficient for V4 |
| Multi-reviewer consensus | Feedback volume insufficient to require it |
| Report PDF export | Useful but not graded or required for V4 |
