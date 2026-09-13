# 15 — Agent 1 Build Plan: Core Backend

> This document is independently executable. Read it top to bottom without needing any other document.
> Cross-references are provided for depth but are not required reading before starting.

---

## 1. Mission

Fix all P0/P1 backend security and functionality defects, implement the Stage 3 control-plane services (event publishing, simulated actuation, Slack alerting, executive dashboard, live demo endpoint), complete the ML Admin API surface, and enforce server-side RBAC across all endpoints.

---

## 2. Scope

**You own exclusively:**
```
sentinel-backend/src/main/java/com/sentinel/   (ALL Java source files)
sentinel-backend/src/main/resources/application.yml
    — only the sentinel.jwt.* and sentinel.cors.* blocks
sentinel-backend/src/test/java/com/sentinel/   (all test classes)
```

**You do NOT modify:**
- `sentinel-backend/src/main/resources/db/migration/` → Agent 4 owns all migrations
- `sentinel-backend/pom.xml` → Agent 4 owns
- `sentinel-backend/Dockerfile` → Agent 4 owns
- `sentinel-frontend/` → Agent 2 owns
- `sentinel/` → Agent 3 owns
- `.github/workflows/` → Agent 4 owns

---

## 3. Architecture Context

The backend is Spring Boot 3.4 / Java 21. Key packages to understand before starting:

| Package | Purpose |
|---|---|
| `com.sentinel.etl` | `EtlReloadService` — currently polls `live_batch.json`; you will refactor to query DB by batch_id |
| `com.sentinel.alert` | `AlertRulesEngine` (3 rules) + `NarrativeService` (template + optional Groq LLM) |
| `com.sentinel.ml` | `MlAdminController`, `DriftDetectionService`, `ModelComparisonService`, `ModelFeedbackService` |
| `com.sentinel.analytics` | `AnalyticsService` — currently reads warehouse JSON files (broken in production) |
| `com.sentinel.risk` | `RiskService` — composite risk score per site |
| `com.sentinel.auth` | Spring Security JWT filter + `AuthController` |

Agent 4 will have already run these Flyway migrations before you write JPA entities for the new tables:
- `V22__fact_tank_telemetry.sql`
- `V23__event_log.sql`
- `V24__actuation_log.sql`

Do not write entity code for these tables until Agent 4 confirms the migrations are merged to main.

---

## 4. Dependencies (what must exist before you can proceed)

| Dependency | Provided by | Required for |
|---|---|---|
| Flyway migrations V22–V24 merged | Agent 4 | EventLog entity, ActuationLog entity, TankTelemetry rule |
| Flyway V25 (`artifact_blob` column) merged | Agent 4 | model_registry artifact_blob field |
| Testcontainers base class (`AbstractIntegrationTest.java`) | Agent 4 | All your integration tests |
| `application-test.yml` | Agent 4 | Spring test profile |

**Start with Phase 0 and Phase 1 tasks that have no migration dependency** (JWT secret fix, AnalyticsService rewrite, ML API endpoints). Add entity code for new tables once Agent 4's migrations are confirmed merged.

---

## 5. Ordered Task List

### Phase 0 — Security and Stabilization (start immediately)

#### Task 1.0.1 — Remove Hardcoded JWT Secret

**File:** `src/main/resources/application.yml`

Change the default profile's jwt block from:
```yaml
sentinel:
  jwt:
    secret: Gric/GyqJGMk3dwMleaADNDcBGQ3qfOYUmPSDnXSy6lDIfYAG7cY06WPJNJp+Yor
    expiration-ms: 86400000
```
to:
```yaml
sentinel:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
```

Add to `.env.local` (gitignored, created by Agent 4):
```
JWT_SECRET=<generate with: openssl rand -base64 64>
```

**Verification:** Application starts locally with `JWT_SECRET` env var set. `mvnw verify` passes.

---

#### Task 1.0.2 — Rewrite AnalyticsService (Production-Broken Fix)

**File:** `src/main/java/com/sentinel/analytics/AnalyticsService.java`

Remove all four methods that read warehouse JSON files. Replace with DB queries:

**`getFeatureImportance()`:**
```java
@Query("SELECT r.featureImportance FROM ModelRegistryEntity r WHERE r.status = 'champion'")
Optional<String> findChampionFeatureImportance();
```
Parse the JSON string from `model_registry.feature_importance` and return a structured DTO.

**`getSurvivalCurves()`:**
Query `fact_incidents` grouped by site and week offset since first incident date. Compute the fraction of sites with zero Critical incidents in each week bucket. Return array of `{week, survivalFraction, siteId}`.

