# 08 — V4 Fix and Technical Debt Plan

> Classified by priority. P0 items must be resolved before any V4 feature work begins.
> Each entry: **Issue → Classification → Fix → Files/Locations Affected → Acceptance Criteria**

---

## P0 — Critical (System-breaking, Security, Data Integrity, Production-blocking)

---

### P0-01 — JWT Secret Hardcoded in Version Control

**Issue:** The JWT signing secret `Gric/GyqJGMk3dwMleaADNDcBGQ3qfOYUmPSDnXSy6lDIfYAG7cY06WPJNJp+Yor` is committed in two files. Any repository reader can forge valid tokens for any user.

**Classification:** Security / Critical

**Fix:**
1. Remove the secret value from `application.yml` (default profile). Replace with:
   ```yaml
   sentinel:
     jwt:
       secret: ${JWT_SECRET}
   ```
2. Remove the secret value from `render.yaml`. Replace with a reference to an external secret:
   ```yaml
   - key: JWT_SECRET
     sync: false   # injected from Render dashboard, not from this file
   ```
3. Generate a new 64-byte secret: `openssl rand -base64 64`
4. Store in `.env.local` (gitignored) for local dev.
5. Rotate the Render dashboard environment variable.
6. Add a CI check: `grep -r "Gric/Gyq" . --include="*.yml" --include="*.yaml"` fails the build if the old secret is found.

**Files affected:**
- `sentinel-backend/src/main/resources/application.yml`
- `sentinel-backend/render.yaml`
- `sentinel-backend/.env.local` *(create, add to .gitignore)*

**Acceptance Criteria:** Zero occurrences of the hardcoded secret in any committed file. CI check passes. Local dev works with `.env.local`.

---

### P0-02 — Duplicate Flyway Migration Version Numbers

**Issue:** Both `V14__add_telemetry_pressure_index.sql` and `V14__hse_foundation.sql` share version `14`. Similarly `V15__fact_predictions.sql` and `V15__hse_technician.sql` share version `15`. `validate-on-migrate: false` masks this.

**Classification:** Database integrity / Critical

**Fix:**
1. Rename files (Git rename, not delete + create):
   ```
   V14__add_telemetry_pressure_index.sql  →  V14.1__add_telemetry_pressure_index.sql
   V14__hse_foundation.sql                →  V14.2__hse_foundation.sql
   V15__hse_technician.sql                →  V15.1__hse_technician.sql
   V15__fact_predictions.sql              →  V15.2__fact_predictions.sql
   ```
2. On the production database: run `DELETE FROM flyway_schema_history WHERE version IN ('14','15')` then re-apply the renamed migrations (since `baseline-on-migrate: true` is set, only unrun migrations are applied).
3. Set `validate-on-migrate: true` in `application-render.yml` and `application-postgres.yml` profiles.
4. Add a CI step that validates Flyway migration naming: `ls db/migration | sort | uniq -d` — fails if duplicates found.

**Files affected:**
- `sentinel-backend/src/main/resources/db/migration/` (4 files renamed)
- `sentinel-backend/src/main/resources/application-render.yml`
- `sentinel-backend/src/main/resources/application.yml` (postgres profile)

**Acceptance Criteria:** `./mvnw flyway:validate` passes against a fresh PostgreSQL container. `validate-on-migrate: true` set in all profiles.

---

### P0-03 — AnalyticsService Returns HTTP 500 in Production

**Issue:** All four analytics endpoints (`/survival-curves`, `/pressure-charts`, `/correlation`, `/feature-importance`) read JSON files from `data/warehouse/`. In production (`ETL_ENABLED=false`), these files don't exist. All endpoints return 500.

**Classification:** Production-broken / Critical

**Fix:**
1. Replace `AnalyticsService.getSurvivalCurves()` with a DB query against `fact_incidents`:
   - Compute weekly incident-free fractions per site using SQL window functions.
2. Replace `AnalyticsService.getPressureCharts()` with a query against `fact_environmental`:
   - Return rolling mean + stddev per asset for the last 30 days.
