# Sentinel Backend

Spring Boot REST API for the Sentinel data-quality and risk-monitoring platform.

Consumes the Stage 1 pipeline output (incidents, audits, ingest_log) and exposes it as REST endpoints for the Next.js frontend.

---

## Architecture

```
sentinel-backend/
├── src/main/java/com/sentinel/
│   ├── ingestion/        # Ingest log entity + repository
│   ├── quality/          # DQ aggregation service + API
│   ├── risk/             # Risk scoring engine + API
│   ├── alert/            # Alert rules + persistence + API
│   ├── site/             # Site, Incident, Audit entities + repositories
│   ├── common/           # Shared DTOs, exceptions, config
│   └── SentinelApplication.java
├── src/main/resources/
│   ├── db/migration/     # Flyway SQL (V1: schema, V2: seed data)
│   └── application.yml
└── pom.xml
```

---

## REST API Contract

| Endpoint | Method | Returns |
|---|---|---|
| `/api/sites/risk-summary` | GET | Per-site risk score + severity band (for heatmap) |
| `/api/sites/{siteId}` | GET | Drill-down: incidents + audits for one site |
| `/api/alerts` | GET | Alert feed (by site, severity, date range) |
| `/api/alerts/{id}/ack` | POST | Acknowledge an alert (audit-logged) |
| `/api/quality/summary` | GET | Trusted/corrected/review/rejected rates, gate status |
| `/api/quality/batches` | GET | Ingest history with checksums, row counts, batch_id |

---

## Quick Start

### Default (H2 in-memory database with seed data)

```bash
./mvnw spring-boot:run
```

The API runs at [http://localhost:8080](http://localhost:8080). Flyway automatically creates tables and seeds data on startup.

### With PostgreSQL

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

Requires a PostgreSQL instance with database `sentinel` accessible at `localhost:5432`.

---

## Risk Scoring

Transparent, rule-weighted score (not a black-box model):

| Input | Weight | Description |
|---|---|---|
| Incident frequency | 30% | Count of incidents per site |
| Severity mix | 25% | Ratio of rejected + review to total |
| Audit recency | 20% | Days since last audit |
| Rejection rate | 25% | Percentage of records rejected |

Severity bands: Critical (≥75), High (≥55), Medium (≥30), Low (<30)

---

## Migration from Stage 1

1. Stage 1 table names and keys are frozen: `site`, `date`, `incident_id`, `audit_id`
2. Flyway V1 recreates `fact_incidents`, `fact_audits`, `dim_site`, `ingest_log` from Stage 1 DDL
3. Seed data (V2) backfills from Stage 1 warehouse output
4. `quality-service` reads `ingest_log` so DQ history starts from Stage 1 batches

---

## Tech Stack

- Java 17
- Spring Boot 3.3
- Spring Data JPA
- Flyway (database migrations)
- PostgreSQL (production) / H2 (dev)
- Lombok
