# 16 — Agent 2 Build Plan: Frontend / User Experience

> This document is independently executable. Read it top to bottom without needing any other document.

---

## 1. Mission

Fix the token security issue, add TanStack Query client-side data management, build the Executive Control Plane dashboard and Live Demo pages (Stage 3 Features 6 and 8), add the ROI overfill line, and establish a frontend test baseline with Vitest and Playwright.

---

## 2. Scope

**You own exclusively:**
```
sentinel-frontend/   (ALL files)
```

**You do NOT modify:**
- `sentinel-backend/` — any directory
- `sentinel/` — any directory
- `.github/workflows/` — Agent 4 owns

**Shared coordination:** When Agent 1 deploys a new API endpoint, you consume it. Until it is live, use MSW mock handlers to develop against. Remove the mock once the real endpoint is confirmed working.

---

## 3. Architecture Context

The frontend is Next.js 16 (App Router), React 19, TypeScript 5.9, Tailwind v4, shadcn/ui, Recharts, Leaflet.

**Key patterns to understand:**

- **Server components** (files without `"use client"`) fetch data on the server side using `fetch()` with the JWT read from `cookies()` via `getAuthToken()` from `@/server/server-actions`. These are correct — keep them.
- **Client components** (files with `"use client"`) currently call `fetch()` in `useEffect` and extract the JWT with `document.cookie.match(...)`. This is the security issue you fix.
- **`src/lib/sentinel/api.ts`** — centralised API helper functions used by server components. You extend this file with new API calls.
- **`src/lib/sentinel/types.ts`** — TypeScript types. Add new V4 types here.

---

## 4. Dependencies

| Dependency | Provided by | Required for |
|---|---|---|
| `POST /api/demo/trigger-overfill` live | Agent 1 | Removing MSW mock from demo page |
| `GET /api/executive/summary` live | Agent 1 | Removing MSW mock from executive dashboard |
| `GET /api/event-log` live | Agent 1 | Live event feed on demo page |
| `GET /api/actuation-log` live | Agent 1 | Actuation status badge on demo page |

**Build against MSW mocks first. Do not wait for Agent 1 to ship before starting.**

---

## 5. Ordered Task List

### Phase 0 — Quick Fixes (start immediately, no dependencies)

#### Task 2.0.1 — Fix `package.json` Name

**File:** `sentinel-frontend/package.json`

Change:
```json
"name": "studio-admin"
```
To:
```json
"name": "sentinel-frontend"
```

---

#### Task 2.0.2 — Set Up Vitest + MSW Test Infrastructure

**Install:**
```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
```

**Create `vitest.config.ts`** (root of `sentinel-frontend/`):
```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

**Create `src/test/setup.ts`:**
```typescript
import '@testing-library/jest-dom'
import { server } from './mocks/server'
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

**Create `src/test/mocks/server.ts`:**
```typescript
import { setupServer } from 'msw/node'
import { handlers } from './handlers'
export const server = setupServer(...handlers)
```

**Create `src/test/mocks/handlers.ts`** — one handler per API endpoint used by client components:
```typescript
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/ml/overview', () =>
    HttpResponse.json({
      champion: { id: '1', version: 'logreg_v1', algorithm: 'logistic_regression',
        trainedAt: '2026-09-01T00:00:00Z', precisionScore: 0.619,
        recallScore: 0.677, f1Score: 0.647, status: 'champion' },
      challenger: null,
    })
  ),
  http.post('/api/ml/feedback', () =>
    HttpResponse.json({ id: 'uuid-123', created: true }, { status: 201 })
  ),
  http.get('/api/ml/predictions-for-review', () =>
    HttpResponse.json([
      { predictionId: 1, siteId: 'site-003', probability: 0.82,
        confidenceBand: 'uncertain', asOfDate: '2026-09-13', existingRating: null },
    ])
  ),
  http.post('/api/demo/trigger-overfill', () =>
    HttpResponse.json({
      message: 'Overfill event seeded for site-003',
      alertId: 'alert-uuid', eventId: 'event-uuid',
      actuationId: 'act-uuid', slackSent: true,
    })
  ),
  http.get('/api/executive/summary', () =>
    HttpResponse.json({
      overfillEventsPrevented: 3,
      estimatedLitresSaved: 15000,
      estimatedKesExposureAvoided: 105000000,
      systemUptimePercent: 99.9,
      lastUpdated: '2026-09-13T10:00:00Z',
      period: 'last_30_days',
    })
  ),
]
```

