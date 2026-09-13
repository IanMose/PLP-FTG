# 18 — Agent 4 Build Plan: Infrastructure / Integration / Quality

> This document is independently executable. Read it top to bottom without needing any other document.
> Agent 4 runs FIRST in Phase 0. All other agents depend on your migrations being merged before their entity code can be written.

---

## 1. Mission

Fix all infra-level P0 items (Flyway duplicate versions, ETL API key placeholder), upgrade the Java runtime, write all V4 Flyway migrations, set up the test infrastructure for Agent 1, extend CI/CD with a deploy step and frontend lint gate, configure UptimeRobot, and harden production deployment configuration.

---

## 2. Scope

**You own exclusively:**
```
sentinel-backend/pom.xml
sentinel-backend/Dockerfile
sentinel-backend/render.yaml
sentinel-backend/nixpacks.toml
sentinel-backend/src/main/resources/db/migration/     (ALL Flyway SQL files)
sentinel-backend/src/main/resources/application-render.yml
sentinel-backend/src/main/resources/application-postgres.yml
sentinel-backend/src/test/java/com/sentinel/AbstractIntegrationTest.java
sentinel-backend/src/test/resources/application-test.yml

.github/workflows/ci.yml
.github/workflows/etl-cron.yml

root/.gitignore
```

**You do NOT modify:**
- `sentinel-backend/src/main/java/` — Agent 1 owns all Java source
- `sentinel-backend/src/main/resources/application.yml` — **shared** (you own everything except `sentinel.jwt` and `sentinel.cors` blocks)
- `sentinel-frontend/` — Agent 2 owns
- `sentinel/` — Agent 3 owns

---

## 3. Architecture Context

**Flyway:** The current migration sequence has duplicate V14 and V15 version numbers. This is masked by `out-of-order: true` and `validate-on-migrate: false`. Your first task is to fix this before any new migrations are added.

**Java version:** The backend runs Java 17. You upgrade to Java 21 (LTS, virtual threads support).

**Test infrastructure:** Agent 1 needs `AbstractIntegrationTest.java` and `application-test.yml` before writing any integration tests. These are your responsibility.

**CI:** Currently tests only Python ETL and Java build. You add frontend lint/build, a deploy step, a secret leakage check, and a coverage gate.

---

## 4. Dependencies

Agent 4 has **no hard dependencies on other agents**. You run first.

However: coordinate migration ordering with Agents 1 and 3 — they need specific migrations (V22, V23, V24) before they can write entity code. Merge your Phase 0 PR to main as early as possible.

---

## 5. Ordered Task List

### Phase 0 — Critical Fixes (run FIRST, ASAP)

#### Task 4.0.1 — Fix Duplicate Flyway Migration Versions (P0-02)

**In `sentinel-backend/src/main/resources/db/migration/`:**

Use `git mv` (not delete + create) to preserve history:
```bash
git mv V14__add_telemetry_pressure_index.sql V14.1__add_telemetry_pressure_index.sql
git mv V14__hse_foundation.sql               V14.2__hse_foundation.sql
git mv V15__hse_technician.sql               V15.1__hse_technician.sql
git mv V15__fact_predictions.sql             V15.2__fact_predictions.sql
```

**On the production Flyway schema history table** (run before first deployment after rename):
```sql
-- Connect to Render PostgreSQL and run:
DELETE FROM flyway_schema_history WHERE version IN ('14', '15');
```
This forces Flyway to re-apply the renamed V14.x and V15.x migrations on next startup (they are idempotent DDL with `CREATE TABLE IF NOT EXISTS` and `INSERT ... ON CONFLICT DO NOTHING`).

**In `sentinel-backend/src/main/resources/application-render.yml`:**
```yaml
spring:
  flyway:
    validate-on-migrate: true      # was false — now safe after version fix
    out-of-order: false            # was true — now safe
```

**In the postgres profile block of `application.yml`:**
```yaml
spring:
  flyway:
    validate-on-migrate: true
    out-of-order: false
```

