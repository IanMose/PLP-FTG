# Sentinel — Spring Boot Backend API

The backend (`sentinel-backend/`) serves the Spring Boot REST API. It reads clean
data from the Python pipeline, evaluates alert rules on each incoming batch,
computes risk scores, manages the full HSE corrective-action lifecycle, and serves
the ML HITL governance endpoints.

---

## Directory Layout

```
sentinel-backend/src/main/java/com/sentinel/
├── SentinelApplication.java
├── alert/          — AlertController, AlertService, AlertRulesEngine (5 rules), NarrativeService
├── analytics/      — AnalyticsController, AnalyticsService (serves pre-computed JSON)
├── auth/           — AuthController, AuthService
├── capa/           — CapaController, CapaService, CapaEntity, QualificationMismatchException
├── common/         — DTOs, JwtUtil, JwtAuthFilter, SecurityConfig, GlobalExceptionHandler, DataSeeder
├── corridor/       — CorridorController, CorridorHeatmapService, Asset, EnvironmentalReading
├── etl/            — EtlReloadService (@Scheduled), EtlConfigController, LiveBatchRecord
├── hazard/         — HazardReportController, HazardReportService, HazardReportEntity
├── ingestion/      — IngestLogEntity, IngestLogRepository
├── ml/             — MlAdminController, ModelFeedbackService, ModelRegistryService, MlWiringConfig
├── prediction/     — PredictionService, PredictionEntity, PredictionRepository, PredictionDto
├── quality/        — QualityController, QualityService
├── risk/           — RiskController, RiskService (5-component transparent score)
├── roi/            — RoiController
├── site/           — SiteEntity, IncidentEntity, AuditEntity + repositories
├── spi/            — SpiController, SpiService, SpiSummaryDto
├── technician/     — TechnicianController, TechnicianService, TechnicianQualificationRepository
├── telemetry/      — TelemetryController, TelemetryEntity
└── user/           — UserController (admin-only), AppUserEntity, AppRoleEntity

src/main/resources/db/migration/   — V1–V19 Flyway migrations
```

---

## Running the Backend

```bash
cd sentinel-backend

# H2 in-memory (no external database needed — default)
./mvnw spring-boot:run

# PostgreSQL
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

| URL                                     | Purpose                       |
| --------------------------------------- | ----------------------------- |
| `http://localhost:8080`                 | API base                      |
| `http://localhost:8080/swagger-ui.html` | Swagger / OpenAPI explorer    |
| `http://localhost:8080/h2-console`      | H2 console (dev profile only) |

---

## Package Reference

### `etl` — Python Pipeline Integration

#### `EtlReloadService` (`@Service`, `@Scheduled`)

**On startup (`@PostConstruct`):** launches `run_live.sh` as a background OS process
via `ProcessBuilder`. Passes `ROWS` and `INTERVAL` as env vars.

**Scheduled polling (`fixedDelay=120000, initialDelay=5000`):** reads `live_batch.json`
every 2 minutes, checks `batch_id` against `lastProcessedBatchId`, then:

1. `loadIncidents()` — `REQUIRES_NEW` transaction, batch-deduplicates via single `IN` query
2. `loadAudits()` — same pattern
3. `loadEnvironmental()` — corridor readings
4. `loadPredictions()` — upserts `fact_predictions` from `predictions_export.json`
5. Calls `AlertRulesEngine.evaluate()` + `AlertRulesEngine.refreshStaleNarratives()`

`normaliseSiteId()` lowercases `SITE-001` → `site-001` before DB insert.

---

### `auth`

`POST /api/auth/login` → validates BCrypt password, updates `last_login_at`, returns
`{ token, email, role, name, userId }`. JWT lifetime: 24 hours.

---

### `alert`

#### `AlertRulesEngine` — 5 Rules

