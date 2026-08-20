# Sentinel — Next.js Frontend Dashboard

The dashboard (`sentinel-frontend/`) is the UI layer. It is a Next.js 16 / React 19
application built with TypeScript, Tailwind CSS v4, shadcn/ui, Recharts, Leaflet,
and Zustand. It reads data from the Spring Boot backend via typed fetch wrappers
and renders a real-time HSE monitoring interface with role-aware navigation.

---

## Directory Layout

```
sentinel-frontend/src/
├── app/
│   ├── layout.tsx                     # Root layout — theme, fonts, TooltipProvider, Toaster
│   ├── globals.css
│   ├── (external)/page.tsx            # Public login page
│   └── (main)/
│       ├── auth/v2/login/page.tsx
│       ├── unauthorized/page.tsx
│       └── dashboard/
│           ├── layout.tsx             # Shell: AppSidebar + DashboardAutoRefresh
│           ├── page.tsx               # Redirects → /dashboard/sentinel
│           ├── _components/sidebar/
│           │   ├── app-sidebar.tsx
│           │   ├── nav-main.tsx       # Role-filtered collapsible nav
│           │   ├── nav-user.tsx       # User avatar dropdown + logout
│           │   └── ...
│           ├── sentinel/
│           │   ├── page.tsx           # Overview: KPI strip, SPI panel, heatmap, alert feed, DQ
│           │   ├── _components/       # Shared Sentinel components (including SpiPanel)
│           │   ├── alerts/page.tsx
│           │   ├── analytics/page.tsx
│           │   ├── sites/[siteId]/page.tsx
│           │   ├── roi/               # ROI Calculator
│           │   ├── hazards/           # Hazard report list + detail
│           │   ├── capas/             # CAPA queue + detail
│           │   └── my-tasks/          # Field Technician task view
│           ├── ml-admin/              # ML HITL portal (ML Admin role only)
│           │   ├── layout.tsx         # Server-side role gate → /unauthorized
│           │   ├── page.tsx           # Overview
│           │   ├── training-runs/
│           │   ├── feedback/
│           │   ├── registry/
│           │   └── settings/
│           ├── sites/                 # Corridor heatmap
│           ├── alerts/
│           ├── users/                 # Admin-only
│           └── roles/
├── components/ui/                     # 60+ shadcn/ui primitives
├── lib/sentinel/
│   ├── api.ts                         # Typed fetch wrappers (25+ functions)
│   └── types.ts                       # Full type inventory
├── navigation/sidebar/sidebar-items.ts # 3 NavGroups, 8 roles, role-filtered items
├── stores/auth/auth-store.ts          # Zustand AuthStore
├── stores/preferences/                # Zustand PreferencesStore
└── server/server-actions.ts           # getAuthToken() reads sentinel-token cookie
```

---

## Route Map

| Route                                | Description                                                             | Role restriction  |
| ------------------------------------ | ----------------------------------------------------------------------- | ----------------- |
| `/`                                  | Login page                                                              | Public            |
| `/dashboard`                         | Redirects to `/dashboard/sentinel`                                      | —                 |
| `/dashboard/sentinel`                | Overview: KPI strip, SPI panel, heatmap, alert feed, DQ panel           | All               |
| `/dashboard/sentinel/alerts`         | Full alert feed — timeline, trend, toolbar, narratives                  | All               |
| `/dashboard/sentinel/analytics`      | ML diagnostics — survival curves, EWMA, correlation, feature importance | All               |
| `/dashboard/sentinel/sites/[siteId]` | Per-site: incidents, audits, telemetry, model prediction, narratives    | All               |
| `/dashboard/sentinel/roi`            | ROI Calculator — editable assumptions, EWMA chart, breakdown, result    | All               |
| `/dashboard/sentinel/hazards`        | Hazard report list + submission form                                    | All authenticated |
| `/dashboard/sentinel/hazards/[id]`   | Hazard detail + risk assessment form                                    | All authenticated |
| `/dashboard/sentinel/capas`          | CAPA queue, create form, status stepper                                 | All authenticated |
| `/dashboard/sentinel/capas/[id]`     | CAPA detail + status transition buttons + evidence                      | All authenticated |
| `/dashboard/sentinel/my-tasks`       | Field Technician own-CAPA view                                          | Field Technician  |
| `/dashboard/sites`                   | Corridor heatmap (Leaflet + leaflet-heat)                               | All               |
| `/dashboard/alerts`                  | Alerts page (mirrors sentinel/alerts)                                   | All               |
| `/dashboard/users`                   | User management                                                         | Admin             |
| `/dashboard/roles`                   | Roles reference                                                         | Admin             |
| `/dashboard/ml-admin`                | ML portal overview                                                      | ML Admin, Admin   |
| `/dashboard/ml-admin/training-runs`  | Retrain history + "Retrain Now" button                                  | ML Admin, Admin   |
| `/dashboard/ml-admin/feedback`       | Confidence-sorted prediction feedback queue                             | ML Admin, Admin   |
| `/dashboard/ml-admin/registry`       | Champion vs challenger compare + Approve/Reject                         | ML Admin, Admin   |
| `/dashboard/ml-admin/settings`       | Retrain trigger mode toggle                                             | ML Admin, Admin   |
| `/unauthorized`                      | Role-check failure                                                      | —                 |

