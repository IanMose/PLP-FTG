# Flyway Migration Review & Implemented Solution

## Status: ✅ IMPLEMENTED (Option C - Hybrid Approach)

**Implementation Date:** 2026-09-15

---

## Quick Start

### First Time Setup (Fresh Database)

```bash
# 1. Grant permissions to sentinel user (run as postgres superuser)
sudo -u postgres psql -d sentinel -c "GRANT ALL ON SCHEMA public TO sentinel;"

# 2. Start the application
cd sentinel-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

### Normal Restart (Existing Database)

```bash
# Just start - Flyway skips already-applied migrations
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

### Adding New Schema Changes

```bash
# 1. Create a new migration file (V3, V4, etc.)
# Use IF NOT EXISTS for idempotency
cat > src/main/resources/db/migration/V3__new_feature.sql << 'EOF'
CREATE TABLE IF NOT EXISTS new_table (...);
CREATE INDEX IF NOT EXISTS idx_new ON new_table(...);
EOF

# 2. Restart the app - only V3 applies
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

---

## What Was Implemented

### Configuration Changes

| Profile | DDL Auto | Flyway | Purpose |
|---------|----------|--------|---------|
| **postgres** (local dev) | none | enabled | Flyway creates schema |
| **render** (production) | validate | enabled | Flyway migrates, Hibernate validates |
| **default** (H2) | create-drop | disabled | In-memory dev testing |

### Migration Consolidation

**Before:** 48 migration files with duplicates, decimal versions, gaps
**After:** 2 idempotent migration files

```
db/migration/
├── V1__baseline_schema.sql    # All tables and indexes
└── V2__seed_data.sql          # RBAC roles and KPC sites
```

Old migrations archived to `db/migration_archive/` for reference.

---

## Executive Summary (Original Analysis)

---

## 1. Current State Analysis

### 1.1 Original Migration Files (Git HEAD)
48 files total, with these issues:

| Issue | Files Affected | Impact |
|-------|---------------|--------|
| **Duplicate versions** | V22, V23, V24, V25, V26 (2 files each) | Flyway fails on startup |
| **Decimal versions** | V11.1, V11.2, V11.3, V14.1, V14.2, etc. | Ordering confusion |
| **Gaps in sequence** | Missing V17, V18 | Minor, but confusing |
| **Non-idempotent SQL** | V1, V3, V5, V6, V16 | Fails on re-run if objects exist |

### 1.2 Files Deleted (Our Cleanup)
```
DELETED (38 files):
V11.1__add_alert_narrative.sql → renamed to V11
V11.2__add_narrative_updated_at.sql → renamed to V12
V11.3__add_narrative_snapshot.sql → renamed to V13
V12__kpc_compliance_schema.sql → renamed to V14
V13__compliance_indicator_seed.sql → renamed to V21
V14.1__add_telemetry_pressure_index.sql → renamed to V15
V14.2__hse_foundation.sql → REMOVED (duplicate of V20)
V15.1__fact_predictions.sql → renamed to V16
V15.2__hse_technician.sql → REMOVED (duplicate of V19)
V16.1__drop_compliance_tables.sql → renamed to V17
V16.2__ml_hitl.sql → renamed to V18
V19__retraining_schedule.sql → renamed to V24
V20__drift_detection.sql → renamed to V22
V21__model_feature_importance.sql → renamed to V23
V22__fact_tank_telemetry.sql → renamed to V25 (duplicate removed)
V22.1__fact_tank_telemetry.sql → renamed to V25
V22.2__hse_foundation.sql → REMOVED (duplicate)
V22__hse_foundation.sql → renamed to V20 (duplicate removed)
V23__event_log.sql → renamed to V26 (duplicate removed)
V23.1__event_log.sql → renamed to V26
V23.2__hse_technician.sql → REMOVED (duplicate)
V23__hse_technician.sql → REMOVED (duplicate)
V24__actuation_log.sql → renamed to V27 (duplicate removed)
V24.1__actuation_log.sql → renamed to V27
V24.2__drop_compliance_tables.sql → REMOVED (duplicate of V17)
V24__drop_compliance_tables.sql → REMOVED (duplicate)
V25__capa_escalated_at.sql → renamed to V28 (duplicate removed)
V25.1__capa_escalated_at.sql → renamed to V28
V25__work_order.sql → renamed to V29
V26__capa_requires_work_order.sql → renamed to V30 (duplicate removed)
V26.2__capa_requires_work_order.sql → renamed to V30
V26__additive_columns.sql → renamed to V31
V27__hazard_report_type.sql → renamed to V32
V28__technician_tables.sql → renamed to V33
V29__work_order_table.sql → renamed to V34
V30__artifact_blob.sql → renamed to V35
V31__fact_site_features.sql → renamed to V36
V32__performance_indexes.sql → renamed to V37
```

### 1.3 New Migration Files (After Cleanup)
```
V1__create_core_tables.sql        (unchanged)
V2__seed_data.sql                 (unchanged)
V3__create_user_tables.sql        (unchanged)
V4__seed_default_users.sql        (unchanged)
V5__schema_corrections.sql        (unchanged)
V6__add_corridor_tables.sql       (unchanged)
V7__add_missing_pump_stations.sql (unchanged)
V8__widen_reading_id.sql          (unchanged)
V9__add_kisumu_site.sql           (unchanged)
V10__historical_seed.sql          (unchanged)
V11__add_alert_narrative.sql      (was V11.1)
V12__add_narrative_updated_at.sql (was V11.2)
V13__add_narrative_snapshot.sql   (was V11.3)
V14__kpc_compliance_schema.sql    (was V12)
V15__add_telemetry_pressure_index.sql (was V14.1)
V16__fact_predictions.sql         (was V15.1)
V17__drop_compliance_tables.sql   (was V16.1)
V18__ml_hitl.sql                  (was V16.2)
V19__hse_technician.sql           (was V15.2)
V20__hse_foundation.sql           (was V14.2/V22.2)
V21__compliance_indicator_seed.sql (was V13)
V22__drift_detection.sql          (was V20)
V23__model_feature_importance.sql (was V21)
V24__retraining_schedule.sql      (was V19)
V25__fact_tank_telemetry.sql      (was V22.1)
V26__event_log.sql                (was V23.1)
V27__actuation_log.sql            (was V24.1)
V28__capa_escalated_at.sql        (was V25.1)
V29__work_order.sql               (was V25)
V30__capa_requires_work_order.sql (was V26.2)
V31__additive_columns.sql         (was V26)
V32__hazard_report_type.sql       (was V27)
V33__technician_tables.sql        (was V28)
V34__work_order_table.sql         (was V29)
V35__artifact_blob.sql            (was V30)
V36__fact_site_features.sql       (was V31)
V37__performance_indexes.sql      (was V32)
```

### 1.4 Root Cause of Current Error
```
Current version of schema "public": 15
Migrating schema "public" to version "16 - fact predictions"
ERROR: relation "idx_predictions_site_date" already exists
```

**The database has migrations up to V15 applied with the OLD numbering.** The new V16 (which was V15.1) tries to create objects that already exist from when V15.1 ran previously.

---

## 2. The Core Problem

Flyway tracks migrations by **version number + checksum**. When you:
1. Rename migrations (V15.1 → V16)
2. Have a database with V15.1 already applied
3. Try to run V16 (same content, different version)

Flyway sees V16 as a "new" migration and tries to run it, but the objects already exist.

---

## 3. Proposed Solutions

### Option A: Flyway + Idempotent Migrations (RECOMMENDED)

**Philosophy:** Keep Flyway for version tracking, but make all SQL idempotent.

**Implementation:**
```yaml
# application.yml (all profiles)
spring:
  flyway:
    enabled: true
    baseline-on-migrate: true
    validate-on-migrate: false   # Don't fail on checksum changes
    out-of-order: false          # Strict ordering in production
