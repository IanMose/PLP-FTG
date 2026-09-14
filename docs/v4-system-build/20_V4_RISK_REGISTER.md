# 20 — V4 Risk Register

> Each risk: Description → Probability → Impact → Mitigation → Owner → Trigger → Contingency

---

## Risk Classification

| Probability | Label |
|---|---|
| > 70% | High |
| 30–70% | Medium |
| < 30% | Low |

| Impact | Label |
|---|---|
| Showcase-blocking or data-loss | Critical |
| Major feature broken | High |
| Degraded experience | Medium |
| Minor inconvenience | Low |

---

## 1. Architecture Risks

### R-A01 — File-Based ETL Handoff Migration Leaves Orphaned Processes

**Risk:** After `load.py` switches to psycopg2, `run_live.sh` and `EtlReloadService` may leave stale file-poll loops or orphaned processes running alongside the new DB-write path, causing double-inserts or ghost alerts.

**Probability:** Medium  
**Impact:** High (duplicate data, duplicate alerts)

**Mitigation:**
- Remove file-write code from `load.py` entirely — no fallback path that still writes JSON.
- Disable `sentinel.etl.enabled=true` on local dev until both sides of the boundary are confirmed replaced.
- Add `ON CONFLICT DO NOTHING` on all inserts — duplicate writes are safe.

**Owner:** Agent 3 (Python side) + Agent 1 (Java side)  
**Trigger:** First run of `run_pipeline.py` post-migration produces duplicate rows in DB  
**Contingency:** Roll back `load.py` to JSON write + keep the file-poll path in `EtlBatchService` as a commented fallback until migration is verified stable.

---

### R-A02 — AnalyticsService Rewrite Returns Empty Data Instead of Meaningful Values

**Risk:** The replacement DB queries for survival curves and correlation may return zero rows on a fresh deployment (DB seeded but no historical feature data), silently returning empty arrays and making the analytics page appear broken.

**Probability:** Medium  
**Impact:** Medium (analytics page empty — not a showcase blocker but visually poor)

**Mitigation:**
- Add a graceful `{"available": false, "reason": "Insufficient data"}` response when DB queries return fewer than 5 rows.
- Seed the analytics endpoint with a minimum of 30 days of synthetic data in the CI test dataset.
- Add a fallback: if `fact_site_features` is empty, return the champion's `feature_importance` JSON from `model_registry` (which is always seeded with logreg_v1 values).

**Owner:** Agent 1  
**Trigger:** Analytics page shows empty charts after AnalyticsService rewrite  
**Contingency:** Return the static JSON values from `model_registry.feature_importance` (always present) as the fallback for the feature importance chart specifically — the most visible analytics component.

---

### R-A03 — PostgreSQL Connection Failure on Render Free Tier

**Risk:** The Render managed PostgreSQL free tier has lower connection limits. Concurrent showcase usage (multiple judges) may exhaust the HikariCP pool.

**Probability:** Low  
**Impact:** High (API returns 500 to all users)

**Mitigation:**
- HikariCP `maximum-pool-size: 10` configured (Agent 4, Task 4.1.2).
- Render free tier allows ~25 connections — 10 app + headroom is safe.
- Virtual threads (Java 21) reduce connection hold time on I/O-bound paths.

**Owner:** Agent 4  
**Trigger:** HTTP 500 responses on all API endpoints simultaneously  
**Contingency:** Restart the Render service from the dashboard (30-second recovery). If recurring: upgrade to Render Starter plan ($7/month) for higher connection limits.

---

## 2. Development Risks

### R-D01 — Flyway Migration Rename Breaks Production DB

**Risk:** The V14/V15 renames may conflict with the Flyway schema history table on the live Render database, causing all subsequent deployments to fail with `FlywayException: Validate failed`.

**Probability:** Medium  
**Impact:** Critical (production broken — no new deployments possible)

**Mitigation:**
- Before deploying the rename: manually delete the old V14/V15 rows from `flyway_schema_history` on Render PostgreSQL (see Agent 4, Task 4.0.1).
- Test the rename against a Testcontainers fresh DB first.
- The renamed migrations use `CREATE TABLE IF NOT EXISTS` and `INSERT ... ON CONFLICT DO NOTHING` — safe to re-apply.

**Owner:** Agent 4  
**Trigger:** `FlywayException` in Render deployment logs after the rename PR is deployed  
**Contingency:** Restore the original V14/V15 filenames (git revert the rename), redeploy. The `validate-on-migrate: true` change must also be reverted. Then fix on a separate branch.

---

### R-D02 — Agent Merge Conflicts on `application.yml`

**Risk:** Agents 1 and 4 both modify `application.yml` in their Phase 0/1 PRs, causing a merge conflict.

