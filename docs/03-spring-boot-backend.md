# Sentinel — Spring Boot Backend API

The backend (`sentinel-backend/`) is Stage 2 of the system. It is a Spring Boot
REST API that reads clean data from the Python pipeline, evaluates alert rules on
each incoming batch, computes risk scores, and exposes everything as JSON to the
Next.js dashboard.

---

## Directory Layout

```
sentinel-backend/
├── src/main/java/com/sentinel/
│   ├── SentinelApplication.java     # Entry point (@SpringBootApplication, @EnableScheduling)
│   ├── alert/                       # Alert CRUD + rules engine
│   ├── auth/                        # JWT login endpoint
│   ├── common/                      # DTOs, JwtUtil, JwtAuthFilter, SecurityConfig
│   ├── corridor/                    # Corridor heatmap + asset management
│   ├── etl/                         # Python pipeline integration (polling + loader)
│   ├── ingestion/                   # Ingest log entity + repository
│   ├── quality/                     # Data quality summary endpoint
│   ├── risk/                        # Per-site risk scoring + site detail
│   ├── site/                        # Site, Incident, Audit entities + repositories
│   ├── telemetry/                   # Pipeline telemetry endpoint
│   └── user/                        # User management (admin-only)
└── src/main/resources/
    ├── application.yml
    └── db/migration/                # V1 – V9 Flyway migrations
```

---

## Running the Backend

```bash
cd sentinel-backend

# H2 in-memory (no external database needed)
./mvnw spring-boot:run

# PostgreSQL
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

| URL | Purpose |
|---|---|
| `http://localhost:8080` | API base |
| `http://localhost:8080/swagger-ui.html` | Swagger / OpenAPI explorer |
| `http://localhost:8080/h2-console` | H2 console (dev profile only) |

PostgreSQL defaults: URL `jdbc:postgresql://localhost:5432/sentinel`,
user `sentinel`, password `sentinel`.

---

## Packages

### `etl` — Python Pipeline Integration

This is the bridge between the Python pipeline and the database.

#### `EtlReloadService` (`@Service`, `@Scheduled`)

**Auto-start on boot** (`@PostConstruct startEtlLoop()`):
Launches `run_live.sh` as a background OS process via `ProcessBuilder`. Passes
`ROWS` and `INTERVAL` as environment variables. Redirects stdout/stderr to
`logs/etl.log`. If the Python project is not found, logs a warning and continues —
the backend works without the live ETL for demo purposes.

**Scheduled polling** (`@Scheduled fixedDelay=120000, initialDelay=5000`):
Reads `live_batch.json` every 2 minutes. Checks `batch_id` against
`lastProcessedBatchId` to skip already-processed batches. Then:

1. Loads the set of known site IDs in one query (used for FK validation)
2. `loadIncidents()` — runs in a `REQUIRES_NEW` transaction; batch-deduplicates
   using a single `IN` query (`findExistingIds`) rather than N `existsById` calls
3. `loadAudits()` — same pattern
4. `loadEnvironmental()` — loads corridor readings; tolerates FK violations if
   `dim_asset` doesn't yet know the asset
5. Calls `AlertRulesEngine.evaluate()` with the newly saved incidents

Site IDs from the Python ETL (`SITE-001`) are lowercased by `normaliseSiteId()`
to match the DB primary keys (`site-001`).

#### `EtlConfigController`

`GET /api/config/etl` → returns `{frontendRefreshMs, pollIntervalMs, rowsPerCycle}`
so the frontend can sync its refresh interval automatically.

#### `LiveBatchRecord`

Jackson DTO that maps the structure of `live_batch.json` for deserialization.

---

### `auth`

#### `AuthController`

`POST /api/auth/login` — accepts `{email, password}`, returns `{token, email, role, …}`.

#### `AuthService`

- Loads the user by email via `UserDetailsService`
- Verifies the password with BCrypt
- Updates `last_login_at`
- Issues a JWT via `JwtUtil` (24-hour expiry)

---

### `alert`

#### `AlertController`

| Method | Path | Description |
|---|---|---|
| GET | `/api/alerts` | All alerts ordered by `createdAt DESC` |
| POST | `/api/alerts/{id}/ack` | Acknowledge an alert; sets `acknowledgedBy` from the JWT principal |

#### `AlertService`

- Loads a `siteNameCache` (`Map<siteId, siteName>`) on `@PostConstruct` — 7 rows, cached for the application lifetime
- `acknowledgeAlert()` reads the authenticated username from `SecurityContextHolder` so the audit trail records the real user

#### `AlertRulesEngine` (`@Service`)