3. Replace `AnalyticsService.getCorrelation()` with a query joining `fact_incidents` and `fact_environmental`.
4. Replace `AnalyticsService.getFeatureImportance()` with:
   ```java
   @Query("SELECT feature_importance FROM model_registry WHERE status = 'champion'")
   Optional<String> getChampionFeatureImportance();
   ```
5. Remove all `ResponseEntity<String>` file-proxy patterns from `AnalyticsService`.
6. Remove `sentinel.etl.live-batch-path` and `sentinel.etl.sentinel-dir` usages from `AnalyticsService` (keep only in `EtlReloadService`).

**Files affected:**
- `sentinel-backend/src/main/java/com/sentinel/analytics/AnalyticsService.java`
- `sentinel-backend/src/main/java/com/sentinel/analytics/AnalyticsController.java`
- New repository query methods in site/analytics repositories

**Acceptance Criteria:** All four analytics endpoints return valid JSON on a production Render deployment where no warehouse directory exists. Frontend analytics page renders without fallback error state.

---

### P0-04 — `src/retrain.py` Does Not Exist

**Issue:** The HITL build plan's core ML execution script has not been written. The entire feedback → retrain → challenger loop is broken.

**Classification:** Missing functionality / ML lifecycle broken

**Fix:** Implement `sentinel/src/retrain.py` as specified in `06_ML_HITL_V4_ARCHITECTURE.md §4`.

**Files affected:**
- `sentinel/src/retrain.py` *(new file)*
- `sentinel/requirements.txt` *(add `requests`)*

**Acceptance Criteria:** Running `python -m src.retrain` against a DB with ≥ 5 feedback rows produces a new `models/logreg_v{N}.pkl`, registers it in `model_registry` with `status='challenger'`, and creates a `training_run` row. The challenger appears in the ML Admin Portal.

---

### P0-05 — `src/predict.py` Uses Hardcoded Model Path

**Issue:** `predict.py` hardcodes `MODEL_PATH = Path("models/logreg_v1.pkl")`. Model promotions via the ML Admin Portal never take effect in live predictions.

**Classification:** ML lifecycle broken / Critical

**Fix:**
1. Remove the hardcoded `MODEL_PATH` constant.
2. Add `load_champion_model()` function that queries `GET /api/ml/model-registry` and loads the `artifact_path` of the `status='champion'` row.
3. Fall back to `logreg_v1.pkl` if the API is unreachable (backward-compatible for local dev without backend running).

**Files affected:**
- `sentinel/src/predict.py`

**Acceptance Criteria:** After promoting a new challenger via the ML Admin Portal, the next `python -m src.predict` run uses the new model's PKL file. The `model_version` field in `fact_predictions` reflects the new version.

---

### P0-06 — Missing `POST /api/ml/model-registry` and `POST /api/ml/training-run` Endpoints

**Issue:** `retrain.py` needs to register its output via API calls. Neither endpoint exists in `MlAdminController`.

**Classification:** Missing API / Blocks ML lifecycle

**Fix:**
1. Add `POST /api/ml/model-registry` — accepts new model registration, stores with `status='challenger'`.
2. Add `POST /api/ml/training-run` — accepts training run record.
3. Add `GET /api/ml/feedback-export` — returns `model_feedback` rows for Python consumption.
4. Add `POST /api/ml/trigger-retrain` — triggers `retrain.py` (subprocess or async).
5. Add `@PreAuthorize("hasRole('ML_ADMIN')")` on 1, 4; SERVICE_TOKEN auth on 2, 3.

**Files affected:**
- `sentinel-backend/src/main/java/com/sentinel/ml/MlAdminController.java`
- `sentinel-backend/src/main/java/com/sentinel/ml/ModelRegistryService.java` *(new or extend)*
- `sentinel-backend/src/main/java/com/sentinel/ml/TrainingRunService.java` *(new or extend)*

**Acceptance Criteria:** `retrain.py` can register a challenger and training run via HTTP. The ML Admin Portal's Training Runs page shows the new run. The challenger appears in the Registry page.

---

### P0-07 — ETL API Key Placeholder in Production

**Issue:** `render.yaml` sets `ETL_API_KEY: REPLACE_WITH_STRONG_RANDOM_KEY`. The CI cron (`etl-cron.yml`) uses this key. If the placeholder is not replaced, either the push silently fails (if backend rejects it) or succeeds with a known, weak key.

