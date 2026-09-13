# 13 — V4 Testing Strategy

---

## 1. Current Test Coverage Baseline

| Layer | Current Tests | Coverage |
|---|---|---|
| Python ETL (`sentinel/tests/`) | 3 test files: `test_features.py`, `test_transform.py`, `test_validate.py` | Partial — `decide.py`, `load.py`, `predict.py`, `retrain.py`, `ingest.py` have zero tests |
| Java backend (`sentinel-backend/src/test/`) | Zero meaningful tests | 0% |
| Next.js frontend (`sentinel-frontend/`) | Zero tests | 0% |
| End-to-end | None | 0% |

V4 must establish a meaningful test baseline with CI gates before any new feature work is merged.

---

## 2. Testing Pyramid

```
                     ┌────────────────┐
                     │  E2E (Playwright)  │  ← 5–10 critical paths
                     └────────┬───────┘
                ┌─────────────┴─────────────┐
                │  Integration Tests         │  ← 20–40 API + DB scenarios
                │  (Spring + Testcontainers) │
                │  (pytest + psycopg2 test DB)│
                └─────────────┬─────────────┘
     ┌───────────────────────┴──────────────────────────┐
     │                  Unit Tests                       │
     │  Java: JUnit 5 (service logic)                   │
     │  Python: pytest (pipeline functions)             │
     │  Frontend: Vitest + Testing Library (components) │
     └──────────────────────────────────────────────────┘
```

---

## 3. Python ETL Tests (`sentinel/tests/`)

### 3.1 Existing Tests (maintain and extend)

| File | Tests | V4 Extensions |
|---|---|---|
| `test_features.py` | Feature computation | Add tests for `tank_overfill_events_7d`, `avg_tank_level_pct_7d` |
| `test_transform.py` | Normalisation functions | Add tank telemetry normalisation |
| `test_validate.py` | Validation rules | Add `tank_level_pct BETWEEN 0 AND 100` rule |

### 3.2 New Test Files Required

#### `tests/test_load.py`
Tests for `src/load.py` psycopg2 direct DB writes.

```python
# Pattern: use a test PostgreSQL instance (Docker or pytest-docker)
# or patch psycopg2.connect with a mock cursor

def test_load_incidents_inserts_new_rows(test_db):
    """New incident rows are inserted correctly."""

def test_load_incidents_skips_duplicates(test_db):
    """Existing incident_ids are not re-inserted (ON CONFLICT DO NOTHING)."""

def test_load_tank_telemetry_flags_overfill(test_db):
    """Rows with tank_level_pct > 95 AND valve_status='Open' set overfill_flag=True."""

def test_load_tank_telemetry_rejects_invalid_level(test_db):
    """tank_level_pct outside [0,100] raises DB constraint error."""

def test_load_predictions_writes_to_fact_predictions(test_db):
    """Prediction rows for known sites are inserted; unknown sites are skipped."""
```

#### `tests/test_retrain.py`
Tests for `src/retrain.py`.

```python
def test_retrain_requires_minimum_feedback(monkeypatch):
    """retrain.py exits without training if feedback count < 5."""

def test_retrain_excludes_uncertain_ratings(mock_feedback):
    """Rows with rating='uncertain' are excluded from the training dataset."""

def test_retrain_flips_label_for_inaccurate_rating(mock_feedback):
    """Rows with rating='inaccurate' have their label flipped."""

def test_retrain_produces_pkl_artifact(tmp_path, mock_feedback):
    """retrain.py saves a valid sklearn Pipeline PKL file."""

def test_retrain_registers_challenger_via_api(mock_api, mock_feedback):
    """POST /api/ml/model-registry is called with correct payload."""

def test_retrain_registers_training_run_via_api(mock_api, mock_feedback):
    """POST /api/ml/training-run is called after successful training."""
```

#### `tests/test_predict.py`
Tests for `src/predict.py` champion selection.