---

## Pages — Detailed

### Sentinel Overview (`/dashboard/sentinel`)

Server Component. Fetches in parallel: `fetchRiskSummary()`, `fetchAlerts()`,
`fetchQualitySummary()`, `fetchBatches()`, `fetchSpi()`.

Layout (top to bottom):

1. `SentinelKpiStrip` — 5 fleet metric cards
2. `SpiPanel` — Safety Performance Indicators (leading + lagging side by side)
3. `RiskHeatmap` + `AlertTrendChart` + `AlertTimeline` (left column)
4. `ConfidenceGauge` + `DataQualityPanel` (right column)

### SPI Panel (`SpiPanel`)

Shows leading indicators alongside existing lagging metrics:

| Leading                               | Lagging                 |
| ------------------------------------- | ----------------------- |
| Hazard reports this month + sparkline | Incidents (30d)         |
| Avg CAPA closure days                 | High/Critical incidents |
| On-time closure rate (%)              |                         |
| Overdue CAPAs count                   |                         |

Data from `GET /api/analytics/spi`. Renders as empty/grey if the backend returns
null (non-fatal fetch).

### ROI Calculator (`/dashboard/sentinel/roi`)

Client Component (needs `useState` for recalculate interaction).

Layout (top to bottom):

1. Reference case header — amber COURT RECORD badge, Kimeu v KPC citation, gross award (display only)
2. `RoiAssumptionsTable` — editable rows with `ProvenanceBadge` per row; "Recalculate" button
3. `RoiResultDisplay` — EWMA lead time panel (SYNTHETIC badge), breakdown table, main KES figure, disclaimer

`ProvenanceBadge` colour codes:

- `COURT_RECORD` → amber `"COURT RECORD"`
- `ESTIMATE` → blue `"ESTIMATE"`
- `SYNTHETIC` → purple `"SYNTHETIC"`
- `PIPELINE_DATA` → green `"LIVE DATA"`

On mount: auto-calculates with default assumptions. On Recalculate: `POST /api/analytics/roi/calculate`
with current form values.

**Hard constraint enforced in UI:** `gross_award_kes` row is read-only — no input element.

### Hazard Reports (`/dashboard/sentinel/hazards`, `/hazards/[id]`)

**List page** (Server Component): table of all hazard reports with `HazardStatusBadge` and
`RiskRatingBadge`. `HazardReportForm` opens in a shadcn Sheet.

**Status badges:**

- `open` → grey | `risk_assessed` → blue | `linked_to_alert` → orange | `closed` → green

**Risk rating colour bands (`RiskRatingBadge`):**

- 1–4 green Low | 5–9 yellow Medium | 10–14 orange High | 15–25 red Critical

**Detail page** (Server Component + Client `RiskAssessmentForm`):

