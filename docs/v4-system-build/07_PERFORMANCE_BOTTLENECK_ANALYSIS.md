# 07 — Performance and Bottleneck Analysis

> All bottleneck assessments are based on code inspection and architectural analysis.
> No production load-test results exist — profiling is a V4 Phase 0 task.

---

## Template

For each bottleneck:
```
Bottleneck → Root Cause → Impact → Recommended Fix → Priority → Expected Improvement
```

---

## 1. Frontend Bottlenecks

### 1.1 `cache: "no-store"` on All Server Component Fetches

**Bottleneck:** Every server component (Sentinel dashboard, analytics, ML admin overview) calls `fetch()` with `cache: "no-store"`. Every page navigation triggers a full round-trip to the Spring Boot API, regardless of how recently data was loaded.

**Root Cause:** No caching strategy was defined. The developers defaulted to disabling cache entirely to avoid stale data issues.

**Impact:**
- Dashboard page load issues 5 parallel `fetch()` calls on every navigation.
- Page transitions feel slow because every `Link` click triggers full server-side re-fetching.
- Spring Boot gets hammered by unnecessary duplicate requests.

**Recommended Fix:**
- Keep `cache: "no-store"` only for real-time data (alerts, current risk scores).
- Add `next: { revalidate: 120 }` (2-minute ISR) for semi-static data (site list, model registry history, batch log).
- Add TanStack Query with `staleTime: 120_000` for client-side pages that don't need server-rendered freshness.

**Priority:** P2  
**Expected Improvement:** 40–60% reduction in server component fetch round-trips for typical navigation patterns.

---

### 1.2 No Loading Skeleton Standardisation

**Bottleneck:** When a server component fetch is slow (Render cold start, free-tier latency), the user sees a blank page or a raw error instead of a loading state.

**Root Cause:** No standardised `loading.tsx` files in route segments; only `BackendError` component exists for the error path.

**Impact:**
- On Render free-tier cold start (~30s), the dashboard shows nothing while Spring Boot wakes up.
- Users may assume the page is broken.

**Recommended Fix:**
- Add `loading.tsx` to each major route segment (`/dashboard/sentinel`, `/dashboard/ml-admin`) with skeleton placeholders.
- Add `Suspense` boundaries around the heaviest data-fetching sections.

**Priority:** P3  
**Expected Improvement:** Perceived performance improvement; no actual API speedup.

---

### 1.3 Leaflet Map Imported at Page Level

**Bottleneck:** `leaflet` and `leaflet.heat` are imported in the `RiskHeatmap` component which renders on the main Sentinel dashboard page. Leaflet is ~148KB uncompressed.

**Root Cause:** No dynamic import / lazy loading applied to the map component.

**Impact:**
- Adds ~150KB to the initial page bundle even for users who don't scroll to the map.
- Leaflet requires `window` — SSR workarounds add complexity.

**Recommended Fix:**
```typescript
const RiskHeatmap = dynamic(() => import("./_components/risk-heatmap"), {
  ssr: false,
  loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" />,
});
```

**Priority:** P3  
**Expected Improvement:** ~150KB reduction in initial bundle; faster first paint for low-bandwidth users.

---

### 1.4 Multiple CSS Theme Files in Bundle

**Bottleneck:** `brutalist.css`, `soft-pop.css`, `tangerine.css` are all bundled even though only one theme is active.

**Root Cause:** The theme-switching system was built generically; unused themes were not tree-shaken.

**Impact:** Minor — CSS files are typically small. Estimated 5–10KB overhead.

**Recommended Fix:** Convert to CSS custom property overrides applied dynamically, or use Next.js built-in Tailwind dark mode only. Remove unused theme files if theme switching is not a V4 user-facing feature.

**Priority:** P3  
**Expected Improvement:** Minor bundle size reduction.

---

## 2. Backend Bottlenecks

### 2.1 File-Based ETL Poll (Primary Bottleneck — Structural)

**Bottleneck:** `EtlReloadService` polls `live_batch.json` every 2 minutes. All data freshness is limited by this interval.

**Root Cause:** Covered in detail in `02_SENTINEL_V4_ARCHITECTURE_REVIEW.md §2.1`.

**Impact:**
- Up to 2-minute delay between a threshold breach in Python and an alert firing in the Spring Boot layer.
- In production (`ETL_ENABLED=false`), this entire path is disabled — no data arrives.

**Recommended Fix:** Replace with direct psycopg2 writes from Python. After V4 fix, data is available in PostgreSQL as soon as Python inserts it (sub-second).