```python
def test_predict_loads_champion_from_registry(mock_api, tmp_path):
    """predict.py queries model_registry and loads the champion artifact_path."""

def test_predict_falls_back_to_default_if_api_unreachable(tmp_path):
    """When API is unreachable, predict.py uses logreg_v1.pkl fallback."""

def test_predict_writes_scores_to_db(test_db, mock_model):
    """Prediction rows are written to fact_predictions via psycopg2."""
```

#### `tests/test_decide.py`
Tests for `src/decide.py`.

```python
def test_decide_marks_overfill_flag_when_threshold_crossed():
    """tank_level_pct > 95 AND valve_status='Open' → overfill_flag=True."""

def test_decide_does_not_flag_when_valve_closed():
    """tank_level_pct > 95 AND valve_status='Closed' → overfill_flag=False."""
```

### 3.3 CI Gate (Python)

```yaml
# In ci.yml — existing step, extended:
- name: Run unit tests
  run: pytest tests/ -v --tb=short

- name: Enforce coverage gate
  run: pytest tests/ --cov=src --cov-fail-under=70
```

---

## 4. Java Backend Tests (`sentinel-backend/src/test/`)

### 4.1 Test Infrastructure Setup (Agent 4)

```java
// AbstractIntegrationTest.java — base class for all integration tests
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
public abstract class AbstractIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
            .withDatabaseName("sentinel_test")
            .withUsername("sentinel")
            .withPassword("sentinel");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "none");
    }
}
```

`application-test.yml`:
```yaml
spring:
  flyway:
    enabled: true
    validate-on-migrate: true
sentinel:
  etl:
    enabled: false
  jwt:
    secret: test-secret-not-for-production-minimum-32-chars
```

### 4.2 Unit Tests (Agent 1 writes)

#### `AlertRulesEngineTest.java`
```java
@Test void highRejectionRateRule_firesAlert_whenRejectionExceedsThreshold()
@Test void highRejectionRateRule_noAlert_whenRejectionBelowThreshold()
@Test void criticalClusterRule_firesAlert_whenThreeCriticalInTwentyFourHours()
@Test void criticalClusterRule_noAlert_whenOnlyTwoCritical()
@Test void overfillRiskRule_firesAlert_whenTankLevelExceeds95AndValveOpen()
@Test void overfillRiskRule_noAlert_whenValveClosed()
@Test void overfillRiskRule_noAlert_whenLevelBelow95()
```

#### `RiskServiceTest.java`
```java
@Test void computeRiskScore_returnsMaxScore_forCriticalSiteWithManyIncidents()
@Test void computeRiskScore_returnsLowScore_forCleanSite()
@Test void computeRiskScore_clampsScoreBetween0And100()
@Test void severityBand_returnsCritical_whenScoreAbove75()
```

#### `DriftDetectionServiceTest.java`
```java
@Test void computeAccuracy_returnsCorrectFraction_withMixedFeedback()
@Test void getDriftStatus_returnsOk_whenDifferenceBelow5Percent()
@Test void getDriftStatus_returnsWarning_whenDifferenceBetween5And15Percent()
@Test void getDriftStatus_returnsCritical_whenDifferenceAbove15Percent()
@Test void getDriftStatus_returnsOk_whenSampleSizeBelowMinimum()
```

#### `MlAdminControllerTest.java`
```java
@Test void promote_returns403_forNonMlAdminRole()
@Test void promote_returns200_forMlAdminRole_andUpdatesStatus()
@Test void reject_archivesChallenger_andLeavesChampionUnchanged()
@Test void rollback_restoresArchivedModel_asChampion()
@Test void promote_returns409_whenNoChallengerExists()
```

#### `ActuationTriggerServiceTest.java`
```java
@Test void closeValve_returnsSimulatedSuccess_withMockActuator()
@Test void closeValve_writesActuationLogRow()
@Test void closeValve_includesLatencyMs_inResponse()
```

#### `CapaServiceTest.java`
```java
@Test void closeCapa_writesModelFeedbackRow_withSourceCapaOutcome()
@Test void closeCapa_setsClosedAtTimestamp()
@Test void closeCapa_withEvidenceUrl_persists()
```

