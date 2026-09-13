# 09 — Multi-Agent V4 Development Plan

> Four independent workstreams designed to run in parallel with minimal file conflicts.
> Boundaries are set by **ownership** (who owns which files/directories), not by arbitrary feature count.

---

## 1. Division Rationale

The repository has three natural sub-projects: `sentinel/` (Python), `sentinel-backend/` (Java), and `sentinel-frontend/` (Next.js). A naive split would give each sub-project to one agent — but that leaves the fourth agent idle, and it creates a bottleneck where one agent owns both the most critical debt fixes (backend P0s) and all new Stage 3 backend features.

The V4 split is:

| Agent | Domain | Primary Sub-Project |
|---|---|---|
| **Agent 1 — Core Backend** | Java business logic, APIs, security, alert/event/actuation system | `sentinel-backend/` (core modules) |
| **Agent 2 — Frontend / UX** | All Next.js pages, components, API integration, Stage 3 UI features | `sentinel-frontend/` |
| **Agent 3 — Data / ML / Python** | Python ETL, ML lifecycle, retrain.py, psycopg2 integration | `sentinel/` |
| **Agent 4 — Infrastructure / Quality** | Docker, CI/CD, DB migrations, testing infra, observability | `sentinel-backend/` (infra), `.github/`, root config |

**Key boundary:** Agent 1 and Agent 4 both work in `sentinel-backend/`, but on strictly separate layers:
- Agent 1 owns `src/main/java/com/sentinel/**` (business logic)
- Agent 4 owns `src/main/resources/db/migration/`, `Dockerfile`, `pom.xml`, CI files, and test infra in `src/test/`

---

## 2. Agent 1 — Core Backend

### Mission
Eliminate all P0/P1 backend security and functionality defects, implement the Stage 3 control-plane services (event, actuation, Slack), complete the ML Admin API surface, and enforce RBAC across all endpoints.

### Scope

**Owns:**
```
sentinel-backend/src/main/java/com/sentinel/
├── alert/          (AlertRulesEngine + NarrativeService + SlackNotificationService NEW)
├── actuation/      (NEW — ActuationTriggerService, ActuationController, ActuationLog)
├── event/          (NEW — EventPublisher, EventLogRepository)
├── analytics/      (rewrite AnalyticsService from file proxy to DB queries)
├── auth/           (JWT secret fix, @PreAuthorize additions)
├── capa/           (no new features; add role enforcement)
├── corridor/       (no new features)
├── demo/           (NEW — DemoController POST /api/demo/trigger-overfill)
├── etl/            (EtlBatchService refactor — remove file polling)
├── executive/      (NEW — ExecutiveSummaryController GET /api/executive/summary)
├── hazard/         (add role enforcement)
├── ingestion/      (EtlPushController — fix API key placeholder warning)
├── maintenance/    (no new features; add role enforcement)
├── ml/             (add 4 new endpoints: POST model-registry, POST training-run,
│                    GET feedback-export, POST trigger-retrain)
├── prediction/     (no changes)
├── risk/           (extend for tank telemetry when table exists)
├── roi/            (add overfill-specific line)
├── site/           (no changes)
├── spi/            (no changes)
└── user/           (add role enforcement on write endpoints)
sentinel-backend/src/main/resources/
└── application.yml (JWT secret → env var; HikariCP config; virtual threads)
```

**Does NOT modify:**
- `sentinel-backend/src/main/resources/db/migration/` — Agent 4 owns all migrations
- `sentinel-backend/pom.xml` — Agent 4 owns
- `sentinel-backend/Dockerfile` — Agent 4 owns
- `sentinel-backend/src/test/` — shared but Agent 4 sets up infra; Agent 1 writes business logic tests

### Key Deliverables

1. **P0-01:** Remove hardcoded JWT secret from `application.yml`
2. **P0-03:** Rewrite `AnalyticsService` (4 methods) as DB-computed queries
3. **P0-06:** Add `POST /api/ml/model-registry`, `POST /api/ml/training-run`, `GET /api/ml/feedback-export`, `POST /api/ml/trigger-retrain`
4. **P1-02:** Write unit tests for `AlertRulesEngine`, `RiskService`, `DriftDetectionService`
5. **P1-03:** Add `@PreAuthorize` to all write endpoints
6. **Stage 3 F2:** Implement `EventPublisher` + `event_log` repository
7. **Stage 3 F3:** Implement `ActuationTriggerService` + `POST /api/actuate/close-valve` + `actuation_log`
8. **Stage 3 F4:** Implement `SlackNotificationService`; wire into `NarrativeService`
9. **Stage 3 F6:** Implement `GET /api/executive/summary` (overfill events, KES saved, uptime)
10. **Stage 3 F8:** Implement `POST /api/demo/trigger-overfill`
11. **P2-03:** Add overfill ROI line to `RoiController`
12. **P1-01 (partial):** Refactor `EtlReloadService` → `EtlBatchService` (remove file poll; read new DB rows by batch_id)