Called by `EtlReloadService` after every batch load. Evaluates 4 named rules:

| Rule constant | Trigger | Severity |
|---|---|---|
| `RULE_HIGH_REJECT_RATE` | ≥10% of a site's records rejected in one batch | High |
| `RULE_CRITICAL_CLUSTER` | ≥2 Critical/High incidents for the same site in one batch | Critical |
| `RULE_CRITICAL_HIGH_RISK` | Any single Critical incident at `site-003` or `site-006` | Critical |
| `RULE_AUDIT_OVERDUE` | High-risk site not audited in the last 14 days | High |

Deduplication: before persisting, checks `findFirstBySiteIdAndRuleAndStatus(…, "active")`.
If an active alert for the same site + rule already exists, the new one is skipped.
This prevents the same alert firing every 2 minutes.

#### `AlertEntity`

Maps the `alerts` table:

```
id (PK), site_id (FK), severity, status (active/acknowledged/resolved),
title, description, rule, record_ids (comma-separated incident/audit IDs),
created_at, acknowledged_at, acknowledged_by
```

---

### `risk`

#### `RiskController`

| Method | Path | Description |
|---|---|---|
| GET | `/api/sites/risk-summary` | Risk score + metadata for all 7 sites |
| GET | `/api/sites/{siteId}` | Full detail for one site (incidents + audits + telemetry) |

#### `RiskService`

Computes a transparent, rule-weighted risk score (0–100) per site.
No black-box model — every component is traceable to the pipeline data.

**Five components:**

| Component | Weight | Formula |
|---|---|---|
| Incident frequency | 25% | `min(incidentCount × 7, 100)` |
| Severity mix | 20% | `(rejected + review) / total decisions × 100` |
| Audit recency | 15% | `min(daysSinceLastAudit × 4, 100)` |
| Rejection rate | 20% | `min(rejectedRate × 300, 100)` |
| Pressure spikes | 20% | `min(pressureSpikeCount × 20, 100)` |

**Severity bands:**

| Score | Band |
|---|---|
| ≥ 75 | Critical |
| ≥ 55 | High |
| ≥ 30 | Medium |
| < 30 | Low |

Canonical coordinates for the heatmap are stored in a hardcoded `SITE_COORDS`
map (keys lowercase, matching DB PKs). Long-term the coordinates should move
to `dim_site`, but are hardcoded for the current stage.

---

### `corridor`

#### `CorridorController`

| Method | Path | Description |
|---|---|---|
| GET | `/api/corridor/risk-heatmap` | Weight (0–1) + band per corridor asset (176 points) |
| GET | `/api/corridor/assets` | All `dim_asset` rows |

#### `CorridorHeatmapService`

Computes a normalized weight (0.0–1.0) per asset from three components:

| Component | Weight | Source |
|---|---|---|
| Flood/landslide zone | 40% | `dim_asset.flood_landslide_risk_zone` |
| Live environmental status | 40% | Latest `fact_environmental.status` per asset |
| Nearest site risk | 20% | `RiskService` score / 100 for linked site; 0 if none |

**Flood zone scores:** `high_flood`=1.0, `moderate_flood`=0.55, `low`=0.15

**Status scores:** `critical`=1.0, `warning`=0.70, `advisory`=0.40, `normal`=0.10

**Performance:** uses a single `findLatestPerAsset()` bulk query that returns
one row per asset. This replaces the previous ~160 per-asset queries that
fired on every heatmap request.

#### `Asset`

Maps `dim_asset`: assetId, assetType (`monitoring_point` / `pump_station` / `depot`),
nearestSiteCode (FK→`dim_site`), segment, chainageKmApprox, latitude, longitude,
floodLandslideRiskZone, sensorSuite.

#### `EnvironmentalReading`

Maps `fact_environmental`: readingId, assetId, readingTimestamp, pressurePsi,
flowRateBph, temperatureCelsius, rainfallMm, status.

---

### `quality`

#### `QualityController`

| Method | Path | Description |
|---|---|---|
| GET | `/api/quality/summary` | Trusted/corrected/review/rejected counts, pass rate, gate status |
| GET | `/api/quality/batches` | Ingest batch history with checksums and decision counts |

`DataQualitySummaryDto` includes:
- `trusted`, `corrected`, `review`, `rejected` record counts
- `passRate` (trusted + corrected / total)
- `gateStatus` (`"passed"` if passRate ≥ 0.90, otherwise `"failed"`)
- `lastBatchId`, `lastBatchDate`

---

### `telemetry`

#### `TelemetryController`

