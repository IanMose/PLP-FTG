# Sentinel Frontend Sitemap

## Overview

The Sentinel frontend is a Next.js 16 application using the App Router. Routes are organized using route groups (parentheses folders) for layout organization without affecting URLs.

---

## Route Structure

```
sentinel-frontend/src/app/
├── (external)/                    # Public landing pages (no sidebar)
│   └── page.tsx                   # Landing page → redirects to /auth/v2/login
│
├── (main)/                        # Main authenticated app shell
│   ├── auth/                      # Authentication routes
│   │   ├── _components/           # Shared auth components
│   │   │   └── login-form.tsx
│   │   └── v2/
│   │       ├── layout.tsx         # Auth layout (centered card)
│   │       ├── login/
│   │       │   └── page.tsx       # /auth/v2/login
│   │       └── register/
│   │           └── page.tsx       # /auth/v2/register
│   │
│   ├── unauthorized/
│   │   └── page.tsx               # /unauthorized (403 page)
│   │
│   └── dashboard/                 # Main dashboard (with sidebar)
│       ├── layout.tsx             # Dashboard shell with sidebar
│       ├── page.tsx               # /dashboard (redirect to sentinel)
│       └── [...see below]
│
├── api/                           # API route handlers
│   └── proxy/                     # Backend proxy routes
│       └── [...see API section]
│
├── layout.tsx                     # Root layout
├── not-found.tsx                  # 404 page
└── globals.css                    # Global styles
```

---

## Dashboard Routes

### Main Dashboard
| Route | Page | Description |
|-------|------|-------------|
| `/dashboard` | page.tsx | Redirects to `/dashboard/sentinel` |

---

### Sentinel Module (Core HSE)
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/sentinel` | page.tsx | Main sentinel overview | Yes |
| `/dashboard/sentinel/sites` | page.tsx | Site/station list | Yes |
| `/dashboard/sentinel/sites/[siteId]` | page.tsx | Site detail with risk breakdown | Yes |
| `/dashboard/sentinel/alerts` | page.tsx | Alert management | Yes |
| `/dashboard/sentinel/hazards` | page.tsx | Hazard reports list | Yes |
| `/dashboard/sentinel/hazards/[id]` | page.tsx | Hazard detail | Yes |
| `/dashboard/sentinel/hazards/new` | page.tsx | Create hazard report | Yes |
| `/dashboard/sentinel/capas` | page.tsx | CAPA list | Yes |
| `/dashboard/sentinel/capas/[id]` | page.tsx | CAPA detail | Yes |
| `/dashboard/sentinel/capas/new` | page.tsx | Create CAPA | HSE+ |
| `/dashboard/sentinel/my-tasks` | page.tsx | User's assigned tasks | Yes |
| `/dashboard/sentinel/analytics` | page.tsx | Analytics dashboard | Yes |
| `/dashboard/sentinel/roi` | page.tsx | ROI calculator | Yes |

---

### Control Plane (V4)
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/control-plane` | layout.tsx | Control plane shell | No |
| `/dashboard/control-plane/tanks` | page.tsx | Live tank telemetry grid | No |
| `/dashboard/control-plane/interlocks` | page.tsx | Interlock rules management | No |
| `/dashboard/control-plane/audit-log` | page.tsx | Actuation audit trail | No |
| `/dashboard/control-plane/demo` | page.tsx | Demo trigger controls | No |

---

### Executive Dashboard
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/executive` | page.tsx | Board-level KPIs | No |

---

### ML Admin
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/ml-admin` | page.tsx | ML overview dashboard | ML_ADMIN |
| `/dashboard/ml-admin/registry` | page.tsx | Model registry (promote/reject) | ML_ADMIN |
| `/dashboard/ml-admin/training-runs` | page.tsx | Training run history | ML_ADMIN |
| `/dashboard/ml-admin/feedback` | page.tsx | Human-in-the-loop feedback | ML_ADMIN |
| `/dashboard/ml-admin/drift` | page.tsx | Drift detection status | ML_ADMIN |
| `/dashboard/ml-admin/retraining-schedule` | page.tsx | Retraining schedule config | ML_ADMIN |

---

### Maintenance
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/maintenance/work-orders` | page.tsx | Work order list | Yes |
| `/dashboard/maintenance/work-orders/[id]` | page.tsx | Work order detail | Yes |
| `/dashboard/maintenance/history` | page.tsx | Maintenance history | Yes |

---

### Workforce
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/workforce/technicians` | page.tsx | Technician roster | HSE+ |
| `/dashboard/workforce/qualifications` | page.tsx | Qualification tracking | HSE+ |

---

### Administration
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/users` | page.tsx | User management | ADMIN |
| `/dashboard/roles` | page.tsx | Role management | ADMIN |
| `/dashboard/alerts` | page.tsx | System alerts | Yes |

---

### Field Operations
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/field` | page.tsx | Field technician view | FIELD_TECHNICIAN |