**Priority:** P0  
**Expected Improvement:** Reduce data latency from 2 minutes to < 5 seconds.

---

### 2.2 AnalyticsService O(1) File Read → DB Query Migration

**Bottleneck:** `AnalyticsService` reads four JSON files from disk. In production, these files don't exist → HTTP 500.

**Root Cause:** Covered in `02_SENTINEL_V4_ARCHITECTURE_REVIEW.md §2.2`.

**Impact:** All analytics endpoints return 500 in production.

**Recommended Fix:** Replace file reads with DB queries:

```java
// Survival curves: fraction of sites with no Critical incident by week-post-observation
// Computed from fact_incidents using window aggregation
@Query("""
    SELECT
        EXTRACT(WEEK FROM incident_date) as week_num,
        site_id,
        COUNT(*) FILTER (WHERE severity = 'Critical') as critical_count
    FROM fact_incidents
    WHERE incident_date > CURRENT_DATE - INTERVAL '180 days'
    GROUP BY week_num, site_id
    ORDER BY week_num
    """)
List<Object[]> getSurvivalData();

// Feature importance: read directly from model_registry
@Query("SELECT feature_importance FROM model_registry WHERE status = 'champion'")
Optional<String> getChampionFeatureImportance();
```

**Priority:** P0  
**Expected Improvement:** Analytics endpoints become production-functional; zero file dependency.

---

### 2.3 `loadPredictions()` N+1 Database Lookups

**Bottleneck:** For each prediction record in `predictions_export.json`, the code calls `predictionRepository.findLatestBySiteId(siteId)` — one query per site.

**Root Cause:** Covered in `02_SENTINEL_V4_ARCHITECTURE_REVIEW.md §2.11`.

**Impact:** 6 DB queries per ETL cycle today (6 sites). Scales linearly with site count.

**Recommended Fix:**
```java
// Add to PredictionRepository:
@Query("SELECT p.siteId FROM PredictionEntity p WHERE p.asOfDate = :date")
Set<String> findSiteIdsForDate(@Param("date") LocalDate date);

// In loadPredictions():
Set<String> alreadyLoaded = predictionRepository.findSiteIdsForDate(asOfDate);
for (Map<String, Object> r : records) {
    if (alreadyLoaded.contains(siteId)) continue;
    // ... insert
}
```

**Priority:** P2  
**Expected Improvement:** Reduces prediction load from N queries to 1 query per ETL cycle.

---

### 2.4 AlertRulesEngine — No Bulk Query Optimisation

**Bottleneck:** `AlertRulesEngine.evaluate()` is called with a list of newly loaded incidents. Each rule likely queries the DB independently (per site, per rule). For 6 sites × 3 rules = potentially 18+ queries per cycle.

**Root Cause:** Rules were implemented individually without a shared data-loading step.

**Impact:** At current scale (6 sites, small data volumes) this is not a measurable bottleneck. At V5 scale (50+ sites), this becomes a problem.

**Recommended Fix (V4 preventative):**
- Add a `AlertDataContext` object loaded once per evaluation cycle that pre-fetches all needed data (incident counts, audit dates, rejection rates per site) in a single query batch.
- Rules consume the context rather than issuing their own queries.

**Priority:** P3 (preventative, not urgent at 6 sites)  
**Expected Improvement:** 70% reduction in DB queries per alert evaluation cycle at scale.

---

### 2.5 NarrativeService Groq API Call on Request Path

**Bottleneck:** When Groq is enabled, `NarrativeService` makes a blocking HTTP call to `api.groq.com` with a 3-second hard timeout. This call happens synchronously within the alert evaluation after an ETL reload.

**Root Cause:** The LLM call was added to the synchronous alert processing path.

**Impact:**
- Alert evaluation takes up to 3 seconds longer when Groq is enabled.
- If Groq's API is slow or unavailable, all alert processing is delayed by 3 seconds.
- The timeout logic is correct (fallback to template), but the blocking wait is unnecessary.

**Recommended Fix (V4):**
- With Java 21 virtual threads enabled (`spring.threads.virtual.enabled: true`), the 3-second blocking call is much cheaper — virtual threads don't block platform threads.
- Additionally, consider making the Groq enhancement async: generate the template narrative immediately, then enhance asynchronously and update `alerts.narrative` in a background task.

**Priority:** P2 (mitigated by virtual threads in Java 21)  
**Expected Improvement:** Virtual threads reduce effective impact to near-zero at V4 scale.

