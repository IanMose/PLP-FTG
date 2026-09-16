# Sentinel V4 System Architecture

## Overview

Sentinel is an AI-powered pipeline integrity monitoring and predictive maintenance system designed for Kenya Pipeline Company (KPC). It provides real-time tank telemetry monitoring, automated overfill prevention, risk prediction, and comprehensive HSE (Health, Safety, Environment) management capabilities.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SENTINEL V4 SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                   │
│   │   Frontend   │────▶│   Backend    │────▶│   Database   │                   │
│   │  (Next.js)   │◀────│ (Spring Boot)│◀────│ (PostgreSQL) │                   │
│   └──────────────┘     └──────────────┘     └──────────────┘                   │
│          │                    │                                                  │
│          │                    ▼                                                  │
│          │             ┌──────────────┐                                          │
│          │             │  ML Service  │                                          │
│          │             │   (Python)   │                                          │
│          │             └──────────────┘                                          │
│          │                    │                                                  │
│          ▼                    ▼                                                  │
│   ┌──────────────┐     ┌──────────────┐                                          │
│   │    Vercel    │     │    Render    │                                          │
│   │  (Frontend)  │     │  (Backend)   │                                          │
│   └──────────────┘     └──────────────┘                                          │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. System Components

### 1.1 Frontend (sentinel-frontend)

**Technology Stack:**
- Next.js 16.x with App Router
- React 19 with Server Components
- TypeScript
- TailwindCSS + shadcn/ui components
- TanStack Query for data fetching
- Zustand for client state management
- Vitest + MSW for testing

**Key Features:**
- Server-side rendering (SSR) for initial page loads
- API proxy routes for secure token handling (no client-side cookie access)
- Real-time dashboard with auto-refresh
- Responsive design with multiple theme support
- Role-based access control UI

**Deployment:** Vercel (serverless)

---

### 1.2 Backend (sentinel-backend)

**Technology Stack:**
- Java 17 / Spring Boot 3.x
- Spring Security with JWT authentication
- Spring Data JPA / Hibernate
- Flyway for database migrations
- PostgreSQL (production) / H2 (development)

**Key Modules:**

| Module | Description |
|--------|-------------|
| `auth` | JWT authentication, user login/registration |
| `user` | User management, role assignments |
| `site` | Site/station management, risk summaries |
| `telemetry` | Real-time tank level and pressure data |
| `alert` | Alert generation and notification |
| `prediction` | ML model inference integration |
| `hazard` | Hazard report submission and tracking |
| `capa` | Corrective/Preventive Actions management |
| `maintenance` | Work order lifecycle |
| `technician` | Field technician management |
| `actuation` | Valve control and actuation logging |
| `executive` | Executive dashboard KPIs |
| `ml` | Model registry, drift detection, retraining |
| `analytics` | Survival curves, correlations, feature importance |
| `demo` | Demo/simulation endpoints for testing |

**Deployment:** Render (Docker)

---

### 1.3 ML Service (sentinel)

**Technology Stack:**
- Python 3.11+
- scikit-learn for ML models
- pandas / numpy for data processing
- psycopg2 for PostgreSQL connectivity
- SHAP for model explainability

**Pipeline Stages:**

```
┌─────────┐    ┌───────────┐    ┌──────────┐    ┌─────────┐    ┌──────────┐
│ Ingest  │───▶│ Transform │───▶│ Validate │───▶│ Feature │───▶│ Predict  │
│         │    │           │    │          │    │ Extract │    │          │
└─────────┘    └───────────┘    └──────────┘    └─────────┘    └──────────┘
                                                                     │
                                                                     ▼
                                                              ┌──────────┐
                                                              │  Decide  │
                                                              │ (Alerts) │
                                                              └──────────┘
```

**Key Modules:**

| Module | Description |
|--------|-------------|
| `ingest.py` | Load raw telemetry data from sources |
| `transform.py` | Data cleaning and normalization |
| `validate.py` | Data quality checks |
| `features.py` | Feature engineering |
| `predict.py` | Risk score prediction |
| `decide.py` | Alert threshold logic |
| `retrain.py` | Model retraining pipeline |
| `model_registry.py` | Model versioning and promotion |
| `explainability.py` | SHAP-based feature explanations |
| `diagnostics.py` | Model performance analytics |