---

### Demo
| Route | Page | Description | Auth Required |
|-------|------|-------------|---------------|
| `/dashboard/demo` | page.tsx | Demo page for testing | No |

---

## API Proxy Routes

All API calls from the frontend go through `/api/proxy/*` routes to handle authentication tokens server-side (security fix - no `document.cookie.match()` on client).

### Proxy Route Structure

```
/api/proxy/
├── actuate/
│   └── close-valve/route.ts       # POST valve close command
├── actuation-log/route.ts         # GET actuation history
├── capas/
│   ├── route.ts                   # GET/POST capas
│   └── [id]/
│       └── status/route.ts        # PATCH capa status
├── control-room/
│   ├── scenarios/route.ts         # GET scenarios
│   └── run/[scenarioId]/route.ts  # POST run scenario
├── demo/
│   └── trigger-overfill/route.ts  # POST trigger demo event
├── executive/
│   └── summary/route.ts           # GET executive KPIs
├── hazard-reports/route.ts        # GET/POST hazard reports
├── hazards/
│   ├── route.ts                   # GET hazards
│   └── [id]/
│       └── risk-assessment/route.ts # POST risk assessment
├── interlock/
│   └── rules/
│       ├── route.ts               # GET all rules
│       └── [siteId]/[ruleType]/route.ts # GET/PATCH site rules
├── ml/
│   ├── drift/route.ts             # GET drift status
│   ├── feedback/route.ts          # GET/POST feedback
│   ├── model-registry/
│   │   ├── route.ts               # GET models
│   │   └── [id]/
│   │       ├── promote/route.ts   # POST promote model
│   │       ├── reject/route.ts    # POST reject model
│   │       └── rollback/route.ts  # POST rollback model
│   ├── overview/route.ts          # GET ML overview
│   ├── retraining-schedule/route.ts # GET/POST schedule
│   ├── training-runs/route.ts     # GET training runs
│   └── trigger-retrain/route.ts   # POST trigger retrain
├── tank-telemetry/
│   └── live/route.ts              # GET live telemetry
└── technicians/route.ts           # GET/POST technicians
```

---

## Visual Sitemap

```
                                    ┌─────────────────┐
                                    │   Landing (/)   │
                                    │   → Redirect    │
                                    └────────┬────────┘
                                             │
                                             ▼
                              ┌──────────────────────────┐
                              │    /auth/v2/login        │
                              │    Authentication        │
                              └──────────────┬───────────┘
                                             │
                         ┌───────────────────┼───────────────────┐
                         │                   │                   │
                         ▼                   ▼                   ▼
              ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
              │  /dashboard      │ │  /unauthorized   │ │  /auth/v2/       │
              │  Main Dashboard  │ │  403 Page        │ │  register        │
              └────────┬─────────┘ └──────────────────┘ └──────────────────┘
                       │
    ┌──────────────────┼──────────────────┬──────────────────┐
    │                  │                  │                  │
    ▼                  ▼                  ▼                  ▼
┌────────┐      ┌────────────┐     ┌───────────┐      ┌──────────┐
│Sentinel│      │Control     │     │Executive  │      │ML Admin  │
│Module  │      │Plane       │     │Dashboard  │      │          │
├────────┤      ├────────────┤     └───────────┘      ├──────────┤
│• sites │      │• tanks     │                        │• registry│
│• alerts│      │• interlocks│                        │• training│
│• hazards│     │• audit-log │                        │• feedback│
│• capas │      │• demo      │                        │• drift   │
│• my-tasks│    └────────────┘                        │• schedule│
│• analytics│                                          └──────────┘
│• roi   │
└────────┘

    ┌──────────────────┬──────────────────┬──────────────────┐
    │                  │                  │                  │
    ▼                  ▼                  ▼                  ▼
┌────────────┐  ┌────────────┐     ┌──────────┐       ┌──────────┐
│Maintenance │  │Workforce   │     │Users     │       │Field     │
├────────────┤  ├────────────┤     │(Admin)   │       │(Tech)    │
│• work-orders│ │• technicians│    ├──────────┤       └──────────┘
│• history   │  │• qualifications│ │• roles   │
└────────────┘  └────────────┘     └──────────┘
```

---

## Navigation Structure

### Primary Sidebar Navigation