```sql
SELECT
    site_id,
    EXTRACT(WEEK FROM incident_date) AS week_num,
    COUNT(*) FILTER (WHERE severity = 'Critical') AS critical_count,
    COUNT(*) AS total_count
FROM fact_incidents
WHERE incident_date > CURRENT_DATE - INTERVAL '180 days'
GROUP BY site_id, week_num
ORDER BY site_id, week_num
```

**`getPressureCharts()`:**
Query `fact_environmental` for rolling 30-day mean and stddev per monitoring point. Limit to the 10 most recent readings per asset.

**`getCorrelation()`:**
Query `fact_site_features` (once Agent 3's `fact_site_features` table is populated) for correlation between `incident_count_30d` and `pressure_anomaly_count_14d` across all sites. If `fact_site_features` is empty, return a graceful `{"available": false}` response — do not return 500.

**All four methods must:** never read from a filesystem path, never throw exceptions that bubble as HTTP 500, and include a graceful empty-data response when the DB has insufficient rows.

---

#### Task 1.0.3 — Add Missing ML API Endpoints

**File:** `src/main/java/com/sentinel/ml/MlAdminController.java`

Add four new endpoints (see `11_V4_API_CONTRACTS.md §5` for exact request/response shapes):

**`POST /api/ml/model-registry`**
- Auth: `ML_ADMIN` role OR valid `X-Service-Token` header
- Creates a new `ModelRegistryEntity` with `status = 'challenger'`
- Returns 409 if a challenger already exists
- Accepts `artifactBlob` (base64) field — store in `artifact_blob` column

**`POST /api/ml/training-run`**
- Auth: `ML_ADMIN` OR `X-Service-Token`
- Creates a `TrainingRunEntity` linked to `model_registry_id`
- Returns 404 if `model_registry_id` not found

**`GET /api/ml/feedback-export`**
- Auth: `X-Service-Token` only
- Query params: `excludeUncertain=true`, `minCount=5`
- Returns `model_feedback` rows where `rating != 'uncertain'` (if excludeUncertain)
- Returns empty array (not 404) if fewer than `minCount` rows exist

**`POST /api/ml/trigger-retrain`**
- Auth: `ML_ADMIN` role
- Sets `retraining_schedule.status = 'running'`
- Invokes `retrain.py` as a subprocess (same pattern as existing `EtlReloadService.startEtlLoop()`)
- Returns 202 with `{ "message": "Retraining started" }`
- Returns 409 if status is already `'running'`

**Service Token Filter:**
Add `ServiceTokenFilter.java` that checks `X-Service-Token` header against `${SERVICE_TOKEN}` env var. Apply only to the three endpoints that accept service token auth. If token is blank/missing, the filter allows the request to fall through to the normal JWT filter (so ML_ADMIN JWT also works).

---

### Phase 1 — Foundation

#### Task 1.1.1 — Refactor EtlReloadService → EtlBatchService

**File:** `src/main/java/com/sentinel/etl/EtlReloadService.java` (rename to `EtlBatchService.java`)

Remove:
- `startEtlLoop()` `@PostConstruct` that spawns `run_live.sh` as a subprocess
- `stopEtlLoop()` `@PreDestroy`
- All file-read logic (`live_batch.json`, `predictions_export.json`)
- `liveBatchPath`, `sentinelDir` config properties (keep `pollIntervalMs`, `rowsPerCycle`)

Add:
```java
@Scheduled(fixedDelayString = "${sentinel.etl.poll-interval-ms:60000}", initialDelay = 10000)
public void processNewBatchRows() {
    if (!enabled) return;
    // Query ingest_log for batch_ids processed after lastProcessedTimestamp
    // For each new batch_id:
    //   1. Load the fact_incidents rows with that batch_id
    //   2. Run AlertRulesEngine.evaluate() on the new incident rows
    //   3. Update lastProcessedTimestamp
    // If no new batches, log debug and return
}
```

The Python layer now writes directly to the DB. This service simply queries for rows added since the last check and triggers alert evaluation. No file I/O required.

**Keep:** `EtlPushController` (push mode from CI cron) — no changes needed there.

---

#### Task 1.1.2 — Add `@PreAuthorize` to All Write Endpoints

Audit every `@PostMapping`, `@PatchMapping`, `@PutMapping`, `@DeleteMapping` across all controllers. Add:

| Controller | Endpoints | Required role |
|---|---|---|
| `MlAdminController` | `/promote`, `/reject`, `/rollback`, `/trigger-retrain` | `ML_ADMIN` |
| `AlertController` | `/ack` | `HSE_OFFICER`, `STATION_MANAGER`, `ADMIN` |
| `CapaController` | `POST`, `PATCH /status` | `HSE_OFFICER`, `ADMIN` |
| `HazardController` | `POST`, `PATCH /risk-assessment` | `FIELD_TECHNICIAN`, `HSE_OFFICER`, `ADMIN` |
| `WorkOrderController` | `POST`, `PATCH /status` | `MAINTENANCE_TEAM`, `STATION_MANAGER`, `ADMIN` |
| `UserController` | `POST`, `PUT`, `DELETE` | `ADMIN` |
| `DemoController` | `POST /trigger-overfill` | `ADMIN`, `ML_ADMIN` |
| `ActuationController` | `POST /close-valve` | `STATION_MANAGER`, `ADMIN` (+ SERVICE) |

Enable `@EnableMethodSecurity` on the `SecurityConfig` class if not already present.

---

#### Task 1.1.3 — Write Unit Tests

Using the Testcontainers base class provided by Agent 4:

**`AlertRulesEngineTest.java`** (7 test methods — see `13_V4_TESTING_STRATEGY.md §4.2`)

**`RiskServiceTest.java`** (4 test methods)

**`DriftDetectionServiceTest.java`** (4 test methods)

**`MlAdminControllerTest.java`** (5 integration test methods — role enforcement)

**`AnalyticsControllerTest.java`** (3 integration test methods — prod-safety: all return 200 without warehouse files)

Run with: `./mvnw test -pl sentinel-backend`

---

### Phase 2 — Stage 3 Control Plane Features

#### Task 1.2.1 — Implement `event/` Package

**New files:**
- `EventLogEntity.java` — JPA entity for `event_log` table
- `EventLogRepository.java` — `findBySiteIdOrderByFiredAtDesc(String siteId, Pageable p)`
- `EventPublisher.java` — service that creates `EventLogEntity` rows
- `EventLogController.java` — `GET /api/event-log?siteId=&limit=20`

`EventPublisher.publishEvent(site, tankId, signalType, severity, value, threshold, alertId)`:
```java
public EventLogEntity publishEvent(String siteId, String tankId,
        String signalType, String severity,
        BigDecimal value, BigDecimal threshold, String alertId) {
    EventLogEntity event = new EventLogEntity();
    event.setId(UUID.randomUUID().toString());
    event.setSiteId(siteId);
    event.setTankId(tankId);
    event.setSignalType(signalType);
    event.setSeverity(severity);
    event.setValue(value);
    event.setThreshold(threshold);
    event.setAlertId(alertId);
    event.setFiredAt(LocalDateTime.now());
    return eventLogRepository.save(event);
}
```

**Wait for:** Agent 4's `V23__event_log.sql` migration to be merged before writing entity code.

---

#### Task 1.2.2 — Implement `actuation/` Package

**New files:**
- `ActuationLogEntity.java` — JPA entity for `actuation_log` table
- `ActuationLogRepository.java`
- `ActuationTriggerService.java` — performs the simulated actuation
- `ActuationController.java` — `POST /api/actuate/close-valve`
- `ActuationLogController.java` — `GET /api/actuation-log?siteId=&limit=20`

`ActuationTriggerService.closeValve(siteId, tankId, eventId)`:
```java
public ActuationResponse closeValve(String siteId, String tankId, String eventId) {
    long startMs = System.currentTimeMillis();
    // Simulate processing — in production this would call KPC SCADA API
    String actuationId = UUID.randomUUID().toString();
    int latencyMs = (int)(System.currentTimeMillis() - startMs);

    ActuationLogEntity log = new ActuationLogEntity();
    log.setId(actuationId);
    log.setEventId(eventId);
    log.setSiteId(siteId);
    log.setTankId(tankId);
    log.setAction("CLOSE_VALVE");
    log.setActuator("MOCK");
    log.setStatus("simulated_success");
    log.setLatencyMs(latencyMs);
    log.setExecutedAt(LocalDateTime.now());
    log.setNotes("Simulated actuator — production deployment binds to KPC SCADA/valve control interface");
    actuationLogRepository.save(log);

    return new ActuationResponse("simulated_success", "MOCK", latencyMs, actuationId,
        "Simulated valve closure — production deployment would bind to KPC SCADA interface");
}
```

**Wait for:** Agent 4's `V24__actuation_log.sql` migration.

---

#### Task 1.2.3 — Implement `SlackNotificationService`

**New file:** `src/main/java/com/sentinel/alert/SlackNotificationService.java`

```java
@Service
@Slf4j
public class SlackNotificationService {

    @Value("${sentinel.slack.webhook-url:}")
    private String webhookUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    public void send(String text) {
        if (webhookUrl == null || webhookUrl.isBlank()) {
            log.debug("Slack webhook not configured — skipping notification");
            return;
        }
        try {
            Map<String, String> payload = Map.of("text", text);
            restTemplate.postForEntity(webhookUrl, payload, String.class);
            log.info("Slack notification sent: {}", text.substring(0, Math.min(80, text.length())));
        } catch (Exception e) {
            // Notification failure MUST NOT suppress the alert or actuation
            log.warn("Slack notification failed (non-fatal): {}", e.getMessage());
        }
    }
}
```

Add to `application.yml`:
```yaml
sentinel:
  slack:
    webhook-url: ${SLACK_WEBHOOK_URL:}
```

Wire into `NarrativeService`: after generating the narrative for a High/Critical alert, call `slackNotificationService.send(narrative + "\n_Auto-triggered simulated valve shutdown, ref ACT-" + actuationId + "_")`.

Wire `EventPublisher` and `ActuationTriggerService` into `AlertRulesEngine`: after the overfill rule fires an alert, the engine publishes an event and triggers actuation. Both calls are wrapped in try/catch — failures do not prevent alert creation.

**Add to `application.yml`** (Render environment variable):
```yaml
sentinel:
  features:
    tank-telemetry-enabled: ${TANK_TELEMETRY_ENABLED:false}
```

Guard the overfill rule in `AlertRulesEngine`:
```java
@Value("${sentinel.features.tank-telemetry-enabled:false}")
private boolean tankTelemetryEnabled;

// In evaluate():
if (tankTelemetryEnabled) {
    evaluateOverfillRisk(newIncidents);
}
```

---

#### Task 1.2.4 — Implement `demo/` Package

**New files:**
- `DemoController.java` — `POST /api/demo/trigger-overfill`

```java
@PostMapping("/api/demo/trigger-overfill")
@PreAuthorize("hasAnyRole('ADMIN','ML_ADMIN')")
public ResponseEntity<DemoTriggerResponse> triggerOverfill(@RequestBody DemoTriggerRequest req) {
    String siteId = req.getSiteId();
    // Validate siteId exists
    if (!siteRepository.existsById(siteId)) {
        return ResponseEntity.badRequest().body(null);
    }
    // Insert one seeded tank telemetry row (tank_level_pct=97.2, valve_status='Open')
    tankTelemetryRepository.save(buildSeededOverfillRow(siteId));
    // Trigger alert evaluation
    List<TankTelemetryEntity> rows = List.of(buildSeededOverfillRow(siteId));
    alertRulesEngine.evaluateTankTelemetry(rows);
    // Return summary
    return ResponseEntity.ok(buildDemoResponse(siteId));
}
```

The demo endpoint bypasses the ETL cycle entirely — it injects data directly and immediately triggers evaluation, making the full detect → act → notify → report loop visible within seconds.

---

#### Task 1.2.5 — Implement `executive/` Package

**New files:**
- `ExecutiveSummaryController.java` — `GET /api/executive/summary`
- `ExecutiveSummaryService.java`

```java
public ExecutiveSummaryDto getSummary() {
    // Overfill events prevented = count of rows in actuation_log where status='simulated_success'
    long eventsPrevented = actuationLogRepository.countByStatus("simulated_success");

    // Estimated litres saved = eventsPrevented × 5000 (assumption: avg 5000L per prevented spill)
    long litresSaved = eventsPrevented * 5000L;

    // Estimated KES exposure avoided = eventsPrevented × 150,000,000 × 0.70 / n_annual_incidents
    // (same intervention probability assumption as ROI calculator)
    long kesAvoided = Math.round(eventsPrevented * 150_000_000L * 0.70 / 3.0);

    // System uptime: derive from model_performance_snapshot or return 99.9 as a placeholder
    double uptimePct = 99.9;

    return new ExecutiveSummaryDto(eventsPrevented, litresSaved, kesAvoided,
        uptimePct, LocalDateTime.now(), "last_30_days");
}
```

**Label assumptions clearly** in the DTO's Javadoc and in the API response — the same honesty discipline as the ROI calculator.

---

#### Task 1.2.6 — Add Overfill ROI Line

**File:** `src/main/java/com/sentinel/roi/RoiController.java`

Add a new assumption key `overfillLitresPerEvent` (default: 5000L, labelled ESTIMATE) to the `/reference-cases` response.

Add computation to `/calculate`:
```java
double overfillLineSavings =
    req.getInterventionProbability()
    * req.getOverfillLitresPerEvent() * 0.001   // litres → m³
    * 150.0                                      // KES per litre (estimate)
    * req.getNHighRiskAlerts();
```

Label this line `"Overfill prevention (estimated)"` in the breakdown array.

---

### Phase 3 — ML Loop Wiring

#### Task 1.3.1 — Wire Retraining Schedule State Machine

**File:** `src/main/java/com/sentinel/ml/RetrainingScheduleService.java` (new)

```java
@Scheduled(cron = "0 0 2 * * MON")  // every Monday at 02:00
public void checkScheduledRetrain() {
    RetrainingScheduleEntity schedule = retrainingScheduleRepository.findSingleRow();
    if (!"scheduled".equals(schedule.getStatus())) return;
    if (schedule.getNextRunAt() == null || schedule.getNextRunAt().isAfter(LocalDateTime.now())) return;
    triggerRetrain("schedule");
}

public void triggerRetrain(String triggeredBy) {
    // Set status → 'running'
    // Invoke retrain.py subprocess (same pattern as old EtlReloadService.startEtlLoop())
    // On completion: set status → 'awaiting_review'
    // On failure: set status → 'failed'
}
```

---

## 6. File / Module Boundaries

| File | Action |
|---|---|
| `com.sentinel.etl.EtlReloadService` | Refactor — remove file poll, keep batch-query logic |
| `com.sentinel.analytics.AnalyticsService` | Rewrite — all 4 methods |
| `com.sentinel.ml.MlAdminController` | Extend — add 4 new endpoints |
| `com.sentinel.alert.AlertRulesEngine` | Extend — add overfill rule + EventPublisher wire |
| `com.sentinel.alert.NarrativeService` | Extend — add Slack call |
| `com.sentinel.alert.SlackNotificationService` | New |
| `com.sentinel.actuation.*` | New package |
| `com.sentinel.event.*` | New package |
| `com.sentinel.demo.*` | New package |
| `com.sentinel.executive.*` | New package |
| `com.sentinel.roi.RoiController` | Extend — add overfill line |
| All `*Controller.java` files | Extend — add @PreAuthorize |
| `src/main/resources/application.yml` | Edit jwt block + add slack + features blocks |

---

## 7. Testing Requirements

Minimum tests to write (see `13_V4_TESTING_STRATEGY.md §4` for full test method list):

- `AlertRulesEngineTest.java` — 7 unit tests
- `RiskServiceTest.java` — 4 unit tests
- `DriftDetectionServiceTest.java` — 4 unit tests
- `MlAdminControllerTest.java` — 5 integration tests (role enforcement)
- `AnalyticsControllerTest.java` — 3 integration tests (no-warehouse-directory safety)
- `ActuationTriggerServiceTest.java` — 3 unit tests
- `DemoControllerTest.java` — 3 integration tests
- `AlertIntegrationTest.java` — 3 integration tests

---

## 8. Acceptance Criteria

- [ ] `./mvnw verify` passes with ≥ 60% line coverage on alert, risk, ml, actuation packages.
- [ ] `GET /api/analytics/feature-importance` returns 200 on a DB with no warehouse directory.
- [ ] `POST /api/ml/model-registry` returns 201 with `status: 'challenger'`.
- [ ] `POST /api/demo/trigger-overfill` creates rows in `event_log` AND `actuation_log` AND sends Slack.
- [ ] `GET /api/executive/summary` returns 4 numeric fields without error.
- [ ] `PATCH /api/ml/model-registry/{id}/promote` returns 403 for HSE_OFFICER role (integration test).
- [ ] No file reads remain in `AnalyticsService`.
- [ ] No hardcoded secret in `application.yml`.
- [ ] `SlackNotificationService` does not throw or log ERROR when webhook URL is blank.

---

## 9. Known Risks

| Risk | Mitigation |
|---|---|
| Agent 4 migration delay blocks entity code | Start with packages that have no new-table dependency (AnalyticsService, ML endpoints, JWT fix) |
| `fact_site_features` empty when analytics correlation query runs | Return `{"available": false}` — do not return 500 |
| Groq API timeout combined with Slack call on alert path | Virtual threads (Java 21) make both calls cheap; Slack call is fire-and-forget with try/catch |
| `retrain.py` not yet ready when trigger-retrain endpoint is called | Endpoint still returns 202; subprocess invocation is a no-op if the script doesn't exist yet (log warning) |

---

## 10. Definition of Done

- All tasks in Sections 5.0–5.3 completed.
- All acceptance criteria in Section 8 pass.
- No TODO comments without a linked debt item ID.
- Branch `agent-1/core-backend` is rebased on latest main and all CI checks pass.
- PR description references every debt item ID fixed (P0-01, P0-03, P0-06, P1-01, P1-02, P1-03, Stage 3 F2–F4, F6, F8, P2-03).