**Execution:** GitHub Actions (scheduled cron) pushing results to backend via ETL API

---

### 1.4 Database (PostgreSQL)

**Core Tables:**

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     sites       │────▶│    telemetry    │────▶│     alerts      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ hazard_reports  │────▶│     capas       │────▶│  work_orders    │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Key Schema Categories:**

| Category | Tables |
|----------|--------|
| **Core** | `sites`, `corridors`, `users`, `roles` |
| **Telemetry** | `telemetry`, `fact_tank_telemetry`, `fact_site_features` |
| **Alerts** | `alerts`, `event_log`, `actuation_log` |
| **HSE** | `hazard_reports`, `capas`, `work_orders` |
| **Workforce** | `technicians`, `qualifications` |
| **ML** | `fact_predictions`, `model_registry`, `training_runs`, `drift_snapshots` |

---

## 2. Data Flow Architecture

### 2.1 Real-Time Monitoring Flow

```
                                    ┌──────────────────┐
                                    │  Tank Sensors    │
                                    │  (Level/Pressure)│
                                    └────────┬─────────┘
                                             │
                                             ▼
┌──────────────┐    ETL Push     ┌──────────────────┐    WebSocket    ┌──────────────┐
│   GitHub     │────────────────▶│  Spring Boot     │─────────────────▶│   Frontend   │
│   Actions    │                 │  Backend         │                  │   Dashboard  │
│  (Cron Job)  │                 └────────┬─────────┘                  └──────────────┘
└──────────────┘                          │
                                          ▼
                               ┌──────────────────┐
                               │   PostgreSQL     │
                               │   Database       │
                               └──────────────────┘
```

### 2.2 Prediction & Alert Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Historical  │────▶│  ML Model    │────▶│   Risk Score │────▶│   Alert      │
│  Telemetry   │     │  Inference   │     │  Generation  │     │  Creation    │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                                                                      │
                            ┌─────────────────────────────────────────┤
                            │                                         │
                            ▼                                         ▼
                     ┌──────────────┐                          ┌──────────────┐
                     │    Slack     │                          │   Actuation  │
                     │ Notification │                          │   (Valve)    │
                     └──────────────┘                          └──────────────┘
```

### 2.3 Control Plane (V4) Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        CONTROL PLANE (V4)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │  Threshold  │───▶│   Event     │───▶│  Actuation  │               │
│   │  Detection  │    │   Logging   │    │  Command    │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│          │                  │                  │                       │
│          ▼                  ▼                  ▼                       │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐               │
│   │  Alert      │    │  Audit      │    │ Verification│               │
│   │  Generation │    │  Trail      │    │  Loop       │               │
│   └─────────────┘    └─────────────┘    └─────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Security Architecture

### 3.1 Authentication Flow

```
┌──────────┐     POST /api/auth/login     ┌──────────────┐
│  Client  │─────────────────────────────▶│   Backend    │
│          │                              │              │
│          │◀─────────────────────────────│              │
└──────────┘       JWT Token              └──────────────┘
     │                                           │
     │  Store in HttpOnly cookie                 │  Validate & sign
     ▼                                           ▼