```

**Migration SQL Pattern:**
```sql
-- Always use IF NOT EXISTS / IF EXISTS
CREATE TABLE IF NOT EXISTS my_table (...);
CREATE INDEX IF NOT EXISTS idx_name ON my_table(...);
DROP TABLE IF EXISTS old_table;
ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_col VARCHAR(50);

-- For unique constraints (PostgreSQL specific)
DO $$ BEGIN
    ALTER TABLE my_table ADD CONSTRAINT uq_name UNIQUE (col);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

**Pros:**
- Version history preserved
- Team members can see what changed when
- Works with existing databases
- Safe re-runs

**Cons:**
- Requires discipline in writing migrations
- More verbose SQL

---

### Option B: Hibernate DDL Auto + No Flyway (Your Suggestion)

**Philosophy:** Let Hibernate manage schema, disable Flyway entirely.

**Implementation:**
```yaml
# application.yml
spring:
  jpa:
    hibernate:
      ddl-auto: update    # Creates/updates tables based on entities
  flyway:
    enabled: false
```

**Pros:**
- Simple — schema matches entities automatically
- No migration files to manage
- Good for rapid prototyping

**Cons:**
- **No version history** — can't track what changed when
- **No rollback capability** — can't undo schema changes
- **Data loss risk** — `update` won't remove columns, but recreating tables can lose data
- **Not production-safe** — `update` can make unintended changes
- **Team coordination** — no visibility into schema changes across developers

