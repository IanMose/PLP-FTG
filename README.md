# Sentinel — HSE Early-Warning Platform

Sentinel is a proactive Health, Safety & Environment (HSE) early-warning platform modeled on the Kenya Pipeline Company domain. It detects patterns of weak audit follow-through before they escalate into incidents.

The system is built across three layers that form a complete data-to-dashboard pipeline:

```
Raw CSVs  →  Python ETL pipeline  →  DuckDB/Parquet warehouse
                                            ↓
                                  Spring Boot REST API  :8080
                                            ↓
                                  Next.js Dashboard      :3000
```

---

## Project Structure

```
PLP-FTG/
├── sentinel/            # Stage 1 — Python data-quality pipeline
├── sentinel-backend/    # Stage 2 — Java Spring Boot REST API
├── sentinel-frontend/   # Stage 3 — Next.js dashboard
├── data/raw/            # Raw CSV inputs (git-ignored)
└── docs/                # Problem framing and data generation notes
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.11+ |
| Java | 17 |
| Maven wrapper | included (`./mvnw`) |
| Node.js | 18+ |
| npm | 9+ |
| PostgreSQL | 15+ (optional — H2 used by default) |

---

## Setup & Running

### 1 — Python Pipeline (`sentinel/`)

Ingests raw HSE data, enforces quality rules, and writes clean output to a local warehouse.

```bash
cd sentinel

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Generate synthetic data (creates ~15 000 rows across incidents, audits, telemetry)
python3 src/generate_data.py

# Run the full ETL pipeline
python -m src.ingest
python -m src.transform
python -m src.decide
python -m src.load

# Enforce the data-quality gate (fails if trusted+corrected rate < 90 %)
python -m src.validate --fail-below 0.90

# Run tests
pytest tests/ -v
```

Warehouse output lands in `sentinel/data/warehouse/` (Parquet + DuckDB).

---

### 2 — Backend API (`sentinel-backend/`)

Spring Boot REST API. Reads the Stage 1 warehouse via Flyway migrations and exposes data as JSON.

```bash
cd sentinel-backend

# Start with H2 in-memory database (no extra setup needed)
./mvnw spring-boot:run

# --- OR --- start with PostgreSQL
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres
```

API base URL: `http://localhost:8080`
Swagger UI: `http://localhost:8080/swagger-ui.html`
H2 console (dev only): `http://localhost:8080/h2-console`

**PostgreSQL connection defaults** (profile `postgres`):

| Property | Value |
|----------|-------|
| URL | `jdbc:postgresql://localhost:5432/sentinel` |
| Username | `sentinel` |
| Password | `sentinel` |

---

### 3 — Frontend Dashboard (`sentinel-frontend/`)

Next.js dashboard consuming the backend APIs.

```bash
cd sentinel-frontend

# Install dependencies
npm install

# Copy the environment file (already present — no changes needed for local dev)
# NEXT_PUBLIC_SENTINEL_API_URL=http://localhost:8080

# Start development server
npm run dev
```

Dashboard URL: `http://localhost:3000`

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Biome lint |
| `npm run check:fix` | Auto-fix lint + format |

---

## Default Credentials

All five seed accounts share the same temporary password. Rotate after first login.

| Email | Password | Role |
|-------|----------|------|
| `admin@sentinel.kpc` | `sentinel@admin` | Admin |
| `manager@sentinel.kpc` | `sentinel@admin` | HSE Manager |
| `auditor@sentinel.kpc` | `sentinel@admin` | Auditor |
| `analyst@sentinel.kpc` | `sentinel@admin` | Analyst |
| `viewer@sentinel.kpc` | `sentinel@admin` | Viewer |

Authentication is via `POST /api/auth/login` with `{ "email": "...", "password": "..." }`.
The response includes a JWT bearer token required on all subsequent requests.

---

## Key API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate and receive JWT |
| `/api/sites/risk-summary` | GET | Per-site risk score + severity band |
| `/api/sites/{siteId}` | GET | Incidents + audits for one site |
| `/api/alerts` | GET | Alert feed (filterable by site, severity, date) |
| `/api/alerts/{id}/ack` | POST | Acknowledge an alert |
| `/api/quality/summary` | GET | Trusted / corrected / review / rejected rates |
| `/api/quality/batches` | GET | Ingest batch history with checksums |

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| Pipeline | Python 3.11, pandas, pandera, DuckDB, PyArrow, pytest |
| Backend | Java 17, Spring Boot 3.3, Spring Security, JJWT, Flyway, PostgreSQL / H2 |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Zustand |

---

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:
1. Install Python dependencies
2. Generate synthetic data
3. Run the full ETL pipeline
4. Enforce the `--fail-below 0.90` data-quality gate
5. Run `pytest` unit tests

The gate is intentionally tested against both clean and dirty data to confirm it fails when it should.