┌──────────┐                              ┌──────────────┐
│  Cookie  │                              │  JWT Secret  │
│  Storage │                              │  (Env Var)   │
└──────────┘                              └──────────────┘
```

### 3.2 Authorization Matrix

| Role | Dashboard | Hazards | CAPAs | Work Orders | ML Admin | User Mgmt |
|------|-----------|---------|-------|-------------|----------|-----------|
| ADMIN | Full | Full | Full | Full | Full | Full |
| HSE_MANAGER | Full | Full | Full | Full | Read | - |
| AUDITOR | Read | Full | Read | Read | - | - |
| STATION_MANAGER | Read | Create | Read | Create | - | - |
| FIELD_TECHNICIAN | Read | Create | - | Update | - | - |
| ML_ADMIN | Read | - | - | - | Full | - |

### 3.3 API Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                      Request Flow                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Request ──▶ CORS ──▶ JWT Filter ──▶ Role Check ──▶ Handler │
│                                                              │
│   Public Endpoints (No Auth):                                │
│   • /api/auth/**                                             │
│   • /api/sites/** (read-only)                               │
│   • /api/alerts (read-only)                                 │
│   • /api/demo/**                                            │
│   • /api/executive/**                                       │
│   • /actuator/health                                        │
│                                                              │
│   ETL Endpoint (API Key Auth):                              │
│   • POST /api/data/ingest (X-ETL-Api-Key header)           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Deployment Architecture

### 4.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         PRODUCTION DEPLOYMENT                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────┐              ┌─────────────────┐                  │
│   │     Vercel      │              │     Render      │                  │
│   │   (Frontend)    │─────────────▶│   (Backend)     │                  │
│   │                 │   API Calls  │                 │                  │
│   │  • Next.js SSR  │              │  • Spring Boot  │                  │
│   │  • Edge Network │              │  • Docker       │                  │
│   │  • Auto-scaling │              │  • Health Check │                  │
│   └─────────────────┘              └────────┬────────┘                  │
│                                             │                            │
│                                             ▼                            │
│                                    ┌─────────────────┐                  │
│                                    │  Render DB      │                  │
│                                    │  (PostgreSQL)   │                  │
│                                    │                 │                  │
│                                    │  • Managed      │                  │
│                                    │  • Auto-backup  │                  │
│                                    └─────────────────┘                  │
│                                                                          │
│   ┌─────────────────┐                                                   │
│   │  GitHub Actions │                                                   │
│   │   (ETL Cron)    │──── Push via ETL API ────────────▶ Backend       │
│   │                 │                                                   │
│   │  • 2-min cycle  │                                                   │
│   │  • ML inference │                                                   │
│   └─────────────────┘                                                   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Environment Configuration

| Environment | Frontend | Backend | Database |
|-------------|----------|---------|----------|
| Development | localhost:3000 | localhost:8080 | H2 in-memory |
| Staging | Vercel Preview | Render (free) | Render PostgreSQL |
| Production | Vercel | Render (starter) | Render PostgreSQL |

### 4.3 Key Environment Variables

**Backend (Render):**
```
SPRING_PROFILES_ACTIVE=render
DATABASE_URL=jdbc:postgresql://...
DB_USERNAME=sentinel
DB_PASSWORD=***
JWT_SECRET=***
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
ETL_API_KEY=***
SLACK_WEBHOOK_URL=*** (optional)
GROQ_API_KEY=*** (optional, for LLM narratives)
```

**Frontend (Vercel):**
```
NEXT_PUBLIC_SENTINEL_API_URL=https://sentinel-backend.onrender.com
NEXT_PUBLIC_TEST_MODE=false (true for dev bypass)
```

**GitHub Actions (ETL):**
```
ETL_API_KEY=*** (matches backend)
SENTINEL_API_URL=https://sentinel-backend.onrender.com
```

---

## 5. ML/AI Architecture

### 5.1 Model Pipeline

```
┌───────────────────────────────────────────────────────────────────────┐
│                        ML PIPELINE (V4)                               │
├───────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   Data Collection        Feature Engineering        Model Training    │
│   ┌─────────────┐       ┌─────────────┐           ┌─────────────┐    │
│   │ Telemetry   │──────▶│ Rolling     │──────────▶│ Random      │    │
│   │ Readings    │       │ Aggregates  │           │ Forest      │    │
│   └─────────────┘       └─────────────┘           └──────┬──────┘    │
│                                                          │            │
│                                                          ▼            │
│   Model Registry        Drift Detection          Model Serving       │
│   ┌─────────────┐       ┌─────────────┐        ┌─────────────┐       │
│   │ Versioning  │◀──────│ Accuracy    │◀───────│ Champion    │       │
│   │ Promotion   │       │ Monitoring  │        │ Model       │       │
│   └─────────────┘       └─────────────┘        └─────────────┘       │
│                                                                        │
└───────────────────────────────────────────────────────────────────────┘
```

### 5.2 Model Registry States

```
         ┌─────────────┐
         │   PENDING   │
         │  (uploaded) │
         └──────┬──────┘
                │ promote
                ▼
         ┌─────────────┐
         │  CHAMPION   │◀────────┐
         │  (active)   │         │
         └──────┬──────┘         │ rollback
                │ demote         │
                ▼                │
         ┌─────────────┐         │
         │  ARCHIVED   │─────────┘
         │  (retired)  │
         └─────────────┘

         ┌─────────────┐
         │  REJECTED   │
         │  (failed)   │
         └─────────────┘