**Probability:** Medium  
**Impact:** Low (easily resolved, brief delay)

**Mitigation:**
- Clear ownership: Agent 1 owns only `sentinel.jwt.*` and `sentinel.cors.*` blocks; Agent 4 owns everything else.
- Agent 4 merges last and rebases on Agent 1's branch if needed.
- Both agents should communicate before opening PRs that touch this file.

**Owner:** Agent 4 (merge authority on `application.yml`)  
**Trigger:** Git merge conflict during Phase 1 PR merge  
**Contingency:** Agent 4 manually resolves by keeping both agents' blocks — no logic is lost.

---

### R-D03 — `retrain.py` Cannot Reach Agent 1 API Endpoints

**Risk:** Agent 3 implements `retrain.py` while Agent 1's new endpoints (`POST /api/ml/model-registry`, etc.) are not yet deployed. Integration testing of the full ML loop is blocked.

**Probability:** High (this is a known sequencing dependency)  
**Impact:** Medium (retrain.py unit tests still pass with mocks; only real integration is delayed)

**Mitigation:**
- Agent 3 uses `responses` mock library for all `retrain.py` unit tests — no dependency on live endpoints.
- Coordination signal: Agent 1 posts a GitHub PR comment when ML endpoints are deployed to staging.
- Agent 3 can test against Agent 1's local environment before staging is available.

**Owner:** Agent 3  
**Trigger:** `retrain.py` returns `ConnectionRefusedError` when run against staging  
**Contingency:** Agent 3 continues with mocked API tests; marks the "real API integration" as a Phase 3 task rather than Phase 1.

---

### R-D04 — Tank Telemetry Feature Flag Not Enabled for Demo

**Risk:** `TANK_TELEMETRY_ENABLED` defaults to `false`. If it is not set to `true` on Render before the showcase, the overfill alert rule never fires and the entire demo loop fails.

**Probability:** Medium (easy to forget a single config change)  
**Impact:** Critical (demo loop breaks — the most memorable showcase moment is gone)

**Mitigation:**
- Add to the Phase 4 checklist: "Verify `TANK_TELEMETRY_ENABLED=true` in Render environment."
- Agent 4 sets this flag as part of Phase 3 exit criteria.
- The demo endpoint (`POST /api/demo/trigger-overfill`) bypasses the flag — it directly inserts the tank telemetry row, so the demo button always works even if the automated pipeline rule is disabled.

**Owner:** Agent 4  
**Trigger:** `POST /api/demo/trigger-overfill` returns 200 but no alert fires  
**Contingency:** The DemoController inserts the row directly and calls `alertRulesEngine.evaluateTankTelemetry()` explicitly — it does not check the feature flag. The demo loop works regardless of the flag setting.

---

## 3. Integration Risks

### R-I01 — Slack Webhook Not Configured at Showcase Time

**Risk:** `SLACK_WEBHOOK_URL` not set on Render, causing every NarrativeService call to skip silently. The Slack message that judges expect to see never arrives.

**Probability:** Medium  
**Impact:** High (Stage 3 Feature 4 demonstrably missing)

**Mitigation:**
- Add to Phase 4/5 checklist: "Confirm Slack message arrives within 10 seconds of demo trigger."
- Pre-run the demo once before the showcase to verify the webhook is live.
- `SlackNotificationService` logs a `DEBUG` message when webhook is blank — check Render logs if Slack is silent.

**Owner:** Agent 4 (sets environment variable), Agent 1 (SlackNotificationService)  
**Trigger:** Demo trigger completes but no Slack message in 15 seconds  
**Contingency:** Show the Render logs live ("We can see the Slack call was made — the webhook needs reconnection"). The actuation and event logs still demonstrate the autonomous response loop.

---

### R-I02 — ML Feedback Loop Insufficient Data for Demo Retrain

**Risk:** The Render production database may have fewer than 5 `model_feedback` rows when the "Retrain Now" button is demonstrated. `retrain.py` exits with "Insufficient feedback" and no challenger appears.

**Probability:** High (fresh deployment with no real user activity)  
**Impact:** Medium (ML loop demo degraded — retrain cannot run live)

**Mitigation:**
- Seed 10+ feedback rows via the Feedback Queue before the showcase (takes ~2 minutes).
- Add a `--seed-feedback` flag to `retrain.py` that inserts synthetic feedback rows for demo purposes.
- Pre-run the retrain cycle 24 hours before the showcase and promote a challenger to confirm the loop works.

**Owner:** Agent 3 + Agent 1  
**Trigger:** "Trigger Retrain Now" shows no new training run after 60 seconds  
**Contingency:** Pre-promote a seeded challenger before the showcase. Show the Registry page with champion `logreg_v2` already promoted — demonstrates that the loop has already completed.

