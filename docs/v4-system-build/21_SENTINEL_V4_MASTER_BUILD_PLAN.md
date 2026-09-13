# 21 — Sentinel V4 Master Build Plan

> The primary reference document for the entire V4 build.
> All supporting documents are linked from this one.

---

## 1. What Sentinel Is

Sentinel is the HSE (Health, Safety and Environment) compliance intelligence platform built for Kenya Pipeline Company. It monitors incidents, audits, and pipeline telemetry across KPC's operational sites, scores risk, generates plain-language alerts, and provides a human-in-the-loop ML governance portal — and in V4, it adds an autonomous control plane: detect → decide → act → notify, all within seconds of a threshold breach.

It was built across three hackathon stages. Stage 1 established the ETL pipeline. Stage 2 added predictive ML and a production-grade React frontend. Stage 3 (V4) wraps the brain in production-grade APIs, event-driven automation, and executive-facing reporting.

---

## 2. Current System Summary (as of start of V4)

Three sub-projects in one repository:

| Sub-project | Language / Framework | Status |
|---|---|---|
| `sentinel/` | Python 3.11, Pandas, scikit-learn | Functional; needs file-handoff replaced and retrain.py added |
| `sentinel-backend/` | Spring Boot 3.3.2, Java 17, PostgreSQL 15 | Functional; analytics broken in prod; 0 backend tests; secrets in config |
| `sentinel-frontend/` | Next.js 16, React 19, TypeScript | Functional; token security issue; 0 frontend tests; Stage 3 pages missing |

**What works:** ETL pipeline, risk scoring, alert engine (3 rules), CAPA/hazard/work-order workflow, ML Admin portal (5 pages, full HITL UI), ROI calculator, survival/pressure/correlation analytics (local only).

**What is broken in production:**
- Analytics endpoints return HTTP 500 (no warehouse directory on Render).
- ML retrain loop never closes (`src/retrain.py` does not exist).
- `predict.py` uses a hardcoded model path — promotions never take effect.
- JWT secret is committed to version control.

**What Stage 3 still needs to build:**
- Tank-level telemetry schema + pipeline + seeded overfill case
- Event-driven actuation endpoint + event_log + actuation_log
- Slack alerting on High/Critical events
- Executive Control Plane dashboard
- Live "Trigger It" demo
- CI/CD deploy step + UptimeRobot monitoring

---

## 3. Current Architecture

```
Python (file output) → live_batch.json ← Spring Boot (polls every 2 min)
Python (file output) → predictions_export.json ← Spring Boot (reads)
Python (file output) → *.json warehouse files ← AnalyticsService (reads — BROKEN in prod)
```

The file-based handoff is the root cause of most production failures.

---

## 4. V4 Target Architecture

```
Python → psycopg2 → PostgreSQL ← Spring Boot (DB queries)
Python retrain.py  →  POST /api/ml/* (register challenger)
Spring Boot alert  →  Slack webhook
Spring Boot event  →  event_log, actuation_log (DB)
Next.js            →  REST API (Spring Boot)
Next.js proxy      →  Route Handlers (token security)
```

Full architecture diagram: **[05_SENTINEL_V4_TARGET_ARCHITECTURE.md](05_SENTINEL_V4_TARGET_ARCHITECTURE.md)**

---

## 5. Problems Identified and Solutions

### P0 — Critical (must fix before any feature work)

| Problem | Solution | Doc |
|---|---|---|
| JWT secret hardcoded in git | Remove to env var; rotate | [08 §P0-01](08_V4_FIX_TECHNICAL_DEBT_PLAN.md) |
| Duplicate Flyway V14/V15 versions | Rename to V14.1/V14.2, V15.1/V15.2; re-enable validate | [08 §P0-02](08_V4_FIX_TECHNICAL_DEBT_PLAN.md) |
| Analytics service returns 500 in prod | Rewrite as DB-computed queries | [08 §P0-03](08_V4_FIX_TECHNICAL_DEBT_PLAN.md) |
| `src/retrain.py` doesn't exist | Implement in full | [06](06_ML_HITL_V4_ARCHITECTURE.md), [17](17_AGENT_3_BUILD_PLAN.md) |
| `predict.py` uses hardcoded model path | Read champion from `model_registry` | [06 §5](06_ML_HITL_V4_ARCHITECTURE.md) |
| Missing ML API endpoints | Add `POST /api/ml/model-registry`, training-run, feedback-export, trigger-retrain | [15](15_AGENT_1_BUILD_PLAN.md) |
| ETL API key is placeholder | Remove from render.yaml; set in Render dashboard | [08 §P0-07](08_V4_FIX_TECHNICAL_DEBT_PLAN.md) |