| Method | Path | Description |
|---|---|---|
| GET | `/api/telemetry/summary` | Aggregate stats across all telemetry |
| GET | `/api/telemetry/site/{siteId}` | Latest readings for one site |

`TelemetrySummaryDto`: totalReadings, pressureSpikeCount (readings >1000 PSI),
sensorDropoutCount, avgPressure, avgFlow, avgTemp.

#### `TelemetryEntity`

Maps `fact_telemetry`: readingId, timestamp, site, pipelineSection, pressurePsi,
flowRateBph, temperatureCelsius, valveStatus, sensorId.

---

### `user`

All endpoints require `ROLE_ADMIN`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/{id}/status` | Enable / disable account |
| DELETE | `/api/users/{id}` | Remove user |
| GET | `/api/users/roles` | Available roles |

---

### `ingestion`

#### `IngestLogEntity`

Maps `ingest_log`: id (IDENTITY PK), batchId (UNIQUE), sourceFilename, rowCount,
sha256Checksum, ingestionTimestamp, trustedCount, correctedCount, reviewCount, rejectedCount.

This table is the audit trail for every batch the Python pipeline has ever run.

---

### `common` — Security & DTOs

#### `JwtUtil`

- Generates JWT tokens with configurable secret and expiry (default 24 h)
- Validates tokens and extracts claims

#### `JwtAuthFilter` (`OncePerRequestFilter`)

Reads the `Authorization: Bearer` header on every request, validates the token,
and sets the authenticated principal in `SecurityContextHolder`.

#### `SecurityConfig`

Stateless JWT security. CORS allows `localhost:3000` and `localhost:3001`.

**Public endpoints** (no token required):

```
POST  /api/auth/**
GET   /api/alerts
GET   /api/sites/**
GET   /api/corridor/**
GET   /api/quality/**
GET   /api/telemetry/**
GET   /api/config/**
```

**Admin-only:** `/api/users/**`

---

## Key API Endpoints Summary

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/login` | POST | None | Get JWT token |
| `/api/sites/risk-summary` | GET | None | All-site risk scores + map coordinates |
| `/api/sites/{siteId}` | GET | None | Site detail: incidents, audits, telemetry |
| `/api/alerts` | GET | None | Alert feed ordered by creation date |
| `/api/alerts/{id}/ack` | POST | Required | Acknowledge an alert |
| `/api/corridor/risk-heatmap` | GET | None | 176 corridor asset heat weights |
| `/api/corridor/assets` | GET | None | Raw corridor asset list |
| `/api/quality/summary` | GET | None | DQ pass rate + gate status |
| `/api/quality/batches` | GET | None | Per-batch ingest history |
| `/api/telemetry/summary` | GET | None | Aggregate telemetry stats |
| `/api/telemetry/site/{siteId}` | GET | None | Site-level sensor readings |
| `/api/config/etl` | GET | None | Frontend polling config |
| `/api/users` | GET/POST | Admin | User management |

---

## Database Migrations

| Migration | Contents |
|---|---|
| V1 | Core tables: `dim_site`, `fact_incidents`, `fact_audits`, `ingest_log`, `alerts` |
| V2 | KPC domain seed: 7 sites, sample incidents/audits, 7 seeded alerts, 5 ingest batches |
| V3 | User tables: `app_role`, `app_user` |
| V4 | Default user accounts (5 roles, BCrypt-hashed passwords) |
| V5 | Schema corrections |
| V6 | Corridor tables: `dim_asset` (176 assets), `fact_environmental` |
| V7 | Missing pump stations added to `dim_asset` |
| V8 | `reading_id` column widened to `VARCHAR` |
| V9 | Kisumu site (`site-007`) added to `dim_site` |

---

## Configuration (`application.yml`)

Key properties under `sentinel.*`:

| Property | Default | Description |
|---|---|---|
| `sentinel.etl.enabled` | `true` | Whether to auto-launch the Python ETL on startup |
| `sentinel.etl.live-batch-path` | `../sentinel/data/warehouse/live_batch.json` | Path to JSON bridge file |
| `sentinel.etl.sentinel-dir` | `../sentinel` | Root of the Python project |
| `sentinel.etl.poll-interval-ms` | `120000` | How often to poll `live_batch.json` (ms) |
| `sentinel.etl.rows-per-cycle` | `200` | Synthetic rows per Python ETL run |
| `sentinel.etl.frontend-refresh-ms` | `125000` | Passed to frontend for `router.refresh()` timing |
| `sentinel.jwt.expiration-ms` | `86400000` | JWT lifetime (24 h) |
| `sentinel.cors.allowed-origins` | `localhost:3000,3001` | CORS allowed origins |
