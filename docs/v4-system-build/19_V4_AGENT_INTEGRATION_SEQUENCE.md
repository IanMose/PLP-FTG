# 19 — V4 Agent Integration Sequence

---

## 1. Dependency Graph

```
┌─────────────────────────────────────────────────────┐
│  PHASE 0 — Agent 4 ONLY (runs first, ~0.5 days)     │
│                                                       │
│  ┌──────────────────────────────────────────────┐    │
│  │ Agent 4:                                      │    │
│  │  • Fix Flyway V14/V15 duplicates             │    │
│  │  • Remove hardcoded secrets from render.yaml │    │
│  │  • Upgrade pom.xml → Java 21, SB 3.4.x      │    │
│  │  • Write V22–V27 migrations                   │    │
│  │  • Create Testcontainers base class           │    │
│  │  • Extend ci.yml (secret check, coverage)    │    │
│  └──────────────────────────────────────────────┘    │
│                        │                             │
│               MERGE TO MAIN                          │
└─────────────────────────┼───────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
          ▼               ▼               ▼
┌─────────────┐  ┌──────────────┐  ┌────────────┐
│  Agent 1    │  │   Agent 3    │  │  Agent 2   │
│  (backend)  │  │   (python)   │  │ (frontend) │
│             │  │              │  │            │
│ P1 tasks:  │  │ P1 tasks:    │  │ P1 tasks:  │
│ Analytics  │  │ load.py →DB  │  │ Route      │
│ fix, JWT   │  │ retrain.py   │  │ Handlers,  │
│ fix, RBAC  │  │ predict.py   │  │ TQ, tests  │
│ ML APIs    │  │ tank pipeline│  │            │
└─────┬───────┘  └──────┬───────┘  └─────┬──────┘
      │                 │                 │
      │      CONTRACT VALIDATION          │
      │   (Agents 1+3 API contracts)      │
      │                 │                 │
      └─────────────────┴─────────────────┘
                        │
               PHASE 1 MERGE GATE
                  (all → main)
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  Agent 1         │        │   Agent 2        │
│  Phase 2:        │        │   Phase 2:       │
│  Event/Actuation │◄───────│   Executive +    │
│  Slack, Demo     │ needs  │   Demo page      │
│  Executive API   │ APIs   │   (MSW mocks     │
└────────┬─────────┘        │   until A1 live) │
         │                  └────────┬─────────┘
         │                           │
         │   Agent 3 Phase 2:        │
         │   Tank telemetry          │
         │   generates data          │
         │   for A1 overfill rule    │
         ▼                           ▼
              PHASE 2 MERGE GATE
                   (all → main)
                        │
          ┌─────────────┴─────────────┐
          │                           │
          ▼                           ▼
┌──────────────────┐        ┌──────────────────┐
│  Agent 1+3       │        │   Agent 2        │
│  Phase 3:        │        │   Phase 3:       │
│  Retrain trigger │        │   Remove MSW     │
│  Schedule state  │        │   mocks, E2E     │
│  machine         │        │   Playwright     │
└────────┬─────────┘        └────────┬─────────┘
         └─────────────┬─────────────┘
                       ▼
               PHASE 3 MERGE GATE
                       │
                       ▼
              PHASE 4 — INTEGRATION
            (all agents, full E2E tests)
                       │
                       ▼
              PHASE 5 — SHOWCASE
```

---

## 2. Step-by-Step Integration Sequence

### Step 1 — Agent 4 Phase 0 PR (Day 1 morning)

**Branch:** `agent-4/infra-migrations`

**Contents:**
- Flyway V14/V15 renames
- `render.yaml` secrets removed
- Java 21 + Spring Boot 3.4.x in `pom.xml` and `Dockerfile`
- `application-render.yml` — `validate-on-migrate: true`, virtual threads
- `V22__fact_tank_telemetry.sql`
- `V23__event_log.sql`
- `V24__actuation_log.sql`
- `V25__artifact_blob.sql`
- `V26__performance_indexes.sql`
- `V27__fact_site_features.sql`
- `AbstractIntegrationTest.java` + `application-test.yml`
- `ci.yml` — secret leakage check + frontend lint job skeleton

**Merge gate:** `flyway:validate` passes. `mvnw verify` passes on Java 21. No secrets in committed files.

**This PR must be merged to main before any other agent begins Phase 1.**

---

### Step 2 — Announce Merge + Unblock Agents 1, 2, 3 (Day 1 midday)

Once Agent 4's PR is merged, send a coordination message (GitHub PR comment, Slack, or equivalent):