### P1 — High (major functionality)

| Problem | Solution | Doc |
|---|---|---|
| File-based ETL handoff | psycopg2 direct writes from Python | [05](05_SENTINEL_V4_TARGET_ARCHITECTURE.md), [17](17_AGENT_3_BUILD_PLAN.md) |
| No backend tests | JUnit 5 + Testcontainers (60% coverage gate) | [13](13_V4_TESTING_STRATEGY.md) |
| RBAC not enforced server-side | Add `@PreAuthorize` to all write endpoints | [15](15_AGENT_1_BUILD_PLAN.md) |
| Model artifact lost on container restart | Store `artifact_blob` base64 in `model_registry` | [12](12_V4_DATA_AND_DATABASE_PLAN.md) |
| Frontend token via `document.cookie` regex | Route Handler proxy pattern | [16](16_AGENT_2_BUILD_PLAN.md) |

---

## 6. V4 Technology Decisions

| Decision | Rationale | Doc |
|---|---|---|
| Java 21 (upgrade from 17) | Virtual threads for blocking I/O (Slack, Groq, actuation calls) | [03 §2.1](03_V4_TECH_STACK_RECOMMENDATIONS.md) |
| psycopg2-binary for Python DB writes | Eliminate file-based handoff | [03 §2.4](03_V4_TECH_STACK_RECOMMENDATIONS.md) |
| TanStack Query v5 | Client-side data management; polling for alerts | [03 §2.5](03_V4_TECH_STACK_RECOMMENDATIONS.md) |
| Vitest + Playwright | Frontend test baseline | [03 §2.7](03_V4_TECH_STACK_RECOMMENDATIONS.md) |
| Slack Incoming Webhooks | Rubric requirement; zero infrastructure | [03 §2.8](03_V4_TECH_STACK_RECOMMENDATIONS.md) |
| UptimeRobot free tier | Keep Render warm; showcase reliability | [03 §2.9](03_V4_TECH_STACK_RECOMMENDATIONS.md) |
| No Kafka, no MLflow, no Redis | Out of proportion to scale | [03 §3](03_V4_TECH_STACK_RECOMMENDATIONS.md) |

---

## 7. ML / HITL Strategy

The feedback → retrain → champion cycle is the core ML lifecycle. V4 closes the loop that V3 left open:

```
model_feedback (from rating + CAPA closure)
    ↓
retrain.py (challenger training, base64 artifact, API registration)
    ↓
ML Admin Portal (compare metrics + feature importance diff)
    ↓
Human approves → champion promoted
    ↓
predict.py reads champion from model_registry (not hardcoded path)
    ↓
fact_predictions updated → alerts reflect new model
```

Key V4 principle: **human approval is always required before a new model serves live predictions**. Automation produces a challenger; a human decides whether it is trusted.

Full ML architecture: **[06_ML_HITL_V4_ARCHITECTURE.md](06_ML_HITL_V4_ARCHITECTURE.md)**

---

## 8. Four-Agent Division

| Agent | Domain | Primary files | Phase 0 role |
|---|---|---|---|
| **Agent 1** | Core Java backend | `sentinel-backend/src/main/java/` | Security fixes, analytics rewrite |
| **Agent 2** | Next.js frontend | `sentinel-frontend/` | Token fix, test infra setup |
| **Agent 3** | Python ETL + ML | `sentinel/` | psycopg2 rewrite, retrain.py |
| **Agent 4** | Infrastructure + DB | `pom.xml`, `db/migration/`, CI | **Runs first** — migrations, Java 21, test infra |

