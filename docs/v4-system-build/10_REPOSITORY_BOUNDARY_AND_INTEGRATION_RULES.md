# 10 — Repository Boundary and Integration Rules

---

## 1. Directory Ownership Map

```
PLP-FTG/
├── sentinel/                          ── Agent 3 (Python ETL + ML)
│   ├── src/                           ── Agent 3
│   ├── tests/                         ── Agent 3
│   ├── requirements.txt               ── Agent 3
│   ├── run_live.sh                    ── Agent 3
│   └── data/                          ── Agent 3
│
├── sentinel-backend/
│   ├── src/main/java/com/sentinel/    ── Agent 1 (business logic)
│   ├── src/main/resources/
│   │   ├── application.yml            ── SHARED (Agent 4 structure; Agent 1 jwt+cors blocks)
│   │   ├── application-render.yml     ── Agent 4
│   │   ├── application-postgres.yml   ── Agent 4
│   │   └── db/migration/              ── Agent 4 (all Flyway SQL files)
│   ├── src/test/                      ── SHARED (Agent 4 base infra; Agent 1 test classes)
│   ├── pom.xml                        ── Agent 4
│   ├── Dockerfile                     ── Agent 4
│   ├── render.yaml                    ── Agent 4
│   └── nixpacks.toml                  ── Agent 4
│
├── sentinel-frontend/                 ── Agent 2 (all files)
│   ├── src/
│   ├── package.json
│   └── ...
│
├── .github/
│   └── workflows/                     ── Agent 4 (all CI/CD files)
│
├── docs/v4-system-build/              ── READ ONLY during V4 build
├── render.yaml                        ── Agent 4
├── requirements.txt                   ── Agent 3
└── .gitignore                         ── Agent 4 (adds .env.local, sentinel/.env)
```

---

## 2. Shared File Rules

### 2.1 `application.yml`

**Owners:** Agent 4 (file structure, datasource, flyway, h2, server, management) and Agent 1 (sentinel.jwt, sentinel.cors blocks).

**Rule:** Each agent edits only its designated YAML block. Conflicts are resolved by Agent 4 as the merge authority.

**Designated blocks:**
```yaml
# Agent 1 owns:
sentinel:
  cors:
    allowed-origins: ...
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
  llm:
    ...

# Agent 4 owns: everything else
spring:
  ...
server:
  ...
management:
  ...
sentinel:
  etl:
    ...
```

### 2.2 `src/test/java/`

**Rule:** Agent 4 creates the base Testcontainers configuration class (`AbstractIntegrationTest.java`). Agent 1 creates business logic test classes that extend it. Both agents commit to different files — no conflict expected.

```
src/test/java/com/sentinel/
├── AbstractIntegrationTest.java     ← Agent 4 creates this
├── alert/
│   └── AlertRulesEngineTest.java    ← Agent 1 creates this
├── risk/
│   └── RiskServiceTest.java         ← Agent 1 creates this
└── ml/
    └── DriftDetectionServiceTest.java  ← Agent 1 creates this
```

### 2.3 `sentinel-frontend/src/lib/sentinel/api.ts`

**Owner:** Agent 2.

**Rule:** Agent 2 is the sole modifier of this file. Agents 1 and 4 do not touch it. When Agent 1 adds a new backend endpoint, Agent 1 documents it in `11_V4_API_CONTRACTS.md`; Agent 2 adds the corresponding frontend call.

### 2.4 `ci.yml`

**Owner:** Agent 4.

**Rule:** Only Agent 4 commits to `.github/workflows/ci.yml`. If Agents 1, 2, or 3 need CI changes (e.g., a new test command), they raise a pull request comment on Agent 4's open branch. Agent 4 incorporates them into the next CI commit.

---

## 3. API Contract Rules

### 3.1 Contract-First Development

Before Agent 1 implements a new endpoint, the contract must be documented in `11_V4_API_CONTRACTS.md`. Agent 2 builds frontend components against the contract (with MSW mocks). Agent 3 builds Python calls against the contract.

