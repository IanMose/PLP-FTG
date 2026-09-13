# 12 — V4 Data and Database Plan

---

## 1. Data Category Definitions

| Category | Definition | Current Tables | Storage |
|---|---|---|---|
| **Operational** | Day-to-day business data; source of truth for alerts, CAPAs, decisions | `dim_site`, `fact_incidents`, `fact_audits`, `alerts`, `hazard_report`, `capa`, `work_order` | PostgreSQL (primary) |
| **Corridor / Telemetry** | Pipeline sensor readings; high-volume time-series | `dim_asset`, `fact_environmental`, `fact_tank_telemetry` (new) | PostgreSQL with 90-day rolling retention |
| **ML Training** | Feature snapshots and labeled data for model training | `fact_site_features` (view/materialized), `model_feedback` | PostgreSQL |
| **ML Metadata** | Model versions, training history, performance snapshots | `model_registry`, `training_run`, `model_performance_snapshot`, `retraining_schedule` | PostgreSQL |
| **Predictions** | Model output scores per site per day | `fact_predictions` | PostgreSQL |
| **Control** | Event and actuation audit trail (new V4) | `event_log`, `actuation_log` | PostgreSQL |
| **Access** | User/role management | `app_user`, `app_role`, `user_roles` | PostgreSQL |
| **Ingest Audit** | Batch-level quality records | `ingest_log` | PostgreSQL |

No separate analytical warehouse. PostgreSQL with proper indexing handles all V4 analytics at current data volumes. A columnar store (TimescaleDB, ClickHouse) can be considered at V5 if telemetry volume exceeds 50M rows.

---

## 2. Existing Schema — Issues and V4 Fixes

### 2.1 Duplicate Flyway Versions (P0)

| Current file | V4 rename |
|---|---|
| `V14__add_telemetry_pressure_index.sql` | `V14.1__add_telemetry_pressure_index.sql` |
| `V14__hse_foundation.sql` | `V14.2__hse_foundation.sql` |
| `V15__hse_technician.sql` | `V15.1__hse_technician.sql` |
| `V15__fact_predictions.sql` | `V15.2__fact_predictions.sql` |

After renaming, re-run `flyway:validate` on a fresh Testcontainers database. Reset `validate-on-migrate: true` in all profiles.

### 2.2 `fact_predictions` — Champion Selection Gap

`fact_predictions` stores `model_version VARCHAR(50)`. Currently all rows show `logreg_v1` because `predict.py` hardcodes the model. After P0-05 fix, `model_version` will correctly reflect the current champion.

### 2.3 `model_registry` — Missing `artifact_blob` Column

Add in `V25__artifact_blob.sql`:
```sql
ALTER TABLE model_registry ADD COLUMN IF NOT EXISTS artifact_blob TEXT NULL;
-- TEXT chosen over BYTEA: base64 encoding makes it portable across JDBC drivers.
-- logreg_v1.pkl is ~5KB → ~7KB base64. Acceptable in a VARCHAR column.
```

---

## 3. New V4 Tables

### 3.1 `fact_tank_telemetry` (V22)

```sql
CREATE TABLE fact_tank_telemetry (
    reading_id          VARCHAR(36)   PRIMARY KEY,
    site_id             VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    tank_id             VARCHAR(50)   NOT NULL,
    reading_timestamp   TIMESTAMP     NOT NULL,
    tank_level_pct      NUMERIC(5,2)  NOT NULL
        CHECK (tank_level_pct BETWEEN 0 AND 100),
    flow_rate_bph       NUMERIC(8,1),
    valve_status        VARCHAR(20)   NOT NULL DEFAULT 'Unknown',
        -- CHECK (valve_status IN ('Open','Closed','Partially_Open','Unknown'))
    overfill_flag       BOOLEAN       NOT NULL DEFAULT FALSE,
    batch_id            VARCHAR(50),
    ingestion_timestamp TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tank_site_time
    ON fact_tank_telemetry(site_id, reading_timestamp DESC);
CREATE INDEX idx_tank_overfill
    ON fact_tank_telemetry(overfill_flag, reading_timestamp DESC)
    WHERE overfill_flag = TRUE;
```

**Retention:** 90 days (same policy as `fact_environmental`).

### 3.2 `event_log` (V23)

```sql
CREATE TABLE event_log (
    id           VARCHAR(36)   PRIMARY KEY,
    site_id      VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    tank_id      VARCHAR(50),
    signal_type  VARCHAR(100)  NOT NULL,
        -- 'overfill_risk' | 'pressure_anomaly' | 'critical_cluster' | 'high_rejection_rate'
    severity     VARCHAR(20)   NOT NULL,
    value        NUMERIC(10,4),
    threshold    NUMERIC(10,4),
    alert_id     VARCHAR(50)   REFERENCES alerts(id),
    fired_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_event_site_fired ON event_log(site_id, fired_at DESC);
CREATE INDEX idx_event_signal     ON event_log(signal_type, fired_at DESC);
```

### 3.3 `actuation_log` (V24)

```sql
CREATE TABLE actuation_log (
    id           VARCHAR(36)   PRIMARY KEY,
    event_id     VARCHAR(36)   NOT NULL REFERENCES event_log(id),
    site_id      VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    tank_id      VARCHAR(50),
    action       VARCHAR(100)  NOT NULL DEFAULT 'CLOSE_VALVE',
    actuator     VARCHAR(50)   NOT NULL DEFAULT 'MOCK',
    status       VARCHAR(50)   NOT NULL,
        -- 'simulated_success' | 'simulated_failure' | 'skipped'
    latency_ms   INTEGER,
    executed_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notes        TEXT
);

CREATE INDEX idx_act_event   ON actuation_log(event_id);
CREATE INDEX idx_act_site    ON actuation_log(site_id, executed_at DESC);
```

