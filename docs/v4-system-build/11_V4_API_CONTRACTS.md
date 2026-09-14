# 11 — V4 API Contracts

> Stable contracts between all system boundaries.
> Every new endpoint must be documented here before implementation begins.
> Format: path, method, auth, request, response, error codes, owner, consumer.

---

## 1. Authentication

All endpoints (except `/api/auth/login` and `/actuator/health`) require:
```
Authorization: Bearer {jwt_token}
```

Python services (`retrain.py`, `load.py`) use:
```
X-Service-Token: {service_token}
```

Error response for missing/invalid auth:
```json
{ "error": "Unauthorized", "status": 401 }
```

Error response for insufficient role:
```json
{ "error": "Forbidden", "status": 403 }
```

---

## 2. Standard Error Format

All error responses follow:
```json
{
  "error":   "Human-readable message",
  "status":  400,
  "path":    "/api/...",
  "timestamp": "2026-09-13T10:00:00Z"
}
```

---

## 3. Existing Endpoints (Confirmed Stable)

### Auth

#### `POST /api/auth/login`
- **Auth:** None (public)
- **Request:** `{ "username": string, "password": string }`
- **Response 200:** `{ "token": string, "role": string, "username": string }`
- **Response 401:** standard error
- **Owner:** Agent 1 | **Consumer:** Agent 2 (frontend login)

---

### Alerts

#### `GET /api/alerts`
- **Auth:** Any authenticated user
- **Query params:** `?siteId=site-001&status=active`
- **Response 200:**
```json
[{
  "id": "string",
  "siteId": "string",
  "severity": "Low | Medium | High | Critical",
  "status": "active | acknowledged",
  "title": "string",
  "description": "string",
  "rule": "string",
  "narrative": "string",
  "createdAt": "ISO8601",
  "acknowledgedAt": "ISO8601 | null",
  "acknowledgedBy": "string | null"
}]
```
- **Owner:** Agent 1 | **Consumer:** Agent 2

#### `POST /api/alerts/{id}/ack`
- **Auth:** `HSE_OFFICER | STATION_MANAGER | ADMIN`
- **Request:** `{}`
- **Response 200:** updated alert object
- **Owner:** Agent 1 | **Consumer:** Agent 2

---

### Risk

#### `GET /api/risk/summary`
- **Auth:** Any authenticated
- **Response 200:**
```json
[{
  "siteId": "string",
  "siteName": "string",
  "riskScore": 0,
  "severityBand": "Low | Medium | High | Critical",
  "incidentCount": 0,
  "pressureSpikeCount": 0,
  "daysSinceLastAudit": 0,
  "rejectedRate": 0.0,
  "lastAuditDate": "YYYY-MM-DD | null",
  "predictionProbability": 0.0,
  "modelVersion": "string | null"
}]
```
- **Owner:** Agent 1 | **Consumer:** Agent 2

---

### Analytics (V4 — DB-computed, all stable in production)

#### `GET /api/analytics/feature-importance`
- **Auth:** Any authenticated
- **Response 200:**
```json
{
  "modelVersion": "string",
  "features": [{ "feature": "string", "weight": 0.0 }]
}
```
- **Owner:** Agent 1 | **Consumer:** Agent 2

#### `GET /api/analytics/survival-curves`
- **Auth:** Any authenticated
- **Response 200:** `{ "sites": [{ "siteId": string, "data": [{ "week": int, "survivalFraction": float }] }] }`
- **Owner:** Agent 1 | **Consumer:** Agent 2

#### `GET /api/analytics/spi`
- **Auth:** Any authenticated
- **Response 200:** `{ "spi": float, "trend": "improving | stable | degrading", "periodDays": 30 }`
- **Owner:** Agent 1 | **Consumer:** Agent 2

---

### ROI Calculator

#### `GET /api/analytics/roi/reference-cases`
- **Auth:** Any authenticated
- **Response 200:**
```json
{
  "case_name": "string",
  "citation": "string",
  "incident_date": "YYYY-MM-DD",
  "gross_award_kes": 0,
  "default_assumptions": [
    { "key": "string", "label": "string", "value": 0.0,
      "provenance": "COURT_RECORD | ESTIMATE | SYNTHETIC" }
  ]
}
```
- **Owner:** Agent 1 | **Consumer:** Agent 2

