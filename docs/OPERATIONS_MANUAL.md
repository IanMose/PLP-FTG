# Sentinel — Operations Manual

> Last updated: September 2026
> Status: Production Ready (Stage 3 Complete)

---

## 1. System Overview

Sentinel is an autonomous control plane for spill and overfill prevention at Kenya Pipeline Company facilities. It monitors tank levels during loading operations and automatically triggers valve shutdowns when thresholds are breached.

### 1.1 Architecture

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Python     │───▶│  PostgreSQL  │◀───│  Spring Boot │
│   ETL        │    │  Database    │    │  Backend     │
└──────────────┘    └──────────────┘    └──────────────┘
      │                    │                    │
      │                    │                    ▼
      │                    │            ┌──────────────┐
      │                    └───────────▶│   Next.js    │
      │                                 │   Frontend   │
      ▼                                 └──────────────┘
┌──────────────┐                              │
│   Slack      │◀─────────────────────────────┘
│   Webhook    │
└──────────────┘
```

### 1.2 Key Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| ETL Pipeline | Python 3.11 | Data generation, ingestion, transformation, validation |
| Backend API | Spring Boot 3 / Java 21 | REST API, business logic, event processing |
| Frontend | Next.js 14 | Dashboard, executive view, demo interface |
| Database | PostgreSQL 15 | Persistent storage, fact tables, audit logs |
| Notifications | Slack Webhooks | Real-time alerts to operations channel |

---

## 2. Running the System

### 2.1 Local Development

```bash
# Terminal 1: Start PostgreSQL
docker run -d --name sentinel-db \
  -e POSTGRES_DB=sentinel \
  -e POSTGRES_USER=sentinel \
  -e POSTGRES_PASSWORD=sentinel \
  -p 5432:5432 postgres:15

# Terminal 2: Start Backend
cd sentinel-backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=postgres

# Terminal 3: Start Frontend
cd sentinel-frontend
pnpm install
pnpm run dev