- Two-column layout: hazard detail card (left) + risk assessment form (right, only if `status='open'`)
- Likelihood and severity use shadcn `Slider` (1–5)
- Live risk rating computed client-side as `likelihood × severity` — colour updates as sliders move
- Orange warning shown when `risk_rating ≥ 10`; red when `≥ 15`
- On submit: `PATCH /api/hazard-reports/{id}/risk-assessment` → toast + `router.refresh()`
- If alert was raised: shows "View linked alert →" link

### CAPAs (`/dashboard/sentinel/capas`, `/capas/[id]`)

**List page** (Server Component): CAPA queue with due-date colouring (red if overdue).
`CapaCreateForm` opens in a shadcn Dialog; technician dropdown populated from
`GET /api/technicians`.

**Detail page** (Client Component — needs live status transitions):

- `CapaStatusStepper` — 5 step circles (open → in_progress → completed → verified → closed)
  with filled/current/pending visual states
- Context-aware action buttons by status:
  - `open` → "Mark In Progress"
  - `in_progress` → evidence URL field + "Mark Completed"
  - `completed` → "Verify"
  - `verified` → "Close CAPA" (green button)
  - `closed` → checkmark message
- On close: `PATCH /api/capas/{id}/status`, toast with CAPA closed + ML feedback info

### My Tasks (`/dashboard/sentinel/my-tasks`)

Client Component (needs JWT cookie for user-scoped fetch). Three sections:
Active Tasks / Awaiting Verification / Completed. Card-only layout (mobile-optimised).
Each card: description, due date, source alert ID, "View / Update" button.

### ML Admin Portal (`/dashboard/ml-admin/**`)

**Layout:** server-side JWT role gate — `decodeRoleFromJwt()` parses the base64
payload; redirects to `/unauthorized` if role not in `["Admin", "ML Admin"]`.

**Overview page:**

- `ChampionCard` (amber border) + `ChallengerCard` or "run a retrain" placeholder
- Challenger banner (orange, only if a challenger exists) with "Review →" link
- Three quick-links: Feedback Queue | Training Runs | Model Registry

**Training Runs page (Client):**

- Table: version, triggered by, rows used, feedback rows, started, status
- "Retrain Now" button: `POST /api/ml/training-run` (demo: creates a placeholder challenger
  record; production: backend would invoke `python -m src.retrain`)
- Spinner animation during retrain

**Feedback Queue (Client):**

- Table sorted by confidence (most uncertain first — lowest `|probability - 0.5|`)
- Confidence band labels: `uncertain` (red) < 0.1 margin | `low` (orange) | `confident` (green)
- Three rating buttons per row: `[👍 Accurate] [👎 Inaccurate] [~ Uncertain]`
- Rated rows show filled coloured button; `POST /api/ml/feedback` on click
- Optimistic UI update — no page reload

**Model Registry (Client):**

- Side-by-side: champion (left, amber border) vs challenger (right)
- Challenger card shows delta vs champion per metric: `▲/▼ ±Npp` coloured green/red
- **Approve & Promote**: shadcn `AlertDialog` with mandatory confirmation copy:
  _"You are promoting {version} to champion. {old_version} will be archived. Live
  predictions will update on the next pipeline run. This cannot be automatically undone."_
- **Reject**: `AlertDialog` with optional notes `Textarea`
- Full version history table below the cards

---

## Role-Aware Navigation (`sidebar-items.ts` + `nav-main.tsx`)

Three `NavGroup`s:

```ts
// Group 1: Dashboards (all roles)
Sentinel → Overview, Alerts, Analytics, ROI Calculator,
           Hazards (all authenticated),
           CAPAs (all authenticated),
           My Tasks (Field Technician only)

// Group 2: Accounts (Admin only)
Users, Roles & Permissions

// Group 3: ML Administration (ML Admin, Admin only)
HITL Portal
```

`NavMainParentItem.subItems` has `roles?: string[]`. In `NavCollapsibleItem`,
sub-items are filtered: `sub.roles` missing → show to everyone; present → only
show if `user.role` is in the list.

`NavGroup.requiredRoles?: string[]` filters entire groups. "ML Administration"
has `requiredRoles: ["Admin", "ML Admin"]`.

Role is read from `useAuthStore((s) => s.user?.role)` (client-side Zustand store).

---