### APIs Owned by Agent 1

```
POST   /api/auth/login
GET    /api/alerts
POST   /api/alerts/{id}/ack
GET    /api/analytics/survival-curves      (rewritten)
GET    /api/analytics/pressure-charts      (rewritten)
GET    /api/analytics/correlation          (rewritten)
GET    /api/analytics/feature-importance   (rewritten)
GET    /api/analytics/spi
GET    /api/analytics/roi/reference-cases
POST   /api/analytics/roi/calculate        (+ overfill line)
POST   /api/actuate/close-valve            (NEW)
POST   /api/demo/trigger-overfill          (NEW)
GET    /api/executive/summary              (NEW)
POST   /api/ml/model-registry              (NEW)
POST   /api/ml/training-run               (NEW)
GET    /api/ml/feedback-export            (NEW)
POST   /api/ml/trigger-retrain            (NEW)
PATCH  /api/ml/model-registry/{id}/promote
PATCH  /api/ml/model-registry/{id}/reject
PATCH  /api/ml/model-registry/{id}/rollback
POST   /api/ml/feedback
GET    /api/ml/predictions-for-review
GET    /api/ml/overview
GET    /api/ml/model-registry
GET    /api/ml/training-runs
GET    /api/ml/drift
GET    /api/ml/retraining-schedule
PATCH  /api/ml/retraining-schedule
```

### Integration Points

- **Depends on Agent 4** to provide Flyway migrations for `event_log`, `actuation_log`, `fact_tank_telemetry` before Agent 1 writes JPA entities for them.
- **Provides to Agent 3** the new ML API endpoints (retrain.py calls them).
- **Provides to Agent 2** all new API endpoints (frontend calls them).

### Acceptance Criteria

- All P0 backend fixes pass CI.
- `GET /actuator/health` returns 200.
- All analytics endpoints return valid JSON in a container with no warehouse directory.
- `POST /api/actuate/close-valve` returns `{status: "simulated_success", actuator: "MOCK"}`.
- `POST /api/demo/trigger-overfill` inserts one tank telemetry row and fires an alert within 5 seconds.
- All write endpoints return 403 for insufficient roles (verified by integration tests).

---

## 3. Agent 2 — Frontend / User Experience

### Mission
Implement all Stage 3 frontend features (Executive Control Plane dashboard, Live Demo page), fix the token security issue, add TanStack Query client-side data management, add the ROI overfill line, and add frontend tests.

### Scope

**Owns:**
```
sentinel-frontend/
├── src/app/
│   ├── (main)/dashboard/sentinel/
│   │   ├── executive/          (NEW — Executive Control Plane page)
│   │   └── roi/                (add overfill assumption line)
│   ├── (main)/dashboard/ml-admin/
│   │   └── *.tsx               (TanStack Query migration for client components)
│   ├── (main)/dashboard/demo/  (NEW — Live Demo page with "Trigger Overfill" button)
│   └── api/proxy/              (NEW — Route Handlers for authenticated mutations)
├── src/components/             (new components: ExecutiveKpiCard, DemoTriggerButton,
│                                EventFeed, ActuationStatusBadge)
├── src/lib/sentinel/api.ts     (add new API calls: executive summary, trigger-overfill,
│                                actuate, event-log)
├── src/lib/sentinel/types.ts   (new types: ExecutiveSummary, EventLogEntry, ActuationLog)
├── package.json                (add @tanstack/react-query v5)
└── vitest.config.ts            (NEW — Vitest setup)
```

**Does NOT modify:**
- `sentinel-backend/` — any directory
- `sentinel/` — any directory
- `sentinel-frontend/src/app/(main)/dashboard/sentinel/page.tsx` — Agent 2 may add components to it but must not restructure the page (coordinate with Agent 1 for API contract)

### Key Deliverables