---

### Option C: Hybrid Approach (BEST FOR YOUR SITUATION)

**Philosophy:** 
- **Development:** Hibernate `update` for rapid iteration
- **Production:** Flyway with consolidated, idempotent migrations

**Implementation:**

```yaml
# application.yml (default - H2/dev)
spring:
  jpa:
    hibernate:
      ddl-auto: create-drop
  flyway:
    enabled: false

---
# application-postgres.yml (local Postgres dev)
spring:
  jpa:
    hibernate:
      ddl-auto: update    # Let Hibernate handle schema
  flyway:
    enabled: false

---
# application-render.yml (production)
spring:
  jpa:
    hibernate:
      ddl-auto: validate  # Only verify schema matches entities
  flyway:
    enabled: true
    baseline-on-migrate: true
    validate-on-migrate: false
```

**Migration Strategy:**
1. Consolidate all current migrations into ONE baseline: `V1__baseline_schema.sql`
2. Generate this from current production database
3. Future changes: Add new migrations V2, V3, etc.

---

## 4. Recommended Implementation Plan

### Phase 1: Immediate Fix (Get App Running)

**Option 1 - Reset Database (Simplest)**
```bash
# Drop and recreate database
psql -U postgres -c "DROP DATABASE IF EXISTS sentinel;"
psql -U postgres -c "CREATE DATABASE sentinel OWNER sentinel;"

# Run with fresh migrations
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

**Option 2 - Disable Flyway Temporarily**
```yaml
# application-postgres.yml
spring:
  flyway:
    enabled: false
  jpa:
    hibernate:
      ddl-auto: update
```

### Phase 2: Consolidate Migrations (This Week)

1. **Export current production schema:**
```bash
pg_dump -U sentinel -d sentinel --schema-only > schema_backup.sql
```

2. **Create consolidated baseline:**
```bash
# Create single baseline migration
cat > src/main/resources/db/migration/V1__baseline.sql << 'EOF'
-- Sentinel Database Baseline Schema
-- Generated: 2026-09-15
-- This replaces all previous migrations (V1-V37)