| Rule                        | Trigger                                               | Severity                     |
| --------------------------- | ----------------------------------------------------- | ---------------------------- |
| `RULE_HIGH_REJECT_RATE`     | ≥10% rejected in one batch for a site                 | High                         |
| `RULE_CRITICAL_CLUSTER`     | ≥2 Critical/High incidents same site in one batch     | Critical                     |
| `RULE_CRITICAL_HIGH_RISK`   | Any single Critical incident at site-003 or site-006  | Critical                     |
| `RULE_AUDIT_OVERDUE`        | High-risk site not audited in last 14 days            | High                         |
| `HAZARD_REPORT_RISK_RATING` | Risk assessment yields rating ≥ 10 on a hazard report | High (≥10) or Critical (≥15) |

Deduplication: `findFirstBySiteIdAndRuleAndStatus(…, "active")` — skips if an active
alert already exists for the same site + rule. Returns the created alert ID so
`HazardReportService` can link the hazard to the alert.

`refreshStaleNarratives()` re-generates narratives when incident counts grow by ≥5–10
since the last narrative write, or audit days increase by ≥7.

#### `NarrativeService`

Builds rule-specific narrative paragraphs from live context (site activity, pressure
spikes, audit gap, Kimeu framing). Optional Groq LLM enhancement (3s timeout, template
fallback on any failure). Five narrative methods:

- `forHighRejectRate()`, `forCriticalCluster()`, `forCriticalHighRisk()`,
  `forAuditOverdue()`, `forHazardRiskRating()`

#### `AlertEntity` columns

```
id, site_id, severity, status, title, description, rule, record_ids,
created_at, acknowledged_at, acknowledged_by,
narrative (TEXT), narrative_updated_at, narrative_incident_count,
required_qualification
```

`acknowledged_by` reads from `SecurityContextHolder.getContext().getAuthentication().getName()`
— never a hardcoded stub.

---

### `hazard` — Hazard Report Module

#### `HazardReportController`

| Method | Path                                       | Auth                                                                   |
| ------ | ------------------------------------------ | ---------------------------------------------------------------------- |
| POST   | `/api/hazard-reports`                      | Any authenticated role                                                 |
| GET    | `/api/hazard-reports`                      | HSE Manager, Auditor, Analyst, Station Manager, Field Technician (own) |
| GET    | `/api/hazard-reports/{id}`                 | Same as list                                                           |
| PATCH  | `/api/hazard-reports/{id}/risk-assessment` | HSE Manager, Auditor                                                   |

#### `HazardReportService`

- `createReport()` — saves with `status='open'`
- `assessRisk(id, likelihood, severity, mitigationNote, assessorId)`:
  - Validates 1–5 range
  - Sets `risk_rating = likelihood × severity` (computed in service layer)
  - `risk_rating ≥ 10` → calls `AlertRulesEngine.createHazardAlert()`
  - On success: sets `linked_alert_id`, transitions status to `linked_to_alert`
- `closeReport()` — sets `status='closed'` (called by `CapaService.close()`)

#### `HazardReportEntity` columns

```
id (VARCHAR 36 PK), site_id, asset_id, category, description,
severity_estimate, reporter_id, photo_url,
likelihood_rating, severity_rating, risk_rating,
mitigation_note, assessed_by, assessed_at, linked_alert_id,
status (open|risk_assessed|linked_to_alert|closed), created_at
```

---

### `capa` — CAPA Lifecycle Module

#### `CapaController`

| Method | Path                     | Auth                                               |
| ------ | ------------------------ | -------------------------------------------------- |
| POST   | `/api/capas`             | HSE Manager, Auditor                               |
| GET    | `/api/capas`             | All authenticated (Field Technician sees own only) |
| GET    | `/api/capas/{id}`        | Same as list                                       |
| PATCH  | `/api/capas/{id}/status` | All authenticated (role-scoped transitions)        |

#### `CapaService`

`createCapa()` — enforces qualification guard: if the source alert has a
`required_qualification`, checks `TechnicianQualificationRepository.existsValidQualification()`
(non-expired match). Throws `QualificationMismatchException` (→ 400) on failure.

