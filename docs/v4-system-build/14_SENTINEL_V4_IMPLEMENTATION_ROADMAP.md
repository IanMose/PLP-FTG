# 14 — Sentinel V4 Implementation Roadmap

> Each phase has a clear entry condition, a set of deliverables, and an exit criterion.
> Phases are sequential at the macro level; within each phase, agent workstreams run in parallel.

---

## Phase 0 — Discovery and Stabilization

**Entry condition:** These documents are complete and reviewed.

**Focus:** Fix every P0 item before touching features. Establish CI gates and test infrastructure.
**Owner:** Primarily Agent 4 (infra), Agent 1 (security fixes).

### Deliverables

| ID | Deliverable | Agent | Priority |
|---|---|---|---|
| P0-01 | Remove hardcoded JWT secret from application.yml and render.yaml | 1 | P0 |
| P0-02 | Rename duplicate Flyway V14/V15 migrations; re-enable validate-on-migrate | 4 | P0 |
| P0-07 | Fix ETL API key placeholder in render.yaml (`sync: false`) | 4 | P0 |
| P3-02 | Upgrade pom.xml to Java 21 + Spring Boot 3.4.x; update Dockerfile | 4 | P3 |
| P3-05 | Fix package.json name to `sentinel-frontend` | 2 | P3 |
| INFRA | Set up Testcontainers base class (`AbstractIntegrationTest.java`) | 4 | — |
| INFRA | Set up Vitest + MSW test infra in sentinel-frontend | 2 | — |
| INFRA | Add `application-test.yml` for Spring test profile | 4 | — |
| INFRA | Add JaCoCo plugin to pom.xml | 4 | — |
| CI | Add frontend lint + build job to ci.yml | 4 | — |
| CI | Add secret leakage grep check to ci.yml | 4 | — |
| CI | Add Flyway validate step to backend CI job | 4 | — |
| DOCS | Add `.env.local` and `sentinel/.env` to `.gitignore` | 4 | — |

### Exit Criteria

- [ ] `./mvnw flyway:validate` passes on fresh Testcontainers PostgreSQL.
- [ ] `./mvnw verify` builds and passes (even with zero business logic tests).
- [ ] CI pipeline passes with no secret leakage check failures.
- [ ] No hardcoded secrets in any committed file.
- [ ] Frontend `pnpm build` succeeds in CI.
- [ ] Java 21 Docker image builds and runs.

---

## Phase 1 — Foundation

**Entry condition:** Phase 0 exit criteria met.

**Focus:** Replace the file-based ETL handoff, implement the ML retrain loop, add the missing ML API endpoints, enforce RBAC, and add the first wave of tests.

**All four agents work in parallel within this phase.**

### Agent 1 Tasks (Phase 1)

| Task | Description |
|---|---|
| P0-03 | Rewrite AnalyticsService (4 methods) as DB-computed queries — no file reads |
| P0-06 | Add `POST /api/ml/model-registry`, `POST /api/ml/training-run`, `GET /api/ml/feedback-export`, `POST /api/ml/trigger-retrain` |
| P1-01 | Refactor EtlReloadService → EtlBatchService: read new rows by batch_id; remove file poll logic |
| P1-03 | Add `@PreAuthorize` to all write endpoints (ML, alert, CAPA, hazard, user) |
| P1-02 | Write unit tests: AlertRulesEngine (7 cases), RiskService (4 cases), DriftDetectionService (4 cases) |
| P1-02 | Write integration tests: auth (4 cases), analytics (3 cases), ETL push (3 cases) |

### Agent 2 Tasks (Phase 1)

| Task | Description |
|---|---|
| P1-05 | Create Route Handlers (`app/api/proxy/**`); remove all `document.cookie.match` patterns |
| P2-05 | Install TanStack Query v5; migrate ML Admin client pages (feedback, registry, training-runs, retraining-schedule) |
| P3-01 | Dynamic import for Leaflet RiskHeatmap component |
| TEST | Write Vitest component tests: FeedbackQueue (4 cases), ModelRegistry (5 cases) |
| TEST | Write MSW handlers for all existing API endpoints |

### Agent 3 Tasks (Phase 1)

| Task | Description |
|---|---|
| P0-04 | Implement `src/retrain.py` (full spec in doc 06) |
| P0-05 | Fix `src/predict.py` champion selection from model_registry API |
| P1-01 | Rewrite `src/load.py`: file output → psycopg2 direct DB writes |
| P1-04 | Add artifact_blob base64 encoding in retrain.py registration |
| DB | Add `sentinel/src/db.py` shared psycopg2 connection helper |
| TEST | Write `tests/test_retrain.py` (6 cases), `tests/test_predict.py` (3 cases), `tests/test_load.py` (5 cases) |

### Agent 4 Tasks (Phase 1)