Full agent plans: **[09](09_MULTI_AGENT_V4_DEVELOPMENT_PLAN.md)**, **[15](15_AGENT_1_BUILD_PLAN.md)**, **[16](16_AGENT_2_BUILD_PLAN.md)**, **[17](17_AGENT_3_BUILD_PLAN.md)**, **[18](18_AGENT_4_BUILD_PLAN.md)**

Repository boundary rules: **[10_REPOSITORY_BOUNDARY_AND_INTEGRATION_RULES.md](10_REPOSITORY_BOUNDARY_AND_INTEGRATION_RULES.md)**

---

## 9. Database Strategy

**New V4 tables (Flyway V22–V27):**

| Migration | Table | Purpose |
|---|---|---|
| V22 | `fact_tank_telemetry` | Tank level + valve status + overfill flag |
| V23 | `event_log` | Event audit trail for every alert-triggered action |
| V24 | `actuation_log` | Simulated valve closure log |
| V25 | `artifact_blob` column | Base64 PKL storage for ephemeral-filesystem safety |
| V26 | (indexes) | Performance indexes for analytics + feedback queries |
| V27 | `fact_site_features` | Feature snapshot for retrain.py consumption |

All new tables use the same conventions as existing tables: UUIDs for primary keys, `ON CONFLICT DO NOTHING` on batch inserts, indexed on common query patterns.

Full DB plan: **[12_V4_DATA_AND_DATABASE_PLAN.md](12_V4_DATA_AND_DATABASE_PLAN.md)**

---

## 10. API Strategy

All endpoints documented at: **[11_V4_API_CONTRACTS.md](11_V4_API_CONTRACTS.md)**

Key new V4 endpoints:

| Endpoint | Purpose |
|---|---|
| `POST /api/actuate/close-valve` | Simulated valve shutdown — always returns `actuator: "MOCK"` |
| `POST /api/demo/trigger-overfill` | Injects seeded overfill row; triggers full detect→act→notify loop |
| `GET /api/executive/summary` | Board-level KPIs (events prevented, litres saved, KES avoided, uptime) |
| `GET /api/event-log` | Event audit trail |
| `GET /api/actuation-log` | Actuation audit trail |
| `POST /api/ml/model-registry` | Python registers a new challenger model |
| `POST /api/ml/training-run` | Python records a completed training run |
| `GET /api/ml/feedback-export` | Python fetches labeled feedback for retraining |
| `POST /api/ml/trigger-retrain` | ML Admin triggers retrain.py |

---

## 11. Testing Strategy Summary

| Layer | Framework | Coverage gate | CI gate |
|---|---|---|---|
| Python ETL | pytest | 70% | Yes |
| Java backend | JUnit 5 + Testcontainers | 60% services | Yes |
| Frontend | Vitest + RTL | — | Yes (build + lint) |
| E2E | Playwright | — | Manual + optional CI |
| Data quality | validate.py | ≥ 90% acceptance | Yes |
| Model sanity | pytest | F1 ≥ 0.40 | Yes |
| Secrets | grep | Zero occurrences | Yes |

Full strategy: **[13_V4_TESTING_STRATEGY.md](13_V4_TESTING_STRATEGY.md)**

---

## 12. Implementation Phases

| Phase | Duration | Focus | Key exits |
|---|---|---|---|
| **0 — Stabilization** | 0.5 days | P0 fixes, infra, migrations | Flyway validates; no secrets committed |
| **1 — Foundation** | 2 days | ETL handoff replaced, ML APIs, RBAC, tests | Analytics returns 200 in prod; retrain.py passes unit tests |
| **2 — Stage 3 Features** | 1.5 days | Actuation, Slack, tank telemetry, executive dashboard | Demo loop completes in < 10s; Slack message arrives |
| **3 — ML Closure** | 1 day | Full feedback→retrain→promote→predict cycle | logreg_v2 can be promoted and used for live predictions |
| **4 — Hardening** | 0.5 days | Integration tests, failure-mode UAT, security check | All CI gates pass; failure-mode UAT documented |
| **5 — Showcase** | 0.5 days | No new features; rehearsal; monitoring check | Demo run completes in 10 min; Render is live |

