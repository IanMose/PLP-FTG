# 03 — V4 Technology Stack Recommendations

> **Principle:** Do not replace what is working. Every proposed change must answer:
> *Why does Sentinel specifically need this?*
> Prefer evolution of the existing stack over substitution.

---

## 1. Decision Summary

| Layer | Current | V4 Decision | Change? |
|---|---|---|---|
| Python runtime | Python 3.11 | Python 3.11 | No change |
| Data pipeline | Pandas + Pandera | Pandas + Pandera | No change |
| ML framework | scikit-learn + joblib | scikit-learn + joblib | No change |
| Survival analysis | lifelines | lifelines | No change |
| DB client (Python) | None (file output) | **psycopg2-binary** | **Add** |
| Warehouse | DuckDB + Parquet | DuckDB + Parquet (local dev only) | Reduced role |
| Backend framework | Spring Boot 3.3.2 | **Spring Boot 3.4.x** | Minor upgrade |
| Backend language | Java 17 | **Java 21 (LTS)** | **Upgrade** |
| Database | PostgreSQL 15 | **PostgreSQL 16** | Minor upgrade |
| Migrations | Flyway | Flyway | No change |
| Auth | Spring Security + JJWT | Spring Security + JJWT | No change |
| Frontend framework | Next.js 16 | Next.js 16 | No change |
| Frontend language | TypeScript 5.9 | TypeScript 5.9 | No change |
| UI library | Tailwind v4 + shadcn | Tailwind v4 + shadcn | No change |
| Charts | Recharts 3.8 | Recharts 3.8 | No change |
| Maps | Leaflet 1.9.4 | Leaflet 1.9.4 | No change |
| Data fetching | Native fetch | Native fetch + **TanStack Query** | **Add** |
| Notification | None (Slack planned) | **Slack Incoming Webhooks** | **Add** |
| Testing (Python) | pytest | pytest | No change |
| Testing (Java) | None | **JUnit 5 + Testcontainers** | **Add** |
| Testing (Frontend) | None | **Vitest + Testing Library** | **Add** |
| Containerization | Docker | Docker | No change |
| CI/CD | GitHub Actions | GitHub Actions + deploy step | Extend |
| Deployment | Render (backend) + Vercel (frontend) | Render + Vercel | No change |
| Monitoring | Actuator `/health` | Actuator + **UptimeRobot** | Minor add |

---

## 2. Changes Recommended for V4

### 2.1 Java 21 (Virtual Threads)

**Current:** Java 17.

**Limitation:** Java 17 is LTS and perfectly functional. However, Java 21 (released Sept 2023, in broad production use by 2025–2026) introduces **Virtual Threads** (Project Loom) which Spring Boot 3.2+ supports natively. For Sentinel's I/O-bound workload (DB queries, Groq API calls, file reads), virtual threads reduce thread-pool pressure at zero code change.

**Why Sentinel needs this:** The Groq LLM call in `NarrativeService` has a 3-second hard timeout and blocks a platform thread. With the Stage 3 addition of Slack webhook calls and actuation endpoint calls, the number of concurrent blocking I/O calls increases. Virtual threads make this safe with no architectural change.

**Migration complexity:** Low. Change `<java.version>17</java.version>` to `21` in `pom.xml`. Enable virtual threads in `application.yml`:
```yaml
spring.threads.virtual.enabled: true
```
No code changes required.

**Recommendation: Upgrade to Java 21 in V4.**

---

### 2.2 Spring Boot 3.4.x

**Current:** Spring Boot 3.3.2.

**Limitation:** 3.3.2 is stable and not end-of-life. 3.4.x (latest patch as of late 2025) includes Actuator improvements, better virtual thread support, and dependency version updates (Hibernate 6.5, Spring Security 6.4).

**Migration complexity:** Very low — patch-level upgrade within the same major/minor branch. Run `mvnw spring-boot:run` and verify tests pass.

**Recommendation: Upgrade to Spring Boot 3.4.x in V4 as part of the Java 21 upgrade.**

---

### 2.3 PostgreSQL 16

**Current:** PostgreSQL 15 (Render managed).

**Limitation:** PostgreSQL 15 is maintained and fully adequate. PostgreSQL 16 adds logical replication improvements and minor query planner improvements that are not material at Sentinel's current data volume.

**Migration complexity:** Minimal — Render supports in-place upgrade via the dashboard for managed databases.

**Recommendation: Upgrade to PostgreSQL 16 when next provisioning the Render database. No urgency; this is a maintenance item.**