```
OVERVIEW
├── Dashboard (/dashboard/sentinel)
├── Executive (/dashboard/executive)

OPERATIONS
├── Sentinel
│   ├── Sites (/dashboard/sentinel/sites)
│   ├── Alerts (/dashboard/sentinel/alerts)
│   ├── Hazards (/dashboard/sentinel/hazards)
│   ├── CAPAs (/dashboard/sentinel/capas)
│   └── My Tasks (/dashboard/sentinel/my-tasks)
│
├── Control Plane
│   ├── Tank Telemetry (/dashboard/control-plane/tanks)
│   ├── Interlocks (/dashboard/control-plane/interlocks)
│   ├── Audit Log (/dashboard/control-plane/audit-log)
│   └── Demo (/dashboard/control-plane/demo)
│
└── Maintenance
    ├── Work Orders (/dashboard/maintenance/work-orders)
    └── History (/dashboard/maintenance/history)

ANALYTICS
├── Analytics (/dashboard/sentinel/analytics)
└── ROI Calculator (/dashboard/sentinel/roi)

WORKFORCE
├── Technicians (/dashboard/workforce/technicians)
└── Qualifications (/dashboard/workforce/qualifications)

ML ADMIN (requires ML_ADMIN role)
├── Overview (/dashboard/ml-admin)
├── Model Registry (/dashboard/ml-admin/registry)
├── Training Runs (/dashboard/ml-admin/training-runs)
├── Feedback Queue (/dashboard/ml-admin/feedback)
├── Drift Detection (/dashboard/ml-admin/drift)
└── Retraining Schedule (/dashboard/ml-admin/retraining-schedule)

ADMIN (requires ADMIN role)
├── Users (/dashboard/users)
└── Roles (/dashboard/roles)
```

---

## Access Control Matrix

| Route Group | PUBLIC | USER | HSE_MANAGER | ADMIN | ML_ADMIN |
|-------------|--------|------|-------------|-------|----------|
| `/auth/*` | Y | Y | Y | Y | Y |
| `/dashboard/sentinel/*` | - | R | RW | RW | R |
| `/dashboard/control-plane/*` | Y | Y | Y | Y | Y |
| `/dashboard/executive` | Y | Y | Y | Y | Y |
| `/dashboard/maintenance/*` | - | R | RW | RW | - |
| `/dashboard/workforce/*` | - | - | R | RW | - |
| `/dashboard/ml-admin/*` | - | - | - | RW | RW |
| `/dashboard/users/*` | - | - | - | RW | - |
| `/dashboard/roles/*` | - | - | - | RW | - |

*R = Read, W = Write, RW = Read + Write, Y = Yes, - = No Access*

---

## Page Components & Features

### Dashboard Pages

| Page | Key Components | Data Source |
|------|----------------|-------------|
| Sentinel Overview | RiskHeatmap, AlertFeed, SiteTable | cachedFetchRiskSummary |
| Site Detail | RiskBreakdown, WhatIfSlider, TelemetryChart | fetchSiteDetail |
| Hazards List | HazardTable, FilterPanel | fetchHazards |
| CAPA Detail | CapaTimeline, WorkOrderLink | fetchCapa |
| Executive | KpiCards, EventFeed, ThangeSummary | useExecutiveSummaryV5 |
| Tank Telemetry | TankCard grid, TankLevelGauge | useTankTelemetry |
| ML Registry | ModelTable, PromoteButton, RejectButton | useModelRegistry |
| Drift Detection | DriftChart, TrendLine | useDriftSummary |

### Common Components

| Component | Location | Purpose |
|-----------|----------|---------|
| AppSidebar | `_components/sidebar/` | Main navigation |
| NotificationBell | `_components/sidebar/` | Alert notifications |
| SearchDialog | `_components/sidebar/` | Global search |
| BackendError | `components/` | Error state display |
| QueryProvider | `providers/` | TanStack Query context |

---

## URL Parameters & Query Strings

### Dynamic Routes

| Route Pattern | Parameter | Example |
|--------------|-----------|---------|
| `/sentinel/sites/[siteId]` | siteId | `/sentinel/sites/SITE-001` |
| `/sentinel/hazards/[id]` | id | `/sentinel/hazards/HAZ-123` |
| `/sentinel/capas/[id]` | id | `/sentinel/capas/CAPA-456` |
| `/ml-admin/registry/[id]/*` | id | `/ml-admin/registry/MODEL-789/promote` |

### Query Parameters

| Route | Parameter | Purpose |
|-------|-----------|---------|
| `/control-plane/interlocks` | `?site=SITE-001` | Filter by site |
| `/sentinel/hazards` | `?status=open` | Filter by status |
| `/maintenance/work-orders` | `?technicianId=5` | Filter by assignee |

---

## Theming

The frontend supports multiple themes via CSS variables:

| Theme | CSS File | Description |
|-------|----------|-------------|
| Default | `globals.css` | Standard light/dark |
| Tangerine | `tangerine.css` | Warm orange accent |
| Soft Pop | `soft-pop.css` | Pastel colors |
| Brutalist | `brutalist.css` | High contrast |

Theme selection is stored in user preferences (cookie/localStorage).

---

*Document Version: 1.0*  
*Last Updated: September 2026*  
*Maintainer: Sentinel Development Team*