```
Agent 4 Phase 0 merged. Unblocked:
  • Agent 1: Start Phase 1 (JWT fix, AnalyticsService, ML endpoints, RBAC)
  • Agent 2: Start Phase 1 (Route Handlers, TanStack Query, Leaflet, tests setup)
  • Agent 3: Start Phase 1 (load.py psycopg2 rewrite, retrain.py, predict.py fix)

Migration versions available: V22 (fact_tank_telemetry), V23 (event_log),
V24 (actuation_log), V25 (artifact_blob), V26 (indexes), V27 (fact_site_features)

Branch: rebase off main now before starting.
```

---

### Step 3 — Agent 1 Phase 1 PR (Day 2)

**Branch:** `agent-1/core-backend`

**Merges when:**
- All P0/P1 backend tasks complete
- Analytics endpoints return 200 without warehouse files
- `POST /api/ml/model-registry` and other new ML endpoints pass integration tests
- RBAC integration tests pass (403 for wrong role)
- Java service coverage ≥ 60%

**Notifies Agent 3:** "ML API endpoints live on staging. You can now test `retrain.py` against the real API (not mocks). New endpoints: `POST /api/ml/model-registry`, `POST /api/ml/training-run`, `GET /api/ml/feedback-export`."

**Notifies Agent 2:** "New API endpoints available: `GET /api/executive/summary` (stub), `POST /api/demo/trigger-overfill` (stub — no tank data yet). Remove MSW stubs for analytics endpoints — they are now production-functional."

---

### Step 4 — Agent 3 Phase 1 PR (Day 2, parallel with Agent 1)

**Branch:** `agent-3/python-etl-v4`

**Merges when:**
- `load.py` writes to PostgreSQL — no `live_batch.json` produced
- `predict.py` reads champion from `model_registry` API
- `retrain.py` passes all 6 unit tests (with mocked API)
- Tank telemetry added to `generate_data.py` and pipeline stages
- Python test coverage ≥ 70%
- `pytest tests/ -v` all green

**Notifies Agent 1:** "Tank telemetry data is now being written to `fact_tank_telemetry`. You can now activate the overfill alert rule by setting `TANK_TELEMETRY_ENABLED=true` on your test environment."

---

### Step 5 — Agent 2 Phase 1 PR (Day 2, parallel)

**Branch:** `agent-2/frontend-v4`

**Merges when:**
- Zero `document.cookie.match` patterns
- All 6 Route Handler proxy files created and working
- TanStack Query installed; ML Admin client pages migrated
- Vitest setup complete; 16+ component tests passing
- `pnpm build` succeeds

**Coordination note:** Agent 2 does not need to wait for Agents 1 or 3 for Phase 1. All client mutations route through MSW mocks until Agents 1/3 deploy real endpoints.

---

### Step 6 — Phase 1 Integration Check (Day 2 evening)

All three Phase 1 PRs merged to main. Run:

```bash
# Full CI pipeline on main
# Expected: all jobs pass (security-check, etl, backend, frontend-lint)

# Smoke test against staging (Render)
curl https://sentinel-backend.onrender.com/actuator/health
# Expected: {"status":"UP"}

curl -X POST https://sentinel-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# Expected: {"token":"...","role":"ADMIN"}

# Analytics endpoints — must return 200 (not 500 as before)
curl -H "Authorization: Bearer <token>" \
  https://sentinel-backend.onrender.com/api/analytics/feature-importance
# Expected: {"features":[...],"modelVersion":"logreg_v1"}
```

**If analytics still return 500:** Agent 1 has a bug in the AnalyticsService rewrite. Do not proceed to Phase 2 until fixed.

---

### Step 7 — Agent 1 Phase 2 PR (Day 3)

**Branch:** `agent-1/stage3-features` (or continue on `agent-1/core-backend`)

**Contents:** EventPublisher, ActuationTriggerService, SlackNotificationService, DemoController, ExecutiveSummaryController, overfill alert rule (behind `TANK_TELEMETRY_ENABLED` flag).

**Merges when:**
- `POST /api/demo/trigger-overfill` creates rows in `event_log` AND `actuation_log`
- Slack webhook mock test passes
- `GET /api/executive/summary` returns 4 numeric fields
- Integration tests pass (demo + actuation)

**After merge:** Set `TANK_TELEMETRY_ENABLED=true` on Render staging environment.

---

### Step 8 — Agent 3 Phase 2 PR (Day 3, parallel with Agent 1)

**Branch:** Continue on `agent-3/python-etl-v4` or new `agent-3/tank-pipeline`

