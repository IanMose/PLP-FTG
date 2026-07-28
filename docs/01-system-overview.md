# Sentinel — System Overview

Sentinel is a proactive Health, Safety & Environment (HSE) early-warning platform
modeled on the Kenya Pipeline Company (KPC) domain. Its purpose is to detect
patterns of weak audit follow-through **before** they escalate into environmental
incidents — a scenario drawn from the *Kimeu v. KPC* judgment where unresolved
audit non-conformances at two pipeline stations preceded a series of spills.

---

## Problem It Solves

Traditional HSE dashboards show what has already happened. Sentinel is designed to
surface the signal earlier: an audit finding left unclosed at a high-risk site is
a leading indicator. Sentinel correlates that finding against incoming incidents
and telemetry to raise an alert before the incident becomes a news story.

---

## Domain Model

The system monitors **7 Kenya Pipeline Company facilities** along the
Mombasa–Eldoret–Kisumu petroleum pipeline:

| Site ID  | Name                   | Location              | Risk Level  |
|----------|------------------------|-----------------------|-------------|
| site-001 | Nairobi Terminal       | Nairobi, Kenya        | Normal      |
| site-002 | Mombasa Terminal       | Mombasa, Kenya        | Normal      |
| site-003 | Makueni Pump Station   | Makueni County, Kenya | **High**    |
| site-004 | Nakuru Depot           | Nakuru, Kenya         | Normal      |
| site-005 | Eldoret Depot          | Uasin Gishu, Kenya    | Normal      |
| site-006 | Sinendet Pump Station  | Bomet, Kenya          | **High**    |
| site-007 | Kisumu Terminal        | Kisumu, Kenya         | Normal      |

Sites 003 and 006 are the two high-risk facilities that anchor the Kimeu framing.
They receive the most aggressive monitoring thresholds throughout the system.

In addition to the 7 operational sites, the system monitors **176 corridor assets**
(monitoring points, pump stations, depots) along the full pipeline route. These
assets feed the corridor heatmap.

---

## Architecture

```
Raw CSVs  →  Python ETL pipeline  →  DuckDB / Parquet warehouse
(data/raw)   (sentinel/src/)         (sentinel/data/warehouse/)
                                              │
                                   live_batch.json (every 2 min)
                                              │
                               Spring Boot REST API  :8080
                               (sentinel-backend/)
                                              │
                                  Next.js Dashboard  :3000
                                  (sentinel-frontend/)
```

The three layers are independently runnable. The Python pipeline produces data;
the Spring Boot API serves it; the Next.js dashboard visualises it.

---

## Data Flow

### One-time (or on-demand) batch
1. `generate_data.py` produces synthetic raw CSVs (~15 000 rows, seed-reproducible)
2. The 5-stage pipeline runs: **ingest → transform → decide → load → validate**
3. Clean records land in `sentinel.duckdb` and Parquet files
4. Flyway migrations apply the schema to the API's PostgreSQL / H2 database

### Live (every 2 minutes)
1. `run_live.sh` calls `run_pipeline.py` with ~200 fresh synthetic rows
2. The pipeline runs all 5 stages and writes `live_batch.json`
3. Spring Boot's `EtlReloadService` polls `live_batch.json` every 2 minutes
4. New records are upserted into the relational DB
5. `AlertRulesEngine` evaluates 4 alert rules against each new batch
6. The Next.js dashboard refreshes at 2 min 5 s to catch the updated state

---

## Database Schema

Managed by Flyway (9 migrations). The canonical tables:

### Core tables (V1)
| Table | Key Columns | Purpose |
|---|---|---|
| `dim_site` | site_id (PK), site_name, location | Reference: 7 KPC sites |
| `fact_incidents` | incident_id (PK), site_id (FK), incident_date, severity, compliance_score, decision | Environmental incidents |
| `fact_audits` | audit_id (PK), site_id (FK), inspection_date, compliance_score, follow_up_required, decision | Compliance audits |
| `ingest_log` | batch_id (UNIQUE), source_filename, sha256_checksum, trusted/corrected/review/rejected counts | Batch traceability |
| `alerts` | id (PK), site_id (FK), severity, status, rule, record_ids, acknowledged_by | Active and historical alerts |

### Corridor tables (V6)
| Table | Key Columns | Purpose |
|---|---|---|
| `dim_asset` | asset_id (PK), asset_type, nearest_site_code (FK→dim_site), lat, lon, flood_landslide_risk_zone | 176 corridor assets |
| `fact_environmental` | reading_id (PK), asset_id (FK), reading_timestamp, pressure_psi, flow_rate_bph, rainfall_mm, status | Live corridor telemetry |

### User tables (V3 / V4)
| Table | Key Columns | Purpose |
|---|---|---|
| `app_role` | id, name | Role definitions |
| `app_user` | id, email, password_hash, role (FK), status | Authenticated users |

### ID conventions
All site IDs use **lowercase** in the DB (`site-001`). The Python ETL generates
uppercase IDs (`SITE-001`) and lowercases them in `EtlReloadService.normaliseSiteId()`
before inserting. The V2 seed and all migrations use lowercase exclusively.

---

## Default User Accounts

| Email | Role | Password |
|---|---|---|
| admin@sentinel.kpc | Admin | sentinel@admin |
| manager@sentinel.kpc | HSE Manager | sentinel@admin |
| auditor@sentinel.kpc | Auditor | sentinel@admin |
| analyst@sentinel.kpc | Analyst | sentinel@admin |
| viewer@sentinel.kpc | Viewer | sentinel@admin |

Authentication is JWT-based. The token is stored as a `sentinel-token` cookie
and passed as `Authorization: Bearer <token>` on all API calls.

---

## Tech Stack

| Layer | Technologies |
|---|---|
| ETL Pipeline | Python 3.11, pandas, pandera, DuckDB, PyArrow, pytest |
| Backend API | Java 17, Spring Boot 3.3, Spring Security (JWT), JJWT, Flyway, PostgreSQL / H2 |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Zustand |

---

## CI / Quality Gate

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:
1. Install Python dependencies
2. Generate synthetic data
3. Run the full ETL pipeline
4. Enforce `--fail-below 0.90` (trusted + corrected rate ≥ 90%)
5. Run `pytest` unit tests

The gate is designed to fail on dirty data intentionally injected during testing,
confirming both that valid data passes and that known bad data is caught.

---

## Running the Full Stack

```bash
# 1 — Python pipeline (one-time setup + data generation)
cd sentinel
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 src/generate_data.py
python -m src.ingest && python -m src.transform
python -m src.decide && python -m src.load
python -m src.validate --fail-below 0.90

# 2 — Spring Boot API (H2 in-memory, no extra DB setup needed)
cd sentinel-backend
./mvnw spring-boot:run
# Swagger UI: http://localhost:8080/swagger-ui.html

# 3 — Next.js dashboard
cd sentinel-frontend
npm install && npm run dev
# Dashboard: http://localhost:3000
```

For PostgreSQL: `./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres`
(database: `sentinel`, user: `sentinel`, password: `sentinel`)