# Terminal 4: Run ETL (one-shot)
cd sentinel
python3 src/generate_data.py
python3 -m src.ingest
python3 -m src.transform
python3 -m src.validate
python3 -m src.decide
python3 -m src.load
```

### 2.2 Production Deployment

Deployment is automated via GitHub Actions on merge to `main`:

1. Push to main branch
2. CI runs tests (ETL + Backend + Frontend)
3. Deploy job triggers Render deploy hook
4. Health check verifies deployment

**Manual deploy:**
```bash
# Trigger Render deploy
curl -X POST "$RENDER_DEPLOY_HOOK_URL"
```

---

## 3. Configuration

### 3.1 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | Authentication secret (64+ chars) | Yes |
| `CORS_ALLOWED_ORIGINS` | Frontend URL(s) | Yes |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook | No |
| `SLACK_ENABLED` | Enable/disable Slack notifications | No |
| `GROQ_API_KEY` | LLM API key for narratives | No |
| `ETL_API_KEY` | API key for ETL push endpoint | Yes |

### 3.2 Key Thresholds

| Threshold | Value | Location |
|-----------|-------|----------|
| Overfill warning | 90% | `TankTelemetryEntity.WARNING_THRESHOLD` |
| Overfill critical | 95% | `TankTelemetryEntity.OVERFILL_THRESHOLD` |
| Overfill emergency | 98% | `TankTelemetryEntity.CRITICAL_THRESHOLD` |
| Audit overdue | 14 days | `AlertRulesEngine.AUDIT_OVERDUE_DAYS` |
| High reject rate | 10% | `AlertRulesEngine.evaluateRejectionRate()` |

### 3.3 Slack Configuration

```yaml
# application.yml
sentinel:
  slack:
    webhook-url: ${SLACK_WEBHOOK_URL:}
    enabled: ${SLACK_ENABLED:false}
    channel: ${SLACK_CHANNEL:#sentinel-alerts}
  dashboard:
    url: ${DASHBOARD_URL:http://localhost:3000}
```

---

## 4. Monitoring

### 4.1 Health Check

```bash
# Backend health
curl https://sentinel-backend.onrender.com/actuator/health
# Expected: {"status":"UP"}

# Database connectivity
curl https://sentinel-backend.onrender.com/actuator/health/db
```

### 4.2 Key Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/api/executive/kpis` | Executive dashboard metrics |
| `/api/executive/dashboard` | Full dashboard data |
| `/api/executive/recent-events` | Live event feed |
| `/api/demo/status` | Demo system health |
| `/api/demo/trigger-overfill` | Trigger demo scenario |
| `/actuator/health` | Service health check |

### 4.3 Logs

- **Render dashboard** → sentinel-backend → Logs
- **GitHub Actions** → Workflows → CI → Job logs
- **Application logs** → Search for `EventService`, `ActuationService`, `SlackNotificationService`

---

## 5. Common Operations

### 5.1 Trigger Live Demo

```bash
# Standard demo (96.5% tank level)
curl -X POST https://sentinel-backend.onrender.com/api/demo/trigger-overfill

# Critical demo (98.7% tank level)
curl -X POST https://sentinel-backend.onrender.com/api/demo/trigger-critical
```

**Expected response:**
```json
{
  "success": true,
  "message": "Demo completed successfully",
  "eventId": "EVT-ABC12345",
  "actuationId": "ACT-DEF67890",
  "steps": [...],
  "totalTimeMs": 250
}
```

### 5.2 Check Demo Status

```bash
curl https://sentinel-backend.onrender.com/api/demo/status
```

### 5.3 Get Executive KPIs

```bash
# Last 24 hours (default)
curl https://sentinel-backend.onrender.com/api/executive/kpis

# Custom period
curl "https://sentinel-backend.onrender.com/api/executive/kpis?hoursBack=72"
```

### 5.4 Manual Data Push (ETL)

```bash
curl -X POST https://sentinel-backend.onrender.com/api/data/ingest \
  -H "X-ETL-Api-Key: $ETL_API_KEY" \
  -H "Content-Type: application/json" \
  -d @live_batch.json
```

---

## 6. Control Loop Flow

The detect → act → notify loop:

```
1. Tank Telemetry Reading Ingested
   └── tank_level_pct > 95% AND valve_status = "Open"
           │
           ▼
2. EventService.detectOverfillEvents()
   └── Creates event in event_log
   └── Deduplicates by loading_operation_id
           │
           ▼
3. EventService.processEvent()
   └── Checks if actuation required (severity >= High)
           │
           ▼
4. ActuationService.closeValve()
   └── Simulates valve close (95% success rate)
   └── Logs to actuation_log
           │
           ▼
5. SlackNotificationService.sendOverfillAlert()
   └── Sends Block Kit formatted message
   └── Includes actuation status
           │
           ▼
6. Event marked as processed
   └── Dashboard updates automatically
```

---

## 7. Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| Dashboard blank | Backend down | Check Render status, redeploy |
| No Slack messages | Webhook misconfigured | Verify `SLACK_WEBHOOK_URL` |
| Stale data | ETL not running | Check GitHub Actions cron |
| 401 errors | JWT expired | Re-authenticate |
| Demo not working | Event deduplicated | Wait 5 min or trigger with new parameters |
| 503 errors | DB connection exhausted | Check connection pool, restart |
| Actuation failing | Simulated failure (5% rate) | Retry, or check ActuationService logs |

### 7.1 Backend Not Starting

1. Check Render dashboard for service status
2. View Events tab for recent failures
3. Check logs for startup errors
4. Verify environment variables are set
5. Try manual redeploy

### 7.2 Database Issues

1. Check `DATABASE_URL` is correct
2. Verify Render managed DB is running
3. Check connection pool settings in `application.yml`
4. Run health check: `/actuator/health/db`

### 7.3 Slack Not Sending

1. Verify `SLACK_ENABLED=true`
2. Check `SLACK_WEBHOOK_URL` is set
3. Test webhook manually:
   ```bash
   curl -X POST "$SLACK_WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"text": "Test message"}'
   ```
4. Check SlackNotificationService logs for errors

---

## 8. Database Schema

### 8.1 Core Tables

| Table | Purpose |
|-------|---------|
| `dim_site` | Site/depot reference data |
| `fact_incidents` | Historical incident records |
| `fact_audits` | Audit compliance records |
| `fact_telemetry` | General telemetry readings |
| `fact_tank_telemetry` | Tank level readings (Stage 3) |
| `event_log` | Control-plane events (Stage 3) |
| `actuation_log` | Valve control audit trail (Stage 3) |
| `alerts` | Generated alerts |

### 8.2 Key Queries

```sql
-- Recent overfill events
SELECT * FROM event_log 
WHERE event_type = 'overfill_risk' 
ORDER BY created_at DESC 
LIMIT 10;

-- Successful actuations
SELECT * FROM actuation_log 
WHERE status = 'simulated_success' 
ORDER BY request_timestamp DESC;

-- Tank readings at risk
SELECT * FROM fact_tank_telemetry 
WHERE tank_level_pct > 95 
  AND valve_status = 'Open'
ORDER BY reading_timestamp DESC;
```

---

## 9. API Reference

### 9.1 Executive API

**GET /api/executive/kpis**
```json
{
  "eventsDetected": 5,
  "shutdownsTriggered": 4,
  "litresSaved": 2000,
  "kesSaved": 300000,
  "successRatePercent": 80.0,
  "periodHours": 24,
  "asOf": "2026-09-15T10:30:00"
}
```

**GET /api/executive/dashboard**
```json
{
  "kpis": { ... },
  "recentEvents": [ ... ],
  "siteBreakdown": [ ... ],
  "severityBreakdown": { ... }
}
```

### 9.2 Demo API

**POST /api/demo/trigger-overfill**
```json
// Request (optional)
{
  "siteId": "site-003",
  "tankId": "TANK-A1",
  "tankLevelPct": 96.5
}

// Response
{
  "success": true,
  "message": "Demo completed successfully",
  "eventId": "EVT-ABC12345",
  "actuationId": "ACT-DEF67890",
  "steps": [
    { "stepNumber": 1, "action": "Telemetry Ingested", ... },
    { "stepNumber": 2, "action": "Overfill Detected", ... },
    ...
  ],
  "totalTimeMs": 250
}
```

---

## 10. Support & Handover

### 10.1 Ownership

| Area | Owner |
|------|-------|
| Backend code | Development team |
| Frontend code | Development team |
| Database | Render managed |
| ETL pipeline | Data team |
| Slack workspace | KPC IT |

### 10.2 Training Required

1. Spring Boot basics (for backend maintenance)
2. Next.js basics (for frontend maintenance)
3. PostgreSQL administration
4. Render platform navigation
5. GitHub Actions workflow editing

### 10.3 Key Contacts

| Role | Contact |
|------|---------|
| On-call engineer | (Configure in team wiki) |
| Render support | https://render.com/support |
| GitHub support | https://support.github.com |

---

## 11. Security Notes

### 11.1 Secrets Management

- All secrets stored in Render dashboard environment variables
- Never commit secrets to git
- Rotate `JWT_SECRET` quarterly
- Rotate `ETL_API_KEY` if compromised

### 11.2 Access Control

- Backend endpoints require JWT authentication (except health checks)
- ETL push endpoint requires `X-ETL-Api-Key` header
- Demo endpoints are public (for hackathon judging)

### 11.3 Audit Trail

All control-plane actions are logged:
- `event_log` — every threshold breach detected
- `actuation_log` — every valve command (simulated or real)
- Slack notifications — sent to channel for human visibility

---

## 12. Future Enhancements

### Production Deployment

When deploying to production with real SCADA integration:

1. Replace `ActuationService` mock with real SCADA client
2. Update `actuator_type` from 'MOCK' to 'SCADA'
3. Add circuit breaker for SCADA communication
4. Implement retry logic with exponential backoff
5. Add PagerDuty escalation for failed actuations

### Honest Line for Judges

> "This calls a simulated actuator; production deployment would bind this endpoint to KPC's SCADA/valve control interface."

This disclaimer is included in all actuation-related API responses and Slack notifications.
