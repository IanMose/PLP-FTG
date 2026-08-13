# Sentinel — System Summary

## What It Is

Sentinel is a **proactive HSE (Health, Safety & Environment) early-warning platform** modeled on the Kenya Pipeline Company (KPC) domain. The design is inspired by the *Kimeu v. KPC* legal judgment, where weak audit follow-through preceded environmental incidents. The system detects that pattern before it repeats.

It's built across **three distinct sections** that form a complete data-to-dashboard pipeline.

---

## Section 1: Python Data Pipeline (`/sentinel/`)

**What it does:** Ingests raw HSE data, enforces quality rules, and writes clean output to a warehouse.

### Five Sequential Stages

```
Raw CSVs → ingest.py → transform.py → validate.py → decide.py → load.py → DuckDB/Parquet warehouse
```

| Stage | Module | Key Output |
|---|---|---|
| Ingest | `ingest.py` | UUID `batch_id`, SHA-256 checksum, row count → `ingest_log.json` + `raw_batch.parquet` |
| Transform | `transform.py` | Normalized severity/status/site labels, ISO 8601 dates, deduplication on natural key |
| Validate | `validate.py` | 8 named rules + `--fail-below` CLI gate |
| Decide | `decide.py` | Every record labeled `trusted / corrected / review / rejected` with a persisted reason |
| Load | `load.py` | Trusted+corrected → `fact_incidents`, `fact_audits`, `fact_telemetry`; rejected → quarantine CSV |

### Validation Rules

| Rule | Field | Condition |
|---|---|---|
| No future incidents | `incident_date` / `inspection_date` | Cannot be later than today |
| Valid severity | `severity` | One of Low / Medium / High / Critical |
| Score bounds | `compliance_score` | Between 0 and 100 |
| Date order | `closed_date` | Cannot precede `inspection_date` |
| Uniqueness | `incident_id` / `audit_id` / `reading_id` | Unique within a batch |
| Valid coordinates | `latitude` / `longitude` | Lat [-90,90], Lon [-180,180], not (0,0) |
| Valid pressure | `pressure_psi` | Between 0 and 1000 PSI (telemetry only) |
| Sensor readings | `pressure_psi` / `flow_rate_bph` / `temperature_celsius` | At least one non-null (telemetry only) |

### Decision Routing Logic

- **Hard-fail rules** (future dates, uniqueness, invalid coords) → `rejected`
- **Recoverable failures** (bad severity casing, out-of-range score) → `corrected` (auto-fixed) or `review` if correction fails
- **Missing required fields** → `review`
- **Ambiguous sensor issues** → `review`
- **All rules pass** → `trusted`

### Synthetic Data

`generate_data.py` produces ~15,685 rows (6,090 incidents + 9,595 audits + 5,000 telemetry) with 6,237 deliberately injected issues. Two sites are seeded as high-risk:

- **SITE-003 — Makueni Pump Station**: lower compliance scores, more Critical/High incidents, skewed toward Leak/Spill types
- **SITE-006 — Sinendet Pump Station**: same weak follow-through pattern

| Issue Type | Count | Expected Pipeline Outcome |
|---|---|---|
| `mixed_date_format` | ~3,571 | Corrected (standardized to ISO 8601) |
| `dirty_label` | ~1,285 | Corrected (auto-normalized) |
| `missing_required_field` | ~516 | Review (held for human sign-off) |
| `out_of_range` | ~311 | Rejected or Corrected (clamp if recoverable) |
| `future_date` | ~209 | Rejected (physically impossible) |
| `duplicate_id` | ~185 | Rejected (uniqueness violation) |
| `closed_before_inspection` | ~160 | Rejected (logical impossibility) |

### CI Gate

GitHub Actions runs on every push/PR to `main`:

```
checkout → install deps → generate data → run ETL → enforce --fail-below 0.90
```

A gate that only ever passes is treated as proof of nothing — it must be demonstrated both green (clean data) and red (bad data).

### Tech Stack

Python 3.11, pandas, pandera, duckdb, pyarrow, numpy, faker, pytest

---

## Section 2: Java Spring Boot Backend (`/sentinel-backend/`)

