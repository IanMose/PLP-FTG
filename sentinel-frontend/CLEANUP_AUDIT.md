# Frontend Cleanup Audit

> Review date: 27 July 2026  
> Scope: `sentinel-frontend/src`  
> Purpose: Identify dead code, orphaned routes, noisy comments, and consolidation candidates before making any changes.

---

## Active Routes (Keep)

Everything under these paths is live and connected to the running app.

| Path | Description |
|---|---|
| `app/(main)/auth/v2/login/` | Active login page |
| `app/(main)/auth/v2/register/` | Active register page |
| `app/(main)/auth/v2/layout.tsx` | Split-panel auth layout |
| `app/(main)/unauthorized/` | Referenced by auth flow |
| `app/not-found.tsx` | Global 404 |
| `dashboard/sentinel/` | Main sentinel dashboard |
| `dashboard/sentinel/alerts/` | Sentinel sub-route |
| `dashboard/sentinel/sites/[siteId]/` | Site detail sub-route |
| `dashboard/alerts/` | Alerts dashboard |
| `dashboard/sites/` | Sites dashboard (renamed from logistics) |
| `dashboard/users/` | User management |
| `dashboard/roles/` | Roles & permissions |
| `dashboard/[...not-found]/` | Catch-all 404 within dashboard |
| `components/ui/` | Full UI primitives set — broadly used |
| `lib/sentinel/api.ts` | Backend API wrappers |
| `lib/sentinel/types.ts` | Shared types |
| `lib/sentinel/auth-types.ts` | Auth types |
| `lib/sentinel/sentinel-data.ts` | Mock data |
| `lib/utils.ts` | `cn`, `getInitials` helpers |
| `lib/preferences/` | Theme/layout preferences system |
| `lib/fonts/registry.ts` | Font registry |
| `lib/cookie.client.ts` | Cookie helpers |
| `lib/local-storage.client.ts` | LocalStorage helpers |
| `stores/auth/auth-store.ts` | Zustand auth store |
| `navigation/sidebar/sidebar-items.ts` | Sidebar nav config |

---

## Stage 1 — Orphaned Route Folders

These folders have no sidebar nav item, no inbound link from any live page, and no imports from active code. Safe to delete in full.

| Folder | Reason |
|---|---|
| `app/(main)/auth/v1/` | App only redirects to v2. Both v1 login and register are unreachable. |
| `app/(main)/dashboard/(legacy)/analytics-v1/` | Legacy template dashboard, no links anywhere |
| `app/(main)/dashboard/(legacy)/crm-v1/` | Legacy template dashboard, no links anywhere |
| `app/(main)/dashboard/(legacy)/default-v1/` | Legacy template dashboard, no links anywhere |
| `app/(main)/dashboard/(legacy)/finance-v1/` | Legacy template dashboard, no links anywhere |
| `dashboard/academy/` | No nav item, no imports |
| `dashboard/analytics/` | No nav item, no imports |
| `dashboard/calendar/` | No nav item, no imports |
| `dashboard/chat/` | Iframe preview page — not wired to sidebar |
| `dashboard/coming-soon/` | No nav item, no imports |
| `dashboard/crm/` | No nav item, no imports |
| `dashboard/default/` | No nav item, no imports |
| `dashboard/ecommerce/` | No nav item, no imports |
| `dashboard/infrastructure/` | No nav item, no imports |
| `dashboard/invoice/` | No nav item, no imports |
| `dashboard/kanban/` | No nav item, no imports |
| `dashboard/mail/` | Iframe preview page — not wired to sidebar |
| `dashboard/productivity/` | No nav item, no imports |
| `dashboard/tasks/` | No nav item, no imports |

Total: **19 route trees** to remove.

---

## Stage 2 — Orphaned Components and Files

These files live inside live-route folders but are never imported or rendered anywhere.

### Sidebar components
| File | Issue |
|---|---|
| `sidebar/sidebar-support-card.tsx` | Exported `SidebarSupportCard` but never imported in `app-sidebar.tsx` or anywhere else |
| `sidebar/nav-documents.tsx` | Import is commented out in `app-sidebar.tsx` — never rendered |
| `sidebar/nav-secondary.tsx` | Same — commented out and never rendered |
| `sidebar/account-switcher.tsx` | `AccountSwitcher` never imported anywhere in the app |

### Finance widgets inside `dashboard/alerts/_components/`
These are template leftovers — finance/wallet widgets completely unrelated to Sentinel alerts.

| File |
|---|
| `balance-distribution-card.tsx` |
| `finance-notification.tsx` |
| `income-breakdown.tsx` |
| `overview-kpis.tsx` |
| `quick-actions.tsx` |
| `transactions-overview-card.tsx` |
| `upcoming-transactions.tsx` |
| `wallet.tsx` |