---

## 4. V4 Performance Indexes (V26)

```sql
-- Incident analytics: severity-filtered queries
CREATE INDEX IF NOT EXISTS idx_incidents_severity_date
    ON fact_incidents(severity, incident_date DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_decision_date
    ON fact_incidents(decision, incident_date DESC);

-- Feedback queries for retraining
CREATE INDEX IF NOT EXISTS idx_feedback_site_source_rating
    ON model_feedback(site_id, source, rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created
    ON model_feedback(created_at DESC);

-- Prediction freshness query
CREATE INDEX IF NOT EXISTS idx_predictions_status
    ON fact_predictions(site_id, as_of_date DESC);
```

---

## 5. `fact_site_features` View

The Python `features.py` module computes 7 features per site per day and currently writes them to a Parquet file. In V4, these should also be accessible from the DB for `retrain.py` to consume without needing the Parquet file.

Add a materialized view (updated by `predict.py` each run):

```sql
-- V27__fact_site_features_table.sql
CREATE TABLE IF NOT EXISTS fact_site_features (
    site_id                        VARCHAR(50)   NOT NULL REFERENCES dim_site(site_id),
    as_of_date                     DATE          NOT NULL,
    days_since_last_audit          INTEGER,
    rejection_rate_7d              NUMERIC(7,4),
    rejection_rate_30d             NUMERIC(7,4),
    incident_count_30d             INTEGER,
    incident_severity_score_30d    NUMERIC(7,4),
    pressure_anomaly_count_14d     INTEGER,
    audit_finding_open_count       INTEGER,
    -- V4 additions (nullable until tank telemetry exists):
    tank_overfill_events_7d        INTEGER,
    avg_tank_level_pct_7d          NUMERIC(5,2),
    computed_at                    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (site_id, as_of_date)
);

CREATE INDEX idx_site_features_date
    ON fact_site_features(as_of_date DESC);
```

`features.py` writes to this table via psycopg2 (`INSERT ... ON CONFLICT (site_id, as_of_date) DO UPDATE`). `retrain.py` reads from it directly via `SELECT`.

---

## 6. Data Retention Policies

| Table | Retention | Enforcement |
|---|---|---|
| `fact_environmental` | 90 days | Weekly `@Scheduled` job in `EnvironmentalRetentionJob.java` |
| `fact_tank_telemetry` | 90 days | Same job |
| `fact_predictions` | 180 days (one ML training window) | Monthly job |
| `event_log` | 365 days (audit trail) | Annual job |
| `actuation_log` | 365 days (audit trail) | Annual job |
| `model_performance_snapshot` | Unlimited (small table) | None |
| `model_feedback` | Unlimited | None — every feedback row is valuable |
| `fact_incidents` | Unlimited | None — primary compliance record |
| `fact_audits` | Unlimited | None — compliance record |

---

## 7. Migration Sequence

Complete ordered sequence for V4:

```
V1  – V13   (existing, unchanged)
V14.1       fix: add_telemetry_pressure_index (renamed)
V14.2       fix: hse_foundation (renamed)
V15.1       fix: hse_technician (renamed)
V15.2       fix: fact_predictions (renamed)
V16  – V21  (existing, unchanged)
V22         NEW: fact_tank_telemetry
V23         NEW: event_log
V24         NEW: actuation_log
V25         NEW: artifact_blob column on model_registry
V26         NEW: performance indexes
V27         NEW: fact_site_features table
```

---

## 8. Data Lineage

Every prediction score in `fact_predictions` is traceable:

```
fact_predictions.model_version
    → model_registry.version (which artifact_path was used)
    → training_run (which rows and feedback rows trained it)
    → model_feedback (which human decisions contributed)
    → fact_site_features.as_of_date (which feature snapshot drove the score)
    → fact_incidents, fact_audits (which raw records built the features)
```

Every actuation in `actuation_log` is traceable:

```
actuation_log.event_id
    → event_log.alert_id
    → alerts (which rule fired, what narrative was generated)
    → fact_tank_telemetry (which reading triggered the threshold)
    → ingest_log.batch_id (which ETL batch introduced the reading)
```

---

## 9. Data Quality Rules

| Table | Rule | Action on violation |
|---|---|---|
| `fact_tank_telemetry` | `tank_level_pct BETWEEN 0 AND 100` | DB CHECK constraint; pipeline sets `overfill_flag` but does NOT reject the row |
| `fact_incidents` | `severity IN ('Low','Medium','High','Critical')` | Validated in `ingest.py`; rejected rows go to `data/quarantine/` |
| `fact_environmental` | `pressure_psi > 0` | Informational flag in `validate.py`; row is trusted |
| `model_registry` | Exactly one `status = 'champion'` | Enforced by `MlAdminController` transaction; not a DB constraint (to allow rollback operations) |
| `event_log` | `severity IN ('Low','Medium','High','Critical')` | Application-enforced |

---

## 10. Backup and Recovery

| Asset | Backup method | Recovery time |
|---|---|---|
| PostgreSQL (Render managed) | Render automated daily snapshots | Restore from snapshot: ~10 min |
| Model PKL artifacts | `artifact_blob` column in `model_registry` | Immediate — loaded from DB |
| Seed data CSVs | Version-controlled in `data/raw/` | Re-run `generate_data.py` |
| Application code | Git repository | Redeploy from last green commit: ~5 min |

**RPO (Recovery Point Objective):** ≤ 24 hours (daily DB snapshot).  
**RTO (Recovery Time Objective):** ≤ 30 minutes (Render snapshot restore + Render deploy).