### 4.3 Integration Tests (Agent 1 writes using Agent 4's base class)

```java
// AlertIntegrationTest.java
@Test void postAck_returns403_forFieldTechnicianRole()
@Test void postAck_returns200_andUpdatesStatus_forHseOfficer()
@Test void getAlerts_returnsAllActive_forAuthenticatedUser()

// AnalyticsIntegrationTest.java
@Test void getSurvivalCurves_returns200_withoutWarehouseDirectory()
@Test void getFeatureImportance_returns200_withChampionFeatures()
@Test void getPressureCharts_returns200_withEnvironmentalData()

// EtlIntegrationTest.java
@Test void postIngest_returns401_forInvalidApiKey()
@Test void postIngest_returns200_andInsertsIncidents()
@Test void postIngest_doesNotDuplicate_existingIncidentIds()

// DemoIntegrationTest.java
@Test void triggerOverfill_returns200_andCreatesEventLogRow()
@Test void triggerOverfill_returns200_andCreatesActuationLogRow()
@Test void triggerOverfill_returns400_forInvalidSiteId()
```

### 4.4 CI Gate (Java)

```yaml
# Extended backend job in ci.yml:
- name: Build and test with Testcontainers
  run: ./mvnw verify -Dspring.profiles.active=test
  env:
    TESTCONTAINERS_RYUK_DISABLED: "true"  # for GitHub Actions

- name: Check coverage threshold
  run: ./mvnw jacoco:check -Djacoco.minimum.coverage=0.60
```

