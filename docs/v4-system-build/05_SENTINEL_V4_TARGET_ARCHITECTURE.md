# 05 — Sentinel V4 Target Architecture

---

## 1. System Overview

Sentinel V4 is a three-layer system: a **Python data + ML layer**, a **Java REST API layer**, and a **Next.js presentation layer**. The critical V4 change from V3 is that the Python layer writes **directly to PostgreSQL** instead of through JSON files — eliminating the file-based handoff that is the root cause of most current production failures.

```mermaid
flowchart TD
    subgraph SOURCES["Data Sources"]
        SYN["Synthetic Generator\n(generate_data.py / run_pipeline.py)"]
        PUSH["CI Push\n(etl-cron.yml → POST /api/etl/ingest)"]
        DEMO["Demo Trigger\n(POST /api/demo/trigger-overfill)"]
    end

    subgraph PYTHON["sentinel/ — Python ETL + ML (Java 21 / Python 3.11)"]
        INGEST["ingest.py — schema validation\n+ quality gate"]
        TRANSFORM["transform.py — normalise,\nclean, enrich"]
        DECIDE["decide.py — rule-based\ntriage (trusted/review/reject)"]
        LOAD["load.py — writes incidents,\naudits, telemetry directly\nto PostgreSQL via psycopg2"]
        FEATURES["features.py —\nsite feature engineering"]
        PREDICT["predict.py — loads champion\nmodel from model_registry,\nscores sites, writes to\nfact_predictions via psycopg2"]
        RETRAIN["retrain.py (NEW) —\nreads model_feedback + features,\ntrains challenger, registers via API"]
    end

    subgraph DB["PostgreSQL 16"]
        direction TB
        CORE["Core tables\n(dim_site, fact_incidents,\nfact_audits, alerts, ingest_log)"]
        CORRIDOR["Corridor tables\n(dim_asset, fact_environmental)"]
        TANK["Tank telemetry (NEW)\nfact_tank_telemetry"]
        HSE["HSE tables\n(hazard_report, capa, work_order)"]
        ML_DB["ML tables\n(fact_predictions, model_feedback,\nmodel_registry, training_run,\nretraining_schedule,\nmodel_performance_snapshot)"]
        CONTROL["Control tables (NEW)\n(event_log, actuation_log)"]
    end

    subgraph BACKEND["sentinel-backend/ — Spring Boot 3.4 / Java 21"]
        ETL_SVC["EtlBatchService\n(no longer polls files —\nprocesses DB rows by batch_id)"]
        ALERT["AlertRulesEngine\n+ NarrativeService\n+ SlackNotificationService (NEW)"]
        ACTUATE["ActuationTriggerService (NEW)\n+ POST /api/actuate/close-valve"]
        EVENT["EventPublisher (NEW)\n+ event_log writes"]
        RISK_SVC["RiskService\n(composite score)"]
        ANALYTICS_SVC["AnalyticsService\n(DB-computed — no file reads)"]
        ML_SVC["MlAdminController\n+ DriftDetectionService\n+ POST /api/ml/training-run (NEW)\n+ POST /api/ml/model-registry (NEW)"]
        HSE_SVC["CAPA / Hazard / WorkOrder\nservices"]
        ROI_SVC["RoiService\n(+ overfill line)"]
        AUTH["Spring Security\nJWT + @PreAuthorize"]
        API_GW["REST API\n/api/**"]
    end

    subgraph FRONTEND["sentinel-frontend/ — Next.js 16 / React 19"]
        DASH["Sentinel Dashboard\n(KPI strip, alerts, heatmap)"]
        EXEC["Executive Control Plane (NEW)\n(overfill events prevented,\nKES saved, uptime)"]
        ANALYTICS_UI["Analytics\n(survival, pressure, correlation,\nfeature importance)"]
        ML_UI["ML Admin Portal\n(Overview, Feedback, Registry,\nDrift, Retraining Schedule)"]
        DEMO_UI["Live Demo Page (NEW)\n('Trigger Overfill' button)"]
        HSE_UI["HSE Workflow\n(Hazards, CAPAs, Work Orders)"]
        MAINT_UI["Maintenance / Workforce"]
    end

    subgraph EXTERNAL["External Services"]
        SLACK["Slack Incoming Webhook"]
        UPTIME["UptimeRobot\n(5-min health ping)"]
        GROQ["Groq LLM API\n(optional narrative enhancement)"]
    end

    SYN --> INGEST
    INGEST --> TRANSFORM --> DECIDE --> LOAD
    LOAD -->|psycopg2 direct write| CORE
    LOAD -->|psycopg2 direct write| CORRIDOR
    LOAD -->|psycopg2 direct write| TANK
    PREDICT -->|psycopg2 direct write| ML_DB
    RETRAIN -->|HTTP POST| ML_SVC
    PUSH --> API_GW

    CORE --> ETL_SVC
    ETL_SVC --> ALERT --> SLACK
    ALERT --> EVENT --> CONTROL
    EVENT --> ACTUATE --> CONTROL
    ACTUATE --> SLACK

    CORE & CORRIDOR & TANK & HSE & ML_DB & CONTROL --> API_GW
    ANALYTICS_SVC -->|DB queries| CORE & CORRIDOR
    ML_SVC -->|DB queries| ML_DB
    RISK_SVC -->|DB queries| CORE & CORRIDOR & ML_DB

    API_GW --> DASH & EXEC & ANALYTICS_UI & ML_UI & DEMO_UI & HSE_UI & MAINT_UI
    DEMO_UI -->|trigger| API_GW
    GROQ -.->|optional| ALERT
    UPTIME -->|ping| API_GW
    UPTIME -->|alert on failure| SLACK
```

