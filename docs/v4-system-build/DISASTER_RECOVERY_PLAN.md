# Disaster Recovery Plan — Sentinel V4

> Last updated: September 2026
> Owner: Infrastructure / Agent 4

---

## 1. Overview

This document defines failure modes, detection methods, fallback behaviors, and recovery procedures for the Sentinel V4 platform deployed on Render.

**Key Principle:** Notification failure (Slack, actuation) must **never** suppress the underlying alert. Every High/Critical alert must be logged in `alerts` and `event_log` regardless of downstream integration status.

---

## 2. Failure Modes and Responses

| Failure | Detection | Fallback | Recovery |
|---------|-----------|----------|----------|
| **Render backend down** | UptimeRobot alert in Slack | N/A — service unavailable | Render dashboard → Manual Deploy from last good commit |
| **Actuation endpoint unresponsive** | `POST /api/actuate/close-valve` returns 500 | Event still logs; dashboard still shows alert (Slack notification failure must never suppress alert) | Restart backend service via Render dashboard |
| **Slack webhook down** | `SlackNotificationService` catches exception, logs warning (non-fatal) | Alert and actuation still fire; Slack failure is silent in UI | Check Render logs; reconfigure webhook URL in dashboard |
| **PostgreSQL down** | All API endpoints return 500; health check fails | No fallback — DB is required | Render managed DB → restore from snapshot (RPO ≤ 24h) |
| **Model artifact missing after restart** | `predict.py` logs warning, falls back to `logreg_v1.pkl` if present | Loads `artifact_blob` from DB if filesystem artifact missing | No action needed if `artifact_blob` populated; re-run `retrain.py` if not |
| **ETL CI cron fails** | GitHub Actions job failure notification | Data goes stale; no new alerts generated | Investigate CI logs; re-run workflow manually |
| **Frontend build fails** | Vercel deployment fails; previous version stays live | Users see old version | Fix build errors; push fix to main |
| **JWT secret compromised** | Unauthorized API access detected | Immediately rotate secret in Render dashboard | Generate new secret, redeploy, invalidate all existing tokens |

---

## 3. Recovery Procedures

### 3.1 Backend Service Recovery

1. Navigate to Render dashboard → `sentinel-backend` service
2. Check **Events** tab for recent failures
3. Click **Manual Deploy** → select last known good commit
4. Monitor logs until "Started SentinelApplication" appears
5. Verify health: `curl https://sentinel-backend.onrender.com/actuator/health`

### 3.2 Database Recovery

Render managed PostgreSQL provides automatic daily snapshots.

1. Navigate to Render dashboard → `sentinel-db`
2. Go to **Backups** tab
3. Select most recent snapshot before failure
4. Click **Restore**
5. Update `DATABASE_URL` in backend service if connection string changed
6. Redeploy backend

**RPO (Recovery Point Objective):** ≤ 24 hours (daily snapshots)
**RTO (Recovery Time Objective):** ~15 minutes (snapshot restore + redeploy)

### 3.3 Secret Rotation

**JWT Secret:**
```bash
# Generate new secret
openssl rand -base64 48

# Update in Render dashboard:
# sentinel-backend → Environment → JWT_SECRET
# Redeploy service
```

**ETL API Key:**
```bash
# Generate new key
openssl rand -base64 32

# Update in TWO places:
# 1. Render dashboard: sentinel-backend → Environment → ETL_API_KEY
# 2. GitHub: Settings → Secrets → Actions → ETL_API_KEY
# Redeploy service
```

### 3.4 ETL Pipeline Recovery

If the scheduled ETL cron fails:

1. Go to GitHub → Actions → `etl-cron.yml`
2. Review failure logs
3. Fix any issues in the Python code
4. Click **Re-run all jobs** or trigger manually:
   ```bash
   gh workflow run etl-cron.yml
   ```

---

## 4. Monitoring Setup

### 4.1 UptimeRobot Configuration

1. Create free account at https://uptimerobot.com
2. Add new monitor:
   - **Monitor Type:** HTTP(s)
   - **URL:** `https://sentinel-backend.onrender.com/actuator/health`
   - **Monitoring Interval:** 5 minutes
3. Configure alert contacts:
   - Email to ops team
   - Slack webhook to `#sentinel-ops`

### 4.2 GitHub Actions Notifications

Failed CI/CD runs automatically notify repository watchers. Ensure team members have notifications enabled for:
- Workflow run failures
- Pull request checks

---

## 5. Data Backup Strategy

| Data Type | Backup Method | Frequency | Retention |
|-----------|---------------|-----------|-----------|
| PostgreSQL | Render managed snapshots | Daily | 7 days (free tier) |
| Model artifacts | `artifact_blob` column in DB | On each retrain | Indefinite |
| ETL source data | `data/raw/*.csv` in git | On commit | Indefinite |
| Configuration | Infrastructure-as-code in git | On commit | Indefinite |

---

## 6. Incident Response Checklist

When an incident occurs:

- [ ] **Acknowledge** — Note the time and initial symptoms
- [ ] **Assess** — Identify affected components using this table
- [ ] **Communicate** — Post to `#sentinel-ops` Slack channel
- [ ] **Mitigate** — Apply fallback or temporary fix
- [ ] **Recover** — Follow recovery procedure for the failure mode
- [ ] **Verify** — Confirm service is restored (health check, sample API call)
- [ ] **Document** — Record incident in `docs/incidents/` with root cause

---

## 7. Contact Information

| Role | Contact |
|------|---------|
| On-call engineer | (Configure in team wiki) |
| Render support | https://render.com/support |
| GitHub support | https://support.github.com |

---

## 8. Testing the DR Plan

Quarterly DR drills:

1. **Failover test:** Manually deploy a previous commit, verify rollback works
2. **Database restore test:** Restore from snapshot to a test environment
3. **Secret rotation test:** Rotate JWT_SECRET, verify tokens invalidate correctly
4. **Monitoring test:** Temporarily break health endpoint, verify alert fires

Document drill results in `docs/dr-drills/`.