#### `POST /api/analytics/roi/calculate`
- **Auth:** Any authenticated
- **Request:**
```json
{
  "interventionProbability": 0.70,
  "incidentExposureKes": 150000000,
  "nHighRiskAlerts": 3,
  "overfillLitresPerEvent": 5000,
  "annualPlatformCostKes": null
}
```
- **Response 200:**
```json
{
  "expectedSavingsKes": 0,
  "overfillLineSavingsKes": 0,
  "roiMultiple": 0.0,
  "breakdown": [{ "label": "string", "value": 0 }]
}
```
- **Owner:** Agent 1 | **Consumer:** Agent 2

---

## 4. New Endpoints — Stage 3 Control Plane

### Actuation

#### `POST /api/actuate/close-valve` *(NEW — Agent 1)*
- **Auth:** `STATION_MANAGER | ADMIN | SERVICE`
- **Request:**
```json
{
  "siteId": "string",
  "tankId": "string",
  "eventId": "string | null"
}
```
- **Response 200:**
```json
{
  "status": "simulated_success",
  "actuator": "MOCK",
  "latencyMs": 42,
  "actuationId": "uuid",
  "message": "Simulated valve closure — production deployment would bind to KPC SCADA interface"
}
```
- **Response 503:** `{ "error": "Actuation service unavailable", "status": 503 }`
- **Note:** Always returns `actuator: "MOCK"`. Never implies real hardware control.
- **Owner:** Agent 1 | **Consumer:** Agent 2 (demo page), Agent 1 (EventPublisher)

---

### Demo Trigger

#### `POST /api/demo/trigger-overfill` *(NEW — Agent 1)*
- **Auth:** `ADMIN | ML_ADMIN`
- **Request:**
```json
{ "siteId": "site-003" }
```
- **Response 200:**
```json
{
  "message": "Overfill event seeded for site-003",
  "tankLevelPct": 97.2,
  "alertId": "uuid",
  "eventId": "uuid",
  "actuationId": "uuid",
  "slackSent": true
}
```
- **Response 400:** `{ "error": "Invalid siteId", "status": 400 }`
- **Owner:** Agent 1 | **Consumer:** Agent 2 (live demo page)

---

### Executive Summary

#### `GET /api/executive/summary` *(NEW — Agent 1)*
- **Auth:** Any authenticated
- **Response 200:**
```json
{
  "overfillEventsPrevented": 0,
  "estimatedLitresSaved": 0,
  "estimatedKesExposureAvoided": 0,
  "systemUptimePercent": 99.9,
  "lastUpdated": "ISO8601",
  "period": "last_30_days"
}
```
- **Owner:** Agent 1 | **Consumer:** Agent 2 (executive dashboard)

---

### Event Log

#### `GET /api/event-log` *(NEW — Agent 1)*
- **Auth:** `STATION_MANAGER | ADMIN | ML_ADMIN`
- **Query params:** `?siteId=&limit=20`
- **Response 200:**
```json
[{
  "id": "uuid",
  "siteId": "string",
  "tankId": "string | null",
  "signalType": "overfill_risk | pressure_anomaly",
  "severity": "string",
  "value": 0.0,
  "threshold": 0.0,
  "alertId": "string | null",
  "firedAt": "ISO8601"
}]
```
- **Owner:** Agent 1 | **Consumer:** Agent 2 (demo page event feed)

---

### Actuation Log

#### `GET /api/actuation-log` *(NEW — Agent 1)*
- **Auth:** `STATION_MANAGER | ADMIN | ML_ADMIN`
- **Query params:** `?siteId=&limit=20`
- **Response 200:**
```json
[{
  "id": "uuid",
  "eventId": "uuid",
  "siteId": "string",
  "tankId": "string | null",
  "action": "CLOSE_VALVE",
  "actuator": "MOCK",
  "status": "simulated_success",
  "latencyMs": 0,
  "executedAt": "ISO8601"
}]
```
- **Owner:** Agent 1 | **Consumer:** Agent 2 (demo page)

---

## 5. ML Admin API Contracts

### Existing (stable)