**Contents:** `generate_data.py` extended with seeded overfill data, tank features in `features.py`.

**Merges when:** Tank telemetry appears in `fact_tank_telemetry` after a pipeline run. Seeded overfill rows have `overfill_flag=True`.

---

### Step 9 — Agent 2 Phase 2 PR (Day 3, parallel)

**Contents:** Executive Control Plane page, Live Demo page (with MSW mocks for new endpoints), ROI overfill line.

**Merges when:** Executive page loads; demo page button triggers the visible 5-step flow (against MSW). `pnpm build` passes.

---

### Step 10 — Phase 2 Integration Check (Day 3 evening)

With all Phase 2 branches merged to main, run the full demo flow against staging:

```bash
# Trigger demo
curl -X POST https://sentinel-backend.onrender.com/api/demo/trigger-overfill \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{"siteId":"site-003"}'

# Expected response contains: alertId, eventId, actuationId, slackSent: true/false

# Verify event_log row
curl -H "Authorization: Bearer <admin_token>" \
  "https://sentinel-backend.onrender.com/api/event-log?siteId=site-003&limit=1"
# Expected: one row with signal_type "overfill_risk"

# Verify actuation_log row
curl -H "Authorization: Bearer <admin_token>" \
  "https://sentinel-backend.onrender.com/api/actuation-log?siteId=site-003&limit=1"
# Expected: one row with status "simulated_success"
```

**If Slack message arrives in the channel:** Full demo loop is working. If not, check `SLACK_WEBHOOK_URL` is set on Render.

---

### Step 11 — Agent 2 MSW Mock Removal (Day 4)

Once Agent 1's real endpoints are confirmed working in staging, Agent 2 removes MSW mock handlers for:
- `POST /api/demo/trigger-overfill`
- `GET /api/executive/summary`
- `GET /api/event-log`
- `GET /api/actuation-log`

Replaces with calls to the real proxy Route Handlers. Verifies demo page works end-to-end.

---

### Step 12 — Phase 3: ML Loop Closure (Day 4)

**Agent 1:** Implement `POST /api/ml/trigger-retrain` subprocess invocation. Wire retraining schedule state machine.

**Agent 3:** Verify `retrain.py` end-to-end against real endpoints:
```bash
# In sentinel/ directory with .env configured:
python -m src.retrain
# Expected: "Challenger logreg_v2 registered. F1=0.XXX"
```

**Agent 2:** Remove MSW mocks for ML registry endpoints. Verify Training Runs page shows new run.

**Full loop verification:**
```
1. Add 5+ feedback ratings via ML Admin Feedback Queue
2. Click "Retrain Now" in Training Runs page
3. Agent 1's trigger-retrain endpoint invokes retrain.py
4. retrain.py registers logreg_v2 as challenger
5. ML Admin Registry shows challenger with new metrics
6. Approve & Promote logreg_v2
7. Run python -m src.predict → confirm model_version in fact_predictions is "logreg_v2"
```

---

### Step 13 — Phase 3 Merge Gate (Day 4 evening)

All Phase 3 branches merged. Run full Playwright E2E suite against staging:

```bash
cd sentinel-frontend
npx playwright test tests/e2e/ --reporter=list
# Expected: all E2E tests pass
```

Run model sanity tests:
```bash
cd sentinel
python -m pytest tests/test_model_sanity.py -v
# Expected: F1 >= 0.40, all probabilities in [0,1]
```

---

### Step 14 — Phase 4: Integration Hardening (Day 5)

All agents rebase on main. Run full integration check:

```bash
# Backend: full test suite with Testcontainers
cd sentinel-backend
./mvnw verify -Dspring.profiles.active=test

# Python: full test suite with coverage
cd sentinel
pytest tests/ --cov=src --cov-fail-under=70 -v

# Frontend: full test suite
cd sentinel-frontend
pnpm exec vitest run
pnpm run build
```

**Failure-mode UAT (manual):**

Test 1 — Kill actuation endpoint:
```bash
# Temporarily override ActuationTriggerService to throw RuntimeException
# Trigger demo
# Verify: event still logged, alert still shows, dashboard still displays
# Verify: actuation_log row has status "simulated_failure" or similar
```

Test 2 — Invalid Slack webhook:
```bash
# Set SLACK_WEBHOOK_URL=https://hooks.slack.com/invalid-url on Render
# Trigger demo
# Verify: event and actuation still log (warning in logs, not error)
# Verify: alert still fires and shows in dashboard
# Restore correct webhook URL
```

---