**Classification:** Security / Production-broken

**Fix:**
1. Generate: `openssl rand -base64 32`
2. Set the value in Render dashboard environment variables (not in `render.yaml`).
3. Set the same value in GitHub repository secrets as `ETL_API_KEY`.
4. Update `render.yaml`:
   ```yaml
   - key: ETL_API_KEY
     sync: false
   ```
5. Add a startup warning in `EtlPushController` if `ETL_API_KEY` matches the placeholder string.

**Files affected:**
- `sentinel-backend/render.yaml`
- GitHub repository secrets (external configuration, no file change)

**Acceptance Criteria:** `render.yaml` contains no literal key values. CI cron successfully pushes a batch to production. ETL push endpoint rejects requests without the correct key.

---

## P1 — High (Major Functionality / Architecture Problems)

---

### P1-01 — File-Based ETL Handoff Replaced with Direct DB Writes

**Issue:** Python writes `live_batch.json` → Spring Boot polls and reads it. Race condition; fails silently on file errors; 2-minute latency.

**Fix:** See `05_SENTINEL_V4_TARGET_ARCHITECTURE.md §3.1` and `06_ML_HITL_V4_ARCHITECTURE.md`. Add `psycopg2-binary` to Python. Rewrite `load.py` to write directly to PostgreSQL.

**Files affected:**
- `sentinel/src/load.py` (rewrite file-write logic to DB inserts)
- `sentinel/src/predict.py` (rewrite predictions_export.json write to DB inserts)
- `sentinel/requirements.txt` (add psycopg2-binary 2.9.x)
- `sentinel-backend/src/main/java/com/sentinel/etl/EtlReloadService.java` (remove file polling; replace with DB batch query)

**Acceptance Criteria:** `live_batch.json` and `predictions_export.json` files are no longer created. DB contains new rows within 5 seconds of `run_pipeline.py` completing. `EtlReloadService` processes new rows by `batch_id` without any file reads.

---

### P1-02 — Backend Unit Tests Missing

**Issue:** Zero meaningful backend unit or integration tests.

**Fix:**
1. Add Testcontainers PostgreSQL test configuration.
2. Write unit tests for `AlertRulesEngine` (3 rules: injection via constructor, assert alert created/not created).
3. Write unit tests for `RiskService.computeRiskScore()` (boundary values).
4. Write unit tests for `DriftDetectionService.computeAccuracy()`.
5. Write integration tests for key API endpoints (`/api/auth/login`, `/api/alerts`, `/api/ml/overview`).
6. Add coverage gate: fail CI if `com.sentinel.*` service coverage < 60%.

**Files affected:**
- `sentinel-backend/src/test/java/com/sentinel/` (new test files)
- `sentinel-backend/pom.xml` (add Testcontainers dependency)

**Acceptance Criteria:** `mvnw verify` runs meaningful tests. CI fails if service test coverage < 60%.

---

### P1-03 — API Endpoints Missing Role Enforcement

**Issue:** `@PreAuthorize` annotations are missing on write endpoints.

**Fix:**
Add the following annotations (verified against each controller):
- `MlAdminController`: `@PreAuthorize("hasRole('ML_ADMIN')")` on `/promote`, `/reject`, `/rollback`, `/trigger-retrain`.
- `AlertController`: `@PreAuthorize("hasAnyRole('ADMIN','HSE_OFFICER','STATION_MANAGER')")` on `POST /ack`.
- `UserController`: `@PreAuthorize("hasRole('ADMIN')")` on `POST`, `PUT`, `DELETE`.
- `CapaController`: `@PreAuthorize("hasAnyRole('ADMIN','HSE_OFFICER')")` on `POST`, `PATCH`.
- `HazardController`: `@PreAuthorize("hasAnyRole('ADMIN','HSE_OFFICER','FIELD_TECHNICIAN')")` on `POST`.

**Files affected:**
- All `*Controller.java` files in `com.sentinel.*`

**Acceptance Criteria:** Integration test returns 403 for `HSE_OFFICER` attempting `PATCH /api/ml/model-registry/{id}/promote`. All documented role requirements are covered by a test.

---

### P1-04 — Model Artifact Storage on Ephemeral Filesystem

