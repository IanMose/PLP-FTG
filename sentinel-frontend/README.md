# Sentinel Frontend

**sentinel-frontend** — Next.js dashboard for the Sentinel data-quality and risk-monitoring platform. Consumes the Spring Boot backend APIs and renders the risk heatmap, alert feed, data-quality panel, and site drill-down views.

![CI](https://github.com/ORG/REPO/actions/workflows/ci.yml/badge.svg)

---

## System Context

Sentinel is a three-tier system built on top of a Stage 1 data-quality pipeline:

| Layer | Component | Responsibility |
|---|---|---|
| Data | Postgres (migrated from Stage 1 warehouse) | System of record for incidents, audits, sites, `ingest_log` |
| Backend | Spring Boot (`sentinel-backend/`) | REST APIs for risk, alerts, quality, ingestion |
| **Frontend** | **Next.js (this repo)** | **Presents Stage 1 data visually — heatmap, alerts, DQ panel, drill-downs** |

This frontend does not own data ingestion, transformation, or validation logic. It renders what the backend exposes.

---

## Frontend Architecture

```
sentinel-frontend/
├── app/
│   ├── dashboard/page.tsx                # composition: heatmap + feed + DQ panel
│   ├── dashboard/analytics/              # risk heatmap and scoring views
│   ├── dashboard/infrastructure/         # site-level infrastructure monitoring
│   ├── sites/[siteId]/page.tsx           # drill-down: incident + audit timeline
│   └── alerts/page.tsx                   # full alert history/search
├── components/
│   ├── ui/                  # shadcn/ui primitives (do not modify)
│   ├── RiskHeatmap/         # site grid or map, color by risk band
│   ├── AlertFeed/           # scrollable, filterable alert list
│   ├── DataQualityPanel/    # trusted/corrected/review/rejected bars
│   │                        #   + CI gate status + ingest history
│   └── SiteDetail/          # incident/audit timeline for one site
├── lib/api/                 # typed fetch wrappers for the Spring Boot API
├── lib/types/               # shared DTOs mirroring backend contracts
├── hooks/                   # shared React hooks
├── stores/                  # Zustand state management
└── styles/presets/          # theme presets (light/dark, color schemes)
```

---

## Key Views (mapped from Sentinel Stage 2 design)

| View | Route | Data Source (Backend API) | Purpose |
|---|---|---|---|
| **Risk Heatmap** | `/dashboard/analytics` | `GET /api/sites/risk-summary` | Site-by-site risk visualization, colored by band (Low/Medium/High/Critical) |
| **Alert Feed** | `/dashboard/alerts` | `GET /api/alerts` | Chronological, filterable stream of triggered alerts |
| **Data Quality Panel** | `/dashboard/default` | `GET /api/quality/summary` | Trusted/corrected/review/rejected rates, CI gate status, ingest history |
| **Site Drill-down** | `/dashboard/sites/[siteId]` | `GET /api/sites/{siteId}` | Per-site incident + audit history, joined on `site + date` |
| **Batch History** | `/dashboard/infrastructure` | `GET /api/quality/batches` | Ingest history with checksums, row counts, `batch_id` |

### Visualization principles (carried from Stage 1)

- **Risk Heatmap** uses the *same* severity vocabulary defined in Stage 1's `validate.py` (Low / Medium / High / Critical) — not a new taxonomy.
- **Alert Feed** links each alert back to the specific record(s) and rule that produced it — carrying forward Stage 1's "traceable reason" principle.
- **Data Quality panel** surfaces the Stage 1 auditability story visually (trusted/corrected/review/rejected split, CI gate result, batch checksums).
- **Site drill-down** joins incident + audit timelines on `site + date`, reusing the exact key convention fixed in Stage 1.

---

## Tech Stack

| Category | Tool |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4, semantic theme tokens |
| UI Components | shadcn/ui (radix-nova style) |
| Data Tables | TanStack Table |
| Charts | Recharts |
| Forms | React Hook Form + Zod validation |
| State | Zustand |
| Tooling | Biome (lint + format), Husky |

---

## Getting Started

```bash
# 1. Clone and install
git clone <repo-url>
cd sentinel-frontend
npm install

# 2. Start development server
npm run dev
```

App runs at [http://localhost:3000](http://localhost:3000).

### Available Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | Biome lint |
| `npm run format` | Biome format |
| `npm run check` | Biome check (lint + format) |
| `npm run check:fix` | Auto-fix lint + format issues |
| `npm run generate:presets` | Regenerate theme preset files |

---

## Backend API Contract

The frontend expects the following endpoints from `sentinel-backend`:

| Endpoint | Method | Returns |
|---|---|---|
| `/api/sites/risk-summary` | GET | Per-site risk score + severity band, for the heatmap |
| `/api/sites/{siteId}` | GET | Drill-down: incidents + audits for one site |
| `/api/alerts` | GET | Paginated, filterable alert feed (by site, severity, date range) |
| `/api/alerts/{id}/ack` | POST | Acknowledge an alert (audit-logged) |
| `/api/quality/summary` | GET | Trusted/corrected/review/rejected rates, latest batch stats |
| `/api/quality/batches` | GET | Ingest history with checksums, row counts, `batch_id` |

Until the backend is live, the frontend uses local mock data in `src/data/`.

---

## Project Conventions

- **Colocation:** feature code lives next to the route that owns it (`_components/` directories)
- **Server Components by default:** `page.tsx` stays server-side; interactive code goes into dedicated Client Components
- **Semantic tokens:** all colors use theme tokens so views work across light/dark modes and presets
- **No arbitrary colors:** use Tailwind palette or existing theme tokens
- **Biome config:** double quotes, semicolons, two-space indent, sorted imports, 120-char line width
- **Import aliases:** use `@/` paths

---

## Relationship to Stage 1

This frontend does **not** replace or reimplement Stage 1 logic. It presents Stage 1 outputs:

1. Stage 1 pipeline (Python) handles ingest → transform → validate → decide → load
2. Stage 1 warehouse (DuckDB/Parquet) migrates to Postgres at Stage 2 start
3. Spring Boot backend exposes warehouse data as REST APIs
4. **This frontend** consumes those APIs and renders the operational views

The CI gate, data-quality rules, and decision routing remain in the Stage 1 Python codebase.

---

## Auth

Stub auth with simple roles (viewer/analyst). SSO is not built until Stage 2 requires it. Authentication screens are at `/auth/v1/` and `/auth/v2/`.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow. Use conventional commit prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`). Include screenshots for visual changes.