Full roadmap: **[14_SENTINEL_V4_IMPLEMENTATION_ROADMAP.md](14_SENTINEL_V4_IMPLEMENTATION_ROADMAP.md)**

Integration sequence: **[19_V4_AGENT_INTEGRATION_SEQUENCE.md](19_V4_AGENT_INTEGRATION_SEQUENCE.md)**

---

## 13. Critical Integration Rules

1. **Agent 4 merges to main first.** All other agents rebase on Agent 4's Phase 0 branch before starting.
2. **API contracts are documented before implementation.** See `11_V4_API_CONTRACTS.md`. Agent 2 builds against MSW mocks until real endpoints deploy.
3. **No secrets in committed files.** CI check fails on any occurrence of the old JWT secret or API key placeholder.
4. **Migrations are Agent 4's sole responsibility.** No other agent writes Flyway SQL files.
5. **Notification failures do not suppress alerts.** `SlackNotificationService` and `ActuationTriggerService` always wrap calls in try/catch. The alert must reach `alerts` and `event_log` regardless.
6. **Human approval is always required for model promotion.** No automation bypasses the "Approve & Promote" button in the ML Admin Portal.
7. **Hard stop in Phase 5.** No new features or refactors once rehearsal begins.

---

## 14. Showcase Talking Points

### The one sentence that matters most

*"The automation you just watched is the same class of event that produced the KES 3.02B Thange judgment — the difference is a valve closing in seconds instead of a leak running for hours."*

### Pre-rehearsed Q&A

**Q: Is this connected to real KPC systems?**
A: "No — it calls a simulated actuator, stated explicitly as `"actuator": "MOCK"` in every response. The production path is clear: this endpoint binds to KPC's SCADA/valve control interface. We're naming the interface honestly rather than implying a connection we don't have."

**Q: What happens if this fails in production?**
A: "Point to the Disaster Recovery Plan and the Failure-Mode UAT results. The key principle: notification failures — Slack down, actuation endpoint unresponsive — never suppress the underlying alert. The alert always logs, the dashboard always shows it."

**Q: Why should we trust an automated shutdown decision?**
A: "Every actuation decision is logged in `actuation_log` with an event reference, which traces back to the specific sensor reading that triggered it. The same audit discipline we use for the Stage 1 decision_log — every action is attributable and reversible by a human."

**Q: Why not use Kafka / real-time streaming?**
A: "Direct psycopg2 writes give us sub-5-second alert latency — the same result as a broker, at zero operational overhead. We'll introduce a broker if volume grows past what a single PostgreSQL instance handles cleanly."

---

## 15. Definition of Done for V4

The V4 build is complete when:

- [ ] All CI gates pass on main branch (security check, ETL tests, backend tests with ≥60% coverage, frontend lint + build, deploy trigger).
- [ ] `POST /api/demo/trigger-overfill` produces all 5 visible steps in the frontend within 10 seconds.
- [ ] A Slack message arrives in the #sentinel-alerts channel within 10 seconds of the demo trigger.
- [ ] `GET /api/analytics/feature-importance` returns 200 on the Render production URL (no warehouse directory needed).
- [ ] `python -m src.retrain` (with ≥5 feedback rows) registers a challenger in `model_registry`.
- [ ] After promoting that challenger, `python -m src.predict` uses the new model version.
- [ ] `GET /api/executive/summary` returns 4 numeric KPI fields.
- [ ] Zero occurrences of `document.cookie.match` in `sentinel-frontend/src/`.
- [ ] Zero hardcoded secrets in any committed file.
- [ ] Flyway `validate-on-migrate: true` is set and passes in all profiles.
- [ ] Failure-mode UAT documented: actuation failure → alert still logs; Slack failure → alert still fires.
- [ ] One full 10-minute rehearsal completed successfully.
- [ ] UptimeRobot shows the backend has been up for the 24 hours preceding the showcase.

---

## 16. Document Index

