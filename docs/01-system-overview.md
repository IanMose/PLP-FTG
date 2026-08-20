# Sentinel — System Overview

Sentinel is a proactive Health, Safety & Environment (HSE) operating platform
modeled on the Kenya Pipeline Company (KPC) domain. It detects patterns of weak
audit follow-through **before** they escalate into environmental incidents — a
scenario drawn from the _Kimeu & 3074 others v KPC Ltd_ [2025] KEELC 5239
judgment (KES 3.02B gross award) — and closes the loop from hazard detection
through corrective action to verified closure and model retraining.

---

## Problem It Solves

Traditional HSE dashboards show what has already happened. Sentinel surfaces the
signal earlier: an audit finding left unclosed at a high-risk site is a leading
indicator. Sentinel correlates that finding against incidents, telemetry, and
human hazard reports to raise an alert before the incident becomes a news story.
When an alert is raised, Sentinel routes it through a full corrective action
lifecycle — CAPA assignment, evidence capture, HSE verification, and closure —
and feeds the verified outcome back into the ML model as new training data.

---

## Domain Model

The system monitors **7 Kenya Pipeline Company facilities** along the
Mombasa–Eldoret–Kisumu petroleum pipeline:

| Site ID  | Name                  | Location              | Risk Level |
| -------- | --------------------- | --------------------- | ---------- |
| site-001 | Nairobi Terminal      | Nairobi, Kenya        | Normal     |
| site-002 | Mombasa Terminal      | Mombasa, Kenya        | Normal     |
| site-003 | Makueni Pump Station  | Makueni County, Kenya | **High**   |
| site-004 | Nakuru Depot          | Nakuru, Kenya         | Normal     |
| site-005 | Eldoret Depot         | Uasin Gishu, Kenya    | Normal     |
| site-006 | Sinendet Pump Station | Bomet, Kenya          | **High**   |
| site-007 | Kisumu Terminal       | Kisumu, Kenya         | Normal     |

Sites 003 and 006 are the two high-risk facilities that anchor the Kimeu framing.
They receive the most aggressive monitoring thresholds throughout the system.

In addition to the 7 operational sites, the system monitors **176 corridor assets**
(monitoring points, pump stations, depots) along the full pipeline route.

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

## Four-Layer Feature Map

### Layer 1 — ETL Pipeline (Stage 1 / complete)

5-stage pipeline: ingest → transform → validate → decide → load. 97.6% pass rate
on 19 800+ records. Live batch every 2 minutes. CI quality gate ≥ 90%.

Analytics modules (`features.py`, `predict.py`, `diagnostics.py`):

- `fact_site_features.parquet` — 180-day rolling feature table, 7 sites × N days
- `logreg_v1.pkl` — trained logistic regression classifier (precision=0.619, recall=0.677, F1=0.647)
- `survival_curve_data.json` — Kaplan-Meier: 56d high-risk vs 23d fleet median (2.41× gap)
- `control_chart_data.json` — EWMA: 17.1-day avg lead time before hard pressure breach
- `correlation_data.json` — Pearson r=0.703 (rejection rate vs incident count)
- `feature_importance.json` — `audit_finding_open_count` top feature (95.2%)

ROI module (`src/roi/`):

- `roi_simulation_result.json` — pre-computed EWMA simulation result for the calculator
- `thange_kimeu_2025.json` — court-record reference anchor (display-only)

### Layer 2 — Spring Boot API (Stage 2 / complete + extended)

19 Flyway migrations (V1–V19). Packages: `alert`, `analytics`, `auth`, `capa`,
`corridor`, `etl`, `hazard`, `ingestion`, `ml`, `prediction`, `quality`, `risk`,
`roi`, `site`, `spi`, `technician`, `telemetry`, `user`.

Alert engine: 5 rules including `HAZARD_REPORT_RISK_RATING`. Narrative service with
Groq LLM enhancement (template fallback). ML HITL controller with champion/challenger
promotion. ROI calculator endpoint. SPI leading/lagging indicator endpoint.