### Other orphaned files
| File | Issue |
|---|---|
| `src/data/users.ts` | Static users array — never imported anywhere in the app |
| `stores/auth/auth-provider.tsx` | Re-exports `useAuthStore` but adds nothing — app uses `auth-store.ts` directly. Imports `createContext`, `useContext`, `useRef`, `useStore` — none are used. |
| `src/proxy.disabled.ts` | Intentionally disabled middleware with boilerplate example comments. Not active. |

---

## Stage 3 — Unused Imports in Live Files

| File | Unused imports |
|---|---|
| `app-sidebar.tsx` | `CircleHelp`, `ClipboardList`, `Database`, `File`, `Search`, `Settings` from lucide-react — used only in a `_data` object that feeds the commented-out `NavDocuments` and `NavSecondary` components |
| `sentinel-kpi-strip.tsx` | `FileWarning`, `Zap` from lucide-react — never appear in any JSX |

---

## Stage 4 — Comments to Humanise or Remove

### `lib/sentinel/api.ts`
Decorative ASCII dividers repeat throughout the file:
```ts
// ─── Risk ────────────────────────────────────────
// ─── Alerts ──────────────────────────────────────
// ─── Data Quality ────────────────────────────────
// ─── Telemetry ───────────────────────────────────
// ─── Auth ────────────────────────────────────────
// ─── User Management ─────────────────────────────
```
The grouping is clear from the function names. Replace with plain `// Risk` or remove.

Top-level JSDoc block describes what reading the first 10 lines already tells you. Trim to one sentence or remove.

### `lib/sentinel/sentinel-data.ts`
Same ASCII divider pattern repeated for every mock section. Same fix applies.

### `stores/auth/auth-store.ts`
JSDoc explains what `zustand/persist` with `name: "sentinel-auth"` already communicates. Remove or shorten.

### `components/sentinel-logo.tsx` and `components/ftg-logo.tsx`
JSDoc on 5–6 line components that restate what the component name and `src` attribute already say. Remove.

### `auth/v2/login/page.tsx`
Structural JSX comments that label sections obvious from the surrounding code:
```tsx
{/* Brand header — pinned top-left */}
{/* Login form — vertically centered */}
{/* Developer company footnote */}
```
Remove all three.

### `sentinel/_components/confidence-gauge.tsx`
JSDoc above a private `GaugeSvg` helper that fully explains what the component name and props already communicate. Remove.

### `sentinel/_components/data-quality-panel.tsx`
```tsx
{/* Distribution bar */}
{/* Recent batches */}
```
Both label sections that have `<h4>` headings directly below them. Remove.

### `proxy.disabled.ts`
Boilerplate example comments in an intentionally disabled file. Remove the examples, keep only the enable instruction.

---

## Stage 5 — Duplicate Components (Consolidation Candidates)

### Two `AlertTrendChart` components
| File | Type |
|---|---|
| `sentinel/_components/alert-trend-chart.tsx` | Data-driven — accepts `alerts: Alert[]`, derives chart data dynamically |
| `alerts/_components/alert-trend-chart.tsx` | Static — hardcoded dates (Jul 16–22), no props |

Both render an identical `LineChart` with the same config. Consolidate into one shared component using the data-driven version, remove the static one.

### Two `AlertTimeline` components
| File | Notes |
|---|---|
| `sentinel/_components/alert-timeline.tsx` | Full detail — severity dots, status badge, rule text. Accepts `alerts: Alert[]`. |
| `alerts/_components/alert-timeline.tsx` | Simplified — no badge, no rule text. Accepts `alerts: Alert[]`. |

Same vertical timeline structure, same `severityIcons` mapping, ~90% identical code. Consolidate into one component with a prop controlling detail level.

---

## Dead API Exports (`lib/sentinel/api.ts`)

These functions are exported but have no call sites anywhere in the frontend. They are likely planned features — recommend keeping them but clearly marking them as not yet wired up rather than deleting.

| Function | Status |
|---|---|
| `acknowledgeAlert(id)` | No call site — alert table has no ack action |
| `fetchTelemetrySummary()` | No call site — `TelemetrySummary` type and mock only exist for this |
| `updateUserStatus(id, status, token)` | No call site — users table has no status toggle |
| `deleteUser(id, token)` | No call site — users table has no delete action |
| `fetchRoles(token)` | No call site — roles page uses local static `data.ts` |

---

## Minor Notes

- `dashboard/page.tsx` renders nothing (`return;`). Not breaking, but a redirect to `/dashboard/sentinel` would be cleaner.
- `lib/utils.ts` exports `formatCurrency` — only used by orphaned route components. Once Stage 1 is done, this export becomes unused too.
- `components/date-range-picker.tsx` — no usages found in any live route.

---

## Cleanup Stages Summary

| Stage | Action | Risk |
|---|---|---|
| 1 | Delete 19 orphaned route folders | Low — no live references |
| 2 | Delete 15 orphaned component/data files | Low — no live imports |
| 3 | Remove unused imports in 2 live files | Low — compile-safe |
| 4 | Humanise and reduce comments in live files | None — no logic changes |
| 5 | Consolidate duplicate alert chart and timeline pairs | Medium — touches live components |