1. **P1-05:** Create `app/api/proxy/` Route Handlers; remove all `document.cookie.match(...)` patterns
2. **P2-05:** Install TanStack Query v5; migrate client ML Admin pages to `useQuery`/`useMutation`
3. **Stage 3 F6:** Implement Executive Control Plane dashboard page at `/dashboard/executive`
   - 4 KPI cards: overfill events auto-prevented, estimated litres saved, KES exposure avoided, system uptime
   - Data from `GET /api/executive/summary`
   - Polling every 30s during demo
4. **Stage 3 F8:** Implement Live Demo page at `/dashboard/demo`
   - "Simulate Tank Overfill at Site X" button
   - Real-time event feed (polling `/api/executive/summary` + `/api/event-log` every 3s during demo)
   - Actuation status badge ("Simulated valve shutdown triggered — ref ACT-XXXXX")
   - Slack notification confirmation ("Slack message sent")
5. **P2-03:** Add overfill-specific assumption row to ROI calculator UI
6. **P3-01:** Dynamic import for Leaflet `RiskHeatmap`
7. **P3-05:** Fix `package.json` name to `sentinel-frontend`
8. **P3-06:** Add Vitest + React Testing Library; write tests for Executive KPI Card, Demo Trigger Button, Feedback Queue rating state

### APIs Consumed by Agent 2

All existing endpoints (no changes needed) plus new from Agent 1:
```
GET  /api/executive/summary
POST /api/demo/trigger-overfill
POST /api/actuate/close-valve
GET  /api/event-log          (new — Agent 1 provides)
GET  /api/actuation-log      (new — Agent 1 provides)
```

### Integration Points

- **Depends on Agent 1** for new API endpoints. Frontend can be built with MSW (Mock Service Worker) mocks until backend endpoints are live.
- **Does not depend on Agent 3 or Agent 4** directly.

### Acceptance Criteria

- Zero occurrences of `document.cookie.match` in committed code.
- Executive Control Plane page loads without error against the live backend.
- Demo page "Trigger Overfill" button produces a visible event in the UI feed within 10 seconds.
- TanStack Query installed; at least 3 client components migrated.
- Vitest runs without errors; at least 5 component tests pass.

---

## 4. Agent 3 — Data / ML / Python

### Mission
Replace the file-based ETL handoff with direct PostgreSQL writes, implement `src/retrain.py`, fix `src/predict.py` champion selection, add tank-level telemetry to the pipeline, and close the end-to-end ML lifecycle loop.

### Scope

**Owns:**
```
sentinel/
├── src/
│   ├── load.py         (rewrite: file output → psycopg2 direct DB writes)
│   ├── predict.py      (fix: hardcoded path → read champion from model_registry API)
│   ├── retrain.py      (NEW — full implementation)
│   ├── features.py     (add tank telemetry features when table populated)
│   ├── generate_data.py (add tank telemetry data generation, seeded overfill case)
│   ├── run_pipeline.py  (add tank telemetry to pipeline orchestration)
│   ├── ingest.py        (add tank telemetry schema validation)
│   ├── transform.py     (add tank telemetry normalisation)
│   └── decide.py        (add overfill_flag rule: tank_level_pct > 95 AND valve_status='Open')
├── requirements.txt    (add psycopg2-binary 2.9.x, requests)
├── run_live.sh         (update INTERVAL / ROWS env var defaults if needed)
└── tests/
    ├── test_retrain.py  (NEW)
    └── test_load.py     (NEW — test psycopg2 writes with a test DB)
```

**Does NOT modify:**
- `sentinel-backend/` — any directory
- `sentinel-frontend/` — any directory
- `.github/workflows/` — Agent 4 owns

### Key Deliverables

1. **P0-04:** Implement `src/retrain.py` (full specification in `06_ML_HITL_V4_ARCHITECTURE.md §4`)
2. **P0-05:** Fix `src/predict.py` champion selection from `model_registry` API
3. **P1-01 (Python side):** Rewrite `src/load.py` to write directly to PostgreSQL via psycopg2
4. **P1-04 (Python side):** Add artifact blob encoding to `retrain.py` (base64 PKL in API registration)
5. **Stage 3 F1:** Extend `generate_data.py` with `fact_tank_telemetry` generation (seed 42 preserved, seeded overfill at SITE-003 and SITE-006)
6. **Stage 3 F1:** Add tank telemetry through the full pipeline: `ingest.py` → `transform.py` → `decide.py` → `load.py`
7. **Stage 3 F1:** Add `overfill_flag` rule to `decide.py`: set `overfill_flag=True` when `tank_level_pct > 95 AND valve_status = 'Open'`
8. **Stage 3 F1:** Add two new features to `features.py`: `tank_overfill_events_7d`, `avg_tank_level_pct_7d`