`updateStatus(id, newStatus, evidence, actorId)` — allowed transitions:

```
open → in_progress → completed → verified → closed
```

On `closed`:

- Sets `closed_at = now()`
- Calls `ModelFeedbackService.recordCapaOutcome(capa)` — writes a `capa_outcome` feedback row
- Calls `HazardReportService.closeReport()` for the linked hazard if present

`QualificationMismatchException` is handled by `GlobalExceptionHandler` → HTTP 400.

---

### `technician`

#### `TechnicianController`

| Method | Path                                                 | Auth                 |
| ------ | ---------------------------------------------------- | -------------------- |
| GET    | `/api/technicians`                                   | HSE Manager, Auditor |
| GET    | `/api/technicians/eligible?qualification=Mechanical` | HSE Manager, Auditor |

`TechnicianQualificationRepository.existsValidQualification(userId, qualType, today)` —
JPQL query checking `expiresAt IS NULL OR expiresAt > :today`.

---

### `spi` — Safety Performance Indicators

`GET /api/analytics/spi` → `SpiSummaryDto`:

```json
{
  "hazardReportsThisMonth": 4,
  "avgCapaClosureDays": 3.2,
  "pctCapasClosedOnTime": 83.0,
  "overdueCapas": 1,
  "hazardReportTrend": [{"month": "Jun 2026", "count": 2}, ...],
  "incidents30d": 24,
  "highCriticalIncidents30d": 0
}
```

Leading indicators (hazard reports, CAPA closure metrics) are computed by SQL
aggregation over `hazard_report` and `capa` tables — no Python needed.

---

### `roi` — ROI Calculator

#### `RoiController`

| Method | Path                                 | Auth             |
| ------ | ------------------------------------ | ---------------- |
| GET    | `/api/analytics/roi/reference-cases` | None (permitAll) |
| POST   | `/api/analytics/roi/calculate`       | None (permitAll) |

`GET /api/analytics/roi/reference-cases` — reads `thange_kimeu_2025.json` from
`data/reference/` (via `AnalyticsService`). Returns reference case + default
assumptions table. If file not found, returns a hard-coded fallback with the court
record values.

`POST /api/analytics/roi/calculate` — reads `roi_simulation_result.json` for
`lead_time_days`, applies the formula server-side:

```
expected_avoided = intervention_probability × incident_exposure_kes × n_high_risk_alerts
net_benefit = expected_avoided - annual_platform_cost (if provided)
roi_pct = net_benefit / annual_platform_cost × 100 (if provided)
```

Returns full `breakdown` map + mandatory `disclaimer` string. Does **not** call Python
at runtime — all calculation is Java, lead time is pre-computed.

**Enforced constraints:**

- `gross_award_kes` (3,018,831,676) is never fed into any formula — display only
- `lead_time_days` is always read from the simulation file — never hardcoded

---

### `ml` — ML HITL Governance

#### `MlAdminController` — All endpoints require `ML_ADMIN` or `ADMIN` role

| Method | Path                                  | Description                                                            |
| ------ | ------------------------------------- | ---------------------------------------------------------------------- |
| GET    | `/api/ml/champion-artifact-path`      | `permitAll` — returns `{artifactPath}` for `predict.py`                |
| GET    | `/api/ml/overview`                    | Champion + challenger + last 5 versions                                |
| GET    | `/api/ml/model-registry`              | All versions ordered by `trained_at DESC`                              |
| GET    | `/api/ml/training-runs`               | All retrain history                                                    |
| GET    | `/api/ml/feedback`                    | Paged list of `model_feedback` rows                                    |
| GET    | `/api/ml/predictions-for-review`      | `fact_predictions` sorted by `ABS(probability - 0.5) ASC`              |
| POST   | `/api/ml/feedback`                    | Save one `ModelFeedbackEntity` (source=`human_review`)                 |
| POST   | `/api/ml/training-run`                | Save `ModelRegistryEntity` (status=`challenger`) + `TrainingRunEntity` |
| PATCH  | `/api/ml/model-registry/{id}/promote` | Champion swap (transactional)                                          |
| PATCH  | `/api/ml/model-registry/{id}/reject`  | Mark rejected + optional notes                                         |