**What it does:** Consumes the Stage 1 warehouse output and exposes it as REST APIs for the frontend.

### Modules

| Module | Package | Responsibility |
|---|---|---|
| `site` | `com.sentinel.site` | JPA entities for `dim_site`, `fact_incidents`, `fact_audits`; repositories |
| `telemetry` | `com.sentinel.telemetry` | Sensor readings, pressure spike detection, site summaries |
| `risk` | `com.sentinel.risk` | Transparent, rule-weighted risk scoring (0–100) per site |
| `alert` | `com.sentinel.alert` | Alert generation, persistence, acknowledgement with audit log |
| `quality` | `com.sentinel.quality` | Aggregates trusted/corrected/review/rejected rates from `ingest_log` |
| `ingestion` | `com.sentinel.ingestion` | Mirrors the Stage 1 `ingest_log` structure |
| `common` | `com.sentinel.common` | Shared DTOs, CORS config (allows `localhost:3000`), exception handling |

### REST API Contract

| Endpoint | Method | Returns |
|---|---|---|
| `/api/sites/risk-summary` | GET | Per-site risk score + severity band (heatmap data) |
| `/api/sites/{siteId}` | GET | Incidents, audits, telemetry for one site |
| `/api/alerts` | GET | Alert feed, reverse-chronological |
| `/api/alerts/{id}/ack` | POST | Acknowledge alert (audit-logged) |
| `/api/quality/summary` | GET | DQ rates + gate status |
| `/api/quality/batches` | GET | Ingest batch history with checksums and batch_id |

### Risk Scoring Formula

Transparent, rule-weighted score — not a black-box model. Each input is traceable back to Stage 1 data.

| Input | Weight | Description |
|---|---|---|
| Incident frequency | 25% | Count of incidents per site |
| Severity mix | 20% | Ratio of rejected + review to total |
| Audit recency | 15% | Days since last audit |
| Rejection rate | 20% | Percentage of records rejected |
| Pressure spike count | 20% | Telemetry leading indicator |

**Severity bands:** Critical ≥75 · High ≥55 · Medium ≥30 · Low <30

### Database Schema (Flyway-managed)

| Table | Key Fields |
|---|---|
| `dim_site` | `site_id` (PK), `site_name`, `location` |
| `fact_incidents` | `incident_id` (PK), `site_id` (FK), `incident_date`, `severity`, `compliance_score`, `decision`, `decision_reason`, `batch_id` |
| `fact_audits` | `audit_id` (PK), `site_id` (FK), `inspection_date`, `compliance_score`, `follow_up_required`, `closed_date`, `decision` |
| `fact_telemetry` | `reading_id` (PK), `timestamp`, `site`, `pressure_psi`, `flow_rate_bph`, `temperature_celsius`, `valve_status` |
| `ingest_log` | `batch_id` (unique), `source_filename`, `row_count`, `sha256_checksum`, trusted/corrected/review/rejected counts |
| `alerts` | `id` (PK), `site_id` (FK), `severity`, `status`, `title`, `rule`, `record_ids`, `created_at`, `acknowledged_at` |

H2 in-memory for dev · PostgreSQL for production

### Tech Stack

Java 17, Spring Boot 3.3, Spring Data JPA, Flyway, Lombok, SpringDoc/OpenAPI

---

## Section 3: Next.js Frontend (`/sentinel-frontend/`)

**What it does:** Consumes the backend REST APIs and renders the operational dashboard.

### Key Views

| View | Route | Backend API | Purpose |
|---|---|---|---|
| Risk Heatmap | `/dashboard/analytics` | `GET /api/sites/risk-summary` | Site-by-site risk visualization, colored by severity band |
| Alert Feed | `/dashboard/default` | `GET /api/alerts` | Chronological, filterable stream of triggered alerts |
| Data Quality Panel | `/dashboard/default` | `GET /api/quality/summary` | Trusted/corrected/review/rejected rates, CI gate status, ingest history |
| Site Drill-down | `/dashboard/sites/[siteId]` | `GET /api/sites/{siteId}` | Per-site incident + audit timeline joined on `site + date` |
| Batch History | `/dashboard/infrastructure` | `GET /api/quality/batches` | Ingest history with checksums, row counts, batch_id |