### DB Connection Pattern for Agent 3

```python
# sentinel/src/db.py (new shared module)
import os
import psycopg2
from contextlib import contextmanager

DB_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://sentinel:sentinel@localhost:5432/sentinel"
)

@contextmanager
def get_connection():
    conn = psycopg2.connect(DB_URL)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
```

All writes use `INSERT ... ON CONFLICT DO NOTHING` for idempotency.

### API Calls for Agent 3

```python
# retrain.py calls (Agent 1 must provide these endpoints first):
GET  {API_BASE}/api/ml/model-registry        # get champion artifact path
GET  {API_BASE}/api/ml/feedback-export       # get feedback labels
POST {API_BASE}/api/ml/model-registry        # register challenger
POST {API_BASE}/api/ml/training-run          # record training run
```

Authentication: `X-Service-Token: {SERVICE_TOKEN}` header (new env var in `sentinel/.env`).

### Integration Points

- **Depends on Agent 1** for `POST /api/ml/model-registry`, `POST /api/ml/training-run`, `GET /api/ml/feedback-export` endpoints being live before `retrain.py` can register its output.
- **Depends on Agent 4** for the `fact_tank_telemetry` Flyway migration to exist before `load.py` can write to it.
- **Provides to Agent 1** new DB rows in `fact_tank_telemetry` that `AlertRulesEngine` evaluates.
- **Provides to Agent 1** new DB rows in `fact_predictions` that `PredictionService` reads.

### Acceptance Criteria

- `python -m src.run_pipeline` writes incidents, audits, and tank telemetry rows to PostgreSQL without creating any JSON files.
- `python -m src.predict` loads the current champion model version (as shown in `model_registry`) and writes predictions.
- `python -m src.retrain` (with ≥ 5 feedback rows in DB) registers a challenger and training run in the database.
- CI ETL tests pass: `pytest tests/ -v` all green.
- `data/warehouse/live_batch.json` is no longer produced.

---

## 5. Agent 4 — Infrastructure / Integration / Quality

### Mission
Upgrade the Java runtime, set up all DB migrations for V4 new tables, configure CI/CD deploy step and uptime monitoring, implement the Testcontainers testing infrastructure, add the performance indexes, and harden production deployment configuration.

### Scope

**Owns:**
```
sentinel-backend/
├── pom.xml                            (Java 21, Spring Boot 3.4.x, Testcontainers)
├── Dockerfile                         (Java 21 base image)
├── src/main/resources/db/migration/   (ALL new Flyway migrations V22+; fix V14/V15 names)
├── src/main/resources/application-render.yml (validate-on-migrate: true)
├── nixpacks.toml                      (update runtime if needed)
├── render.yaml                        (ETL_API_KEY → sync:false; JWT_SECRET → sync:false)
└── src/test/                          (Testcontainers base config, all test infrastructure)

.github/workflows/
├── ci.yml                             (add deploy step, frontend lint, backend coverage gate)
└── etl-cron.yml                       (verify ETL_API_KEY secret wiring)

root/
└── .gitignore                         (add .env.local, sentinel/.env)
```

**Does NOT modify:**
- `sentinel-backend/src/main/java/` — Agent 1 owns
- `sentinel-frontend/` — Agent 2 owns
- `sentinel/src/` — Agent 3 owns

### Key Deliverables

1. **P0-02:** Fix duplicate Flyway versions (rename V14.x and V15.x files)
2. **P0-07:** Fix ETL API key placeholder in `render.yaml` (`sync: false`)
3. **P3-02:** Upgrade `pom.xml` to Java 21 + Spring Boot 3.4.x; update Dockerfile base image
4. **Stage 3 F1 (migration):** Write `V22__fact_tank_telemetry.sql`
5. **Stage 3 F2 (migration):** Write `V23__event_log.sql`
6. **Stage 3 F3 (migration):** Write `V24__actuation_log.sql`
7. **P1-04 (migration):** Write `V25__artifact_blob.sql`
8. **P2-02:** Write `V26__performance_indexes.sql`
9. **P3-03:** Write `V27__hikaricp_config.sql` (no-op migration; HikariCP config goes in YML)
10. **P1-02 (infra):** Set up Testcontainers test base class; configure `@SpringBootTest` with real PostgreSQL
11. **Stage 3 F5:** Add `deploy` job to `ci.yml` (trigger Render deploy via API on merge to main)
12. **Stage 3 F5:** Add UptimeRobot configuration (documented in ops runbook; no code change)
13. **P3-03:** Add HikariCP settings to `application.yml`
14. Re-enable `validate-on-migrate: true` in `application-render.yml` after V14/V15 fix