```

### 5.3 Drift Detection

| Metric | Threshold | Action |
|--------|-----------|--------|
| Accuracy drop > 5% | Warning | Notify ML Admin |
| Accuracy drop > 10% | Critical | Trigger retraining |
| Feature drift detected | Warning | Log for review |
| Sample size < 100 | Insufficient | Skip evaluation |

---

## 6. Integration Points

### 6.1 External Integrations

| System | Integration Type | Purpose |
|--------|------------------|---------|
| Slack | Webhook | Alert notifications |
| Groq LLM | REST API | Narrative generation |
| GitHub Actions | ETL Push API | Scheduled ML inference |

### 6.2 Internal API Contracts

**Frontend → Backend:**
- REST API over HTTPS
- JWT Bearer token authentication
- JSON request/response format

**ETL → Backend:**
- POST `/api/data/ingest`
- API Key authentication via `X-ETL-Api-Key` header
- Batch JSON payload with predictions

**Backend → Database:**
- JDBC connection pool
- Flyway-managed schema migrations
- JPA/Hibernate ORM

---

## 7. Monitoring & Observability

### 7.1 Health Checks

| Component | Endpoint | Interval |
|-----------|----------|----------|
| Backend | `/actuator/health` | 30s (Render) |
| Frontend | Built-in Vercel | Automatic |
| Database | Connection pool | Per-request |

### 7.2 Logging

| Component | Log Destination | Level |
|-----------|-----------------|-------|
| Backend | Render console | INFO |
| Frontend | Vercel logs | ERROR |
| ETL | GitHub Actions | INFO |

### 7.3 Key Metrics

- **System Uptime**: Tracked via `/api/executive/summary`
- **Response Times**: Actuation verification timing
- **Model Accuracy**: Drift detection snapshots
- **Alert Volume**: Events per period

---

## 8. Disaster Recovery

### 8.1 Backup Strategy

| Data Type | Backup Method | Retention |
|-----------|---------------|-----------|
| Database | Render auto-backup | 7 days |
| ML Models | Model registry table | All versions |
| Config | Git repository | Indefinite |

### 8.2 Recovery Procedures

1. **Database Recovery**: Restore from Render backup
2. **Backend Recovery**: Redeploy from Git main branch
3. **Frontend Recovery**: Redeploy from Vercel
4. **Model Recovery**: Rollback to previous champion in registry

---

## 9. Scalability Considerations

### 9.1 Current Limitations (Free Tier)

- Render free tier: 512MB RAM, spins down after inactivity
- PostgreSQL free: 256MB storage, shared compute
- Vercel free: 100GB bandwidth/month

### 9.2 Upgrade Path

| Component | Free → Starter | Starter → Pro |
|-----------|----------------|---------------|
| Backend | Always-on, 2GB RAM | Auto-scaling, SLA |
| Database | Persistent storage | Dedicated compute |
| Frontend | More bandwidth | Edge functions |

---

## Appendix A: Technology Stack Summary

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | Next.js | 16.x |
| Frontend Language | TypeScript | 5.x |
| UI Components | shadcn/ui + Tailwind | Latest |
| State Management | Zustand + TanStack Query | 5.x |
| Backend Framework | Spring Boot | 3.x |
| Backend Language | Java | 17 |
| ORM | Hibernate/JPA | 6.x |
| Database | PostgreSQL | 15 |
| ML Framework | scikit-learn | 1.x |
| ML Language | Python | 3.11+ |
| CI/CD | GitHub Actions | - |
| Frontend Hosting | Vercel | - |
| Backend Hosting | Render | - |

---

*Document Version: 1.0*  
*Last Updated: September 2026*  
*Maintainer: Sentinel Development Team*