**Verification:** Run `./mvnw flyway:validate -Dspring.profiles.active=postgres` against a Testcontainers database (you'll set this up in Task 4.0.4). Must exit 0.

---

#### Task 4.0.2 — Fix ETL API Key Placeholder (P0-07)

**File:** `sentinel-backend/render.yaml`

Change:
```yaml
- key: ETL_API_KEY
  value: REPLACE_WITH_STRONG_RANDOM_KEY
```
To:
```yaml
- key: ETL_API_KEY
  sync: false   # Value is set in Render dashboard, never committed to this file
```

Do the same for `JWT_SECRET`:
```yaml
- key: JWT_SECRET
  sync: false
```

**Action outside this file:** Go to the Render dashboard, set `JWT_SECRET` and `ETL_API_KEY` to real generated values:
```bash
openssl rand -base64 64   # JWT_SECRET
openssl rand -base64 32   # ETL_API_KEY
```

Set the same `ETL_API_KEY` value in GitHub repository secrets (`Settings → Secrets → Actions → ETL_API_KEY`).

**Add startup warning** to `EtlPushController.java` (coordinate with Agent 1 — they own the Java; you provide the check instruction):
```java
@Value("${sentinel.etl.api-key:}")
private String etlApiKey;

@PostConstruct
public void validateApiKey() {
    if ("REPLACE_WITH_STRONG_RANDOM_KEY".equals(etlApiKey)) {
        log.error("SECURITY: ETL_API_KEY is still the placeholder value. Change it immediately.");
    }
}
```

---

#### Task 4.0.3 — Upgrade Java and Spring Boot (P3-02)

**File:** `sentinel-backend/pom.xml`

Change:
```xml
<parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.3.2</version>   <!-- change to 3.4.x latest patch -->
</parent>

<properties>
    <java.version>17</java.version>   <!-- change to 21 -->
</properties>
```

**File:** `sentinel-backend/Dockerfile`

Change base image:
```dockerfile
FROM eclipse-temurin:21-jre-alpine AS runtime
```
(If using a build stage, also update the builder to `eclipse-temurin:21-jdk-alpine`.)

**File:** `sentinel-backend/src/main/resources/application.yml` (add to top-level):
```yaml
spring:
  threads:
    virtual:
      enabled: true     # Java 21 virtual threads for I/O-bound work
```

**Verification:** `./mvnw verify` passes. `./mvnw spring-boot:run` starts and logs "Started SentinelApplication in X seconds" with Java 21 in the startup log.

---

#### Task 4.0.4 — Set Up Testcontainers Test Infrastructure

**File:** `sentinel-backend/pom.xml` — add dependencies:
```xml
<!-- Testcontainers -->
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <version>1.19.8</version>
    <scope>test</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <version>1.19.8</version>
    <scope>test</scope>
</dependency>

<!-- JaCoCo for coverage reporting -->
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.12</version>
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
</plugin>
```

**File:** `sentinel-backend/src/test/java/com/sentinel/AbstractIntegrationTest.java`:
```java
package com.sentinel;

import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
public abstract class AbstractIntegrationTest {

    @Container
    @SuppressWarnings("resource")
    static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16")
                    .withDatabaseName("sentinel_test")
                    .withUsername("sentinel")
                    .withPassword("sentinel");

    @DynamicPropertySource
    static void configure(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url",      POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
```

**File:** `sentinel-backend/src/test/resources/application-test.yml`:
```yaml
spring:
  flyway:
    enabled: true
    validate-on-migrate: true
    out-of-order: false
    locations: classpath:db/migration
  jpa:
    hibernate:
      ddl-auto: none
  sql:
    init:
      mode: never
  h2:
    console:
      enabled: false

sentinel:
  etl:
    enabled: false
    poll-interval-ms: 999999999
  jwt:
    secret: test-secret-value-that-is-at-least-32-characters-long
    expiration-ms: 3600000
  features:
    tank-telemetry-enabled: false
  slack:
    webhook-url: ""
```

**Verification:** Create an empty test class that extends `AbstractIntegrationTest`. Run `./mvnw test` — it should start a Postgres container, apply all Flyway migrations, and pass.

---

#### Task 4.0.5 — Add Secret Leakage Check to CI

**File:** `.github/workflows/ci.yml` — add as first job:
```yaml
security-check:
  name: Secret Leakage Check
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Reject hardcoded secrets
      run: |
        FAILED=0
        if grep -rn "Gric/Gyq" . --include="*.yml" --include="*.yaml" --include="*.java" --include="*.properties"; then
          echo "ERROR: Hardcoded JWT secret found"; FAILED=1
        fi
        if grep -rn "REPLACE_WITH_STRONG" . --include="*.yml" --include="*.yaml"; then
          echo "ERROR: API key placeholder found"; FAILED=1
        fi
        if grep -rn "document\.cookie\.match" sentinel-frontend/src --include="*.tsx" --include="*.ts" 2>/dev/null; then
          echo "ERROR: document.cookie.match pattern found"; FAILED=1
        fi
        exit $FAILED
```

---

### Phase 0 — New Flyway Migrations (merge immediately after Task 4.0.1)

Write all migrations now so Agents 1 and 3 can proceed without waiting.

#### Task 4.0.6 — V22__fact_tank_telemetry.sql

```sql
-- V22: Tank-level telemetry for loading-gantry overfill detection (Stage 3 Feature 1)
CREATE TABLE IF NOT EXISTS fact_tank_telemetry (
    reading_id          VARCHAR(36)   PRIMARY KEY,
    site_id             VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    tank_id             VARCHAR(50)   NOT NULL,
    reading_timestamp   TIMESTAMP     NOT NULL,
    tank_level_pct      NUMERIC(5,2)  NOT NULL
        CONSTRAINT chk_tank_level CHECK (tank_level_pct BETWEEN 0 AND 100),
    flow_rate_bph       NUMERIC(8,1),
    valve_status        VARCHAR(20)   NOT NULL DEFAULT 'Unknown',
    overfill_flag       BOOLEAN       NOT NULL DEFAULT FALSE,
    batch_id            VARCHAR(50),
    ingestion_timestamp TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tank_site_time
    ON fact_tank_telemetry(site_id, reading_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tank_overfill
    ON fact_tank_telemetry(overfill_flag, reading_timestamp DESC)
    WHERE overfill_flag = TRUE;
```

#### Task 4.0.7 — V23__event_log.sql

```sql
-- V23: Event log for the event-driven alert-to-action wrapper (Stage 3 Feature 2)
CREATE TABLE IF NOT EXISTS event_log (
    id           VARCHAR(36)   PRIMARY KEY,
    site_id      VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    tank_id      VARCHAR(50),
    signal_type  VARCHAR(100)  NOT NULL,
    severity     VARCHAR(20)   NOT NULL,
    value        NUMERIC(10,4),
    threshold    NUMERIC(10,4),
    alert_id     VARCHAR(50)   REFERENCES alerts(id),
    fired_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_site_fired
    ON event_log(site_id, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_signal
    ON event_log(signal_type, fired_at DESC);
```

#### Task 4.0.8 — V24__actuation_log.sql

```sql
-- V24: Actuation log — simulated valve control audit trail (Stage 3 Feature 3)
CREATE TABLE IF NOT EXISTS actuation_log (
    id           VARCHAR(36)   PRIMARY KEY,
    event_id     VARCHAR(36)   NOT NULL REFERENCES event_log(id),
    site_id      VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    tank_id      VARCHAR(50),
    action       VARCHAR(100)  NOT NULL DEFAULT 'CLOSE_VALVE',
    actuator     VARCHAR(50)   NOT NULL DEFAULT 'MOCK',
    status       VARCHAR(50)   NOT NULL,
    latency_ms   INTEGER,
    executed_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_act_event   ON actuation_log(event_id);
CREATE INDEX IF NOT EXISTS idx_act_site    ON actuation_log(site_id, executed_at DESC);
```

#### Task 4.0.9 — V25__artifact_blob.sql

```sql
-- V25: Store model PKL as base64 blob in model_registry
-- Prevents artifact loss when container filesystem is ephemeral (Render free tier)
ALTER TABLE model_registry
    ADD COLUMN IF NOT EXISTS artifact_blob TEXT NULL;
-- TEXT chosen over BYTEA: base64 encoding makes it portable across JDBC drivers.
-- logreg_v1.pkl is ~5KB → ~7KB base64. Acceptable in a TEXT column.
```

#### Task 4.0.10 — V26__performance_indexes.sql

```sql
-- V26: Performance indexes identified in 07_PERFORMANCE_BOTTLENECK_ANALYSIS.md
CREATE INDEX IF NOT EXISTS idx_incidents_severity_date
    ON fact_incidents(severity, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_decision_date
    ON fact_incidents(decision, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_site_source_rating
    ON model_feedback(site_id, source, rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created
    ON model_feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_predictions_site_date_desc
    ON fact_predictions(site_id, as_of_date DESC);
```

#### Task 4.0.11 — V27__fact_site_features.sql

```sql
-- V27: Site feature snapshot table — consumed by retrain.py and predict.py
-- Populated by Python features.py on each pipeline run
CREATE TABLE IF NOT EXISTS fact_site_features (
    site_id                     VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    as_of_date                  DATE          NOT NULL,
    days_since_last_audit       INTEGER,
    rejection_rate_7d           NUMERIC(7,4),
    rejection_rate_30d          NUMERIC(7,4),
    incident_count_30d          INTEGER,
    incident_severity_score_30d NUMERIC(7,4),
    pressure_anomaly_count_14d  INTEGER,
    audit_finding_open_count    INTEGER,
    -- V4 additions (null until tank telemetry data exists):
    tank_overfill_events_7d     INTEGER,
    avg_tank_level_pct_7d       NUMERIC(5,2),
    computed_at                 TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (site_id, as_of_date)
);

CREATE INDEX IF NOT EXISTS idx_site_features_date
    ON fact_site_features(as_of_date DESC);
```

---

### Phase 1 — CI/CD Improvements

#### Task 4.1.1 — Extend `ci.yml` with Frontend Lint and Deploy

```yaml
# New job: frontend-lint
frontend-lint:
  name: Frontend Lint + Build
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: sentinel-frontend
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v4
      with:
        version: 9
    - name: Set up Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'pnpm'
        cache-dependency-path: sentinel-frontend/pnpm-lock.yaml
    - name: Install dependencies
      run: pnpm install --frozen-lockfile
    - name: Lint (Biome)
      run: pnpm run check
    - name: Build
      run: pnpm run build
      env:
        NEXT_PUBLIC_SENTINEL_API_URL: "https://sentinel-backend.onrender.com"

# New job: deploy (only on push to main, after tests pass)
deploy:
  name: Deploy to Render
  needs: [security-check, etl, backend, frontend-lint]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - name: Trigger Render Deploy
      run: |
        curl -s -X POST "${{ secrets.RENDER_DEPLOY_HOOK_URL }}" \
          -o /dev/null -w "%{http_code}" | grep -q "^2" || \
          (echo "Deploy hook failed" && exit 1)

# Extend existing backend job: add coverage gate
# After the test step:
    - name: Generate coverage report
      run: ./mvnw jacoco:report -q
    - name: Check coverage threshold
      run: |
        ./mvnw jacoco:check \
          -Djacoco.haltOnFailure=true \
          -Djacoco.minimum.coverage=0.60 \
          -q || echo "Coverage below 60% — please add tests"
```

Add to GitHub repository secrets:
- `RENDER_DEPLOY_HOOK_URL` — from Render dashboard → service → Settings → Deploy Hook

---

#### Task 4.1.2 — HikariCP Connection Pool Configuration

**File:** `sentinel-backend/src/main/resources/application.yml` — add to the datasource section of the postgres profile:
```yaml
# In the postgres profile block (spring.config.activate.on-profile: postgres):
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2
      connection-timeout: 30000    # 30s before giving up on a new connection
      idle-timeout: 600000         # 10 min before retiring idle connections
      max-lifetime: 1800000        # 30 min max connection lifetime
      pool-name: SentinelHikariCP
```

**File:** `sentinel-backend/src/main/resources/application-render.yml` — same HikariCP config.

---

#### Task 4.1.3 — `fact_environmental` Retention Job

Coordinate with Agent 1 to write `EnvironmentalRetentionJob.java`. Provide the SQL logic here:

```sql
-- Run weekly: deletes rows older than 90 days from high-volume time-series tables
DELETE FROM fact_environmental
WHERE reading_timestamp < NOW() - INTERVAL '90 days';

DELETE FROM fact_tank_telemetry
WHERE reading_timestamp < NOW() - INTERVAL '90 days';
```

Provide as a note on Agent 1's PR — they implement the `@Scheduled` bean; you provide the SQL.

---

#### Task 4.1.4 — Feature Flag in `render.yaml`

Add the `TANK_TELEMETRY_ENABLED` flag, defaulting to `false` until Phase 3 stability is confirmed:
```yaml
- key: TANK_TELEMETRY_ENABLED
  value: "false"   # Change to "true" once Phase 3 tank pipeline is stable
```

---

### Phase 1 — Documentation (Operational Artifacts)

#### Task 4.1.5 — Update `.gitignore`

Add:
```
# Local development environment files (never commit)
sentinel-backend/.env.local
sentinel/.env
*.env.local

# Python cache
__pycache__/
*.pyc
*.pyo
.pytest_cache/

# Java build artifacts
sentinel-backend/target/

# Node modules
sentinel-frontend/node_modules/
sentinel-frontend/.next/
```

---

### Phase 3 — Operations Documentation

#### Task 4.3.1 — Disaster Recovery Plan

Create `docs/v4-system-build/DISASTER_RECOVERY_PLAN.md`:

**Failure modes and responses:**

| Failure | Detection | Fallback | Recovery |
|---|---|---|---|
| Render backend down | UptimeRobot alert in Slack | N/A — service unavailable | Render dashboard → Manual Deploy from last good commit |
| Actuation endpoint unresponsive | `POST /api/actuate/close-valve` returns 500 | Event still logs; dashboard still shows alert (Slack notification failure must never suppress alert) | Restart backend service |
| Slack webhook down | `SlackNotificationService` catches exception, logs warning (non-fatal) | Alert and actuation still fire; Slack failure is silent in UI | Check Render logs; reconfigure webhook URL |
| PostgreSQL down | All API endpoints return 500 | No fallback — DB is required | Render managed DB → restore from snapshot (RPO ≤ 24h) |
| Model artifact missing after restart | `predict.py` falls back to logreg_v1.pkl if present; loads `artifact_blob` from DB if not | Predictions continue with last known model | No action needed if artifact_blob populated; re-run `retrain.py` if not |
| ETL CI cron fails | GitHub Actions job failure notification | Data goes stale; no new alerts | Investigate CI logs; re-run workflow manually |

**Key principle:** Notification failure (Slack, actuation) must **never** suppress the underlying alert. Every High/Critical alert must be logged in `alerts` and `event_log` regardless of downstream integration status.

---

## 6. Verification After Phase 0

Run this sequence to confirm Phase 0 is complete:

```bash
# 1. Flyway validation
cd sentinel-backend
./mvnw flyway:validate -Dspring.profiles.active=postgres
# Expected: BUILD SUCCESS

# 2. Java 21 build
./mvnw verify -q
# Expected: BUILD SUCCESS, Java 21 in logs

# 3. Secret check
grep -rn "Gric/Gyq" . --include="*.yml"
# Expected: no output

grep -rn "REPLACE_WITH_STRONG" . --include="*.yml"
# Expected: no output

# 4. Testcontainers smoke test (once Agent 1 writes first test class)
./mvnw test -pl sentinel-backend -Dspring.profiles.active=test
# Expected: at least 1 test passes against real PostgreSQL
```

---

## 7. Acceptance Criteria

- [ ] `flyway:validate` passes on a fresh Testcontainers PostgreSQL database.
- [ ] No hardcoded secrets in `render.yaml` or `application.yml`.
- [ ] `./mvnw verify` passes with Java 21.
- [ ] All 7 new migrations (V22–V27 + V14.x/V15.x rename) apply cleanly in sequence.
- [ ] CI pipeline includes: security check, ETL tests, backend tests (with coverage gate), frontend lint+build, deploy trigger.
- [ ] `AbstractIntegrationTest.java` and `application-test.yml` exist and work.
- [ ] `.gitignore` covers `.env.local`, `sentinel/.env`, and build artifacts.

---

## 8. Definition of Done

- All tasks in Sections 5.0–5.3 completed.
- All acceptance criteria pass.
- Phase 0 PR merged to main **before** Agents 1, 2, 3 begin their Phase 1 entity code.
- Branch `agent-4/infra-migrations` is rebased on latest main and all CI checks pass.
- PR description references: P0-02, P0-07, P3-02, P3-03, Stage 3 F5, V22–V27 migrations.