---

### 2.6 No Database Connection Pool Tuning

**Bottleneck:** HikariCP connection pool uses Spring Boot defaults (10 connections max). For the Render free-tier PostgreSQL, the connection limit is lower (typically 25–97 depending on plan).

**Root Cause:** No explicit HikariCP configuration.

**Impact:** At current load (1 user, batch ETL), no impact. Under demo load (multiple judges navigating simultaneously), connections could exhaust if API calls are slow.

**Recommended Fix:**
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10        # conservative for Render free-tier
      minimum-idle: 2
      connection-timeout: 30000
      idle-timeout: 600000
      max-lifetime: 1800000
```

**Priority:** P3  
**Expected Improvement:** Prevents connection pool exhaustion under concurrent demo load.

---

## 3. Database Bottlenecks

### 3.1 Missing Indexes on `fact_incidents` for Analytics Queries

**Bottleneck:** Analytics queries filter `fact_incidents` by `severity`, `site_id`, and date ranges. The existing index `idx_incidents_site_date ON fact_incidents(site_id, incident_date)` covers site+date but not severity.

**Root Cause:** Index was created for the primary query pattern (incidents by site) not for analytics (incidents by severity across all sites).

**Recommended Fix:**
```sql
-- V22 migration:
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON fact_incidents(severity, incident_date);
CREATE INDEX IF NOT EXISTS idx_incidents_decision_date ON fact_incidents(decision, incident_date);
```

**Priority:** P2  
**Expected Improvement:** Survival curve and rule evaluation queries scan fewer rows.

---

### 3.2 Missing Index on `model_feedback` for Retraining Queries

**Bottleneck:** `retrain.py` will query `model_feedback` by `site_id`, `source`, and `rating`. Current indexes: `idx_feedback_site`, `idx_feedback_source` (separate). No composite index.

**Recommended Fix:**
```sql
-- V22 migration:
CREATE INDEX IF NOT EXISTS idx_feedback_site_source_rating
    ON model_feedback(site_id, source, rating);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON model_feedback(created_at DESC);