**Issue:** Model PKL files are stored on the local filesystem. Render containers restart with empty filesystems.

**Fix (V4 pragmatic solution):**
Add `artifact_blob` column to `model_registry`:
```sql
-- V22 migration:
ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS artifact_blob TEXT NULL;
```
`retrain.py` base64-encodes the PKL and stores it in `artifact_blob`. `predict.py` decodes it to a temp file if the `artifact_path` file doesn't exist:
```python
import base64, tempfile
if not Path(artifact_path).exists():
    blob = registry_row["artifact_blob"]
    with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as f:
        f.write(base64.b64decode(blob))
        artifact_path = f.name
```

**Files affected:**
- `sentinel-backend/src/main/resources/db/migration/V22__artifact_blob.sql` *(new)*
- `sentinel/src/retrain.py`
- `sentinel/src/predict.py`

**Acceptance Criteria:** After a Render container restart, `predict.py` can load the champion model without the PKL file being present on disk.

---

### P1-05 — Frontend Token Cookie Regex Replaced

**Issue:** Six client-side pages use `document.cookie.match(/sentinel-token=([^;]+)/)?.[1]` to extract the JWT. This is XSS-vulnerable and fragile.

**Fix:**
1. Create Next.js Route Handlers for authenticated client-side mutations:
   - `app/api/proxy/ml/feedback/route.ts`
   - `app/api/proxy/ml/model-registry/[id]/promote/route.ts`
   - `app/api/proxy/ml/model-registry/[id]/reject/route.ts`
   - `app/api/proxy/ml/model-registry/[id]/rollback/route.ts`
   - `app/api/proxy/ml/trigger-retrain/route.ts`
2. Each Route Handler reads the `sentinel-token` cookie server-side using `cookies()` from `next/headers`.
3. Remove all `document.cookie.match(...)` patterns from client components.

**Files affected:**
- `sentinel-frontend/src/app/api/proxy/**/*.ts` *(new route handlers)*
- `sentinel-frontend/src/app/(main)/dashboard/ml-admin/feedback/page.tsx`
- `sentinel-frontend/src/app/(main)/dashboard/ml-admin/registry/page.tsx`
- `sentinel-frontend/src/app/(main)/dashboard/ml-admin/training-runs/page.tsx`
- `sentinel-frontend/src/app/(main)/dashboard/ml-admin/retraining-schedule/page.tsx`
- `sentinel-frontend/src/app/(main)/dashboard/maintenance/page.tsx` *(if applicable)*

**Acceptance Criteria:** Zero occurrences of `document.cookie.match` in the codebase. Client-side authenticated mutations work through Route Handlers.

---

## P2 — Medium (Quality / Performance Improvements)

---

### P2-01 — `loadPredictions()` N+1 Queries Fixed

**Files:** `sentinel-backend/src/main/java/com/sentinel/etl/EtlReloadService.java`, `PredictionRepository.java`

**Fix:** Add bulk `findSiteIdsForDate()` query. See `07_PERFORMANCE_BOTTLENECK_ANALYSIS.md §3.2`.

---

### P2-02 — Database Indexes Added

**Files:** New migration `V22__performance_indexes.sql`

**Fix:**
```sql
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON fact_incidents(severity, incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_decision_date ON fact_incidents(decision, incident_date);
CREATE INDEX IF NOT EXISTS idx_feedback_site_source_rating ON model_feedback(site_id, source, rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON model_feedback(created_at DESC);
```

---

### P2-03 — ROI Calculator Overfill Line Added

**Files:** `sentinel-backend/src/main/java/com/sentinel/roi/RoiController.java`, `sentinel-frontend/src/app/(main)/dashboard/sentinel/roi/page.tsx`

**Fix:** Add one new assumption line: `P(shutdown prevents spill) × avg_litres_per_overfill_event × n_high_risk_alerts_in_period`. Label as ESTIMATE. Wire to `calculateRoi()` POST.

---

### P2-04 — `fact_environmental` Retention Policy

**Files:** New scheduled job in `sentinel-backend/src/main/java/com/sentinel/corridor/EnvironmentalRetentionJob.java`

**Fix:** Weekly `@Scheduled` job deletes `fact_environmental` rows older than 90 days.