| # | Document | Purpose |
|---|---|---|
| 01 | [01_CURRENT_SYSTEM_IMPLEMENTATION_AUDIT.md](01_CURRENT_SYSTEM_IMPLEMENTATION_AUDIT.md) | What currently exists — source of truth for V4 starting point |
| 02 | [02_SENTINEL_V4_ARCHITECTURE_REVIEW.md](02_SENTINEL_V4_ARCHITECTURE_REVIEW.md) | 13 architectural problems with root causes and recommended solutions |
| 03 | [03_V4_TECH_STACK_RECOMMENDATIONS.md](03_V4_TECH_STACK_RECOMMENDATIONS.md) | Technology decisions — what to change, what to keep, what to defer |
| 04 | [04_PHASE_3_TO_V4_GAP_ANALYSIS.md](04_PHASE_3_TO_V4_GAP_ANALYSIS.md) | Stage 3 plan vs. current implementation — every gap catalogued |
| 05 | [05_SENTINEL_V4_TARGET_ARCHITECTURE.md](05_SENTINEL_V4_TARGET_ARCHITECTURE.md) | Full V4 system design with Mermaid diagrams and data flows |
| 06 | [06_ML_HITL_V4_ARCHITECTURE.md](06_ML_HITL_V4_ARCHITECTURE.md) | Complete ML lifecycle design: retrain.py spec, champion selection fix, drift |
| 07 | [07_PERFORMANCE_BOTTLENECK_ANALYSIS.md](07_PERFORMANCE_BOTTLENECK_ANALYSIS.md) | 17 bottlenecks with root causes and fixes |
| 08 | [08_V4_FIX_TECHNICAL_DEBT_PLAN.md](08_V4_FIX_TECHNICAL_DEBT_PLAN.md) | 22 debt items P0–P3 with exact file locations and acceptance criteria |
| 09 | [09_MULTI_AGENT_V4_DEVELOPMENT_PLAN.md](09_MULTI_AGENT_V4_DEVELOPMENT_PLAN.md) | Four-agent division: ownership, scope, integration points |
| 10 | [10_REPOSITORY_BOUNDARY_AND_INTEGRATION_RULES.md](10_REPOSITORY_BOUNDARY_AND_INTEGRATION_RULES.md) | Shared file rules, git strategy, conflict resolution, review checklist |
| 11 | [11_V4_API_CONTRACTS.md](11_V4_API_CONTRACTS.md) | 35+ API endpoints: method, auth, request, response, owner, consumer |
| 12 | [12_V4_DATA_AND_DATABASE_PLAN.md](12_V4_DATA_AND_DATABASE_PLAN.md) | New tables V22–V27, retention policies, data lineage, migration sequence |
| 13 | [13_V4_TESTING_STRATEGY.md](13_V4_TESTING_STRATEGY.md) | Full test pyramid: Python, Java, Frontend, E2E, security, CI gates |
| 14 | [14_SENTINEL_V4_IMPLEMENTATION_ROADMAP.md](14_SENTINEL_V4_IMPLEMENTATION_ROADMAP.md) | 5-phase roadmap with entry/exit criteria and per-agent task lists |
| 15 | [15_AGENT_1_BUILD_PLAN.md](15_AGENT_1_BUILD_PLAN.md) | Agent 1 (Core Backend) — independently executable build plan |
| 16 | [16_AGENT_2_BUILD_PLAN.md](16_AGENT_2_BUILD_PLAN.md) | Agent 2 (Frontend/UX) — independently executable build plan |
| 17 | [17_AGENT_3_BUILD_PLAN.md](17_AGENT_3_BUILD_PLAN.md) | Agent 3 (Data/ML/Python) — independently executable build plan |
| 18 | [18_AGENT_4_BUILD_PLAN.md](18_AGENT_4_BUILD_PLAN.md) | Agent 4 (Infrastructure/Quality) — independently executable build plan |
| 19 | [19_V4_AGENT_INTEGRATION_SEQUENCE.md](19_V4_AGENT_INTEGRATION_SEQUENCE.md) | Step-by-step merge sequence, dependency matrix, integration checkpoints |
| 20 | [20_V4_RISK_REGISTER.md](20_V4_RISK_REGISTER.md) | 17 risks with probability, impact, mitigation, contingency |
| 21 | [21_SENTINEL_V4_MASTER_BUILD_PLAN.md](21_SENTINEL_V4_MASTER_BUILD_PLAN.md) | This document — executive summary linking all supporting documents |