---

## 2. Layer Responsibilities

### 2.1 Python Layer (`sentinel/`)

| Module | V4 Responsibility |
|---|---|
| `generate_data.py` | Synthetic data generation (incidents, audits, telemetry, **tank telemetry**) |
| `ingest.py` | Schema validation, quality gate (trusted / review / reject) |
| `transform.py` | Normalisation, cleaning, enrichment |
| `decide.py` | Rule-based triage |
| `load.py` | **Direct psycopg2 writes** to PostgreSQL (replaces JSON file output) |
| `features.py` | Feature engineering per site (7 features + new tank features) |
| `predict.py` | **Reads champion from `model_registry`**; scores all sites; writes to `fact_predictions` via psycopg2 |
| `retrain.py` *(new)* | Reads `model_feedback` + features from DB; trains challenger; registers via `POST /api/ml/model-registry` + `POST /api/ml/training-run` |
| `run_pipeline.py` | Orchestrates ingest → transform → decide → load → predict in sequence |
| `diagnostics.py` | Survival, pressure, correlation computations (kept for local validation; analytics moved to DB) |

### 2.2 Java Backend (`sentinel-backend/`)

| Module | V4 Responsibility |
|---|---|
| `auth/` | JWT authentication, Spring Security, `@PreAuthorize` role enforcement on all write endpoints |
| `etl/` | `EtlBatchService` — processes new DB rows since last batch_id (no file polling); `EtlPushController` for CI push mode |
| `alert/` | `AlertRulesEngine` (3 rules + overfill rule NEW), `NarrativeService` + `SlackNotificationService` (NEW) |
| `actuation/` *(new)* | `ActuationTriggerService`, `POST /api/actuate/close-valve`, `actuation_log` repository |
| `event/` *(new)* | `EventPublisher`, `event_log` repository |
| `risk/` | `RiskService` — composite score (incidents + audits + pressure + predictions + tank level NEW) |
| `analytics/` | **DB-computed** survival curves, pressure control charts, correlation, feature importance (no file reads) |
| `ml/` | `MlAdminController` — all existing endpoints plus `POST /api/ml/training-run` (NEW) and `POST /api/ml/model-registry` (NEW); `DriftDetectionService`; `ModelComparisonService` |
| `prediction/` | `PredictionService` — reads `fact_predictions` per site |
| `roi/` | `RoiController` + overfill-specific ROI line (NEW) |
| `hse/` | Hazard, CAPA, WorkOrder services (unchanged) |
| `demo/` *(new)* | `POST /api/demo/trigger-overfill` — injects seeded tank telemetry to trigger the full loop for live demo |
| `executive/` *(new)* | `GET /api/executive/summary` — overfill events prevented, KES saved, system uptime |
| `user/` | User CRUD (unchanged) |