**Protocol:**
1. Agent 1 documents the endpoint contract in `11_V4_API_CONTRACTS.md` (PR to main).
2. Agent 2 adds a MSW mock handler matching the contract.
3. Agent 2 builds the UI component against the mock.
4. Agent 1 implements and deploys the real endpoint.
5. Agent 2 removes the mock and verifies against the real endpoint.

### 3.2 Breaking Change Rule

Any change to an existing endpoint's request/response shape must be announced in a PR comment on all open Agent branches before merging. Changes to paths, required fields, or HTTP method are breaking changes. Adding optional fields is non-breaking.

### 3.3 Versioning

All endpoints are unversioned (`/api/...`) for V4. The system is small enough that coordinated changes are safe. V5 may introduce `/api/v2/` if breaking changes are unavoidable.

---

## 4. Database Migration Rules

### 4.1 Single Owner

Agent 4 is the sole author of all Flyway migration files in `sentinel-backend/src/main/resources/db/migration/`. No other agent commits SQL migration files.

### 4.2 Migration Request Protocol

When Agent 1 or Agent 3 needs a new table or column:
1. They open a PR or issue describing the required schema change.
2. Agent 4 writes the migration file (`V{N}__description.sql`).
3. Agent 4 merges the migration to `main` before the requesting agent can merge entity code that depends on it.

### 4.3 Migration Naming Convention

```
V{major}.{minor}__{snake_case_description}.sql
```

Examples:
- `V22__fact_tank_telemetry.sql`
- `V23__event_log.sql`
- No spaces, no uppercase, no special characters beyond underscores.

### 4.4 Never Edit an Applied Migration

Once a migration has been applied to any environment (dev, staging, production), its content must not be changed. Create a new migration to correct mistakes.

### 4.5 Migration Validation Gate

Agent 4's CI step runs `mvnw flyway:validate` against a Testcontainers PostgreSQL instance. No migration PR can merge without this passing.

---

## 5. Git Branch Strategy

### 5.1 Branch Names

```
agent-1/core-backend         ← Agent 1 primary branch
agent-1/ml-api               ← Agent 1 secondary (ML endpoints)
agent-2/frontend-v4          ← Agent 2 primary branch
agent-3/python-etl-v4        ← Agent 3 primary branch
agent-4/infra-migrations     ← Agent 4 primary branch
```

### 5.2 Merge Order

Merges to `main` follow this order to prevent blocked dependencies:

```
Phase 0:
  agent-4/infra-migrations   → main  (P0 fixes: Flyway rename, JWT, migrations V22–V26)

Phase 1 (parallel, merge when ready):
  agent-1/core-backend       → main  (after Phase 0)
  agent-3/python-etl-v4      → main  (after Phase 0)
  agent-2/frontend-v4        → main  (can start in parallel; mocks until Agent 1 ready)

Phase 2 (integration):
  All branches rebased on main
  Integration testing
  Final merges
```

### 5.3 Commit Convention

```
type(scope): description

type:   feat | fix | refactor | test | chore | docs
scope:  backend | frontend | python | infra | db | ml
```

Examples:
```
feat(backend): add POST /api/actuate/close-valve endpoint
fix(db): rename V14/V15 duplicate Flyway migrations
feat(python): implement src/retrain.py challenger training
chore(infra): upgrade pom.xml to Java 21 + Spring Boot 3.4
```

### 5.4 Pull Request Requirements

Every PR to `main` must:
1. Pass all CI checks (linting, tests, build).
2. Reference the debt item ID (e.g., "Closes P0-02") in the PR description.
3. Not introduce new `document.cookie.match` patterns (Agent 2 rule).
4. Not commit secrets or API key values (all agents).
5. Not modify Flyway migration files previously applied to production (all agents).

---

## 6. Conflict Resolution Rules

### 6.1 `application.yml` Conflict

If Agents 1 and 4 both modify `application.yml`:
- Agent 4 rebases on Agent 1's branch (since Agent 4 merges last).
- Agent 4 preserves Agent 1's `sentinel.jwt` and `sentinel.cors` blocks verbatim.
- Agent 4 applies its own structural changes around them.

### 6.2 `api.ts` vs New Backend Endpoint