| Task | Description |
|---|---|
| DB | Write V22__fact_tank_telemetry.sql (needed by Agent 1 + 3) |
| DB | Write V23__event_log.sql |
| DB | Write V24__actuation_log.sql |
| DB | Write V25__artifact_blob.sql |
| DB | Write V26__performance_indexes.sql |
| DB | Write V27__fact_site_features.sql |
| P3-03 | Add HikariCP settings to application.yml |
| INFRA | Write AbstractIntegrationTest.java (Testcontainers base) |

### Phase 1 Exit Criteria

- [ ] All analytics endpoints return 200 on a Render deployment with no warehouse directory.
- [ ] `POST /api/ml/model-registry` accepts a challenger registration and returns 201.
- [ ] `python -m src.load` writes to PostgreSQL; no `live_batch.json` created.
- [ ] `python -m src.retrain` (with ≥ 5 feedback rows) registers a challenger.
- [ ] `python -m src.predict` loads the champion from model_registry.
- [ ] All write endpoints return 403 for insufficient roles.
- [ ] Java service coverage ≥ 60% (AlertRulesEngine, RiskService, DriftDetectionService packages).
- [ ] Python test coverage ≥ 70%.
- [ ] Zero `document.cookie.match` patterns in frontend code.

---

## Phase 2 — Core V4 Features

**Entry condition:** Phase 1 exit criteria met and all Phase 1 branches merged to main.

**Focus:** Implement Stage 3 features (actuation, Slack, event log, tank telemetry pipeline) and the executive dashboard foundation.

### Agent 1 Tasks (Phase 2)

| Task | Description |
|---|---|
| Stage 3 F1 | Add overfill_risk AlertRule consuming `fact_tank_telemetry` |
| Stage 3 F2 | Implement EventPublisher and event_log repository |
| Stage 3 F3 | Implement ActuationTriggerService and `POST /api/actuate/close-valve` |
| Stage 3 F4 | Implement SlackNotificationService; wire into NarrativeService |
| Stage 3 F6 | Implement `GET /api/executive/summary` endpoint |
| P2-01 | Fix loadPredictions() N+1 queries (bulk existence check) |
| P2-03 | Add overfill-specific ROI line to RoiController |
| TEST | Write integration tests: actuation (3 cases), event_log (2 cases), Slack mock (1 case) |

### Agent 2 Tasks (Phase 2)

| Task | Description |
|---|---|
| Stage 3 F6 | Implement Executive Control Plane dashboard page (`/dashboard/executive`) |
| Stage 3 F8 | Scaffold Live Demo page (`/dashboard/demo`) — with MSW mocks for actuation/event APIs |
| P2-03 | Add overfill assumption row to ROI calculator |
| P2-05 | Continue TanStack Query migration (remaining pages) |
| TEST | Write Vitest tests: ExecutiveDashboard (3 cases), DemoTriggerButton (4 cases) |

### Agent 3 Tasks (Phase 2)

| Task | Description |
|---|---|
| Stage 3 F1 | Extend generate_data.py with tank telemetry (seeded overfill at SITE-003, SITE-006) |
| Stage 3 F1 | Add tank telemetry through pipeline: ingest → transform → decide (overfill_flag) → load |
| Stage 3 F1 | Add tank features to features.py: `tank_overfill_events_7d`, `avg_tank_level_pct_7d` |
| Stage 3 F1 | Add tank features to fact_site_features writes in predict.py/features.py |
| TEST | Write `tests/test_decide.py` (2 cases), extend `tests/test_validate.py` for tank |

### Agent 4 Tasks (Phase 2)

| Task | Description |
|---|---|
| Stage 3 F5 | Add deploy job to ci.yml (Render webhook trigger on merge to main) |
| P2-04 | Add EnvironmentalRetentionJob.java (weekly cleanup of fact_environmental + fact_tank_telemetry) |
| Stage 3 F5 | Document UptimeRobot configuration in ops runbook |
| CI | Add `TANK_TELEMETRY_ENABLED` feature flag to render.yaml (default: false until Phase 3 stable) |

### Phase 2 Exit Criteria

- [ ] `POST /api/demo/trigger-overfill` inserts tank telemetry, fires alert, logs event, logs actuation, sends Slack message — all within 5 seconds.
- [ ] Slack channel receives a message containing narrative text + actuation reference.
- [ ] Executive Control Plane page loads and displays 4 KPI cards.
- [ ] Tank telemetry data flows through the Python pipeline and appears in `fact_tank_telemetry`.
- [ ] CI deploy job triggers a Render deploy on merge to main.
- [ ] `TANK_TELEMETRY_ENABLED=true` can be set in render.yaml to activate the overfill alert rule.

---

## Phase 3 — ML/HITL Closure

**Entry condition:** Phase 2 exit criteria met.

**Focus:** Close the end-to-end ML loop (feedback → retrain → promote → predictions update), add drift monitoring enhancements, and verify the complete HITL cycle.

### Agent 1 Tasks (Phase 3)