### Layer 3 — Next.js Frontend (Stage 3 / complete + extended)

15 routes including ROI Calculator, Hazard Reports, CAPAs, My Tasks (Field Technician),
and the full ML Admin portal (5 pages). Role-aware sidebar (8 roles, filtered per user).
SPI panel on the main dashboard.

### Layer 4 — ML HITL Loop (complete)

`model_feedback` table collects human ratings and automatic CAPA-outcome labels.
`model_registry` tracks champion/challenger versions. `training_run` logs each
retrain. Human gate on every promotion — no auto-promotion.

---

## HSE Process Loop (end-to-end)

```
Hazard Report submitted (any authenticated user)
        ↓
HSE Officer fills Risk Assessment (likelihood × severity → risk_rating/25)
        ↓
risk_rating ≥ 10 → alert raised via AlertRulesEngine (HAZARD_REPORT_RISK_RATING)
        ↓
CAPA created, assigned to qualified technician (qualification guard enforced)
        ↓
Field Technician → in_progress → completed (with evidence URL)
        ↓
HSE Manager → verified → closed
        ↓
ModelFeedbackService.recordCapaOutcome() writes capa_outcome row to model_feedback
        ↓
SPI panel on dashboard updates (leading: hazard reports, avg closure, on-time %)
        ↓
ML Admin runs retrain → challenger model → Approve/Reject in HITL portal
        ↓
Promoted champion → predict.py loads from model_registry → fact_predictions updated
```

---

## Database Schema

Managed by Flyway (19 migrations). All new tables follow `VARCHAR(36)` UUID PKs
(string-typed to match the alerts table convention).

### Core tables (V1–V13, unchanged)

| Table                | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `dim_site`           | 7 KPC sites (lowercase PKs)               |
| `fact_incidents`     | Environmental incidents                   |
| `fact_audits`        | Compliance audits                         |
| `ingest_log`         | Batch traceability                        |
| `alerts`             | Active and historical alerts + narrative  |
| `dim_asset`          | 176 corridor assets                       |
| `fact_environmental` | Live corridor telemetry                   |
| `app_role`           | Role definitions                          |
| `app_user`           | Authenticated users                       |
| `fact_predictions`   | ML model probability scores per site/date |

### HSE loop tables (V14–V17)

| Table                      | Purpose                                                |
| -------------------------- | ------------------------------------------------------ |
| `hazard_report`            | Human-submitted hazard / near-miss reports             |
| `capa`                     | Corrective & Preventive Action records                 |
| `technician`               | Technician profiles linked to `app_user`               |
| `technician_qualification` | Qualification tags per technician with optional expiry |

Note: `hazard_report.risk_rating` is computed in the service layer as
`likelihood_rating × severity_rating`. `alerts.required_qualification` (VARCHAR)
added via V14 to drive the CAPA qualification guard.

### ML HITL tables (V16)

| Table            | Purpose                                                    |
| ---------------- | ---------------------------------------------------------- |
| `model_feedback` | Human ratings and capa_outcome labels for model retraining |
| `model_registry` | One row per trained model version (champion/challenger/…)  |
| `training_run`   | One row per retrain attempt                                |

---

## RBAC — 8 Roles

| Role name (DB)     | Spring authority        | Key permissions                                         |
| ------------------ | ----------------------- | ------------------------------------------------------- |
| `Admin`            | `ROLE_ADMIN`            | Full access including user management                   |
| `HSE Manager`      | `ROLE_HSE_MANAGER`      | Read all, create/verify/close CAPAs, acknowledge alerts |
| `Auditor`          | `ROLE_AUDITOR`          | Read all, create CAPAs, assess hazard reports           |
| `Analyst`          | `ROLE_ANALYST`          | Read analytics and hazard reports                       |
| `Viewer`           | `ROLE_VIEWER`           | Read dashboard only                                     |
| `Field Technician` | `ROLE_FIELD_TECHNICIAN` | Submit hazards, view/action own CAPAs, My Tasks page    |
| `Station Manager`  | `ROLE_STATION_MANAGER`  | Read/write for own station only                         |
| `ML Admin`         | `ROLE_ML_ADMIN`         | Full access to /dashboard/ml-admin and /api/ml/\*\*     |

