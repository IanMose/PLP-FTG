# 01 — Current System Implementation Audit

> **Source of truth:** the repository as inspected on 13 September 2026.
> Documentation claims are secondary; actual source code, migrations, and configuration files are primary.

---

## 1. Repository Structure

```
PLP-FTG/
├── sentinel/               # Python ETL + ML pipeline
├── sentinel-backend/       # Spring Boot 3 REST API + business logic
├── sentinel-frontend/      # Next.js 16 / React 19 frontend
├── data/raw/               # Seed CSVs (audits, incidents, dim_site, ground_truth)
├── docs/                   # Stage 1 & 2 design documents
├── .github/workflows/      # CI (ci.yml, etl-cron.yml)
└── render.yaml             # Render IaC (backend + PostgreSQL)
```

Three independent sub-projects sharing one repository. No monorepo tooling (no Nx, Turborepo, or workspace-level package.json).

---

## 2. Sub-Project 1 — Python ETL Pipeline (`sentinel/`)

### 2.1 Technology Stack

| Layer | Technology |
|---|---|
| Language | Python 3.11 |
| Data processing | Pandas, NumPy |
| Schema validation | Pandera |
| ML | scikit-learn ≥ 1.5, joblib ≥ 1.4 |
| Survival analysis | lifelines ≥ 0.29 |
| Statistical diagnostics | scipy ≥ 1.14 |
| Warehouse | DuckDB + Parquet |
| Data generation | Faker |
| Tests | pytest |

### 2.2 Pipeline Stages

| Module | File | Status |
|---|---|---|
| Data generation | `src/generate_data.py` | Fully implemented |
| Ingestion (ingest) | `src/ingest.py` | Fully implemented |
| Transform / normalise | `src/transform.py` | Fully implemented |
| Validation rules | `src/validate.py` | Fully implemented |
| Decision engine | `src/decide.py` | Fully implemented |
| Load (Parquet + DuckDB) | `src/load.py` | Fully implemented |
| Feature engineering | `src/features.py` | Fully implemented |
| ML predict / train | `src/predict.py` | Fully implemented |
| Live batch runner | `src/run_pipeline.py` | Fully implemented |
| Statistical diagnostics | `src/diagnostics.py` | Fully implemented |
| V10 migration script | `scripts/gen_v10_migration.py` | Utility script |

### 2.3 ML Model Details (verified from `src/predict.py`)

- **Algorithm:** Logistic Regression (scikit-learn Pipeline: StandardScaler → LogisticRegression)
- **Model file:** `models/logreg_v1.pkl`
- **Version string:** `logreg_v1`
- **Label:** Any `severity == 'Critical'` incident in next **7 days** for a given site
- **Label balance:** ~51% positive overall (site-specific: SITE-003=92%, SITE-006=75%, SITE-001=34%, SITE-004=27%)
- **Train/test split:** time-based cutoff `2026-06-12` (no shuffle)
- **Seeded metrics:** Precision=0.619, Recall=0.677, F1=0.647 (from V16 migration)

**Features (7):**
```
days_since_last_audit
rejection_rate_7d
rejection_rate_30d
incident_count_30d
incident_severity_score_30d
pressure_anomaly_count_14d
audit_finding_open_count
```

**Null handling:** `days_since_last_audit` NULL → sentinel value 999 ("never audited").

### 2.4 Pipeline Output Artifacts

| Artifact | Path | Consumer |
|---|---|---|
| Live batch JSON | `data/warehouse/live_batch.json` | Spring Boot EtlReloadService (polled every 2 min) |
| Predictions export JSON | `data/warehouse/predictions_export.json` | Spring Boot EtlReloadService (predictions loader) |
| Fact predictions Parquet | `data/warehouse/fact_predictions.parquet` | Reference only |
| Feature importance JSON | `data/warehouse/feature_importance.json` | Spring Boot AnalyticsService |
| Survival curves JSON | `data/warehouse/survival_curves.json` | Spring Boot AnalyticsService |
| Pressure charts JSON | `data/warehouse/pressure_charts.json` | Spring Boot AnalyticsService |
| Correlation JSON | `data/warehouse/correlation.json` | Spring Boot AnalyticsService |
| DuckDB warehouse | `data/warehouse/sentinel.duckdb` | Local inspection only |