Add to `package.json` scripts:
```json
"test": "vitest run",
"test:watch": "vitest"
```

---

### Phase 1 — Security Fix

#### Task 2.1.1 — Replace `document.cookie.match` with Route Handlers

**Step 1 — Create Route Handler directory:** `src/app/api/proxy/`

**Step 2 — Create one Route Handler per client-side mutation:**

`src/app/api/proxy/ml/feedback/route.ts`:
```typescript
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? ''

export async function POST(req: NextRequest) {
  const token = (await cookies()).get('sentinel-token')?.value
  const body = await req.json()
  const res = await fetch(`${API_BASE}/api/ml/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

Create the same pattern for:
- `src/app/api/proxy/ml/model-registry/[id]/promote/route.ts` (PATCH)
- `src/app/api/proxy/ml/model-registry/[id]/reject/route.ts` (PATCH)
- `src/app/api/proxy/ml/model-registry/[id]/rollback/route.ts` (PATCH)
- `src/app/api/proxy/ml/trigger-retrain/route.ts` (POST)
- `src/app/api/proxy/demo/trigger-overfill/route.ts` (POST)
- `src/app/api/proxy/actuate/close-valve/route.ts` (POST)

**Step 3 — Update client components to call proxy routes:**

In `feedback/page.tsx`, replace:
```typescript
const getToken = () => document.cookie.match(/sentinel-token=([^;]+)/)?.[1]

await fetch(`${API_BASE}/api/ml/feedback`, {
  headers: { Authorization: `Bearer ${getToken()}` },
  ...
})
```
With:
```typescript
await fetch('/api/proxy/ml/feedback', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ predictionId, siteId, rating }),
})
```

Repeat for `registry/page.tsx`, `training-runs/page.tsx`, `retraining-schedule/page.tsx`, and any other client component with `document.cookie.match`.

**Step 4 — Verify:** `grep -r "document.cookie.match" src/` returns zero results.

---

#### Task 2.1.2 — Leaflet Dynamic Import

**File:** `src/app/(main)/dashboard/sentinel/_components/risk-heatmap.tsx`

If the file is a client component (`"use client"`), wrap the inner map with `dynamic`:
```typescript
// In the parent server component or in a client-safe wrapper:
import dynamic from 'next/dynamic'

const LeafletMap = dynamic(
  () => import('./_components/leaflet-map-inner'),
  { ssr: false, loading: () => <div className="h-64 bg-muted rounded-lg animate-pulse" /> }
)
```

Move Leaflet-specific code into `_components/leaflet-map-inner.tsx` (new file). This keeps the `RiskHeatmap` wrapper clean and prevents SSR issues.

---

### Phase 1 — TanStack Query Migration

#### Task 2.1.3 — Install and Configure TanStack Query

```bash
pnpm add @tanstack/react-query
```

**Create `src/providers/query-provider.tsx`:**
```typescript
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,       // 1 minute default
        retry: 1,
      },
    },
  }))
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

**Wrap the app in `src/app/layout.tsx`:**
```typescript
import { QueryProvider } from '@/providers/query-provider'
// ...
<QueryProvider>{children}</QueryProvider>
```

---

#### Task 2.1.4 — Migrate Client ML Admin Pages to TanStack Query

**`feedback/page.tsx`** — replace `useEffect`/fetch with `useQuery`:
```typescript
const { data: predictions = [], refetch } = useQuery({
  queryKey: ['predictions-for-review'],
  queryFn: () => fetch('/api/proxy/ml/predictions-for-review').then(r => r.json()),
  staleTime: 30_000,
})