```

**Priority:** P2  
**Expected Improvement:** Feedback export query for retraining runs in milliseconds.

---

### 3.3 `fact_environmental` — No Partition or Rotation

**Bottleneck:** `fact_environmental` accumulates sensor readings from 160+ monitoring points. At the current generation rate (one reading per asset per ETL cycle, every 2 minutes), this table grows by ~5,000 rows/hour. After 6 months: ~21M rows.

**Root Cause:** No data retention policy or table partitioning was designed.

**Impact:** Analytics queries over `fact_environmental` become slower as the table grows. Unindexed full scans become expensive.

**Recommended Fix (V4 preventative):**
- Add a **rolling window** — keep only the last 90 days of readings in `fact_environmental`. Archive or delete older rows via a weekly scheduled job.
- Alternatively: add a partial index `WHERE reading_timestamp > NOW() - INTERVAL '90 days'` to limit analytics scan range.
- For V4, add a `DELETE FROM fact_environmental WHERE reading_timestamp < NOW() - INTERVAL '90 days'` in a weekly `@Scheduled` Spring job.

**Priority:** P2  
**Expected Improvement:** Prevents unbounded table growth; keeps analytics queries fast.

---

### 3.4 Duplicate Flyway Versions Block Re-Validation

**Bottleneck (operational):** The duplicate V14/V15 migration versions mean `validate-on-migrate: false` must remain set. This disables Flyway's checksum protection — a corrupted migration can be applied silently.

**Root Cause:** Covered in `02_SENTINEL_V4_ARCHITECTURE_REVIEW.md §2.4`.

**Impact:** Risk of silent schema corruption if a migration file is edited after being applied.

**Recommended Fix:** Renumber to V14.1, V14.2, V15.1, V15.2 as the first V4 migration task. Re-enable `validate-on-migrate: true`.

**Priority:** P0  
**Expected Improvement:** Schema integrity protection restored.

---

## 4. ML Pipeline Bottlenecks

### 4.1 `predict.py` Hardcoded Model Path

**Bottleneck:** `predict.py` uses `MODEL_PATH = Path("models/logreg_v1.pkl")`. After a challenger is promoted, the new model is never used.

**Root Cause:** The model registry was built after `predict.py` was written.

**Impact:** ML lifecycle improvements are never reflected in live predictions.

**Recommended Fix:** Champion selection from registry — see `06_ML_HITL_V4_ARCHITECTURE.md §5`.

**Priority:** P0  
**Expected Improvement:** Promotions take effect in production; the ML loop actually closes.

---

### 4.2 Feature Engineering Re-Computed Every Cycle

**Bottleneck:** `features.py` recomputes all 7 features for all 6 sites on every pipeline run (every 2 minutes). Most features change slowly (days_since_last_audit, audit_finding_open_count) but are recomputed as frequently as pressure anomaly counts.

**Root Cause:** Features were designed for a daily prediction job, but `run_pipeline.py` runs every 2 minutes.

**Impact:** Unnecessary computation on each cycle. Low impact at current scale (6 sites), but inefficient.

**Recommended Fix (V4):**
- Separate feature recomputation frequency from telemetry cycle frequency.
- Slow-changing features (audit-based): recompute every 30 minutes.
- Fast-changing features (pressure anomaly, tank level): recompute every cycle.
- Use a `fact_site_features` DB table as a cache — only recompute if source data has changed since last feature write.

**Priority:** P3  
**Expected Improvement:** 40–60% reduction in Python CPU time per ETL cycle.

---

## 5. Infrastructure Bottlenecks

### 5.1 Render Free-Tier Cold Start

**Bottleneck:** Render free-tier services go to sleep after 15 minutes of inactivity. Cold start takes ~25–35 seconds (Spring Boot JVM startup + Flyway migration check).

**Impact:**
- First API call after inactivity returns a timeout or very slow response.
- During showcase: if judges spend > 15 minutes on non-demo activities before the live demo, the backend may be cold.

**Recommended Fix:**
- UptimeRobot 5-minute ping keeps the service warm (zero-cost fix).
- Render Starter plan ($7/month) provides always-on instances — worth considering for the showcase window.

**Priority:** P1 for showcase reliability  
**Expected Improvement:** UptimeRobot eliminates cold starts entirely.

---

### 5.2 No Persistent Storage for Model Artifacts on Render

**Bottleneck:** Render free-tier containers have ephemeral file systems. Model PKL files in `sentinel/models/` are not persistent between container restarts.

**Impact:**
- If the backend container restarts (Render redeploy), the champion model file is gone until the Python layer runs again locally and re-pushes.
- In production with `ETL_ENABLED=false`, the Python layer never runs on the server, so model artifacts are never present.

**Root Cause:** The model serving design assumed the Python and Java layers share a filesystem. They do not in production.

**Recommended Fix (V4):**
- Store model artifacts in object storage (S3-compatible) or encode the model as a Base64 BLOB in the `model_registry.artifact_path` column (acceptable at current model sizes: logreg_v1.pkl is ~5KB).
- For V4 simplicity: store model PKL as a Base64-encoded TEXT in `model_registry` (new column `artifact_blob`). `predict.py` loads from DB rather than filesystem.
- For V5: use S3/Cloudflare R2 artifact storage.

**Priority:** P1  
**Expected Improvement:** Model promotions survive container restarts; the ML loop functions in production.

---

## 6. Summary Table

| Bottleneck | Priority | Category | Expected Improvement |
|---|---|---|---|
| File-based ETL handoff | P0 | Architecture | 2-min latency → < 5s |
| AnalyticsService file proxy | P0 | Architecture | 500 errors → 200s in prod |
| predict.py hardcoded model path | P0 | ML | ML loop closes |
| Duplicate Flyway versions | P0 | Database | Schema integrity restored |
| Model artifact storage (ephemeral FS) | P1 | Infrastructure | Artifacts survive redeploys |
| Render free-tier cold start | P1 | Infrastructure | Eliminated by UptimeRobot |
| loadPredictions() N+1 queries | P2 | Database | 6 → 1 query per cycle |
| Missing analytics indexes | P2 | Database | Faster analytics queries |
| Missing feedback index | P2 | Database | Fast retraining query |
| fact_environmental table growth | P2 | Database | Bounded table size |
| Groq API on sync path | P2 | Backend | Mitigated by virtual threads |
| No cache strategy (frontend) | P2 | Frontend | Fewer redundant API calls |
| AlertRulesEngine query count | P3 | Backend | Preventative at 6 sites |
| Leaflet map bundle size | P3 | Frontend | ~150KB bundle reduction |
| Feature recomputation frequency | P3 | Python ML | 40–60% CPU reduction |
| HikariCP pool defaults | P3 | Database | Prevents exhaust under load |
| CSS theme bundle | P3 | Frontend | Minor bundle size reduction |