### 2.5 Execution Model

`run_live.sh` loops indefinitely, executing `python -m src.run_pipeline` every N seconds (controlled by the `INTERVAL` env var set by Spring Boot's `EtlReloadService`). Spring Boot starts `run_live.sh` as a `ProcessBuilder` subprocess on `@PostConstruct`.

**Critical weakness:** The entire integration is file-based — Spring Boot writes nothing to the Python layer; Python writes files that Spring Boot reads on a polling interval. There is a race condition window where Spring Boot may read a partially written `live_batch.json`.

### 2.6 Test Coverage

| Test file | What it covers |
|---|---|
| `tests/test_features.py` | Feature engineering functions |
| `tests/test_transform.py` | Normalisation functions |
| `tests/test_validate.py` | Validation rules |

No tests exist for: `decide.py`, `load.py`, `predict.py`, `run_pipeline.py`, `ingest.py`.

### 2.7 Missing Functionality

- **`src/retrain.py` does not exist.** The HITL build plan and V16 migration both assume a retrain script exists that reads `model_feedback` and produces a challenger model. It has not been written.
- No mechanism to export feedback data from PostgreSQL back to the Python layer for retraining.
- No scheduled retraining automation (the `retraining_schedule` table exists in DB but nothing triggers it).
- No SHAP explainability (feature importance is per-model, not per-prediction).
- Tank-level telemetry (Stage 3 Feature 1) is not implemented.

---

## 3. Sub-Project 2 — Spring Boot Backend (`sentinel-backend/`)

### 3.1 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Spring Boot 3.3.2 |
| Language | Java 17 |
| Build | Maven (mvnw) |
| Database | PostgreSQL 15 (prod) / H2 (dev/test) |
| Migrations | Flyway |
| Auth | Spring Security + JJWT 0.12.6 |
| Validation | jakarta.validation |
| API docs | springdoc-openapi 2.6.0 |
| Monitoring | Spring Actuator (`/actuator/health`) |
| Persistence | Spring Data JPA (Hibernate) |
| Boilerplate reduction | Lombok |

### 3.2 Package Structure

```
com.sentinel/
├── SentinelApplication.java
├── alert/          AlertController, AlertRulesEngine, AlertService, NarrativeService
├── analytics/      AnalyticsController, AnalyticsService
├── auth/           AuthController, AuthService
├── capa/           CapaController, CapaService, CapaEntity …
├── common/         (shared DTOs, exceptions, utilities)
├── corridor/       EnvironmentalReading, EnvironmentalReadingRepository
├── etl/            EtlReloadService, EtlConfigController, EtlPushController, LiveBatchRecord
├── hazard/         HazardReportController, HazardReportService …
├── ingestion/      (EtlPushController — push-mode ingest API)
├── maintenance/    WorkOrderController, WorkOrderService …
├── ml/             MlAdminController, DriftDetectionService, ModelComparisonService, ModelFeedbackService …
├── prediction/     PredictionService, PredictionDto …
├── quality/        (data quality summary endpoints)
├── risk/           RiskController, RiskService
├── roi/            RoiController
├── site/           SiteRepository, IncidentEntity, AuditEntity …
├── spi/            SpiController, SpiService
├── technician/     TechnicianEntity …
├── telemetry/      (pipeline telemetry endpoints)
└── user/           UserController, UserService, AppUserEntity, AppRoleEntity
```

### 3.3 Module Status

#### Authentication & Authorization

| Feature | Status | Notes |
|---|---|---|
| JWT login (`POST /api/auth/login`) | Fully implemented | 24h token, HS256 |
| Role-based access | Partially implemented | Roles exist in DB; endpoint-level authorization not consistently enforced |
| JWT secret rotation | **Broken** | Secret hardcoded in `application.yml` AND `render.yaml` |
| Token refresh | Not implemented | Tokens expire after 24h with no refresh path |
| Role: ML Admin | Implemented (DB seed in V14) | Enforced only on ML Admin Portal layout client-side |

#### Alert Engine

| Feature | Status | Notes |
|---|---|---|
| AlertRulesEngine (3 rules) | Fully implemented | Rules: high rejection rate, critical cluster, critical high-risk |
| NarrativeService (template-based) | Fully implemented | Generates plain-language alert narratives |
| NarrativeService (Groq/LLM enhancement) | Partially implemented | Falls back silently if `GROQ_API_KEY` missing; 3s hard timeout |
| Alert acknowledgement | Fully implemented | `POST /api/alerts/{id}/ack` |
| Alert listing / filtering | Fully implemented | By site, by status |
| Narrative refresh for stale alerts | Fully implemented | Triggered per ETL cycle |

#### Analytics

| Feature | Status | Notes |
|---|---|---|
| Survival curves | **MVP/Stub** | `AnalyticsService` reads JSON files from warehouse — no Java computation |
| Pressure control charts | **MVP/Stub** | Same pattern — file passthrough |
| Correlation matrix | **MVP/Stub** | Same |
| Feature importance | **MVP/Stub** | Same |
| SPI (Safety Performance Indicator) | Partially implemented | `SpiService` queries DB; limited logic |

**Critical:** `AnalyticsService.getSurvivalCurves()` etc. return `ResponseEntity<String>` by reading a JSON file from the warehouse directory. These return 500 if the warehouse does not exist (i.e., in production where `ETL_ENABLED=false`).

#### Risk Scoring

| Feature | Status | Notes |
|---|---|---|
| Risk summary (all sites) | Fully implemented | Composite score: incidents + audits + pressure + predictions |
| Site detail | Fully implemented | Per-site breakdown with feature values |
| What-if simulation (`/simulate`) | Fully implemented | Varies 3 scalar features, returns score range |
| Corridor heatmap data | Fully implemented | Reads `fact_environmental` via `EnvironmentalReadingRepository` |

#### ETL Integration

| Feature | Status | Notes |
|---|---|---|
| EtlReloadService (poll live_batch.json) | Fully implemented | 2-min polling, launches run_live.sh subprocess |
| EtlPushController (`POST /api/etl/ingest`) | Fully implemented | Push mode from CI/CD (GitHub Actions cron) |
| Prediction loading | Partially implemented | Reads `predictions_export.json` sidecar; per-record `findLatestBySiteId` is O(n) |
| Alert evaluation post-load | Fully implemented | Fires AlertRulesEngine after each successful batch |

#### HSE Workflow (Hazard → CAPA → Work Order)

| Feature | Status | Notes |
|---|---|---|
| Hazard report creation | Fully implemented | POST `/api/hazards` |
| Risk assessment on hazard | Fully implemented | PATCH `/api/hazards/{id}/risk-assessment` |
| CAPA creation | Fully implemented | POST `/api/capas` |
| CAPA status update | Fully implemented | Supports escalation |
| CAPA → model feedback link | Partially implemented | `ModelFeedbackService.setModelFeedbackService()` wired from `CapaService`; feedback written on CAPA closure |
| Work order creation | Fully implemented | POST `/api/work-orders` |
| Work order verification | Fully implemented | PATCH status → `verified` |
| Escalation check (overdue CAPAs) | Partially implemented | `escalated_at` column exists; scheduled check logic unclear |

#### ML / HITL Platform

| Feature | Status | Notes |
|---|---|---|
| `model_feedback` table + writes | Fully implemented | Feedback written from CAPA closure + manual rating |
| `model_registry` table | Fully implemented | Seeded with `logreg_v1` as champion |
| `training_run` table | Fully implemented | Schema exists; populated only via API |
| ML Admin Overview (`GET /api/ml/overview`) | Fully implemented | Champion + challenger cards |
| Model comparison | Fully implemented | Feature importance diff, metric delta |
| Feedback listing for review | Fully implemented | `GET /api/ml/predictions-for-review` |
| Feedback submission | Fully implemented | `POST /api/ml/feedback` |
| Model promotion | Fully implemented | `PATCH /api/ml/model-registry/{id}/promote` |
| Model rollback | Fully implemented | `PATCH /api/ml/model-registry/{id}/rollback` |
| Model rejection | Fully implemented | `PATCH /api/ml/model-registry/{id}/reject` |
| **`src/retrain.py`** | **Not implemented** | The actual retraining script does not exist |
| Training run record via API | Partially implemented | Endpoint exists but `POST /api/ml/training-run` not confirmed in controller |
| Drift detection | Fully implemented | `DriftDetectionService` computes baseline vs recent accuracy daily |
| Retraining schedule | Partially implemented | Table + seed row exist; Java scheduled job to execute retrain not confirmed |
| Auto-promotion workflow | Not implemented | Schedule → running → challenger → human approval loop not wired end-to-end |

#### ROI Calculator

| Feature | Status | Notes |
|---|---|---|
| Reference case data | Fully implemented | Kimeu case hardcoded in `RoiController` |
| ROI calculation (what-if) | Fully implemented | `POST /api/analytics/roi/calculate` |

#### User Management

| Feature | Status | Notes |
|---|---|---|
| List users | Fully implemented | GET `/api/users` |
| Get user by ID | Fully implemented | GET `/api/users/{id}` |
| Create user | Fully implemented | POST `/api/users` |
| Password hashing | Fully implemented | BCrypt via Spring Security |
| Role assignment | Partially implemented | Roles seeded (V4, V14) but assignment UI is placeholder |

### 3.4 Database Schema (21 Migrations — V1 to V21)

| Migration | Tables / Changes |
|---|---|
| V1 | `dim_site`, `fact_incidents`, `fact_audits`, `ingest_log`, `alerts` |
| V2 | Seed data (6 sites) |
| V3 | `app_user`, `app_role`, `user_roles` |
| V4 | Default users seed (admin, hseofficer, analyst, fieldtech) |
| V5 | Schema corrections (column widening) |
| V6 | `dim_asset` (160+ monitoring points, pump stations, depots), `fact_environmental`, seed data |
| V7 | Missing pump stations |
| V8 | `reading_id` column widening |
| V9 | Kisumu site addition |
| V10 | Historical seed data |
| V11.1–11.3 | Alert narrative columns (`narrative`, `narrative_updated_at`, `narrative_snapshot`) |
| V12 | KPC compliance schema (later dropped) |
| V13 | Compliance indicator seed (later dropped) |
| V14a | Telemetry pressure index |
| V14b | **HSE foundation** — `hazard_report`, `capa`, `required_qualification` on alerts; new roles |
| V15a | **Fact predictions** — `fact_predictions` table |
| V15b | HSE technician table (`technician`) |
| V16 | **ML HITL** — `model_feedback`, `model_registry`, `training_run`; seeded champion |
| V17 | `work_order` |
| V18 | Additive columns (`requires_work_order`, `escalated_at`, `report_type`) |
| V19 | `retraining_schedule` (single global row, disabled by default) |
| V20 | `model_performance_snapshot` (drift detection) |
| V21 | `feature_importance` column on `model_registry`; backfill champion |

**⚠ Flyway version collision:** Both `V14__add_telemetry_pressure_index.sql` and `V14__hse_foundation.sql` share the version prefix `V14`. Similarly, `V15__fact_predictions.sql` and `V15__hse_technician.sql` share `V15`. This works only because `out-of-order: true` and `validate-on-migrate: false` are configured. **This is a real production risk** — a Flyway upgrade or stricter configuration will break the migration chain.

### 3.5 Known Backend Issues

1. **JWT secret hardcoded** in `application.yml` (default dev profile) and `render.yaml` (production). Secret is committed to version control.
2. **No backend tests.** The `sentinel-backend` Maven build passes CI but has zero meaningful tests — `mvnw verify` runs only against H2 with `create-drop` and no actual test classes for business logic.
3. **`AnalyticsService` is a file proxy.** All four analytics endpoints (`/survival-curves`, `/pressure-charts`, `/correlation`, `/feature-importance`) return raw JSON file content from the warehouse directory. They return HTTP 500 in production where `ETL_ENABLED=false` and no warehouse directory exists.
4. **`loadPredictions()` has O(n) DB lookups.** For each prediction record, it calls `predictionRepository.findLatestBySiteId()` individually rather than bulk-checking existing `(site_id, as_of_date)` pairs.
5. **Duplicate Flyway versions.** See §3.4 above.
6. **`EtlPushController` API key check.** The push-mode ingest endpoint validates an `X-API-Key` header. The key is set in `render.yaml` as `REPLACE_WITH_STRONG_RANDOM_KEY` — a placeholder that must be replaced before production.
7. **No `POST /api/ml/training-run` endpoint** confirmed. The Python retrain script (when built) would need to register its run here; without the endpoint the training loop cannot close.

### 3.6 Missing Backend Features (Stage 3 Plan)

- `POST /api/actuate/close-valve` (simulated actuation endpoint)
- `event_log` table and event publishing service
- `actuation_log` table
- Slack webhook integration on NarrativeService
- Executive control plane dashboard endpoint
- Tank-level telemetry table and validation rule
- `/api/demo/trigger-overfill` demo endpoint

---

## 4. Sub-Project 3 — Next.js Frontend (`sentinel-frontend/`)

### 4.1 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2 (App Router) |
| Language | TypeScript 5.9 |
| React | React 19.2 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Radix UI |
| Charts | Recharts 3.8 |
| Maps | Leaflet 1.9.4 + leaflet.heat |
| Forms | react-hook-form + Zod v4 |
| State | Zustand 5 |
| Data fetching | Native fetch (no React Query) |
| Package manager | pnpm 9.15 |
| Linter/formatter | Biome 2.5 |
| Git hooks | Husky + lint-staged |

**Note:** `package.json` `name` is `studio-admin` (not `sentinel-frontend`) — residue from a template or renaming.

### 4.2 Application Routes

```
/ (external landing page)
/auth/              Login page
/dashboard/
  /sentinel/        Main Sentinel dashboard (KPI strip, risk heatmap, alerts, data quality)
    /analytics      Risk heatmap + statistical diagnostics (survival, pressure, correlation, features)
    /alerts         Alert timeline + management
    /capas          CAPA list + creation
    /hazards        Hazard report list + creation
    /my-tasks       Personal task queue
    /roi            ROI calculator (interactive what-if)
    /sites/[id]     Site detail (incidents, telemetry, predictions)
  /ml-admin/        ML Admin Portal
    /feedback       Prediction rating queue
    /registry       Model registry + promote/reject/rollback
    /training-runs  Training run history + manual trigger
    /drift          Drift monitoring
    /retraining-schedule  Auto-retrain schedule management
  /maintenance/     Work order management
  /workforce/       Technician management
  /field/           Field officer mobile view
  /roles/           Role management
  /users/           User management
```

### 4.3 Page-by-Page Status

| Page | Status | Notes |
|---|---|---|
| Landing (`/`) | Fully implemented | Marketing/intro page |
| Login (`/auth`) | Fully implemented | JWT stored in cookie |
| Sentinel dashboard | Fully implemented | 5 parallel API calls; graceful backend error component |
| Analytics | Fully implemented | 6 API calls; optional analytics sections degrade gracefully |
| Alerts | Fully implemented | Alert timeline, acknowledge action |
| CAPAs | Fully implemented | List, create, status update |
| Hazards | Fully implemented | List, create, risk assessment |
| My Tasks | Partially implemented | Queries CAPAs by owner; full task management TBD |
| ROI Calculator | Fully implemented | Interactive assumptions table + live recalculate |
| Sites / Site Detail | Fully implemented | Incidents, audits, predictions, telemetry per site |
| ML Admin — Overview | Fully implemented | Champion/challenger cards + drift banner |
| ML Admin — Feedback | Fully implemented | Prediction review queue with 3-button rating |
| ML Admin — Registry | Fully implemented | Side-by-side compare + promote/reject/rollback with confirmation dialogs |
| ML Admin — Training Runs | Fully implemented | History table + manual retrain button |
| ML Admin — Drift | Fully implemented | Drift status + baseline vs recent accuracy |
| ML Admin — Retraining Schedule | Fully implemented | Enable/disable + cadence management |
| Maintenance | Fully implemented | Work order CRUD |
| Workforce | Partially implemented | Technician list; assignment workflows incomplete |
| Field | Partially implemented | Mobile-oriented view; limited functionality |
| Roles | Partially implemented | Role list; role-editing incomplete |
| Users | Fully implemented | User list + create user |

### 4.4 Known Frontend Issues

1. **Token extracted by regex from cookie string** (`document.cookie.match(/sentinel-token=([^;]+)/)?.[1]`). This pattern is used in six client-side pages. It bypasses secure server-side token handling.
2. **No React Query or data cache.** All server components call `fetch()` with `cache: "no-store"`. Client components call `fetch()` directly in `useEffect`. No caching strategy, no loading skeleton standardisation.
3. **No frontend tests.** Zero Jest/Vitest/Playwright test files exist in `sentinel-frontend/`.
4. **`proxy.disabled.ts` file** in `src/` — a commented-out local dev proxy configuration that was disabled. Indicates past friction with the CORS/API-base-URL setup.
5. **`NEXT_PUBLIC_SENTINEL_API_URL` must be set.** If undefined, API_BASE falls back to `""` (relative URL) which only works in specific deployment configurations.
6. **Multiple CSS theme files** (`brutalist.css`, `soft-pop.css`, `tangerine.css`) — theme switching system that adds bundle weight for unused themes.
7. **`package.json` name is `studio-admin`** not `sentinel-frontend` — minor inconsistency but affects npm ecosystem tooling.

---

## 5. CI/CD Pipeline

### 5.1 Existing Workflows

**`ci.yml`** — triggers on push/PR to `main` or `feature/**`:
- ETL job: Python 3.11, installs requirements, runs pytest, generates data, runs ETL pipeline, enforces ≥90% data quality gate
- Backend job: Java 17, Maven build + H2 tests, confirms fat JAR

**`etl-cron.yml`** — scheduled cron job:
- Pushes live batch data to the deployed backend via `POST /api/etl/ingest` using the `ETL_API_KEY` secret

### 5.2 Missing CI/CD

- No frontend build/lint step in CI
- No deploy step in `ci.yml` (deploy happens on Render via webhook, not GitHub Actions)
- No integration tests
- No contract tests
- No backend unit test gate (CI passes with zero backend tests)
- Stage 3 plan requires a CI/CD deploy step — not yet added

---

## 6. Deployment

| Component | Platform | Status |
|---|---|---|
| Backend | Render (free tier, Docker) | Live |
| Frontend | Vercel | Live |
| Database | Render managed PostgreSQL 15 | Live |
| ETL pipeline | Disabled in prod (`ETL_ENABLED=false`) | Pushed via GitHub Actions cron |

**Render free tier limitations:** cold start latency (~30s), sleep after inactivity, no persistent disk (no local file system for warehouse JSON files in production — this means `AnalyticsService` always returns 500 in production).

---

## 7. Feature Classification Summary

| Feature | Classification |
|---|---|
| Python ETL pipeline (5 stages) | Fully implemented |
| ML model training + scoring | Fully implemented |
| ML retrain script (`src/retrain.py`) | **Not implemented** |
| Spring Boot core API | Fully implemented |
| Alert rules engine (3 rules) | Fully implemented |
| Narrative service (template + LLM) | Fully implemented |
| HSE workflow (hazard → CAPA → work order) | Fully implemented |
| Risk scoring + simulation | Fully implemented |
| HITL portal (frontend all 5 pages) | Fully implemented |
| HITL backend (feedback, registry, promote/reject) | Fully implemented |
| Drift detection (backend) | Fully implemented |
| Retraining schedule (DB + frontend) | Partially implemented (no Java execution logic) |
| Analytics service | MVP/Stub (file proxy, fails in prod) |
| Tank-level telemetry (Stage 3) | **Not implemented** |
| Event-driven actuation (Stage 3) | **Not implemented** |
| Slack webhook integration (Stage 3) | **Not implemented** |
| Executive control plane dashboard (Stage 3) | **Not implemented** |
| Live "Trigger It" demo endpoint (Stage 3) | **Not implemented** |
| CI/CD deploy step (Stage 3) | **Not implemented** |
| Backend unit tests | **Not implemented** |
| Frontend tests | **Not implemented** |
| Secure JWT secret management | **Broken** (hardcoded) |
| Flyway migration versioning | **Broken** (duplicate versions) |