-- Use IF NOT EXISTS for all objects to be idempotent
CREATE TABLE IF NOT EXISTS dim_site (...);
CREATE TABLE IF NOT EXISTS alerts (...);
-- ... all tables
EOF
```

3. **Delete old migrations, keep only:**
```
V1__baseline.sql
V2__seed_data.sql (optional - merge into V1 or separate)
```

### Phase 3: Production-Ready Config

```yaml
# application-render.yml (production)
spring:
  jpa:
    hibernate:
      ddl-auto: validate   # NEVER update/create in production
  flyway:
    enabled: true
    baseline-on-migrate: true
    baseline-version: 1
    validate-on-migrate: false
    locations: classpath:db/migration
```

---

## 5. Environment-Specific Behavior Matrix

| Environment | Profile | DDL Auto | Flyway | Migration Source |
|-------------|---------|----------|--------|------------------|
| **Local H2** | default | create-drop | disabled | None (Hibernate creates) |
| **Local Postgres** | postgres | update | disabled | Hibernate manages |
| **CI/CD Tests** | test | create-drop | disabled | None |
| **Staging** | staging | validate | enabled | db/migration/*.sql |
| **Production** | render | validate | enabled | db/migration/*.sql |

---

## 6. Fresh Setup vs Normal Restart

### Fresh Setup (New Database)
```bash
# 1. Create database
psql -U postgres -c "CREATE DATABASE sentinel OWNER sentinel;"

# 2. Run app - Flyway applies all migrations
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

### Normal Restart (Existing Database)
```bash
# Flyway checks flyway_schema_history table
# Applies only NEW migrations (V38+)
# Skips already-applied ones
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

### Adding New Schema Changes
```bash
# 1. Create new migration file
cat > src/main/resources/db/migration/V38__add_new_feature.sql << 'EOF'
-- V38: Add new feature table
CREATE TABLE IF NOT EXISTS new_feature (...);
CREATE INDEX IF NOT EXISTS idx_new ON new_feature(...);
EOF

# 2. Run app - only V38 applies
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

---

## 7. Decision Required

**Which approach do you want to implement?**

| Approach | Best For | Effort |
|----------|----------|--------|
| **A: Idempotent Migrations** | Teams, production systems | Medium |
| **B: Hibernate Only** | Solo dev, prototypes | Low |
| **C: Hybrid** | Your situation (hackathon → production) | Medium |

**My Recommendation:** **Option C (Hybrid)** because:
1. You need to get running NOW (disable Flyway temporarily)
2. You want production stability LATER (re-enable with consolidated migrations)
3. It matches your current profile structure

---

## 8. Immediate Action Items

1. [ ] **Decide on approach** (A, B, or C)
2. [ ] **Reset local database** (clean slate)
3. [ ] **Apply chosen configuration**
4. [ ] **Test full startup cycle**
5. [ ] **Document for team**

---

*Document created: 2026-09-15*
*Status: ✅ IMPLEMENTED*

---

## Troubleshooting

### Permission Denied for Schema Public

```bash
# Grant permissions to sentinel user
sudo -u postgres psql -d sentinel -c "GRANT ALL ON SCHEMA public TO sentinel;"
```

### Flyway Checksum Mismatch

If you modify an existing migration file:
```bash
# Repair the schema history (updates checksums)
./mvnw flyway:repair -Dflyway.url=jdbc:postgresql://localhost:5432/sentinel -Dflyway.user=sentinel -Dflyway.password=sentinel
```

### Complete Database Reset

```bash
# Drop and recreate database
sudo -u postgres psql -c "DROP DATABASE IF EXISTS sentinel;"
sudo -u postgres psql -c "CREATE DATABASE sentinel OWNER sentinel;"
sudo -u postgres psql -d sentinel -c "GRANT ALL ON SCHEMA public TO sentinel;"

# Start fresh
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

### Table Already Exists Errors

All migrations use `IF NOT EXISTS` - this should not happen. If it does:
1. Check that you're using the new consolidated migrations (V1, V2)
2. Delete any old migration files that may have been restored from git