#### `ModelFeedbackService`

`recordCapaOutcome(capa)` — called from `CapaService.close()` via `MlWiringConfig`
setter injection (breaks the circular dependency):

```java
// MlWiringConfig.wire() called @PostConstruct
capaService.setModelFeedbackService(modelFeedbackService);
```

Derives `site_id` from `source_alert_id` or `source_hazard_id` FK chain. Sets
`source='capa_outcome'`, `rating='accurate'`.

#### `ModelRegistryService.promote()` — `@Transactional`

```java
// 1. Verify challenger exists and status == 'challenger'
// 2. Archive all current champions (findByStatus("champion"))
// 3. Set challenger.status = 'champion', approved_by, approved_at
// Both saves in one transaction — never two simultaneous champions
```

---

### `analytics` — Diagnostic Artifacts

All analytics endpoints read pre-computed JSON from `sentinel/data/warehouse/`
via `AnalyticsService.readJson(filename)`. Returns 503 if file not yet generated.

| Endpoint                             | File served                                         |
| ------------------------------------ | --------------------------------------------------- |
| `/api/analytics/survival-curves`     | `survival_curve_data.json`                          |
| `/api/analytics/pressure-charts`     | `control_chart_data.json`                           |
| `/api/analytics/correlation`         | `correlation_data.json`                             |
| `/api/analytics/feature-importance`  | `feature_importance.json`                           |
| `/api/analytics/roi/reference-cases` | `data/reference/thange_kimeu_2025.json`             |
| `/api/analytics/roi/calculate`       | reads `roi_simulation_result.json`, applies formula |
| `/api/analytics/spi`                 | computed from DB (not a file)                       |

---

### `risk` — Risk Scoring

`RiskService.computeRiskScore()` — transparent, 5-component rule-weighted score (0–100):

| Component          | Weight | Formula                                 |
| ------------------ | ------ | --------------------------------------- |
| Incident frequency | 30%    | `min(incidentCount / 2.0, 100)`         |
| Severity mix       | 30%    | `(critHighCount / incidentCount) × 100` |
| Audit recency      | 20%    | `min(daysSinceAudit / 1.8, 100)`        |
| Rejection rate     | 10%    | `min(rejectedRate × 500, 100)`          |
| Pressure spikes    | 10%    | `min(spikeCount × 10, 100)`             |

Bands: ≥75 Critical · ≥55 High · ≥30 Medium · <30 Low

`SITE_COORDS` map uses **lowercase keys** (`"site-001"` not `"SITE-001"`).

`SiteRiskSummaryDto` includes `incidentProbability7d` and `modelRiskBand` from
`PredictionService.getProbabilityBySite()`.

---

### `corridor`

`CorridorHeatmapService` computes normalized weight (0–1) per asset:

- Flood zone: 40% | Live environmental status: 40% | Nearest-site risk: 20%
- Single `findLatestPerAsset()` bulk query — no per-asset round trips

---

### `quality`

`GET /api/quality/summary` → `{ trusted, corrected, review, rejected, passRate, gateStatus, lastBatchId, lastBatchDate }`

`passRate` = (trusted + corrected) / total. `gateStatus` = `"passed"` if ≥ 0.90.

---

## Security Configuration

`JwtAuthFilter` sets authority as `"ROLE_" + roleName.toUpperCase().replace(" ","_")`:

- `"Admin"` → `ROLE_ADMIN`
- `"HSE Manager"` → `ROLE_HSE_MANAGER`
- `"Field Technician"` → `ROLE_FIELD_TECHNICIAN`

`SecurityConfig` permission matrix:

```
permitAll:
  /api/auth/**
  /api/alerts (GET)
  /api/sites/**
  /api/corridor/**
  /api/quality/**
  /api/telemetry/**
  /api/config/**
  /api/analytics/**          (includes roi, spi)
  /api/ml/champion-artifact-path

authenticated (any JWT):
  POST /api/alerts/{id}/ack
  POST /api/hazard-reports
  GET/PATCH /api/hazard-reports/**
  GET/PATCH /api/capas/**
  POST /api/capas (HSE_MANAGER, AUDITOR only)

role-gated:
  /api/technicians/**        → HSE_MANAGER, AUDITOR
  /api/ml/**                 → ML_ADMIN, ADMIN
  /api/users/**              → ADMIN
  /api/roles/**              → ADMIN
```

---

## Database Migrations

| Migration | Key content                                                                                                                         |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| V1        | Core tables: `dim_site`, `fact_incidents`, `fact_audits`, `ingest_log`, `alerts`                                                    |
| V2        | KPC domain seed: 7 sites, incidents, audits, 7 alerts, 5 ingest batches                                                             |
| V3        | `app_role`, `app_user`                                                                                                              |
| V4        | Default user accounts (5 roles, BCrypt)                                                                                             |
| V5        | Schema corrections                                                                                                                  |
| V6        | `dim_asset` (176), `fact_environmental`                                                                                             |
| V7        | Missing pump stations                                                                                                               |
| V8        | `reading_id` widened to VARCHAR                                                                                                     |
| V9        | `site-007` (Kisumu) added                                                                                                           |
| V10       | `fact_predictions` (id BIGINT, site_id, as_of_date, probability, model_version, top_features)                                       |
| V11       | `narrative TEXT` added to `alerts` (two V11 files exist — see note)                                                                 |
| V12       | `narrative_updated_at` backfilled from `created_at`                                                                                 |
| V13       | `narrative_incident_count BIGINT` added to `alerts`                                                                                 |
| V14       | New roles (Field Technician, Station Manager, Maintenance Team, ML Admin); `hazard_report`; `capa`; `alerts.required_qualification` |
| V15       | `technician`; `technician_qualification`                                                                                            |
| V16       | `model_feedback`; `model_registry`; `training_run`; champion seed row for logreg_v1                                                 |

**Note on V11 conflict:** two V11 files exist (`V11__add_alert_narrative.sql` and
`V11__fact_predictions.sql`). On a clean deploy, rename the narrative file to
`V14__add_alert_narrative_fix.sql` if Flyway rejects the duplicate.

---

## Configuration (`application.yml`)

| Property                           | Default                                      | Description                                            |
| ---------------------------------- | -------------------------------------------- | ------------------------------------------------------ |
| `sentinel.etl.enabled`             | `true`                                       | Auto-launch Python ETL on startup                      |
| `sentinel.etl.live-batch-path`     | `../sentinel/data/warehouse/live_batch.json` | JSON bridge file                                       |
| `sentinel.etl.sentinel-dir`        | `../sentinel`                                | Python project root (used by AnalyticsService)         |
| `sentinel.etl.poll-interval-ms`    | `120000`                                     | Polling interval                                       |
| `sentinel.etl.rows-per-cycle`      | `200`                                        | Synthetic rows per ETL run                             |
| `sentinel.etl.frontend-refresh-ms` | `125000`                                     | Passed to frontend for auto-refresh timing             |
| `sentinel.jwt.expiration-ms`       | `86400000`                                   | JWT lifetime (24 h)                                    |
| `sentinel.cors.allowed-origins`    | `localhost:3000,3001`                        | CORS allowed origins                                   |
| `sentinel.llm.groq-api-key`        | `""`                                         | Groq API key (blank = LLM disabled, template fallback) |
| `sentinel.llm.enabled`             | `true`                                       | Enable/disable LLM narrative enhancement               |
| `sentinel.llm.timeout-ms`          | `3000`                                       | Max wait for Groq API before fallback                  |