---

### R-I03 — Render Free Tier Cold Start During Showcase

**Risk:** If the Render backend has been idle for >15 minutes before the showcase begins, the first API call takes 25–35 seconds (JVM cold start), making the demo appear broken.

**Probability:** Medium (depends on whether judges use the demo before the formal showcase window)  
**Impact:** High (first impression of the system: 30-second delay)

**Mitigation:**
- UptimeRobot pings `/actuator/health` every 5 minutes — keeps the service warm.
- Do a manual warm-up request 2 minutes before the showcase begins.
- Open the Render dashboard → click "Manual Deploy" → service restarts fresh 5 minutes before showcase.

**Owner:** Agent 4 (UptimeRobot config)  
**Trigger:** First API response in showcase context takes >5 seconds  
**Contingency:** Say: "The service is warming up — this is a known characteristic of the free-tier hosting we use for the showcase. Production deployment uses dedicated instances." (The honest answer, prepared in advance.)

---

## 4. ML-Specific Risks

### R-M01 — Challenger Model Has Lower Metrics Than Champion

**Risk:** `retrain.py` trains a challenger with F1 < 0.647 (the seeded champion's F1). If demonstrated live, judges see a model regression.

**Probability:** Medium (dependent on feedback quality)  
**Impact:** Low (actually demonstrates the safety of the champion/challenger approval gate)

**Mitigation:**
- Frame it explicitly: "The challenger has lower F1 — which is exactly why we have a human approval gate. We can see the diff and reject this challenger."
- The Reject button is a feature, not a failure.
- Pre-run retraining before the showcase and promote if the challenger beats the champion; keep the champion if not.

**Owner:** Agent 3  
**Trigger:** Challenger `f1_score` < champion `f1_score` in Registry comparison  
**Contingency:** Demonstrate the reject flow — it is equally valid as a showcase moment.

---

### R-M02 — `predict.py` Champion Load Fails on Render (Ephemeral Filesystem)

**Risk:** After a Render container restart, `models/logreg_v1.pkl` no longer exists on the filesystem. `predict.py` tries to load it and fails. If `artifact_blob` is not populated, the scoring cycle silently breaks.

**Probability:** High (Render restarts happen on every deploy)  
**Impact:** High (`fact_predictions` goes stale — risk scores are not updated)

**Mitigation:**
- `retrain.py` always populates `artifact_blob` in `model_registry` (Agent 3, Task 3.2.1).
- `predict.py` has three-tier fallback: (1) local file, (2) `artifact_blob` from DB, (3) hardcoded `logreg_v1.pkl`.
- Backfill `artifact_blob` for the seeded `logreg_v1` champion as part of Agent 3's initial setup (run `python -m src.retrain` once against staging to register logreg_v2 — this populates blob; or manually base64-encode logreg_v1.pkl and update the DB row directly).

**Owner:** Agent 3  
**Trigger:** `fact_predictions` table has no rows added after a Render redeploy  
**Contingency:** Manually set `artifact_blob` on the `logreg_v1` champion row: `UPDATE model_registry SET artifact_blob = '<base64>' WHERE version='logreg_v1'`.

---

### R-M03 — DriftDetectionService Reports False Critical Drift

**Risk:** With a small number of feedback rows (< 10 after a fresh deployment), the baseline accuracy window and recent accuracy window may both contain only a few rows, producing a misleading "critical drift" signal.

**Probability:** High (any fresh deployment has very few feedback rows)  
**Impact:** Low (cosmetic — drift banner shows "critical" when it shouldn't)

**Mitigation:**
- `DriftDetectionService` already has a `sample_size` check — implement the minimum sample guard (Agent 1, Phase 3 task): if `sample_size < 10`, return `driftStatus: "ok"` rather than computing accuracy from noise.
- This is already designed in `06_ML_HITL_V4_ARCHITECTURE.md §6.2`.

**Owner:** Agent 1  
**Trigger:** ML Admin Overview shows "Critical Drift" banner immediately after deployment  
**Contingency:** Dismiss the banner; explain: "Drift detection requires at least 10 rated predictions to be meaningful. With only N feedback rows, the signal is noise."

---

## 5. Security Risks

### R-S01 — JWT Secret Rotation Invalidates Active Sessions

**Risk:** When Agent 4 rotates the JWT secret (removing the hardcoded value), all existing JWT tokens become invalid. Any judge or team member with an active session will be logged out.

**Probability:** Certain (this is the intended effect of rotation)  
**Impact:** Low (inconvenience — re-login required)

**Mitigation:**
- Rotate the secret before any showcase users log in for the first time.
- Communicate to the team: "After the JWT secret is rotated, all team members need to log in again."

**Owner:** Agent 4  
**Trigger:** After `JWT_SECRET` is set to a new value in Render  
**Contingency:** None needed — re-login is the correct behaviour.

---

### R-S02 — Service Token Exposed in Python `.env` File

**Risk:** The `SERVICE_TOKEN` used by `retrain.py` and `predict.py` to authenticate to the backend API is stored in `sentinel/.env`. If this file is accidentally committed to git, it exposes the token.

**Probability:** Low (`.gitignore` protects it)  
**Impact:** High (anyone with the token can register arbitrary challenger models)

**Mitigation:**
- `sentinel/.env` added to `.gitignore` by Agent 4 (Task 4.1.5).
- Add `.env` to the secret leakage CI check.
- `ServiceTokenFilter` validates the token server-side — even if leaked, token rotation on Render invalidates it.

**Owner:** Agent 4 (gitignore), Agent 1 (ServiceTokenFilter)  
**Trigger:** `.env` file appears in a PR diff  
**Contingency:** Rotate `SERVICE_TOKEN` on Render. The old token is immediately invalid. Regenerate `sentinel/.env` locally.

---

## 6. Scope Creep Risks

### R-SC01 — New Features Added After Rehearsal Begins

**Risk:** A team member adds a "quick fix" or new feature after the Phase 5 hard stop, introducing a regression that breaks the demo in the last hours before the showcase.

**Probability:** Medium  
**Impact:** Critical (last-minute regression with no time to recover)

**Mitigation:**
- Hard stop rule: no new features, refactors, or "quick fixes" once Phase 5 begins (per Stage 3 build plan §4, Feature 14).
- Only permitted actions after hard stop: verify Render is up, verify Slack webhook is connected.
- If a critical bug is found after hard stop: fix it on a hotfix branch; have a second person review before merging.

**Owner:** All agents (collective responsibility)  
**Trigger:** Any PR opened to main during Phase 5  
**Contingency:** Accept the known bug, rehearse the narrative around it, and demo the working paths.

---

### R-SC02 — Real SCADA Integration Implied in Demo

**Risk:** A team member or judge comment during Q&A implies or infers that the actuation endpoint controls real KPC valve hardware.

**Probability:** Low (Stage 3 plan explicitly requires the honest caveat)  
**Impact:** High (credibility damage if overclaimed, especially with the Em-Tech CTO panel)

**Mitigation:**
- The actuation response always includes `"actuator": "MOCK"` and `"message": "Simulated valve closure..."`.
- The demo page UI labels the button and steps as "simulated".
- Pre-rehearsed Q&A answer: "This calls a simulated actuator — stated explicitly in the response. Production deployment would bind this endpoint to KPC's SCADA/valve control interface, following the same architecture."

**Owner:** All agents (consistent messaging)  
**Trigger:** Any question about whether this controls real hardware  
**Contingency:** Point to the `"actuator": "MOCK"` field in the API response shown on screen.

---

## 7. Risk Summary Matrix

| ID | Risk | Prob | Impact | Priority |
|---|---|---|---|---|
| R-A01 | File-based ETL orphaned processes | Medium | High | 🔴 High |
| R-A02 | Analytics rewrite returns empty data | Medium | Medium | 🟡 Medium |
| R-A03 | PostgreSQL connection exhaustion | Low | High | 🟡 Medium |
| R-D01 | Flyway rename breaks production | Medium | Critical | 🔴 High |
| R-D02 | application.yml merge conflict | Medium | Low | 🟢 Low |
| R-D03 | retrain.py blocked on Agent 1 APIs | High | Medium | 🟡 Medium |
| R-D04 | Tank telemetry flag not enabled | Medium | Critical | 🔴 High |
| R-I01 | Slack webhook not configured | Medium | High | 🔴 High |
| R-I02 | Insufficient feedback for retrain demo | High | Medium | 🟡 Medium |
| R-I03 | Render cold start during showcase | Medium | High | 🔴 High |
| R-M01 | Challenger has lower metrics | Medium | Low | 🟢 Low |
| R-M02 | Model artifact missing after restart | High | High | 🔴 High |
| R-M03 | False critical drift signal | High | Low | 🟢 Low |
| R-S01 | JWT rotation invalidates sessions | Certain | Low | 🟢 Low |
| R-S02 | Service token in committed .env | Low | High | 🟡 Medium |
| R-SC01 | New features after hard stop | Medium | Critical | 🔴 High |
| R-SC02 | Real SCADA implication | Low | High | 🟡 Medium |

**High-priority items requiring active monitoring:**
- R-D01, R-D04, R-I01, R-I03, R-M02, R-SC01 — all have showcase-blocking potential.