If Agent 1 deploys an endpoint before Agent 2 adds it to `api.ts`:
- Agent 2 is responsible for adding the call within 1 working session.
- Agent 1 documents new endpoints in `11_V4_API_CONTRACTS.md` at the time of implementation (not after).

### 6.3 Feature Flag for Incomplete Features

If Agent 3's tank telemetry pipeline is not yet merged when Agent 1's alert rule for overfill is deployed:
- Use a Spring Boot feature flag: `sentinel.features.tank-telemetry-enabled: ${TANK_TELEMETRY_ENABLED:false}`
- Agent 1's `AlertRulesEngine` checks this flag before evaluating the overfill rule.
- Agent 4 sets `TANK_TELEMETRY_ENABLED=true` in `render.yaml` when Agent 3 confirms the pipeline is stable.

---

## 7. Environment Variable Ownership

| Variable | Set By | Used By | Location |
|---|---|---|---|
| `JWT_SECRET` | Agent 4 (Render + `.env.local`) | Agent 1 (Spring Security) | Render dashboard; `.env.local` (gitignored) |
| `DATABASE_URL` | Render (auto-inject) | Agent 1 (Spring JPA), Agent 3 (psycopg2) | `render.yaml` fromDatabase |
| `ETL_API_KEY` | Agent 4 (Render + GitHub Secrets) | Agent 4 (CI cron), Agent 1 (EtlPushController) | Render dashboard; GitHub Secrets |
| `SLACK_WEBHOOK_URL` | Agent 4 (Render) | Agent 1 (SlackNotificationService) | Render dashboard |
| `GROQ_API_KEY` | Agent 4 (Render) | Agent 1 (NarrativeService) | Render dashboard |
| `CORS_ALLOWED_ORIGINS` | Agent 4 (Render) | Agent 1 (CORS config) | `render.yaml` |
| `SERVICE_TOKEN` | Agent 4 (Render + `sentinel/.env`) | Agent 1 (ML endpoint auth), Agent 3 (retrain.py) | Render dashboard; `sentinel/.env` (gitignored) |
| `NEXT_PUBLIC_SENTINEL_API_URL` | Agent 2 (Vercel) | Agent 2 (frontend) | Vercel project settings |
| `TANK_TELEMETRY_ENABLED` | Agent 4 (Render) | Agent 1 (feature flag) | Render dashboard |

---

## 8. Testing Integration Rules

### 8.1 Contract Testing

Before any cross-agent boundary is considered stable, a contract test must exist:

| Boundary | Test type | Owns test |
|---|---|---|
| Frontend → Backend API | MSW mock + component test | Agent 2 |
| Python retrain.py → Backend API | `pytest` with `responses` mock | Agent 3 |
| Backend → PostgreSQL | `@SpringBootTest` + Testcontainers | Agent 1 (test) + Agent 4 (infra) |
| AlertRulesEngine → event_log | `@SpringBootTest` | Agent 1 |

### 8.2 End-to-End Test Ownership

The end-to-end "trigger overfill → Slack message" path is owned by Agent 4 as a CI integration test:
1. Start backend with Testcontainers PostgreSQL.
2. Call `POST /api/demo/trigger-overfill`.
3. Assert `event_log` has one row.
4. Assert `actuation_log` has one row.
5. Assert Slack webhook was called (mocked in test).

---

## 9. Code Review Checklist (All Agents)

Before merging any PR:

- [ ] No hardcoded secrets, passwords, or API keys in any file
- [ ] No `System.out.println` or unstructured logging (use `log.info/warn/error`)
- [ ] No `TODO` comments without a linked issue/debt item ID
- [ ] All new public methods have Javadoc / docstrings
- [ ] All new API endpoints are documented in `11_V4_API_CONTRACTS.md`
- [ ] All new DB tables have a corresponding Flyway migration (Agent 4 only)
- [ ] No `document.cookie.match` patterns (Agent 2 only)
- [ ] `ON CONFLICT DO NOTHING` on all batch inserts (Agent 3 only)
- [ ] All new `@Service` beans have at least one unit test