### 2.3 Frontend (`sentinel-frontend/`)

| Page | V4 Change |
|---|---|
| Sentinel dashboard | No structural change; alert feed uses `refetchInterval: 30_000` via TanStack Query |
| **Executive Control Plane** *(new)* | 4 large KPI cards: overfill events prevented, estimated litres saved, KES exposure avoided, system uptime |
| Analytics | No structural change; analytics now come from DB-computed endpoints (resilient in prod) |
| ML Admin (all 5 pages) | Client mutations use TanStack Query `useMutation` for consistent optimistic UI |
| **Live Demo page** *(new)* | Single "Simulate tank overfill at Site X" button; real-time event feed showing detect → act → notify → report loop |
| ROI Calculator | Add overfill-specific line to assumptions table |
| Token handling | All client authenticated requests routed through Next.js Route Handlers (no `document.cookie` regex) |

---

## 3. Data Flow — V4

### 3.1 Normal Pipeline Cycle (every N minutes via run_live.sh)

```
run_pipeline.py
    │
    ├─ generate synthetic batch (incidents, audits, tank telemetry)
    ├─ ingest.py → validate → quality gate
    ├─ transform.py → normalise
    ├─ decide.py → trusted/review/reject
    ├─ load.py → INSERT INTO fact_incidents, fact_audits, fact_tank_telemetry
    │             (psycopg2, ON CONFLICT DO NOTHING, atomic per table)
    │
    ├─ features.py → compute 7+N site features
    └─ predict.py → load champion pkl from model_registry.artifact_path
                  → score 6 sites
                  → INSERT INTO fact_predictions (psycopg2, ON CONFLICT DO NOTHING)
```

### 3.2 Spring Boot Alert Evaluation (triggered post-insert via DB notification or scheduled poll)

```
EtlBatchService.processNewRows()
    │
    ├─ query fact_incidents WHERE batch_id > last_batch_id
    ├─ AlertRulesEngine.evaluate(newIncidents)
    │       ├─ Rule 1: high rejection rate
    │       ├─ Rule 2: critical cluster
    │       ├─ Rule 3: critical high-risk site
    │       └─ Rule 4 (NEW): overfill_risk — tank_level_pct > 95 AND valve_status = Open
    │
    ├─ For each High/Critical alert:
    │       ├─ NarrativeService.generate() → templated narrative + optional Groq enhancement
    │       ├─ EventPublisher.publish(event) → INSERT INTO event_log
    │       ├─ ActuationTriggerService.closeValve(site, tank_id) → POST /api/actuate/close-valve
    │       │                                                     → INSERT INTO actuation_log
    │       └─ SlackNotificationService.send(narrative + actuation_ref)
    │
    └─ alerts table updated
```

### 3.3 ML Feedback → Retrain → Champion Cycle

```
Human reviews prediction in ML Admin Feedback Queue
    │
    └─ POST /api/ml/feedback → INSERT INTO model_feedback

CAPA closed by HSE officer
    │
    └─ CapaService.close() → INSERT INTO model_feedback (source='capa_outcome')

[Manual trigger or retraining_schedule reaches next_run_at]
    │
    └─ POST /api/ml/trigger-retrain → Spring Boot invokes retrain.py
                                    (subprocess or GitHub Actions dispatch)

retrain.py
    ├─ GET /api/ml/feedback-export → fetch model_feedback rows
    ├─ query fact_site_features from PostgreSQL
    ├─ train challenger LogisticRegression pipeline
    ├─ evaluate on holdout set (precision, recall, F1)
    ├─ save logreg_v{N+1}.pkl to models/ directory
    ├─ POST /api/ml/model-registry → register challenger
    └─ POST /api/ml/training-run  → register training run

Human reviews challenger in ML Admin Registry page
    │
    └─ PATCH /api/ml/model-registry/{id}/promote
            → old champion status → 'archived'
            → challenger status → 'champion'

predict.py (next run)
    ├─ SELECT artifact_path FROM model_registry WHERE status = 'champion'
    └─ load new champion pkl → new predictions
```