Add JaCoCo plugin to `pom.xml`:
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <executions>
        <execution>
            <goals><goal>prepare-agent</goal></goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals><goal>report</goal></goals>
        </execution>
    </executions>
    <configuration>
        <rules>
            <rule>
                <element>PACKAGE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.60</minimum>
                    </limit>
                </limits>
                <includes>
                    <include>com/sentinel/alert/*</include>
                    <include>com/sentinel/risk/*</include>
                    <include>com/sentinel/ml/*</include>
                    <include>com/sentinel/actuation/*</include>
                    <include>com/sentinel/capa/*</include>
                </includes>
            </rule>
        </rules>
    </configuration>
</plugin>
```

---

## 5. Frontend Tests (`sentinel-frontend/`)

### 5.1 Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

MSW (Mock Service Worker) for API mocking:
```typescript
// src/test/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/ml/overview', () =>
    HttpResponse.json({ champion: mockChampion, challenger: null })
  ),
  http.post('/api/ml/feedback', () =>
    HttpResponse.json({ id: 'uuid', created: true }, { status: 201 })
  ),
  http.post('/api/demo/trigger-overfill', () =>
    HttpResponse.json({
      message: 'Overfill event seeded',
      alertId: 'uuid', eventId: 'uuid', actuationId: 'uuid', slackSent: true
    })
  ),
]
```

### 5.2 Component Tests (Vitest + Testing Library)

#### `FeedbackQueue.test.tsx`
```typescript
test('renders predictions sorted by confidence band', async () => { ... })
test('clicking Accurate button sends POST /api/ml/feedback', async () => { ... })
test('rating is persisted across re-renders', async () => { ... })
test('shows empty state when no predictions available', async () => { ... })
```

#### `ModelRegistry.test.tsx`
```typescript
test('shows Approve and Reject buttons only for challenger model', async () => { ... })
test('Approve dialog confirms before promoting', async () => { ... })
test('Reject dialog accepts optional notes', async () => { ... })
test('Rollback button shown only for archived models', async () => { ... })
test('promote returns 403 for non-ML-admin token', async () => { ... })
```

#### `ExecutiveDashboard.test.tsx`
```typescript
test('renders 4 KPI cards', async () => { ... })
test('shows overfill events prevented from API', async () => { ... })
test('shows loading skeleton before API resolves', async () => { ... })
```

#### `DemoTriggerButton.test.tsx`
```typescript
test('button is enabled and labelled correctly', () => { ... })
test('clicking button calls POST /api/demo/trigger-overfill', async () => { ... })
test('shows event feed after successful trigger', async () => { ... })
test('shows error state if API returns 500', async () => { ... })
```

### 5.3 Playwright E2E Tests

#### Critical paths to cover:

```typescript
// tests/e2e/demo-flow.spec.ts
test('full overfill demo: trigger → event → actuation → dashboard update', async ({ page }) => {
  await page.goto('/dashboard/demo')
  await page.click('[data-testid="trigger-overfill-btn"]')
  await expect(page.locator('[data-testid="event-feed"]')).toContainText('overfill_risk')
  await expect(page.locator('[data-testid="actuation-badge"]')).toContainText('simulated_success')
})

// tests/e2e/ml-promote.spec.ts
test('ML admin promote flow: challenger → approve → champion updated', async ({ page }) => {
  await page.goto('/dashboard/ml-admin/registry')
  await page.click('[data-testid="approve-promote-btn"]')
  await page.click('[data-testid="confirm-promote-btn"]')
  await expect(page.locator('[data-testid="champion-version"]')).not.toContainText('logreg_v1')
})

// tests/e2e/auth.spec.ts
test('unauthenticated user is redirected to login', async ({ page }) => { ... })
test('HSE officer cannot access ML Admin portal', async ({ page }) => { ... })
```

### 5.4 CI Gate (Frontend)

```yaml
# New job in ci.yml:
frontend-test:
  name: Frontend Tests
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: sentinel-frontend
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with: { version: 9 }
    - run: pnpm install --frozen-lockfile
    - run: pnpm run check           # Biome lint
    - run: pnpm exec vitest run     # Unit + component tests
    - run: pnpm run build           # Verify build succeeds
```

---

## 6. Data Quality Tests

### 6.1 ETL Quality Gate (existing, kept)

```yaml
- name: Enforce data-quality gate (≥ 90% acceptance)
  run: python -m src.validate --fail-below 0.90
```

### 6.2 New: Tank Telemetry Quality Gate

```python
# In ci.yml after generate_data + ETL run:
- name: Validate tank telemetry
  run: python -m src.validate --table tank_telemetry --fail-below 0.95
```

```python
# src/validate.py extension:
def validate_tank_telemetry(df: pd.DataFrame) -> ValidationResult:
    schema = pa.DataFrameSchema({
        "tank_level_pct": pa.Column(float, pa.Check.in_range(0, 100)),
        "valve_status":   pa.Column(str, pa.Check.isin(["Open","Closed","Partially_Open","Unknown"])),
        "tank_id":        pa.Column(str, pa.Check.str_length(1, 50)),
    })
    return schema.validate(df, lazy=True)
```

---

## 7. ML-Specific Tests

### 7.1 Model Sanity Tests (run after every retrain)

```python
# tests/test_model_sanity.py
def test_model_scores_range_between_0_and_1(trained_model, test_features):
    """All predicted probabilities are in [0, 1]."""
    probs = trained_model.predict_proba(test_features)[:, 1]
    assert (probs >= 0).all() and (probs <= 1).all()

def test_model_f1_above_minimum_threshold(trained_model, test_data):
    """F1 score on holdout set >= 0.40 (minimum acceptable — better than random)."""
    f1 = f1_score(test_data["label"], trained_model.predict(test_data[FEATURES]))
    assert f1 >= 0.40, f"Model F1 {f1:.3f} below minimum 0.40"

def test_model_not_predicting_constant(trained_model, test_features):
    """Model predicts both classes — not a constant predictor."""
    preds = trained_model.predict(test_features)
    assert len(set(preds)) > 1, "Model predicts only one class"

def test_champion_artifact_loadable():
    """The current champion PKL file (or artifact_blob) can be loaded."""
    model, version = load_champion_model(API_BASE, SERVICE_TOKEN)
    assert model is not None
    assert version is not None
```

### 7.2 Drift Detection Test

```python
# tests/test_drift.py
def test_drift_status_ok_when_accuracy_unchanged():
    baseline = 0.70
    recent   = 0.70
    assert compute_drift_status(baseline, recent) == "ok"

def test_drift_status_warning_when_5pct_drop():
    assert compute_drift_status(0.70, 0.64) == "warning"

def test_drift_status_critical_when_15pct_drop():
    assert compute_drift_status(0.70, 0.54) == "critical"

def test_drift_returns_ok_when_sample_below_minimum():
    assert compute_drift_status(0.70, 0.50, sample_size=3) == "ok"
```

---

## 8. Security Tests

### 8.1 Authentication Tests (Java Integration)

```java
@Test void login_returns401_forWrongPassword()
@Test void login_returns401_forUnknownUsername()
@Test void protectedEndpoint_returns401_withoutToken()
@Test void protectedEndpoint_returns401_withExpiredToken()
@Test void protectedEndpoint_returns403_withInsufficientRole()
@Test void mlAdminEndpoint_returns403_forHseOfficerRole()
```

### 8.2 Input Validation Tests

```java
@Test void triggerOverfill_returns400_forUnknownSiteId()
@Test void postFeedback_returns400_forInvalidRating()
@Test void postActuate_returns400_forMissingSiteId()
```

### 8.3 Secret Leakage CI Check

```yaml
# In ci.yml:
- name: Check for hardcoded secrets
  run: |
    if grep -r "Gric/Gyq" . --include="*.yml" --include="*.yaml" --include="*.java"; then
      echo "ERROR: Hardcoded JWT secret found"
      exit 1
    fi
    if grep -r "REPLACE_WITH_STRONG" . --include="*.yml" --include="*.yaml"; then
      echo "ERROR: API key placeholder found"
      exit 1
    fi
```

---

## 9. Regression Tests

### Definition of Regression Suite

Tests that must pass on every PR to main, protecting existing working functionality:

| # | Test | Tool | Protects |
|---|---|---|---|
| 1 | All existing Python pytest tests | pytest | ETL pipeline |
| 2 | Data quality gate ≥ 90% | validate.py | Pipeline quality |
| 3 | Spring Boot context loads | JUnit | Application startup |
| 4 | Flyway migrations apply cleanly | Flyway + Testcontainers | DB schema integrity |
| 5 | `GET /actuator/health` returns 200 | Integration test | Service availability |
| 6 | `POST /api/auth/login` returns JWT | Integration test | Auth |
| 7 | `GET /api/alerts` returns 200 | Integration test | Core API |
| 8 | `GET /api/risk/summary` returns 200 | Integration test | Risk scoring |
| 9 | `GET /api/ml/overview` returns 200 | Integration test | ML Admin |
| 10 | Frontend builds without errors | `pnpm build` | Deployment readiness |
| 11 | Frontend Biome lint passes | `pnpm check` | Code quality |
| 12 | No hardcoded secrets | grep check | Security |

---

## 10. Test Ownership Summary

| Test type | Owner agent | Framework | CI gate |
|---|---|---|---|
| Python unit (ETL functions) | Agent 3 | pytest | ✅ Yes (existing) |
| Python unit (retrain, predict, load) | Agent 3 | pytest | ✅ Yes (new) |
| Python coverage gate (≥ 70%) | Agent 3 | pytest-cov | ✅ Yes |
| Java unit (service logic) | Agent 1 | JUnit 5 | ✅ Yes |
| Java integration (API + DB) | Agent 1 + 4 | Testcontainers | ✅ Yes |
| Java coverage gate (≥ 60% services) | Agent 4 | JaCoCo | ✅ Yes |
| Frontend component | Agent 2 | Vitest + RTL | ✅ Yes |
| Frontend build | Agent 2 | Next.js | ✅ Yes |
| Frontend E2E (demo flow, auth) | Agent 2 | Playwright | Manual + optional CI |
| Data quality gate (≥ 90%) | Agent 3 | validate.py | ✅ Yes (existing) |
| Model sanity (F1 ≥ 0.40, range) | Agent 3 | pytest | ✅ Yes |
| Secret leakage check | Agent 4 | grep | ✅ Yes |
| Flyway validation | Agent 4 | Flyway | ✅ Yes |