### Migration Sequence (Agent 4 writes these)

```
V14.1__add_telemetry_pressure_index.sql   (rename of existing V14)
V14.2__hse_foundation.sql                 (rename of existing V14)
V15.1__hse_technician.sql                 (rename of existing V15)
V15.2__fact_predictions.sql               (rename of existing V15)
(V16–V21 unchanged)
V22__fact_tank_telemetry.sql
V23__event_log.sql
V24__actuation_log.sql
V25__artifact_blob.sql
V26__performance_indexes.sql
```

### CI/CD Additions

```yaml
# Addition to ci.yml:
deploy:
  name: Deploy to Render
  needs: [etl, backend]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - name: Trigger Render Deploy
      run: |
        curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}"

frontend-lint:
  name: Frontend Lint
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: sentinel-frontend
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with: { version: 9 }
    - run: pnpm install --frozen-lockfile
    - run: pnpm run check
    - run: pnpm run build
```

### Integration Points

- **Provides to Agent 1:** Flyway migrations for new tables (Agent 1 needs the schema before writing JPA entities).
- **Provides to Agent 3:** `fact_tank_telemetry` migration (Agent 3 needs the table before `load.py` can write to it).
- **Sets up test infrastructure** that Agent 1 uses to write business logic tests.

### Acceptance Criteria

- `./mvnw flyway:validate` passes on a fresh PostgreSQL database (Testcontainers).
- `./mvnw verify` runs at least 10 meaningful test assertions.
- `ci.yml` includes frontend lint, backend test coverage gate, and deploy step.
- `render.yaml` contains no hardcoded secrets.
- Java 21 Docker image builds and Spring Boot starts with virtual threads enabled.

---

## 6. Cross-Agent Shared Files

The following files are touched by more than one agent. Ownership and merge protocol:

| File | Primary Owner | Secondary | Protocol |
|---|---|---|---|
| `sentinel-backend/src/main/resources/application.yml` | Agent 4 (structure) | Agent 1 (JWT fix, HikariCP) | Agent 1 edits only `sentinel.jwt.secret` and `sentinel.cors` blocks; Agent 4 owns the rest. Merge: Agent 4 merges last. |
| `sentinel-backend/src/test/java/` | Agent 4 (base config) | Agent 1 (test classes) | Agent 4 creates base classes; Agent 1 extends them. No file ownership conflicts — different class files. |
| `sentinel/data/warehouse/` | Agent 3 | — | Agent 3 removes JSON file generation entirely. No other agent modifies this. |
| `sentinel/.env` | Agent 3 | — | New file; Agent 3 creates it and adds to `.gitignore` (coordinated with Agent 4). |
| `.github/workflows/ci.yml` | Agent 4 | — | Only Agent 4 modifies CI. Agent 1/2/3 request CI changes via PR comments on Agent 4's branch. |

---

## 7. Work Cannot Start Until

| Agent | Blocked on |
|---|---|
| Agent 1 (actuation entity) | Agent 4 must merge `V24__actuation_log.sql` migration |
| Agent 1 (event entity) | Agent 4 must merge `V23__event_log.sql` migration |
| Agent 1 (tank telemetry rule) | Agent 4 must merge `V22__fact_tank_telemetry.sql` migration |
| Agent 3 (`load.py` tank writes) | Agent 4 must merge `V22__fact_tank_telemetry.sql` migration |
| Agent 3 (`retrain.py` registration) | Agent 1 must deploy `POST /api/ml/model-registry` and `POST /api/ml/training-run` |
| Agent 2 (live demo page) | Agent 1 must deploy `POST /api/demo/trigger-overfill` |
| Agent 2 (executive dashboard) | Agent 1 must deploy `GET /api/executive/summary` |

**Resolution:** Agent 4 runs first (Phase 0 — migrations + infra). Agent 1 and Agent 3 run in parallel once migrations are in place. Agent 2 starts with mocked API responses and integrates real endpoints as Agent 1 deploys them.