#### `GET /api/ml/overview`
- **Auth:** `ML_ADMIN`
- **Response 200:**
```json
{
  "champion": { "id": "uuid", "version": "string", "algorithm": "string",
    "trainedAt": "ISO8601", "precisionScore": 0.0, "recallScore": 0.0,
    "f1Score": 0.0, "status": "champion", "approvedBy": "string | null",
    "approvedAt": "ISO8601 | null" },
  "challenger": { ...same shape... } | null
}
```

#### `GET /api/ml/model-registry`
- **Auth:** `ML_ADMIN`
- **Response 200:** array of model objects (same shape as above)

#### `GET /api/ml/training-runs`
- **Auth:** `ML_ADMIN`
- **Response 200:**
```json
[{
  "id": "uuid",
  "modelRegistryId": "uuid",
  "modelVersion": "string",
  "triggeredBy": "manual | schedule | feedback_threshold",
  "rowsUsed": 0,
  "feedbackRowsUsed": 0,
  "startedAt": "ISO8601",
  "completedAt": "ISO8601 | null",
  "notes": "string | null"
}]
```

#### `GET /api/ml/drift`
- **Auth:** `ML_ADMIN`
- **Response 200:**
```json
{
  "driftStatus": "ok | warning | critical",
  "baselineAccuracy": 0.0,
  "recentAccuracy": 0.0,
  "modelVersion": "string",
  "computedAt": "ISO8601"
}
```

#### `PATCH /api/ml/model-registry/{id}/promote`
- **Auth:** `ML_ADMIN`
- **Request:** `{}`
- **Response 200:** updated champion model object

#### `PATCH /api/ml/model-registry/{id}/reject`
- **Auth:** `ML_ADMIN`
- **Request:** `{ "notes": "string | null" }`
- **Response 200:** updated rejected model object

#### `PATCH /api/ml/model-registry/{id}/rollback`
- **Auth:** `ML_ADMIN`
- **Request:** `{}`
- **Response 200:** restored champion model object

#### `POST /api/ml/feedback`
- **Auth:** Any authenticated reviewer
- **Request:**
```json
{
  "predictionId": 0,
  "siteId": "string",
  "rating": "accurate | inaccurate | uncertain",
  "note": "string | null"
}
```
- **Response 201:** `{ "id": "uuid", "created": true }`

#### `GET /api/ml/predictions-for-review`
- **Auth:** `ML_ADMIN`
- **Response 200:**
```json
[{
  "predictionId": 0,
  "siteId": "string",
  "probability": 0.0,
  "confidenceBand": "confident | low | uncertain",
  "asOfDate": "YYYY-MM-DD",
  "existingRating": "accurate | inaccurate | uncertain | null"
}]
```

---

### New ML Endpoints (V4)

#### `POST /api/ml/model-registry` *(NEW — Agent 1)*
- **Auth:** `ML_ADMIN` or `X-Service-Token`
- **Request:**
```json
{
  "version": "logreg_v2",
  "algorithm": "logistic_regression",
  "precisionScore": 0.0,
  "recallScore": 0.0,
  "f1Score": 0.0,
  "artifactPath": "sentinel/models/logreg_v2.pkl",
  "artifactBlob": "base64-encoded-pkl | null",
  "featureImportance": "{\"feature_name\": 0.0}",
  "notes": "string | null"
}
```
- **Response 201:**
```json
{
  "id": "uuid",
  "version": "logreg_v2",
  "status": "challenger",
  "trainedAt": "ISO8601"
}
```
- **Response 409:** `{ "error": "A challenger already exists. Reject or promote it first.", "status": 409 }`
- **Owner:** Agent 1 | **Consumer:** Agent 3 (`retrain.py`)

#### `POST /api/ml/training-run` *(NEW — Agent 1)*
- **Auth:** `ML_ADMIN` or `X-Service-Token`
- **Request:**
```json
{
  "modelRegistryId": "uuid",
  "triggeredBy": "manual | schedule | feedback_threshold",
  "rowsUsed": 0,
  "feedbackRowsUsed": 0,
  "startedAt": "ISO8601",
  "completedAt": "ISO8601",
  "notes": "string | null"
}
```
- **Response 201:** `{ "id": "uuid" }`
- **Owner:** Agent 1 | **Consumer:** Agent 3 (`retrain.py`)