`JwtAuthFilter` sets authority as `"ROLE_" + roleName.toUpperCase().replace(" ","_")`.
`SecurityConfig` uses `hasRole()` consistently — Spring strips the `ROLE_` prefix.

---

## Default User Accounts

| Email                 | Role             | Password       |
| --------------------- | ---------------- | -------------- |
| admin@sentinel.kpc    | Admin            | sentinel@admin |
| manager@sentinel.kpc  | HSE Manager      | sentinel@admin |
| auditor@sentinel.kpc  | Auditor          | sentinel@admin |
| analyst@sentinel.kpc  | Analyst          | sentinel@admin |
| viewer@sentinel.kpc   | Viewer           | sentinel@admin |
| tech@sentinel.kpc     | Field Technician | sentinel@admin |
| station@sentinel.kpc  | Station Manager  | sentinel@admin |
| ml.admin@sentinel.kpc | ML Admin         | sentinel@admin |

`tech@sentinel.kpc` has a seeded `Mechanical` qualification and `station_home_id = site-006`.

---

## Key Evidence Numbers (from pipeline output)

| Metric                             | Value                              | Source file                |
| ---------------------------------- | ---------------------------------- | -------------------------- |
| EWMA lead time before hard breach  | **17.1 days**                      | `control_chart_data.json`  |
| KM median closure — fleet          | **23 days**                        | `survival_curve_data.json` |
| KM median closure — high-risk      | **56 days** (2.41×)                | `survival_curve_data.json` |
| Model precision / recall / F1      | **0.619 / 0.677 / 0.647**          | `backtest_report.json`     |
| Pearson r (rejection vs incidents) | **r=0.703**                        | `correlation_data.json`    |
| Top predictive feature             | `audit_finding_open_count` (95.2%) | `feature_importance.json`  |

---

## Tech Stack

| Layer        | Technologies                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------ |
| ETL Pipeline | Python 3.11, pandas, pandera, DuckDB, PyArrow, scikit-learn, lifelines, scipy, pytest            |
| Backend API  | Java 17, Spring Boot 3.3, Spring Security (JWT), JJWT, Flyway, PostgreSQL / H2, Jackson, Lombok  |
| Frontend     | Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Leaflet, Zustand, Sonner |

---

## CI / Quality Gate

GitHub Actions (`.github/workflows/ci.yml`) runs on every push/PR to `main`:

1. Install Python dependencies
2. Generate synthetic data
3. Run the full ETL pipeline
4. Enforce `--fail-below 0.90` (trusted + corrected rate ≥ 90%)
5. Run `pytest` unit tests

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
# Run analytics + ML
python -m src.features
python -m src.predict --train
python -m src.diagnostics

# 2 — Spring Boot API (H2 in-memory, no extra DB setup needed)
cd sentinel-backend
./mvnw spring-boot:run
# Swagger UI: http://localhost:8080/swagger-ui.html

# 3 — Next.js dashboard
cd sentinel-frontend
npm install && npm run dev
# Dashboard: http://localhost:3000
# Default login: admin@sentinel.kpc / sentinel@admin
# ML Admin login: ml.admin@sentinel.kpc / sentinel@admin
```

For PostgreSQL: `./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres`
(database: `sentinel`, user: `sentinel`, password: `sentinel`)

---

## Kimeu Case — Q&A Facts

- **Citation:** Kimeu & 3074 others v Kenya Pipeline Company Ltd & another [2025] KEELC 5239 (KLR)
- **Incident:** 12 May 2015 pipeline leak near source of Thange River, Makueni County
- **Liability:** KPC 80%, NEMA 20%
- **Award:** KES 2,118,831,676 damages + KES 900,000,000 environmental restoration = **KES 3,018,831,676 gross**
- **Current status:** KPC has appealed; enforcement paused by court order — live liability
- Sentinel does **not** claim to reconstruct the 2015 incident — synthetic data resembles the pattern