## Authentication & State

### JWT Flow

1. `LoginForm` → `POST /api/auth/login` → `{ token, email, role, name, userId }`
2. Token written as `sentinel-token` cookie (client-side via `cookie.client.ts`)
3. `getAuthToken()` (server action) reads the cookie for Server Component fetches
4. `AuthStore` (Zustand + localStorage persistence) holds `{ user, role, token }`
5. `ML Admin` layout uses `decodeRoleFromJwt()` — parses base64 JWT payload client-free

### Live Refresh

`DashboardAutoRefresh` (mounted in dashboard layout) calls `GET /api/config/etl`
once at mount, then calls `router.refresh()` every `frontendRefreshMs` ms
(default 125,000) — re-runs all Server Component fetches without full page reload.

`SentinelAlertSound` + `AlertSoundToggle` play audio when new Critical/High alerts
arrive (polling via `useSentinelAlerts` at 60s interval).

---

## API Client (`src/lib/sentinel/api.ts`)

All requests use a 15-second `AbortController` timeout. Authenticated endpoints
call `authedOpts()` which reads the JWT cookie via `getAuthToken()`.

### Complete function list

| Function                              | Endpoint                              |
| ------------------------------------- | ------------------------------------- |
| `fetchRiskSummary()`                  | GET /api/sites/risk-summary           |
| `fetchSiteDetail(id)`                 | GET /api/sites/{siteId}               |
| `fetchPredictions()`                  | GET /api/sites/predictions            |
| `fetchSitePrediction(id)`             | GET /api/sites/{siteId}/prediction    |
| `fetchAlerts()`                       | GET /api/alerts                       |
| `acknowledgeAlert(id)`                | POST /api/alerts/{id}/ack             |
| `fetchQualitySummary()`               | GET /api/quality/summary              |
| `fetchBatches()`                      | GET /api/quality/batches              |
| `fetchTelemetrySummary()`             | GET /api/telemetry/summary            |
| `fetchEtlConfig()`                    | GET /api/config/etl                   |
| `loginUser(email, pwd)`               | POST /api/auth/login                  |
| `fetchUsers(token)`                   | GET /api/users                        |
| `fetchRoles(token)`                   | GET /api/users/roles                  |
| `createUser(req, token)`              | POST /api/users                       |
| `updateUserStatus(id, status, token)` | PATCH /api/users/{id}/status          |
| `deleteUser(id, token)`               | DELETE /api/users/{id}                |
| `fetchSurvivalCurves()`               | GET /api/analytics/survival-curves    |
| `fetchPressureCharts()`               | GET /api/analytics/pressure-charts    |
| `fetchCorrelation()`                  | GET /api/analytics/correlation        |
| `fetchFeatureImportance()`            | GET /api/analytics/feature-importance |

Additional functions called inline in page components (no wrapper in api.ts yet):

- `fetchSpi()` — GET /api/analytics/spi
- `fetchRoiReferenceCase()` — GET /api/analytics/roi/reference-cases
- `calculateRoi(input)` — POST /api/analytics/roi/calculate
- `fetchHazards(token)` — GET /api/hazard-reports
- `fetchHazard(id, token)` — GET /api/hazard-reports/{id}
- `fetchCapas(token)` — GET /api/capas
- `fetchMlOverview()` — GET /api/ml/overview
- `fetchModelRegistry()` — GET /api/ml/model-registry
- `fetchTrainingRuns()` — GET /api/ml/training-runs
- `fetchFeedbackQueue()` — GET /api/ml/predictions-for-review
- `promoteModel(id)` — PATCH /api/ml/model-registry/{id}/promote
- `rejectModel(id, notes)` — PATCH /api/ml/model-registry/{id}/reject

---

## Type Inventory (`src/lib/sentinel/types.ts`)

Key types:

```ts
SiteRiskSummary         — riskScore, severityBand, incidentProbability7d, modelRiskBand
Alert                   — id, siteId, severity, status, narrative, narrativeUpdatedAt
SiteDetail              — incidents[], audits[], telemetryReadings[], activeAlerts[]
PredictionDto           — siteId, probability, riskBand, modelVersion, topFeatures
SurvivalCurveData       — fleet_median_days, high_risk_median_days, curves{fleet, high_risk}
ControlChartData        — fleet_avg_lead_time_days, sites{}
CorrelationData         — pearson_r, p_value, scatter_points[]
FeatureImportanceData   — model_version, features[{name, importance, direction}]
// New types:
SpiSummary              — hazardReportsThisMonth, avgCapaClosureDays, pctCapasClosedOnTime,
                          overdueCapas, hazardReportTrend[], incidents30d
RoiReferenceCase        — grossAwardKes, citation, default_assumptions[]
RoiResult               — leadTimeDays, expectedAvoidedCostKes, breakdown{}, disclaimer
ModelRegistryEntry      — version, status, precisionScore, recallScore, f1Score
FeedbackItem            — predictionId, siteId, probability, confidenceBand, existingRating
```

---

## Key Frontend Components

| Component                                 | Location                             | Purpose                                              |
| ----------------------------------------- | ------------------------------------ | ---------------------------------------------------- |
| `SentinelKpiStrip`                        | `sentinel/_components/`              | Fleet KPI cards                                      |
| `SpiPanel`                                | `sentinel/_components/`              | Leading + lagging SPI indicators                     |
| `RiskHeatmap`                             | `sentinel/_components/`              | Leaflet map with 7-site markers                      |
| `AlertFeed` / `FullAlertFeed`             | `sentinel/_components/`              | Alert cards with ack                                 |
| `NarrativeAlertCard`                      | `sentinel/_components/`              | Rich narrative from backend                          |
| `DataQualityPanel`                        | `sentinel/_components/`              | Donut chart + gate badge                             |
| `ModelPredictionCard` + `ConfidenceGauge` | `sentinel/sites/[siteId]/`           | ML output                                            |
| `SurvivalCurveChart`                      | `sentinel/analytics/_components/`    | KM curves                                            |
| `PressureControlChart`                    | `sentinel/analytics/_components/`    | EWMA + UCL/LCL                                       |
| `CorrelationScatterChart`                 | `sentinel/analytics/_components/`    | Rejection × incidents                                |
| `FeatureImportanceBar`                    | `sentinel/analytics/_components/`    | Horizontal bar chart                                 |
| `ProvenanceBadge`                         | `sentinel/roi/_components/`          | COURT RECORD / ESTIMATE / SYNTHETIC / LIVE DATA chip |
| `RoiAssumptionsTable`                     | `sentinel/roi/_components/`          | Editable assumptions with provenance                 |
| `RoiResultDisplay`                        | `sentinel/roi/_components/`          | Lead time + breakdown + KES result + disclaimer      |
| `HazardReportForm`                        | `sentinel/hazards/_components/`      | Sheet-based submission form                          |
| `RiskRatingBadge`                         | `sentinel/hazards/_components/`      | Colour-coded N/25 badge                              |
| `HazardStatusBadge`                       | `sentinel/hazards/_components/`      | open/risk_assessed/linked_to_alert/closed            |
| `RiskAssessmentForm`                      | `sentinel/hazards/[id]/_components/` | Likelihood × severity sliders                        |
| `CapaStatusBadge`                         | `sentinel/capas/_components/`        | open/in_progress/completed/verified/closed           |
| `CapaStatusStepper`                       | `sentinel/capas/_components/`        | 5-step visual progress indicator                     |
| `CapaCreateForm`                          | `sentinel/capas/_components/`        | Dialog with technician selector                      |
| `CorridorHeatmapMap`                      | `components/`                        | Full-screen Leaflet + leaflet-heat                   |

---

## Running the Frontend

```bash
cd sentinel-frontend
npm install
npm run dev        # → http://localhost:3000

# Production build
npm run build && npm start
```

Set `NEXT_PUBLIC_SENTINEL_API_URL=http://localhost:8080` in `.env.local`.

Default logins:

- `admin@sentinel.kpc` / `sentinel@admin` — full access
- `tech@sentinel.kpc` / `sentinel@admin` — Field Technician (My Tasks visible)
- `ml.admin@sentinel.kpc` / `sentinel@admin` — ML Admin portal