#### `GET /api/ml/feedback-export` *(NEW — Agent 1)*
- **Auth:** `X-Service-Token`
- **Query params:** `?excludeUncertain=true&minCount=5`
- **Response 200:**
```json
[{
  "id": "uuid",
  "siteId": "string",
  "predictionId": 0,
  "source": "human_review | capa_outcome",
  "rating": "accurate | inaccurate",
  "createdAt": "ISO8601"
}]
```
- **Owner:** Agent 1 | **Consumer:** Agent 3 (`retrain.py`)

#### `POST /api/ml/trigger-retrain` *(NEW — Agent 1)*
- **Auth:** `ML_ADMIN`
- **Request:** `{}`
- **Response 202:** `{ "message": "Retraining started", "triggeredAt": "ISO8601" }`
- **Response 409:** `{ "error": "A retraining job is already running", "status": 409 }`
- **Owner:** Agent 1 | **Consumer:** Agent 2 (Training Runs page "Retrain Now" button)

#### `GET /api/ml/retraining-schedule`
- **Auth:** `ML_ADMIN`
- **Response 200:**
```json
{
  "id": "uuid",
  "status": "disabled | scheduled | running | completed | failed | awaiting_review",
  "cadence": "weekly",
  "nextRunAt": "ISO8601 | null",
  "lastRunId": "uuid | null",
  "updatedAt": "ISO8601"
}
```

#### `PATCH /api/ml/retraining-schedule`
- **Auth:** `ML_ADMIN`
- **Request:** `{ "status": "scheduled | disabled", "cadence": "weekly" }`
- **Response 200:** updated schedule object

---

## 6. ETL / Ingestion API

#### `POST /api/etl/ingest`
- **Auth:** `X-API-Key: {etl_api_key}` header
- **Request:** live batch JSON payload (incidents, audits, environmental, predictions)
- **Response 200:** `{ "batchId": "string", "incidentsLoaded": 0, "auditsLoaded": 0 }`
- **Response 401:** standard error if API key invalid
- **Owner:** Agent 1 | **Consumer:** Agent 4 (CI cron `etl-cron.yml`)

---

## 7. HSE Workflow API

#### `POST /api/hazards`
- **Auth:** `FIELD_TECHNICIAN | HSE_OFFICER | ADMIN`
- **Request:** `{ "siteId", "category", "description", "severityEstimate", "photoUrl?" }`
- **Response 201:** hazard report object

#### `PATCH /api/hazards/{id}/risk-assessment`
- **Auth:** `HSE_OFFICER | ADMIN`
- **Request:** `{ "likelihoodRating": 1–5, "severityRating": 1–5, "mitigationNote"? }`
- **Response 200:** updated hazard report

#### `POST /api/capas`
- **Auth:** `HSE_OFFICER | ADMIN`
- **Request:** `{ "sourceAlertId"?, "sourceHazardId"?, "ownerId", "dueDate", "description" }`
- **Response 201:** CAPA object

#### `PATCH /api/capas/{id}/status`
- **Auth:** `HSE_OFFICER | STATION_MANAGER | ADMIN`
- **Request:** `{ "status": "in_progress | closed", "evidenceUrl"? }`
- **Response 200:** updated CAPA

---

## 8. Python ↔ Backend Service Token Protocol

Agent 3's Python scripts authenticate to Spring Boot using a `SERVICE_TOKEN` env var distinct from the user JWT. The token is a static secret (not a JWT), validated by a custom filter in Spring Security.

```
Header: X-Service-Token: {SERVICE_TOKEN}
```

Endpoints that accept `X-Service-Token`:
- `POST /api/ml/model-registry`
- `POST /api/ml/training-run`
- `GET /api/ml/feedback-export`
- `POST /api/etl/ingest` (uses `X-API-Key` — rename to `X-Service-Token` for consistency in V4)

**Note:** The service token is not a JWT — it does not expire and does not encode roles. It grants access only to the specific endpoints listed above, validated by endpoint-level annotation:
```java
@ServiceTokenRequired  // custom annotation checked by ServiceTokenFilter
```