const rateMutation = useMutation({
  mutationFn: ({ predictionId, siteId, rating }: RateArgs) =>
    fetch('/api/proxy/ml/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId, siteId, rating }),
    }).then(r => r.json()),
  onSuccess: () => {
    toast.success('Rating saved')
    refetch()
  },
})
```

**`registry/page.tsx`** — replace manual `fetch` + `useState` load/reload with:
```typescript
const { data: models = [], refetch } = useQuery({
  queryKey: ['model-registry'],
  queryFn: () => fetch('/api/proxy/ml/model-registry').then(r => r.json()),
})

const promoteMutation = useMutation({
  mutationFn: (id: string) =>
    fetch(`/api/proxy/ml/model-registry/${id}/promote`, { method: 'PATCH' }),
  onSuccess: () => { toast.success('Model promoted'); queryClient.invalidateQueries({ queryKey: ['model-registry'] }) },
})
```

Apply the same pattern to `training-runs/page.tsx` and `retraining-schedule/page.tsx`.

---

### Phase 2 — Stage 3 UI Features

#### Task 2.2.1 — Executive Control Plane Dashboard

**New file:** `src/app/(main)/dashboard/executive/page.tsx`

This is a **server component** — fetches `GET /api/executive/summary` server-side on every navigation.

```typescript
import { getAuthToken } from '@/server/server-actions'
import { ExecutiveKpiCard } from './_components/executive-kpi-card'

const API_BASE = process.env.NEXT_PUBLIC_SENTINEL_API_URL ?? ''

async function fetchExecutiveSummary(token: string | undefined) {
  const res = await fetch(`${API_BASE}/api/executive/summary`, {
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export default async function ExecutiveDashboard() {
  const token = await getAuthToken()
  const summary = await fetchExecutiveSummary(token)

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Control Plane</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Autonomous overfill prevention — operational summary for executive review.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
        <ExecutiveKpiCard
          label="Overfill Events Prevented"
          value={summary.overfillEventsPrevented}
          suffix=""
          description="Auto-triggered simulated shutdowns this period"
        />
        <ExecutiveKpiCard
          label="Estimated Litres Saved"
          value={summary.estimatedLitresSaved.toLocaleString()}
          suffix="L"
          description="Based on 5,000L avg per prevented overfill (estimate)"
        />
        <ExecutiveKpiCard
          label="KES Exposure Avoided"
          value={`KES ${(summary.estimatedKesExposureAvoided / 1_000_000).toFixed(1)}M`}
          suffix=""
          description="At 70% intervention probability (estimate)"
        />
        <ExecutiveKpiCard
          label="System Uptime"
          value={summary.systemUptimePercent.toFixed(1)}
          suffix="%"
          description="Last 30 days"
        />
      </div>

      <p className="text-xs text-muted-foreground border-t pt-3">
        Estimates labelled as such. Litres and KES figures use assumptions from the ROI calculator.
        Actuation uses a simulated actuator — production deployment binds to KPC SCADA interface.
      </p>
    </div>
  )
}
```

**New file:** `src/app/(main)/dashboard/executive/_components/executive-kpi-card.tsx`
```typescript
export function ExecutiveKpiCard({
  label, value, suffix, description
}: { label: string; value: string | number; suffix: string; description: string }) {
  return (
    <div className="rounded-xl border bg-card p-6 flex flex-col gap-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-4xl font-black tabular-nums">
        {value}<span className="text-lg font-normal ml-1">{suffix}</span>
      </p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
```

Add a navigation link in the sidebar: "Control Plane" under the main Sentinel section.

---

#### Task 2.2.2 — Live Demo Page

**New file:** `src/app/(main)/dashboard/demo/page.tsx`

This is a **client component** — it needs real-time polling after the button is pressed.

```typescript
'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type DemoResult = {
  message: string; alertId: string; eventId: string;
  actuationId: string; slackSent: boolean
}

export default function DemoPage() {
  const [triggered, setTriggered] = useState(false)
  const [result, setResult] = useState<DemoResult | null>(null)
  const [loading, setLoading] = useState(false)

  // Poll executive summary every 3s after trigger to show counter update
  const { data: summary } = useQuery({
    queryKey: ['executive-summary-demo'],
    queryFn: () => fetch('/api/executive/summary').then(r => r.json()),
    refetchInterval: triggered ? 3000 : false,
    staleTime: 0,
  })

  const trigger = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/proxy/demo/trigger-overfill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: 'site-003' }),
      })
      const data = await res.json()
      setResult(data)
      setTriggered(true)
      toast.success('Overfill event triggered — watch the feed below')
    } catch {
      toast.error('Demo trigger failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Live Demo</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Simulate a tank overfill event and watch the autonomous response loop execute.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Simulate Overfill at Site X (SITE-003)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Pressing this button injects one seeded telemetry reading — tank_level_pct = 97.2%,
            valve_status = Open — and triggers the full detect → act → notify → report loop.
            A real Slack message will appear in the #sentinel-alerts channel within seconds.
          </p>
          <Button
            size="lg"
            onClick={trigger}
            disabled={loading}
            data-testid="trigger-overfill-btn"
            className="w-full sm:w-auto"
          >
            {loading ? 'Triggering…' : '🚨 Simulate Tank Overfill at Site X'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <div className="flex flex-col gap-3" data-testid="event-feed">
          <EventStep step={1} label="Threshold breach detected"
            detail={`Tank level 97.2% > 95% threshold — valve Open`} done />
          <EventStep step={2} label="Event logged"
            detail={`event_log ref: ${result.eventId}`} done />
          <EventStep step={3} label="Simulated valve closure triggered"
            detail={`actuation_log ref: ACT-${result.actuationId?.slice(0,8).toUpperCase()}`}
            done data-testid="actuation-badge" />
          <EventStep step={4} label="Slack notification sent"
            detail={result.slackSent ? '#sentinel-alerts — message delivered' : 'Webhook not configured'}
            done={result.slackSent} />
          <EventStep step={5} label="Executive dashboard updated"
            detail={`Overfill events prevented: ${summary?.overfillEventsPrevented ?? '—'}`}
            done={!!summary} />
        </div>
      )}
    </div>
  )
}