| Task | Description |
|---|---|
| ML | Implement `POST /api/ml/trigger-retrain` to invoke retrain.py (subprocess or GitHub Actions dispatch) |
| ML | Wire retraining_schedule.status state machine in scheduled Spring job |
| ML | Drift detection enhancements: confidence trend, min sample check, auto-suggest CTA |

### Agent 2 Tasks (Phase 3)

| Task | Description |
|---|---|
| Stage 3 F8 | Complete Live Demo page with real API integration (remove MSW mocks) |
| ML UI | Add retrain lineage display to ML Admin Training Runs page |
| ML UI | Add feedback count since last retrain to ML Admin Overview |
| TEST | Write Playwright E2E: demo flow (1 test), ML promote flow (1 test), auth redirect (1 test) |

### Agent 3 Tasks (Phase 3)

| Task | Description |
|---|---|
| ML | Verify end-to-end: submit feedback → trigger retrain → challenger appears → promote → predict uses new model |
| ML | Add tank telemetry features to retrain.py feature set (with null handling for pre-V4 rows) |
| TEST | Write `tests/test_model_sanity.py` (4 cases) |

### Agent 4 Tasks (Phase 3)

| Task | Description |
|---|---|
| CI | Add model sanity test to CI pipeline (run after ETL + predict steps) |
| DOCS | Write Disaster Recovery Plan (Stage 3 Feature 9) |
| DOCS | Write Ops Manual + Support Handover (Stage 3 Feature 10) |
| INFRA | Set `TANK_TELEMETRY_ENABLED=true` in render.yaml after Phase 3 stability confirmed |

### Phase 3 Exit Criteria

- [ ] Complete feedback → retrain → promote → predictions cycle executes successfully end-to-end.
- [ ] After promotion, `fact_predictions.model_version` reflects the new champion version.
- [ ] ML Admin Portal Training Runs page shows the run with correct row counts.
- [ ] Model sanity tests pass: F1 ≥ 0.40, all probabilities in [0,1], not a constant predictor.
- [ ] Live Demo page shows the full detect → act → notify → report loop in < 10 seconds.
- [ ] Playwright E2E demo flow test passes against the live staging environment.

---

## Phase 4 — Integration and Hardening

**Entry condition:** Phase 3 exit criteria met.

**Focus:** Cross-service integration testing, security hardening, performance validation, and showcase preparation.

### All Agents (Phase 4)

| Task | Owner | Description |
|---|---|---|
| INTEGRATION | All | Rebase all branches on main; resolve any remaining conflicts |
| SECURITY | Agent 1+4 | Verify no secrets in committed code (CI check passes) |
| SECURITY | Agent 1 | Run through all 403 role-enforcement scenarios manually |
| PERF | Agent 4 | Verify cold start resolved (UptimeRobot active, Render service warm) |
| P3-04 | Agent 1 | Refactor AlertRulesEngine data context (preventative optimisation) |
| P3-06 | Agent 2 | Add remaining Vitest tests to reach coverage parity |
| TEST | Agent 4 | Run full E2E demo flow against production Render URL |
| DOCS | Agent 4 | Verify all docs/v4-system-build documents are accurate as-built |

### Phase 4 Exit Criteria

- [ ] All CI jobs pass on main branch.
- [ ] Live Render URL responds to `GET /actuator/health` with 200.
- [ ] Full 10-minute pitch demo can be completed without any system error.
- [ ] Failure-mode UAT: killing actuation endpoint → event still logs, alert still shows.
- [ ] Failure-mode UAT: invalid Slack webhook → alert still fires, actuation still logs.
- [ ] UptimeRobot shows 100% uptime in the 24 hours before showcase.

---

## Phase 5 — Production Readiness and Showcase

**Entry condition:** Phase 4 exit criteria met.

**Focus:** Final rehearsal, monitoring check, no new features.

| Task | Description |
|---|---|
| REHEARSAL | One full timed 10-minute pitch run including live demo button |
| MONITORING | Confirm UptimeRobot alert is wired to Slack channel |
| DEPLOY | Confirm latest main is deployed to Render |
| FREEZE | No new features, refactors, or "quick fixes" after rehearsal begins |
| QA PREP | Walk through all 4 Q&A scenarios (see Stage 3 plan §7, Feature 12) |

---

## Summary Timeline

```
Phase 0  (stabilization):  ~0.5 days — Agent 4 leads; critical before anything else
Phase 1  (foundation):     ~2 days   — All 4 agents in parallel
Phase 2  (Stage 3 features):~1.5 days — All 4 agents in parallel
Phase 3  (ML closure):     ~1 day    — Agent 3 leads; Agents 1+2 integrate
Phase 4  (hardening):      ~0.5 days — All agents; integration testing
Phase 5  (showcase):       ~0.5 days — No code changes
```

**Total V4 build window: 6 days** (matching the original Stage 3 planning cadence).