### Step 15 — Phase 5: Showcase Lock (Day 6)

**Final checks before presentation:**

```bash
# 1. Confirm live URL is healthy
curl https://sentinel-backend.onrender.com/actuator/health
# Expected: {"status":"UP"}

# 2. Confirm Render deploy is on the latest main commit
# Check Render dashboard → Last deploy timestamp

# 3. Confirm UptimeRobot is active and monitoring
# Check UptimeRobot dashboard → Status "Up", no recent downtime

# 4. Confirm Slack webhook is working
# Trigger one test notification manually

# 5. Full demo run (one complete rehearsal)
# Dashboard → ML Admin → Demo page → Trigger Overfill → Watch 5 steps complete
# Verify Slack message arrives
```

**No new features, refactors, or config changes after rehearsal begins.**

---

## 3. Integration Decision Points

| Decision | When | Who decides | Options |
|---|---|---|---|
| Is Phase 0 stable enough to unblock others? | After Agent 4 Phase 0 merge | Agent 4 | Block if Flyway validate fails; proceed if passes |
| Should Agent 2 wait for Agent 1 endpoints or use mocks longer? | Day 3 | Agent 2 | Use MSW mocks until real endpoints confirmed on staging |
| Is the ML loop working well enough for Phase 3? | After Phase 2 merge gate | Agent 1 + 3 | Proceed if `retrain.py --dry-run` passes; rollback retrain features if loop unstable |
| Tank telemetry flag: enable in production? | Phase 3 completion | Agent 4 | Set `TANK_TELEMETRY_ENABLED=true` in render.yaml only after Phase 3 E2E passes |
| Is the system showcase-ready? | End of Phase 4 | All agents | All CI gates pass + failure-mode UAT documented |

---

## 4. Rollback Procedures

### Rollback a Merged Feature

```bash
# Revert the feature commit (safe — creates a new revert commit)
git revert <commit-hash> --no-edit
git push origin main

# Render auto-deploys the revert
```

### Rollback a Model Promotion

```
ML Admin Portal → Model Registry → find previous champion (status: archived)
→ click "Rollback" → confirm
→ predict.py next run will use previous champion
```

### Rollback a Migration

Flyway does not support down-migrations. To undo a schema change:
1. Write a new migration `V{N+1}__rollback_{description}.sql` that reverses the DDL.
2. Apply via normal Flyway migration process.
3. Do NOT edit the original migration file.

---

## 5. Communication Protocol Between Agents

| Event | Action | Channel |
|---|---|---|
| Phase 0 merged | Post unblock message with migration version list | GitHub PR comment on all open branches |
| New API endpoint deployed to staging | Post endpoint URL + sample curl to `11_V4_API_CONTRACTS.md` update | PR comment |
| Breaking API change | Post to all open branch PRs before merging | GitHub PR comment + message |
| Phase gate passed | Post confirmation with test results summary | GitHub PR comment on merge commit |
| Blocker encountered | Raise immediately — don't wait for standup | GitHub issue or direct message |

---

## 6. Integration Dependency Matrix

| What | Needs | From | Phase |
|---|---|---|---|
| Agent 1 entity code (event_log) | `V23__event_log.sql` applied | Agent 4 | 0 |
| Agent 1 entity code (actuation_log) | `V24__actuation_log.sql` applied | Agent 4 | 0 |
| Agent 1 analytics DB queries | `fact_site_features` table exists (V27) | Agent 4 | 0 |
| Agent 1 integration tests | `AbstractIntegrationTest.java` | Agent 4 | 0 |
| Agent 3 load.py tank writes | `V22__fact_tank_telemetry.sql` applied | Agent 4 | 0 |
| Agent 3 retrain.py (real test) | `POST /api/ml/model-registry` live | Agent 1 | 1 |
| Agent 3 predict.py champion load | `GET /api/ml/model-registry` live | Agent 1 | 1 |
| Agent 2 demo page (real) | `POST /api/demo/trigger-overfill` live | Agent 1 | 2 |
| Agent 2 executive page (real) | `GET /api/executive/summary` live | Agent 1 | 2 |
| Agent 1 overfill alert rule | Tank telemetry rows in DB | Agent 3 | 2 |
| Agent 2 MSW mock removal | All new endpoints confirmed on staging | Agent 1 | 3 |
| ML loop end-to-end | `retrain.py` + `trigger-retrain` endpoint both live | Agent 1 + 3 | 3 |
| `TANK_TELEMETRY_ENABLED=true` on Render | Phase 3 tank E2E passes | All | 3 |