function EventStep({ step, label, detail, done, ...props }: {
  step: number; label: string; detail: string; done: boolean; [key: string]: any
}) {
  return (
    <div className={`flex items-start gap-3 rounded-lg border p-3 transition-all ${
      done ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20' : 'border-muted'
    }`} {...props}>
      <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
      }`}>{done ? '✓' : step}</div>
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
```

Add navigation link "Live Demo" to the sidebar (visible only to ADMIN and ML_ADMIN roles).

---

#### Task 2.2.3 — ROI Overfill Line

**File:** `src/app/(main)/dashboard/sentinel/roi/_components/roi-assumptions-table.tsx`

The backend now returns an `overfillLitresPerEvent` assumption in the reference-cases response (added by Agent 1). No structural UI change needed — the existing `RoiAssumptionsTable` component already renders any assumption keys returned by the API. The new line will appear automatically once Agent 1's backend change is live.

**Verify:** Load the ROI page and confirm a new "Overfill prevention (estimated)" row appears in the assumptions table.

---

### Phase 3 — Tests

#### Task 2.3.1 — Component Tests

**`src/test/components/ExecutiveDashboard.test.tsx`** (3 tests):
```typescript
test('renders 4 KPI cards', async () => { ... })
test('shows overfill events prevented from mock API', async () => { ... })
test('handles API error gracefully', async () => { ... })
```

**`src/test/components/DemoTriggerButton.test.tsx`** (4 tests):
```typescript
test('button is enabled and correctly labelled', () => { ... })
test('clicking button calls POST /api/proxy/demo/trigger-overfill', async () => { ... })
test('shows event feed steps after trigger', async () => { ... })
test('shows error toast when API returns 500', async () => { ... })
```

**`src/test/components/FeedbackQueue.test.tsx`** (4 tests):
```typescript
test('renders predictions sorted by confidence band', async () => { ... })
test('clicking Accurate sends POST /api/proxy/ml/feedback', async () => { ... })
test('rating state persists in component', async () => { ... })
test('shows empty state when no predictions', async () => { ... })
```

**`src/test/components/ModelRegistry.test.tsx`** (5 tests):
```typescript
test('Approve & Promote button visible only for challenger', async () => { ... })
test('Approve dialog confirms before promoting', async () => { ... })
test('Reject dialog accepts notes', async () => { ... })
test('Rollback button shows for archived models', async () => { ... })
test('delta percentage shown comparing challenger to champion', async () => { ... })
```

#### Task 2.3.2 — Playwright E2E Setup

```bash
pnpm add -D @playwright/test
npx playwright install --with-deps chromium
```

**`tests/e2e/demo-flow.spec.ts`:**
```typescript
import { test, expect } from '@playwright/test'

test('full overfill demo: trigger → event feed shows 5 completed steps', async ({ page }) => {
  await page.goto('/dashboard/demo')
  await expect(page.getByTestId('trigger-overfill-btn')).toBeVisible()
  await page.click('[data-testid="trigger-overfill-btn"]')
  await expect(page.getByTestId('event-feed')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByTestId('actuation-badge')).toContainText('ACT-')
})
```

**`tests/e2e/auth.spec.ts`:**
```typescript
test('unauthenticated user is redirected to login', async ({ page }) => {
  await page.goto('/dashboard/sentinel')
  await expect(page).toHaveURL(/\/auth/)
})
```

---

## 6. API Calls to Add to `src/lib/sentinel/api.ts`

```typescript
export async function fetchExecutiveSummary(): Promise<ExecutiveSummary> { ... }
export async function fetchEventLog(siteId?: string, limit?: number): Promise<EventLogEntry[]> { ... }
export async function fetchActuationLog(siteId?: string, limit?: number): Promise<ActuationLog[]> { ... }
```

**Types to add to `src/lib/sentinel/types.ts`:**
```typescript
export type ExecutiveSummary = {
  overfillEventsPrevented: number
  estimatedLitresSaved: number
  estimatedKesExposureAvoided: number
  systemUptimePercent: number
  lastUpdated: string
  period: string
}

export type EventLogEntry = {
  id: string; siteId: string; tankId: string | null
  signalType: string; severity: string
  value: number | null; threshold: number | null
  alertId: string | null; firedAt: string
}

export type ActuationLog = {
  id: string; eventId: string; siteId: string; tankId: string | null
  action: string; actuator: string; status: string
  latencyMs: number; executedAt: string
}
```

---

## 7. Acceptance Criteria

- [ ] Zero occurrences of `document.cookie.match` in `src/` (`grep -r "document.cookie.match" src/` returns empty).
- [ ] All six proxy Route Handlers exist and work correctly.
- [ ] Executive Control Plane page loads and shows 4 KPI cards without error.
- [ ] Live Demo page "Trigger Overfill" button produces a visible 5-step event feed.
- [ ] TanStack Query installed; `feedback/page.tsx`, `registry/page.tsx`, `training-runs/page.tsx` migrated.
- [ ] `pnpm exec vitest run` — all 16+ component tests pass.
- [ ] `pnpm run build` succeeds with no type errors.
- [ ] `pnpm run check` (Biome) passes.

---

## 8. Known Risks

| Risk | Mitigation |
|---|---|
| Agent 1 endpoints not ready when building demo page | Use MSW handlers (already set up in Task 2.0.2); remove handlers when real endpoints deploy |
| Next.js Route Handler cookies() API changes | Use `next/headers` `cookies()` — stable in Next.js 14+; test against the actual deployed version |
| Leaflet SSR issues after dynamic import | `ssr: false` on the dynamic import prevents SSR entirely; fallback skeleton prevents CLS |
| Playwright tests flaky on CI timing | Use `timeout: 15_000` on assertions that depend on the demo flow completing |

---

## 9. Definition of Done

- All tasks in Sections 5.0–5.3 completed.
- All acceptance criteria in Section 7 pass.
- Branch `agent-2/frontend-v4` is rebased on latest main and all CI checks pass.
- PR description references: P1-05, P2-05, P3-01, P3-05, Stage 3 F6, F8, P2-03.