---

### 2.4 psycopg2-binary (Python → PostgreSQL Direct Writes)

**Current:** Python writes to JSON files; Spring Boot reads them. No direct DB access from Python.

**Why Sentinel needs this:** The file-based ETL handoff is the single most critical architectural weakness (see `02_SENTINEL_V4_ARCHITECTURE_REVIEW.md §2.1`). Direct PostgreSQL writes from Python remove the race condition, eliminate production failures, and reduce ETL latency from 2 minutes to near-zero.

**psycopg2-binary** is the standard, battle-tested PostgreSQL adapter for Python. It is synchronous, simple, and does not require connection pooling infrastructure at Sentinel's scale.

**Alternative considered:** `asyncpg` (async PostgreSQL driver). Rejected because: (a) the ETL pipeline is synchronous; (b) psycopg2 is simpler for batch inserts; (c) asyncpg adds complexity with no benefit in a single-threaded batch script.

**Alternative considered:** `SQLAlchemy` ORM. Rejected because: the ETL pipeline already uses Pandas DataFrame operations. `psycopg2` with `cursor.executemany()` or `copy_from()` is faster for batch inserts and has no ORM overhead.

**Migration complexity:** Low. Add `psycopg2-binary` to `sentinel/requirements.txt`. Replace file-write logic in `src/load.py` and `src/predict.py` with parameterized `INSERT ... ON CONFLICT DO NOTHING` statements.

**Recommendation: Add psycopg2-binary 2.9.x (pinned) in V4.**

---

### 2.5 TanStack Query (React Query) v5

**Current:** All data fetching via raw `fetch()` calls. No caching, no polling, no retry.

**Why Sentinel needs this:** The Stage 3 alert dashboard must update near-real-time. The ML Admin portal needs predictable refetch behaviour after actions (promote, reject, feedback). Without a data-fetching library, every interaction that modifies data requires manual state invalidation with `useEffect` re-runs.

TanStack Query v5 (stable, widely adopted) provides: automatic background refetch, configurable `staleTime`, `refetchInterval` for polling, optimistic updates, and consistent loading/error state.