### 3.4 Live Demo Flow

```
Judge presses "Simulate tank overfill at Site X" on demo page
    │
    └─ POST /api/demo/trigger-overfill (site=SITE-003)
            │
            ├─ INSERT one tank_telemetry row: tank_level_pct=97.2, valve_status='Open'
            ├─ AlertRulesEngine.evaluate() → fires overfill_risk alert (High)
            ├─ EventPublisher → event_log row
            ├─ ActuationTriggerService → POST /api/actuate/close-valve → actuation_log row
            │                            returns {status:"simulated_success", actuator:"MOCK"}
            ├─ NarrativeService → narrative + Groq enhancement
            ├─ SlackNotificationService → Slack message arrives in channel
            └─ Executive dashboard counters update on next poll (≤5s)

Frontend (demo page):
    ├─ shows event in real-time feed (polling /api/executive/summary every 3s during demo)
    └─ Slack message visible in channel within 5s
```

---

## 4. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant Browser
    participant NextJS as Next.js (server)
    participant RouteHandler as Route Handler (/api/proxy/*)
    participant SpringBoot as Spring Boot API
    participant DB as PostgreSQL

    Browser->>NextJS: Login (POST /auth/login)
    NextJS->>SpringBoot: POST /api/auth/login
    SpringBoot-->>NextJS: JWT (24h)
    NextJS-->>Browser: Set httpOnly cookie: sentinel-token

    Browser->>NextJS: Navigate to ML Admin page
    NextJS->>SpringBoot: GET /api/ml/overview (server component, reads cookie server-side)
    SpringBoot-->>NextJS: champion/challenger data
    NextJS-->>Browser: Rendered page

    Browser->>RouteHandler: PATCH /api/proxy/ml/model-registry/promote
    RouteHandler->>SpringBoot: PATCH /api/ml/model-registry/{id}/promote\n(Authorization: Bearer {cookie value})
    SpringBoot->>SpringBoot: @PreAuthorize("hasRole('ML_ADMIN')")
    alt authorised
        SpringBoot->>DB: UPDATE model_registry SET status='champion'
        SpringBoot-->>RouteHandler: 200 OK
        RouteHandler-->>Browser: 200 OK
    else unauthorised
        SpringBoot-->>RouteHandler: 403
        RouteHandler-->>Browser: 403
    end
```

---

## 5. Database Architecture

### 5.1 Schema Groups

| Group | Tables | Purpose |
|---|---|---|
| **Core** | `dim_site`, `fact_incidents`, `fact_audits`, `alerts`, `ingest_log` | Primary data + audit trail |
| **Corridor** | `dim_asset`, `fact_environmental` | 160+ pipeline monitoring points |
| **Tank** *(new V4)* | `fact_tank_telemetry` | Loading-gantry tank level + valve status |
| **HSE** | `hazard_report`, `capa`, `work_order`, `technician` | Safety workflow |
| **ML** | `fact_predictions`, `model_feedback`, `model_registry`, `training_run`, `retraining_schedule`, `model_performance_snapshot` | Full ML lifecycle |
| **Control** *(new V4)* | `event_log`, `actuation_log` | Event-driven action audit |
| **Access** | `app_user`, `app_role`, `user_roles` | RBAC |

### 5.2 Key New Tables (V4)

```sql
-- Tank telemetry (Feature 1)
CREATE TABLE fact_tank_telemetry (
    reading_id        VARCHAR(36)  PRIMARY KEY,
    site_id           VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    tank_id           VARCHAR(50)  NOT NULL,
    reading_timestamp TIMESTAMP    NOT NULL,
    tank_level_pct    NUMERIC(5,2) NOT NULL CHECK (tank_level_pct BETWEEN 0 AND 100),
    flow_rate_bph     NUMERIC(8,1),
    valve_status      VARCHAR(20)  NOT NULL DEFAULT 'Unknown',
    -- 'Open' | 'Closed' | 'Unknown'
    overfill_flag     BOOLEAN      NOT NULL DEFAULT FALSE,
    batch_id          VARCHAR(50),
    ingestion_timestamp TIMESTAMP  DEFAULT CURRENT_TIMESTAMP
);

-- Event log (Feature 2)
CREATE TABLE event_log (
    id               VARCHAR(36)  PRIMARY KEY,
    site_id          VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    tank_id          VARCHAR(50),
    signal_type      VARCHAR(100) NOT NULL,
    severity         VARCHAR(20)  NOT NULL,
    value            NUMERIC(10,4),
    threshold        NUMERIC(10,4),
    alert_id         VARCHAR(50)  REFERENCES alerts(id),
    fired_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Actuation log (Feature 3)
CREATE TABLE actuation_log (
    id               VARCHAR(36)  PRIMARY KEY,
    event_id         VARCHAR(36)  NOT NULL REFERENCES event_log(id),
    site_id          VARCHAR(50)  NOT NULL REFERENCES dim_site(site_id),
    tank_id          VARCHAR(50),
    action           VARCHAR(100) NOT NULL DEFAULT 'CLOSE_VALVE',
    actuator         VARCHAR(50)  NOT NULL DEFAULT 'MOCK',
    status           VARCHAR(50)  NOT NULL,
    latency_ms       INTEGER,
    executed_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes            TEXT
);
```

---

## 6. Deployment Architecture

```mermaid
flowchart LR
    subgraph GitHub
        REPO["git repository"]
        CI["GitHub Actions\nci.yml — test + lint\netl-cron.yml — push batch"]
    end

    subgraph Render
        BACKEND["sentinel-backend\n(Docker, Java 21)\nRender Web Service"]
        PGDB[("PostgreSQL 16\nRender Managed DB")]
    end

    subgraph Vercel
        FRONTEND["sentinel-frontend\n(Next.js 16)\nVercel Deployment"]
    end

    subgraph Local
        PYTHON["sentinel/\nrun_live.sh\n(dev only — writes to local or remote DB)"]
    end

    subgraph External
        SLACK_WS["Slack Channel\n#sentinel-alerts"]
        UPTIME_R["UptimeRobot\n(5-min ping)"]
    end

    REPO --> CI
    CI -->|"on merge: docker build + deploy"| BACKEND
    CI -->|"cron: POST /api/etl/ingest"| BACKEND
    BACKEND <--> PGDB
    FRONTEND -->|fetch /api/**| BACKEND
    PYTHON -->|psycopg2 direct write| PGDB
    BACKEND -->|Slack webhook| SLACK_WS
    UPTIME_R -->|GET /actuator/health| BACKEND
    UPTIME_R -->|alert on failure| SLACK_WS
```

---

## 7. Non-Functional Requirements

| Requirement | V4 Target | How Achieved |
|---|---|---|
| API response time (p95) | < 500ms for all dashboard endpoints | DB indexing; analytics moved from file to DB queries |
| Alert pipeline latency | < 60s from data insert to Slack notification | Direct DB writes remove 2-min file poll delay |
| Actuation latency | < 5s from threshold breach to `actuation_log` entry | Synchronous call within alert evaluation |
| Demo loop latency | < 10s from button press to Slack message | Demo endpoint bypasses ETL cycle entirely |
| System availability | > 99% during showcase window | UptimeRobot keeps Render warm; health check endpoint active |
| Auth security | No secrets in version control | JWT_SECRET via env var only; `document.cookie` patterns removed |
| Data consistency | No race conditions on ETL writes | psycopg2 `ON CONFLICT DO NOTHING` on all batch inserts |
| ML model safety | No auto-promotion; human always approves | `PATCH /promote` requires `ML_ADMIN` role + confirmation dialog |