---

### P2-05 — TanStack Query Client-Side Polling

**Files:** `sentinel-frontend/src/app/(main)/dashboard/ml-admin/*/page.tsx`, `sentinel-frontend/package.json`

**Fix:** Add `@tanstack/react-query` v5. Wrap app in `QueryClientProvider`. Migrate `useEffect`/fetch patterns in ML Admin client pages to `useQuery`/`useMutation`.

---

## P3 — Low (Optimisation / Refactoring / Future Improvements)

---

### P3-01 — Leaflet Dynamic Import

**Files:** `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/risk-heatmap.tsx`

**Fix:** Wrap with `next/dynamic` + `ssr: false`.

---

### P3-02 — Java 21 + Spring Boot 3.4 Upgrade

**Files:** `sentinel-backend/pom.xml`, `sentinel-backend/Dockerfile`

**Fix:** Update `<java.version>` to `21`. Update parent Spring Boot version to `3.4.x`. Add `spring.threads.virtual.enabled: true` to `application.yml`.

---

### P3-03 — HikariCP Connection Pool Configuration

**Files:** `sentinel-backend/src/main/resources/application.yml`

**Fix:** Add explicit HikariCP settings (see `07_PERFORMANCE_BOTTLENECK_ANALYSIS.md §2.6`).

---

### P3-04 — AlertRulesEngine Data Context Refactor

**Files:** `sentinel-backend/src/main/java/com/sentinel/alert/AlertRulesEngine.java`

**Fix:** Introduce `AlertDataContext` loaded once per evaluation cycle to prevent per-rule DB queries.

---

### P3-05 — `package.json` Name Corrected

**Files:** `sentinel-frontend/package.json`

**Fix:** Change `"name": "studio-admin"` to `"name": "sentinel-frontend"`.

---

### P3-06 — Frontend Tests Added

**Files:** `sentinel-frontend/src/` (new test files)

**Fix:** Add Vitest + React Testing Library. Add component tests for ML Admin Registry and Feedback Queue pages.

---

## Summary

| ID | Issue | Priority | Agent | Phase |
|---|---|---|---|---|
| P0-01 | JWT secret hardcoded | P0 | Agent 1 | Phase 0 |
| P0-02 | Duplicate Flyway versions | P0 | Agent 1 | Phase 0 |
| P0-03 | AnalyticsService prod-broken | P0 | Agent 1 | Phase 0 |
| P0-04 | `src/retrain.py` missing | P0 | Agent 3 | Phase 1 |
| P0-05 | `predict.py` hardcoded model | P0 | Agent 3 | Phase 1 |
| P0-06 | Missing ML API endpoints | P0 | Agent 1 | Phase 1 |
| P0-07 | ETL API key placeholder | P0 | Agent 4 | Phase 0 |
| P1-01 | File-based ETL handoff | P1 | Agent 3+1 | Phase 1 |
| P1-02 | No backend tests | P1 | Agent 1 | Phase 1 |
| P1-03 | API role enforcement | P1 | Agent 1 | Phase 1 |
| P1-04 | Model artifact ephemeral storage | P1 | Agent 3+1 | Phase 1 |
| P1-05 | Frontend token cookie regex | P1 | Agent 2 | Phase 1 |
| P2-01 | loadPredictions N+1 | P2 | Agent 1 | Phase 2 |
| P2-02 | DB indexes missing | P2 | Agent 4 | Phase 2 |
| P2-03 | ROI overfill line | P2 | Agent 2 | Phase 2 |
| P2-04 | fact_environmental retention | P2 | Agent 4 | Phase 2 |
| P2-05 | TanStack Query | P2 | Agent 2 | Phase 2 |
| P3-01 | Leaflet dynamic import | P3 | Agent 2 | Phase 4 |
| P3-02 | Java 21 upgrade | P3 | Agent 4 | Phase 1 |
| P3-03 | HikariCP config | P3 | Agent 4 | Phase 2 |
| P3-04 | AlertRulesEngine data context | P3 | Agent 1 | Phase 4 |
| P3-05 | package.json name | P3 | Agent 2 | Phase 0 |
| P3-06 | Frontend tests | P3 | Agent 2 | Phase 4 |