### Source Layout

```
sentinel-frontend/
├── src/
│   ├── app/(main)/dashboard/     # all dashboard routes
│   │   ├── default/              # DQ panel + alert feed
│   │   ├── analytics/            # risk heatmap
│   │   ├── infrastructure/       # batch history
│   │   └── sites/[siteId]/       # site drill-down
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (do not modify)
│   │   └── ...                   # feature components
│   ├── lib/sentinel/             # typed fetch wrappers for the Spring Boot API
│   ├── stores/                   # Zustand state management
│   └── styles/presets/           # light/dark theme tokens
├── public/                       # static assets (KPC logo, sentinel logo)
└── src/data/                     # local mock data (used until backend is live)
```

### Visualization Principles

All views carry forward Stage 1 conventions — nothing gets reimplemented:

- **Risk Heatmap** uses the same severity vocabulary (Low/Medium/High/Critical) defined in `validate.py`
- **Alert Feed** links each alert back to the specific record(s) and rule that triggered it — the Stage 1 "traceable reason" principle made visual
- **DQ Panel** surfaces the CI gate result, batch checksums, and trusted/corrected/review/rejected split — Stage 1 auditability rendered as UI
- **Site Drill-down** joins incident + audit timelines on `site + date`, reusing the exact key names frozen in Stage 1

### Tech Stack

| Category | Tool |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, semantic theme tokens |
| UI Components | shadcn/ui (radix-nova style) |
| Data Tables | TanStack Table |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Tooling | Biome (lint + format), Husky |

---

## End-to-End Data Flow

```
Raw CSVs (incidents, audits, telemetry)
        │
        ▼ Python pipeline (Stage 1)
DuckDB/Parquet warehouse
  └── fact_incidents.parquet
  └── fact_audits.parquet
  └── fact_telemetry.parquet
  └── dim_site.parquet
  └── ingest_log.json
        │
        ▼ Flyway migration
PostgreSQL (table names and keys frozen from Stage 1)
        │
        ▼ Spring Boot REST API  →  :8080
        │
        ▼ Next.js frontend  →  :3000
  ┌─────────────────────────────────────────┐
  │  Risk Heatmap │ Alert Feed │ DQ Panel   │
  │  Site Drill-down │ Batch History        │
  └─────────────────────────────────────────┘
```

---

## Core Design Principles (shared across all three sections)

1. **Traceability over speed** — every record carries `batch_id`, every decision carries a human-readable reason. This chain runs from the Python pipeline all the way to the frontend alert links.

2. **Transparent rules over black-box scoring** — validation rules are individually named and testable; risk scores use named, weighted, judge-explainable inputs.

3. **Stage 2 extends, never replaces, Stage 1** — table names and keys are frozen in Stage 1 so the Flyway migration is a straight load, not a redesign. The Python pipeline's CI gate, validation rules, and decision routing are not duplicated in the backend.

4. **Gate as real proof** — the CI gate must fail on bad data. A gate that only ever passes proves nothing.

---

## Key Entities

| Entity | Natural Key | Lives In |
|---|---|---|
| Site | `site_id` (SITE-001 … SITE-006) | All three sections |
| Incident | `incident_id` (INC-XXXXX) | Stage 1 → backend → frontend |
| Audit | `audit_id` (AUD-XXXXX) | Stage 1 → backend → frontend |
| Telemetry Reading | `reading_id` (TEL-XXXXXX) | Stage 1 → backend → frontend |
| Ingest Batch | `batch_id` (UUID) | Stage 1 → backend → frontend DQ panel |
| Alert | `id` (UUID) | Backend → frontend alert feed |

---

## Running Each Section

### Stage 1 Pipeline

```bash
cd sentinel
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 src/generate_data.py
python -m src.ingest
python -m src.transform
python -m src.decide
python -m src.load
python -m src.validate --fail-below 0.90
pytest tests/ -v
```

### Backend

```bash
cd sentinel-backend
./mvnw spring-boot:run                              # H2 in-memory (dev)
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres  # PostgreSQL
```

API available at `http://localhost:8080`

### Frontend

```bash
cd sentinel-frontend
npm install
npm run dev
```

Dashboard available at `http://localhost:3000`