**Alternative considered:** SWR (Vercel's data fetching library). TanStack Query is preferred because it has richer cache invalidation, works identically on client and server, and is already a listed dependency in the frontend `package.json` (`@tanstack/react-table` is already installed — same ecosystem).

**Migration complexity:** Medium. Requires wrapping the app in `QueryClientProvider` and migrating client-component `useEffect`/fetch patterns to `useQuery`/`useMutation`. Server components (which use `fetch()` directly) are not affected — only client-side pages.

**Estimated pages to migrate:** 6 client-side pages (feedback queue, registry, training runs, drift, retraining schedule, maintenance).

**Recommendation: Add TanStack Query v5 for client-side data fetching in V4.**

---

### 2.6 JUnit 5 + Testcontainers (Backend Testing)

**Current:** Zero meaningful backend tests. `mvnw verify` passes against H2 with create-drop.

**Why Sentinel needs this:** See `02_SENTINEL_V4_ARCHITECTURE_REVIEW.md §2.6`. Without tests, refactoring alert rules, ML promotion logic, or CAPA state machines is unguarded.

**JUnit 5** is already on the classpath via `spring-boot-starter-test`. No addition needed.

**Testcontainers** (v1.19+) provides a real PostgreSQL container for integration tests. This is critical because: (a) Flyway migrations don't run in H2 mode; (b) H2's PostgreSQL compatibility mode has gaps that mask real query bugs; (c) the duplicate Flyway version fix must be validated against a real Flyway + PostgreSQL run.

**Migration complexity:** Low to add. Add `testcontainers` dependency to `pom.xml`. Write test classes — this is new work, not migration.

**Recommendation: Add Testcontainers 1.19.x for integration tests in V4. Make backend test coverage a CI gate.**

---

### 2.7 Vitest + Testing Library (Frontend Testing)

**Current:** Zero frontend tests.

**Why Sentinel needs this:** The ML Admin Registry page has complex state (promote/reject/rollback with confirmation dialogs, feature importance diff chart). The feedback queue has real-time rating state. Without tests, these are untestable black boxes.

**Vitest** is the natural choice for Next.js/TypeScript projects using Tailwind (same config as Vite, fast, compatible with the existing Biome linter setup). **React Testing Library** provides component-level integration tests without implementation details.

**Playwright** for end-to-end (E2E) tests covers the full promote → champion flow and the live demo button. Playwright is recommended for Stage 3 demo-path validation specifically.

**Migration complexity:** Low to add (new files only, no migration of existing code).

**Recommendation: Add Vitest + Testing Library for component tests; add Playwright for critical E2E paths in V4.**

---

### 2.8 Slack Incoming Webhooks

**Current:** No external alerting integration.

**Why Sentinel needs this:** Explicitly named in Stage 3 rubric. Slack Incoming Webhooks are a no-infrastructure solution — a single HTTPS POST to a webhook URL. No SDK, no library, no account beyond a Slack workspace. Spring Boot's `RestTemplate` or `WebClient` handles the call.

**Alternative considered:** PagerDuty. Rejected — higher setup cost, not free, overkill for a demo + MVP. Slack is faster to prove and more visible.

**Alternative considered:** AWS SNS. Rejected — adds cloud dependency outside the existing Render/Vercel stack.

**Migration complexity:** Near-zero. One new `SlackNotificationService` bean with a single `sendMessage(String text)` method. Add `SLACK_WEBHOOK_URL` environment variable. NarrativeService calls it after generating a narrative for High/Critical alerts.

**Recommendation: Add Slack Incoming Webhook integration in V4 (Stage 3 Feature 4).**

---

### 2.9 UptimeRobot (External Health Monitoring)

**Current:** `GET /actuator/health` endpoint exists but is not externally monitored.

**Why Sentinel needs this:** Stage 3 rubric requires a "live, monitored environment." Render's free tier goes to sleep after inactivity. UptimeRobot free tier pings the health endpoint every 5 minutes, keeps the service warm, and alerts the Slack channel on failure.

**Alternative considered:** GitHub Actions scheduled ping. Also viable, slightly less visible. UptimeRobot requires no repository changes.

**Migration complexity:** Zero code change. Account setup and webhook configuration only.

**Recommendation: Configure UptimeRobot free tier monitoring in V4.**

---

## 3. Changes Explicitly Deferred

| Technology | Reason Not Adopting in V4 |
|---|---|
| Apache Kafka / message broker | Out of proportion to scale. psycopg2 direct writes solve the handoff problem without a broker. |
| Celery / task queue | Python ETL runs as a scheduled script — Celery's async worker overhead adds operational complexity for no gain at current volume. |
| MLflow / model tracking | The three-table custom registry (`model_registry`, `training_run`, `model_feedback`) is sufficient and proven. Introducing MLflow requires a new server. Revisit at V5 when multi-model, multi-experiment tracking becomes necessary. |
| FastAPI Python service | A separate FastAPI service would clean the Python–Java boundary. Deferred because: (a) adds a third deployed service; (b) psycopg2 direct writes achieve the same integration improvement at zero infrastructure cost. Revisit at V5 if Python-side query serving is needed. |
| GraphQL | All current API consumers (Next.js) use REST fetch patterns. No benefit from GraphQL at this scale. |
| Redis cache | Not needed. PostgreSQL query performance is adequate for Sentinel's data volume with proper indexing. |
| Kubernetes / container orchestration | Render handles container orchestration. K8s would add significant operational overhead. |
| SHAP per-prediction explainability | SHAP values per prediction require model scoring at inference time. The current architecture scores predictions in batch; per-prediction SHAP is a V5 feature when serving latency matters. |
| Full Grafana + Prometheus stack | Health check + Slack alerting covers the Stage 3 "monitored" requirement. Grafana is valuable at V5. |
| Elasticsearch | `pg_trgm` and DB full-text search are adequate for Sentinel's incident/audit search volume. |

---

## 4. Final V4 Stack Summary

```
Python Layer:
  Python 3.11, Pandas, Pandera, scikit-learn, lifelines,
  psycopg2-binary 2.9.x (NEW), pytest

Java Backend:
  Java 21 (upgrade), Spring Boot 3.4.x (upgrade),
  PostgreSQL 16, Flyway, Spring Security + JJWT,
  JUnit 5 + Testcontainers (NEW), Lombok, springdoc-openapi

Frontend:
  Next.js 16, React 19, TypeScript 5.9, Tailwind v4, shadcn/ui,
  Recharts, Leaflet, TanStack Query v5 (NEW),
  Vitest + React Testing Library (NEW), Playwright (NEW), Biome

Integrations:
  Slack Incoming Webhooks (NEW), UptimeRobot (NEW)

Infrastructure:
  Docker, GitHub Actions (extended), Render (backend + DB), Vercel (frontend)
```
