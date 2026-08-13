# Risk Score Breakdown + What-If Slider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a risk score breakdown panel and a real-time what-if slider panel to the site drill-down page, showing how each of the 5 formula factors contributes to the composite score and letting users adjust any factor to see the score update instantly.

**Architecture:** The breakdown panel is purely presentational — it computes per-factor contributions in TypeScript using the same formula as the backend, from scalar fields added to `SiteDetailDto`. The slider panel uses `onValueChange` to recompute the score synchronously in JavaScript on every pixel of drag (zero network), and `onValueCommit` to POST a server confirmation once on mouse-up. A shared `risk-formula.ts` utility keeps both panels in sync and guards against formula drift.

**Tech Stack:** Spring Boot 3 / JPA / Lombok (backend), Next.js 14 App Router / React / TypeScript / shadcn/ui (frontend). Slider: `@/components/ui/slider` (Radix UI, already installed). Progress bar: `@/components/ui/progress` (already installed). Skeleton: `@/components/ui/skeleton` (already installed).

## Global Constraints

- All backend DTOs use Lombok `@Data @Builder` — follow this pattern exactly
- Backend package names: new DTOs go in `com.sentinel.risk.dto`, new queries stay in their existing repository files
- `/api/sites/**` is already `permitAll()` in `SecurityConfig` — **do not change SecurityConfig**
- The simulate endpoint is a plain POST with no auth — `simulateRisk()` in `api.ts` must **not** call `authedOpts()` or `getAuthToken()` (Server Action — fails in client components)
- `SiteDetailView` is already `"use client"` — new components rendered inside it inherit this
- Follow existing `severityStyles` colour map in `site-detail-view.tsx` for all new severity-coloured elements
- No new npm packages — use only what is already in `package.json`
- Formula constants must exactly match `RiskService.java`: ceiling 2.0 for incidents, 1.8 for audit days, 500.0 for rejection rate, 10.0 for spikes, weights 0.30/0.30/0.20/0.10/0.10

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `sentinel-backend/src/main/java/com/sentinel/common/dto/SiteDetailDto.java` | Modify | Add 4 scalar fields: `incidentCount`, `critHighCount`, `daysSinceAudit`, `rejectedRate` |
| `sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java` | Modify | Populate 4 new fields in builder; make `computeRiskScore` package-private; add `loadLiveScalars()`; add `simulateScore()` |
| `sentinel-backend/src/main/java/com/sentinel/risk/RiskController.java` | Modify | Add `POST /{siteId}/simulate` endpoint |
| `sentinel-backend/src/main/java/com/sentinel/risk/dto/RiskSimulateRequestDto.java` | Create | 5 nullable override fields with `@Valid` constraints |
| `sentinel-backend/src/main/java/com/sentinel/risk/dto/RiskSimulateResponseDto.java` | Create | Score, band, delta, 5 weighted component contributions |
| `sentinel-backend/src/main/java/com/sentinel/site/IncidentRepository.java` | Modify | Add `getScalarsForSite()` aggregate projection |
| `sentinel-backend/src/main/java/com/sentinel/site/AuditRepository.java` | Modify | Add `findLatestAuditDateForSite()` single-site max-date query |
| `sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryRepository.java` | Modify | Add `countSpikesForSite()` targeted WHERE query |
| `sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryService.java` | Modify | Add `getSpikeCountForSite(String siteId)` delegate |
| `sentinel-backend/src/main/resources/db/migration/V11__add_telemetry_pressure_index.sql` | Create | `CREATE INDEX idx_telemetry_site_pressure ON fact_telemetry(site, pressure_psi)` |
| `sentinel-frontend/src/lib/sentinel/types.ts` | Modify | Add 4 fields to `SiteDetail`; add `WhatIfRequest`, `WhatIfResponse` |
| `sentinel-frontend/src/lib/sentinel/api.ts` | Modify | Add `simulateRisk()` — plain fetch, no auth |
| `sentinel-frontend/src/lib/sentinel/risk-formula.ts` | Create | `computeRiskScore()` TypeScript function mirroring Java formula exactly |
| `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/risk-score-breakdown.tsx` | Create | Static 5-factor breakdown card with progress bars |
| `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/what-if-panel.tsx` | Create | Interactive 5-slider panel with real-time score, server confirmation |
| `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/site-detail-view.tsx` | Modify | Import and render both new cards in 2-column grid |

---

## Task 1: Add 4 scalar fields to `SiteDetailDto` and populate them in `getSiteDetail()`

**Files:**
- Modify: `sentinel-backend/src/main/java/com/sentinel/common/dto/SiteDetailDto.java`
- Modify: `sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java`

**Interfaces:**
- Produces: `SiteDetailDto` with fields `incidentCount: int`, `critHighCount: int`, `daysSinceAudit: int`, `rejectedRate: double` — all later tasks depend on these being in the response JSON

- [ ] **Step 1: Add the 4 fields to `SiteDetailDto.java`**

Open `sentinel-backend/src/main/java/com/sentinel/common/dto/SiteDetailDto.java`.
Add these 4 fields after `pressureSpikeCount`:

```java
private int incidentCount;
private int critHighCount;
private int daysSinceAudit;
private double rejectedRate;
```

The full file after edit:

```java
package com.sentinel.common.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class SiteDetailDto {
    private String siteId;
    private String siteName;
    private String location;
    private Double latitude;
    private Double longitude;
    private int riskScore;
    private String severityBand;
    private int pressureSpikeCount;
    private int incidentCount;
    private int critHighCount;
    private int daysSinceAudit;
    private double rejectedRate;
    private List<IncidentDto> incidents;
    private List<AuditDto> audits;
    private List<TelemetryReadingDto> telemetryReadings;
}
```

- [ ] **Step 2: Populate the 4 new fields in `RiskService.getSiteDetail()`**

Open `sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java`.
Find the `return SiteDetailDto.builder()` call at the bottom of `getSiteDetail()`.
Add the 4 new fields. The variables `incidents.size()`, `critHigh`, `daysSinceAudit`, and `rejectedRate` are already computed earlier in the method:

```java
return SiteDetailDto.builder()
        .siteId(site.getSiteId())
        .siteName(site.getSiteName())
        .location(site.getLocation())
        .latitude(coords[0])
        .longitude(coords[1])
        .riskScore(riskScore)
        .severityBand(scoreToSeverityBand(riskScore))
        .pressureSpikeCount(pressureSpikes)
        .incidentCount(incidents.size())
        .critHighCount((int) critHigh)
        .daysSinceAudit(daysSinceAudit)
        .rejectedRate(Math.round(rejectedRate * 10000.0) / 10000.0)
        .incidents(incidentDtos)
        .audits(auditDtos)
        .telemetryReadings(telemetryReadings)
        .build();
```

- [ ] **Step 3: Start the backend and verify the response**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-backend
./mvnw spring-boot:run &
sleep 20
curl -s http://localhost:8080/api/sites/site-003 | python3 -m json.tool | grep -E '"incidentCount|critHighCount|daysSinceAudit|rejectedRate'
```

Expected output (exact numbers will vary by current date):
```
"incidentCount": 124,
"critHighCount": 87,
"daysSinceAudit": 21,
"rejectedRate": 0.0161,
```

All 4 fields must be present and non-zero for site-003.

- [ ] **Step 4: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-backend/src/main/java/com/sentinel/common/dto/SiteDetailDto.java
git add sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java
git commit -m "feat(risk): expose scalar risk inputs in SiteDetailDto"
```

---

## Task 2: Add lightweight repository queries for the simulate path

**Files:**
- Modify: `sentinel-backend/src/main/java/com/sentinel/site/IncidentRepository.java`
- Modify: `sentinel-backend/src/main/java/com/sentinel/site/AuditRepository.java`
- Modify: `sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryRepository.java`
- Modify: `sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryService.java`
- Create: `sentinel-backend/src/main/resources/db/migration/V11__add_telemetry_pressure_index.sql`

**Interfaces:**
- Produces: `IncidentRepository.getScalarsForSite(String siteId)` → `SiteIncidentScalars` with `getTotal()`, `getCritHigh()`, `getRejected()`
- Produces: `AuditRepository.findLatestAuditDateForSite(String siteId)` → `LocalDateTime`
- Produces: `TelemetryRepository.countSpikesForSite(String siteId)` → `Long`
- Produces: `TelemetryService.getSpikeCountForSite(String siteId)` → `int`

- [ ] **Step 1: Add scalar projection to `IncidentRepository`**

Open `sentinel-backend/src/main/java/com/sentinel/site/IncidentRepository.java`.
Add after the existing `findExistingIds` method:

```java
/** Projection interface for aggregate incident scalars per site. */
interface SiteIncidentScalars {
    long getTotal();
    long getCritHigh();
    long getRejected();
}

/**
 * Returns aggregate incident counts for a single site in one query.
 * Used by the simulate path — avoids loading the full incident collection.
 */
@Query("""
    SELECT COUNT(i) AS total,
           SUM(CASE WHEN i.severity IN ('Critical', 'High') THEN 1 ELSE 0 END) AS critHigh,
           SUM(CASE WHEN i.decision = 'rejected' THEN 1 ELSE 0 END) AS rejected
    FROM IncidentEntity i
    WHERE i.siteId = :siteId
    """)
SiteIncidentScalars getScalarsForSite(@Param("siteId") String siteId);
```

Note: The `@Param` import is already present in the file.

- [ ] **Step 2: Add single-site max-date query to `AuditRepository`**

Open `sentinel-backend/src/main/java/com/sentinel/site/AuditRepository.java`.
Add after `findLatestAuditDateBySite`:

```java
/**
 * Returns the most recent inspection date for a single site.
 * Used by the simulate path — avoids loading all audit rows.
 */
@Query("SELECT MAX(a.inspectionDate) FROM AuditEntity a WHERE a.siteId = :siteId")
LocalDateTime findLatestAuditDateForSite(@Param("siteId") String siteId);
```

Add the import at the top of the file:
```java
import java.time.LocalDateTime;
```

- [ ] **Step 3: Add targeted spike count query to `TelemetryRepository`**

Open `sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryRepository.java`.
Add after `findLatestBySite`:

```java
/**
 * Counts pressure spikes for a single site directly.
 * Replaces the current approach of loading all sites and filtering in Java.
 */
@Query("SELECT COUNT(t) FROM TelemetryEntity t WHERE t.site = :site AND (t.pressurePsi > 800 OR t.pressurePsi < 0)")
Long countSpikesForSite(@Param("site") String site);
```

Add the `@Param` import if not already present:
```java
import org.springframework.data.repository.query.Param;
```

- [ ] **Step 4: Add `getSpikeCountForSite` to `TelemetryService`**

Open `sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryService.java`.
Add after `getPressureSpikeCountForSite`:

```java
/**
 * Returns spike count for a single site using a targeted query.
 * Use this in the simulate path instead of getPressureSpikeCountForSite().
 */
public int getSpikeCountForSite(String siteId) {
    Long count = telemetryRepository.countSpikesForSite(siteId);
    return count != null ? count.intValue() : 0;
}
```

- [ ] **Step 5: Create the telemetry pressure index migration**

Create `sentinel-backend/src/main/resources/db/migration/V11__add_telemetry_pressure_index.sql`:

```sql
-- V11: Index on fact_telemetry(site, pressure_psi) to support targeted spike queries.
-- Replaces the full-table GROUP BY scan used by countPressureSpikesBySite().
CREATE INDEX IF NOT EXISTS idx_telemetry_site_pressure
    ON fact_telemetry(site, pressure_psi);
```

- [ ] **Step 6: Restart backend and verify new queries compile**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-backend
./mvnw spring-boot:run 2>&1 | grep -E "ERROR|Started|Failed"
```

Expected: `Started SentinelApplication` with no errors.

- [ ] **Step 7: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-backend/src/main/java/com/sentinel/site/IncidentRepository.java
git add sentinel-backend/src/main/java/com/sentinel/site/AuditRepository.java
git add sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryRepository.java
git add sentinel-backend/src/main/java/com/sentinel/telemetry/TelemetryService.java
git add sentinel-backend/src/main/resources/db/migration/V11__add_telemetry_pressure_index.sql
git commit -m "feat(risk): add lightweight scalar queries for simulate path"
```

---

## Task 3: Create `RiskSimulateRequestDto`, `RiskSimulateResponseDto`, and the simulate endpoint

**Files:**
- Create: `sentinel-backend/src/main/java/com/sentinel/risk/dto/RiskSimulateRequestDto.java`
- Create: `sentinel-backend/src/main/java/com/sentinel/risk/dto/RiskSimulateResponseDto.java`
- Modify: `sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java`
- Modify: `sentinel-backend/src/main/java/com/sentinel/risk/RiskController.java`

**Interfaces:**
- Consumes: `IncidentRepository.getScalarsForSite()`, `AuditRepository.findLatestAuditDateForSite()`, `TelemetryService.getSpikeCountForSite()` (from Task 2)
- Produces: `POST /api/sites/{siteId}/simulate` accepting `RiskSimulateRequestDto`, returning `RiskSimulateResponseDto`

- [ ] **Step 1: Create the `dto` package directory**

The `com.sentinel.risk.dto` package needs a new directory. Create the first file there and Java will resolve the package automatically.

- [ ] **Step 2: Create `RiskSimulateRequestDto.java`**

Create `sentinel-backend/src/main/java/com/sentinel/risk/dto/RiskSimulateRequestDto.java`:

```java
package com.sentinel.risk.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

/**
 * Request body for POST /api/sites/{siteId}/simulate.
 *
 * All fields are nullable — null means "use the site's live value".
 * critHighPercentOverride is 0-100 (percentage), not a raw count.
 * rejectionRateOverride is 0.0-1.0 (fraction), not a percentage.
 */
@Data
public class RiskSimulateRequestDto {

    @Min(0) @Max(200)
    private Integer incidentCountOverride;

    @Min(0) @Max(100)
    private Integer critHighPercentOverride;

    @Min(0) @Max(365)
    private Integer daysSinceAuditOverride;

    @DecimalMin("0.0") @DecimalMax("1.0")
    private Double rejectionRateOverride;

    @Min(0) @Max(20)
    private Integer pressureSpikesOverride;
}
```

- [ ] **Step 3: Create `RiskSimulateResponseDto.java`**

Create `sentinel-backend/src/main/java/com/sentinel/risk/dto/RiskSimulateResponseDto.java`:

```java
package com.sentinel.risk.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Response for POST /api/sites/{siteId}/simulate.
 *
 * Component contributions are weighted points (e.g., incidentFrequencyContrib
 * is up to 30.0 because its weight is 0.30 and the sub-score ceiling is 100).
 * All 5 contribs sum to simulatedScore (within rounding).
 */
@Data
@Builder
public class RiskSimulateResponseDto {
    private int currentScore;
    private String currentBand;
    private int simulatedScore;
    private String simulatedBand;
    private int scoreDelta;                     // simulatedScore - currentScore

    // Per-factor weighted contributions (max values: 30, 30, 20, 10, 10)
    private double incidentFrequencyContrib;
    private double severityMixContrib;
    private double auditRecencyContrib;
    private double rejectionRateContrib;
    private double pressureSpikesContrib;

    // Live baseline values (useful for slider reset)
    private int liveDaysSinceAudit;
    private int liveIncidentCount;
    private int liveCritHighPercent;
    private double liveRejectionRate;
    private int livePressureSpikes;
}
```

- [ ] **Step 4: Add `loadLiveScalars()` and `simulateScore()` to `RiskService`**

Open `sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java`.

First, change the `computeRiskScore` visibility from `private` to package-private (remove the `private` keyword):

```java
// BEFORE:
private int computeRiskScore(long incidentCount, long criticalHighCount,
                              int daysSinceAudit, double rejectedRate, int pressureSpikes) {

// AFTER:
int computeRiskScore(long incidentCount, long criticalHighCount,
                     int daysSinceAudit, double rejectedRate, int pressureSpikes) {
```

Then add these two methods after `getSiteDetail()` and before `computeRiskScore()`. Also add the required import at the top of the file:
```java
import com.sentinel.risk.dto.RiskSimulateRequestDto;
import com.sentinel.risk.dto.RiskSimulateResponseDto;
```

```java
/**
 * Loads the 5 live scalar inputs for a site using lightweight aggregate queries.
 * Returns a double[] array: [incidentCount, critHigh, daysSinceAudit, rejectedRate, spikes]
 */
private double[] loadLiveScalars(String siteId) {
    IncidentRepository.SiteIncidentScalars inc = incidentRepository.getScalarsForSite(siteId);
    long total    = inc != null ? inc.getTotal()    : 0L;
    long critHigh = inc != null ? inc.getCritHigh() : 0L;
    long rejected = inc != null ? inc.getRejected() : 0L;

    java.time.LocalDateTime lastAudit = auditRepository.findLatestAuditDateForSite(siteId);
    int daysSince = lastAudit != null
            ? (int) java.time.temporal.ChronoUnit.DAYS.between(lastAudit.toLocalDate(), java.time.LocalDate.now())
            : 365;

    int spikes = telemetryService.getSpikeCountForSite(siteId);
    double rejectedRate = total > 0 ? (double) rejected / total : 0.0;

    return new double[]{ total, critHigh, daysSince, rejectedRate, spikes };
}

/**
 * Simulates the risk score with optional overrides applied to live values.
 * No data is persisted. Used by POST /api/sites/{siteId}/simulate.
 */
public RiskSimulateResponseDto simulateScore(String siteId, RiskSimulateRequestDto req) {
    double[] live = loadLiveScalars(siteId);
    long  liveTotal    = (long)  live[0];
    long  liveCritHigh = (long)  live[1];
    int   liveDays     = (int)   live[2];
    double liveRejRate = live[3];
    int   liveSpikes   = (int)   live[4];

    int currentScore = computeRiskScore(liveTotal, liveCritHigh, liveDays, liveRejRate, liveSpikes);

    // Apply overrides — null means keep live value
    long incidents = req.getIncidentCountOverride() != null
            ? req.getIncidentCountOverride() : liveTotal;
    // critHighPercent is 0-100; convert to count against the simulated incident total
    long critHigh = req.getCritHighPercentOverride() != null
            ? Math.round(incidents * req.getCritHighPercentOverride() / 100.0) : liveCritHigh;
    int auditDays = req.getDaysSinceAuditOverride() != null
            ? req.getDaysSinceAuditOverride() : liveDays;
    double rejection = req.getRejectionRateOverride() != null
            ? req.getRejectionRateOverride() : liveRejRate;
    int spikes = req.getPressureSpikesOverride() != null
            ? req.getPressureSpikesOverride() : liveSpikes;

    // Per-component weighted contributions
    double incContrib  = Math.min(incidents / 2.0, 100.0)                               * 0.30;
    double sevContrib  = incidents > 0 ? Math.min(critHigh * 100.0 / incidents, 100.0) * 0.30 : 0.0;
    double audContrib  = Math.min(auditDays / 1.8, 100.0)                               * 0.20;
    double rejContrib  = Math.min(rejection * 500.0, 100.0)                             * 0.10;
    double spikeContrib = Math.min(spikes * 10.0, 100.0)                               * 0.10;

    int simScore = computeRiskScore(incidents, critHigh, auditDays, rejection, spikes);

    int liveCritHighPct = liveTotal > 0
            ? (int) Math.round(liveCritHigh * 100.0 / liveTotal) : 0;

    return RiskSimulateResponseDto.builder()
            .currentScore(currentScore)
            .currentBand(scoreToSeverityBand(currentScore))
            .simulatedScore(simScore)
            .simulatedBand(scoreToSeverityBand(simScore))
            .scoreDelta(simScore - currentScore)
            .incidentFrequencyContrib(Math.round(incContrib  * 100.0) / 100.0)
            .severityMixContrib      (Math.round(sevContrib  * 100.0) / 100.0)
            .auditRecencyContrib     (Math.round(audContrib  * 100.0) / 100.0)
            .rejectionRateContrib    (Math.round(rejContrib  * 100.0) / 100.0)
            .pressureSpikesContrib   (Math.round(spikeContrib * 100.0) / 100.0)
            .liveDaysSinceAudit(liveDays)
            .liveIncidentCount((int) liveTotal)
            .liveCritHighPercent(liveCritHighPct)
            .liveRejectionRate(Math.round(liveRejRate * 10000.0) / 10000.0)
            .livePressureSpikes(liveSpikes)
            .build();
}
```

- [ ] **Step 5: Add the simulate endpoint to `RiskController`**

Open `sentinel-backend/src/main/java/com/sentinel/risk/RiskController.java`.

Add these imports at the top:
```java
import com.sentinel.risk.dto.RiskSimulateRequestDto;
import com.sentinel.risk.dto.RiskSimulateResponseDto;
import jakarta.validation.Valid;
```

Add this method after `getSiteDetail()`:
```java
/** POST /api/sites/{siteId}/simulate — what-if risk simulation, no persistence */
@PostMapping("/{siteId}/simulate")
public ResponseEntity<RiskSimulateResponseDto> simulate(
        @PathVariable String siteId,
        @RequestBody @Valid RiskSimulateRequestDto request) {
    return ResponseEntity.ok(riskService.simulateScore(siteId, request));
}
```

- [ ] **Step 6: Test the simulate endpoint**

Start the backend if not running, then test:

```bash
# All nulls — simulated must equal current
curl -s -X POST http://localhost:8080/api/sites/site-003/simulate \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool | grep -E "Score|Band|Delta|Contrib"

# Max audit days — auditRecencyContrib must be 20.0
curl -s -X POST http://localhost:8080/api/sites/site-003/simulate \
  -H "Content-Type: application/json" \
  -d '{"daysSinceAuditOverride": 365}' | python3 -m json.tool | grep "auditRecencyContrib"
```

Expected for second call: `"auditRecencyContrib": 20.0`

- [ ] **Step 7: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-backend/src/main/java/com/sentinel/risk/dto/
git add sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java
git add sentinel-backend/src/main/java/com/sentinel/risk/RiskController.java
git commit -m "feat(risk): add simulate endpoint with per-component breakdown"
```

---

## Task 4: Update TypeScript types and add `simulateRisk()` to `api.ts`

**Files:**
- Modify: `sentinel-frontend/src/lib/sentinel/types.ts`
- Modify: `sentinel-frontend/src/lib/sentinel/api.ts`

**Interfaces:**
- Consumes: `POST /api/sites/{siteId}/simulate` (from Task 3)
- Produces: `SiteDetail` extended with 4 new fields; `WhatIfRequest` and `WhatIfResponse` types; `simulateRisk(siteId, overrides)` function

- [ ] **Step 1: Add 4 fields to `SiteDetail` and add simulation types in `types.ts`**

Open `sentinel-frontend/src/lib/sentinel/types.ts`.

In the `SiteDetail` interface, add 4 fields after `pressureSpikeCount`:

```typescript
export interface SiteDetail {
  siteId: string;
  siteName: string;
  location: string;
  latitude: number;
  longitude: number;
  riskScore: number;
  severityBand: SeverityBand;
  pressureSpikeCount: number;
  // Risk formula inputs — used by breakdown panel and what-if slider
  incidentCount: number;
  critHighCount: number;
  daysSinceAudit: number;
  rejectedRate: number;
  incidents: Incident[];
  audits: Audit[];
  telemetryReadings: TelemetryReading[];
}
```

Append these two interfaces at the end of the file:

```typescript
// What-If Simulation

export interface WhatIfRequest {
  incidentCountOverride?: number;
  critHighPercentOverride?: number;  // 0-100 percentage
  daysSinceAuditOverride?: number;
  rejectionRateOverride?: number;    // 0.0-1.0 fraction
  pressureSpikesOverride?: number;
}

export interface WhatIfResponse {
  currentScore: number;
  currentBand: SeverityBand;
  simulatedScore: number;
  simulatedBand: SeverityBand;
  scoreDelta: number;
  incidentFrequencyContrib: number;  // max 30.0
  severityMixContrib: number;        // max 30.0
  auditRecencyContrib: number;       // max 20.0
  rejectionRateContrib: number;      // max 10.0
  pressureSpikesContrib: number;     // max 10.0
  liveDaysSinceAudit: number;
  liveIncidentCount: number;
  liveCritHighPercent: number;
  liveRejectionRate: number;
  livePressureSpikes: number;
}
```

- [ ] **Step 2: Add `simulateRisk()` to `api.ts`**

Open `sentinel-frontend/src/lib/sentinel/api.ts`.

Update the import line at the top to include `WhatIfRequest` and `WhatIfResponse`:
```typescript
import type { Alert, DataQualitySummary, IngestBatch, SiteDetail, SiteRiskSummary, TelemetrySummary, WhatIfRequest, WhatIfResponse } from "./types";
```

Add this function in the `// ─── Risk ───` section, after `fetchSiteDetail`:

```typescript
/**
 * POST /api/sites/{siteId}/simulate
 *
 * What-if risk simulation — no auth required (/api/sites/** is permitAll()).
 * IMPORTANT: This is a plain fetch — do NOT use authedOpts() here.
 * authedOpts() calls getAuthToken() which is a Server Action and will
 * throw "Server Actions can only be called from Client Components" when
 * invoked from a client-side event handler.
 */
export async function simulateRisk(
  siteId: string,
  overrides: WhatIfRequest,
): Promise<WhatIfResponse> {
  const res = await fetch(`${requireApiBase()}/api/sites/${siteId}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: makeTimeoutSignal(),
    body: JSON.stringify(overrides),
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-frontend
npx tsc --noEmit 2>&1 | head -30
```

Expected: no output (zero TypeScript errors).

- [ ] **Step 4: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-frontend/src/lib/sentinel/types.ts
git add sentinel-frontend/src/lib/sentinel/api.ts
git commit -m "feat(frontend): add WhatIf types and simulateRisk API function"
```

---

## Task 5: Create `risk-formula.ts` — the shared frontend formula utility

**Files:**
- Create: `sentinel-frontend/src/lib/sentinel/risk-formula.ts`

**Interfaces:**
- Produces:
  - `computeRiskScore(incidentCount, critHighCount, daysSinceAudit, rejectedRate, pressureSpikes): RiskScoreResult`
  - `scoreToBand(score: number): SeverityBand`
  - `interface RiskScoreResult { score: number; band: SeverityBand; contribs: RiskContribs }`
  - `interface RiskContribs { incidentFrequency: number; severityMix: number; auditRecency: number; rejectionRate: number; pressureSpikes: number }`

- [ ] **Step 1: Create `risk-formula.ts`**

Create `sentinel-frontend/src/lib/sentinel/risk-formula.ts`:

```typescript
/**
 * Frontend mirror of RiskService.java computeRiskScore().
 *
 * CRITICAL: This formula MUST match RiskService.java exactly.
 * If the Java formula changes, update this file in the same commit.
 *
 * Formula constants (must match Java):
 *   incidentCeiling : 2.0   (200 incidents = max sub-score)
 *   auditCeiling    : 1.8   (180 days = max sub-score)
 *   rejectionAmp    : 500.0 (amplifier — 20% rejection → max sub-score)
 *   spikeCeiling    : 10.0  (10 spikes = max sub-score)
 *   weights         : 0.30 / 0.30 / 0.20 / 0.10 / 0.10
 */

import type { SeverityBand } from "./types";

export interface RiskContribs {
  incidentFrequency: number;  // weighted pts, max 30
  severityMix: number;        // weighted pts, max 30
  auditRecency: number;       // weighted pts, max 20
  rejectionRate: number;      // weighted pts, max 10
  pressureSpikes: number;     // weighted pts, max 10
}

export interface RiskScoreResult {
  score: number;
  band: SeverityBand;
  contribs: RiskContribs;
}

export function scoreToBand(score: number): SeverityBand {
  if (score >= 75) return "Critical";
  if (score >= 55) return "High";
  if (score >= 30) return "Medium";
  return "Low";
}

/**
 * Computes the composite risk score and per-factor weighted contributions.
 *
 * @param incidentCount  - total incident count for the site
 * @param critHighCount  - number of Critical or High severity incidents
 * @param daysSinceAudit - calendar days since last audit (365 if never audited)
 * @param rejectedRate   - fraction of records rejected (0.0 to 1.0)
 * @param pressureSpikes - count of out-of-range pressure readings
 */
export function computeRiskScore(
  incidentCount: number,
  critHighCount: number,
  daysSinceAudit: number,
  rejectedRate: number,
  pressureSpikes: number,
): RiskScoreResult {
  const incidentSub  = Math.min(incidentCount / 2.0, 100);
  const severitySub  = incidentCount > 0
    ? Math.min((critHighCount / incidentCount) * 100, 100) : 0;
  const auditSub     = Math.min(daysSinceAudit / 1.8, 100);
  const rejectionSub = Math.min(rejectedRate * 500, 100);
  const spikeSub     = Math.min(pressureSpikes * 10, 100);

  const contribs: RiskContribs = {
    incidentFrequency: Math.round(incidentSub  * 0.30 * 100) / 100,
    severityMix:       Math.round(severitySub  * 0.30 * 100) / 100,
    auditRecency:      Math.round(auditSub     * 0.20 * 100) / 100,
    rejectionRate:     Math.round(rejectionSub * 0.10 * 100) / 100,
    pressureSpikes:    Math.round(spikeSub     * 0.10 * 100) / 100,
  };

  const raw = contribs.incidentFrequency + contribs.severityMix +
              contribs.auditRecency + contribs.rejectionRate + contribs.pressureSpikes;

  const score = Math.min(Math.max(Math.round(raw), 0), 100);

  return { score, band: scoreToBand(score), contribs };
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Manually validate the formula against a known input**

Open the browser console on any page and paste:

```javascript
// Paste this to verify — should equal approximately the server score for site-003
const inc = 124, critH = 87, days = 21, rej = 0.016, spk = 3;
const iS = Math.min(inc/2,100)*0.30;
const sS = Math.min(critH/inc*100,100)*0.30;
const aS = Math.min(days/1.8,100)*0.20;
const rS = Math.min(rej*500,100)*0.10;
const pS = Math.min(spk*10,100)*0.10;
console.log("Score:", Math.round(iS+sS+aS+rS+pS), "Contribs:", {iS,sS,aS,rS,pS});
```

Compare the result against `curl http://localhost:8080/api/sites/site-003 | python3 -m json.tool | grep riskScore`. They must match within ±1 (rounding difference).

- [ ] **Step 4: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-frontend/src/lib/sentinel/risk-formula.ts
git commit -m "feat(frontend): add shared risk formula utility (mirrors RiskService.java)"
```

---

## Task 6: Build `RiskScoreBreakdown` — static 5-factor breakdown card

**Files:**
- Create: `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/risk-score-breakdown.tsx`

**Interfaces:**
- Consumes: `computeRiskScore()` from `@/lib/sentinel/risk-formula`; `severityStyles` pattern from existing `site-detail-view.tsx`
- Produces: `<RiskScoreBreakdown>` component accepting props below

Props:
```typescript
interface RiskScoreBreakdownProps {
  riskScore: number;
  severityBand: SeverityBand;
  incidentCount: number;
  critHighCount: number;
  daysSinceAudit: number;
  rejectedRate: number;      // 0.0-1.0
  pressureSpikeCount: number;
}
```

- [ ] **Step 1: Create `risk-score-breakdown.tsx`**

Create `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/risk-score-breakdown.tsx`:

```tsx
"use client";

import { Activity, Calendar, Gauge, ShieldAlert, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { computeRiskScore } from "@/lib/sentinel/risk-formula";
import type { SeverityBand } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface RiskScoreBreakdownProps {
  riskScore: number;
  severityBand: SeverityBand;
  incidentCount: number;
  critHighCount: number;
  daysSinceAudit: number;
  rejectedRate: number;
  pressureSpikeCount: number;
}

const bandStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  High: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Low: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

/** Progress bar fill colour based on how dominant a factor is (% of its max weight) */
function factorBarClass(contrib: number, maxWeight: number): string {
  const pct = contrib / maxWeight;
  if (pct >= 0.75) return "[&>div]:bg-red-500";
  if (pct >= 0.45) return "[&>div]:bg-orange-400";
  return "[&>div]:bg-primary";
}

export function RiskScoreBreakdown({
  riskScore,
  severityBand,
  incidentCount,
  critHighCount,
  daysSinceAudit,
  rejectedRate,
  pressureSpikeCount,
}: RiskScoreBreakdownProps) {
  const { contribs } = computeRiskScore(
    incidentCount,
    critHighCount,
    daysSinceAudit,
    rejectedRate,
    pressureSpikeCount,
  );

  const critHighPct = incidentCount > 0
    ? Math.round((critHighCount / incidentCount) * 100) : 0;

  const factors = [
    {
      icon: Activity,
      label: "Incident frequency",
      weight: "30%",
      contrib: contribs.incidentFrequency,
      maxWeight: 30,
      detail: `${incidentCount} incidents recorded`,
    },
    {
      icon: ShieldAlert,
      label: "Severity mix",
      weight: "30%",
      contrib: contribs.severityMix,
      maxWeight: 30,
      detail: `${critHighCount} of ${incidentCount} are Critical/High (${critHighPct}%)`,
    },
    {
      icon: Calendar,
      label: "Audit recency",
      weight: "20%",
      contrib: contribs.auditRecency,
      maxWeight: 20,
      detail: daysSinceAudit === 365 ? "Never audited" : `Last audited ${daysSinceAudit} days ago`,
    },
    {
      icon: Gauge,
      label: "Rejection rate",
      weight: "10%",
      contrib: contribs.rejectionRate,
      maxWeight: 10,
      detail: `${(rejectedRate * 100).toFixed(1)}% of records rejected`,
    },
    {
      icon: Zap,
      label: "Pressure spikes",
      weight: "10%",
      contrib: contribs.pressureSpikes,
      maxWeight: 10,
      detail: `${pressureSpikeCount} spike event${pressureSpikeCount === 1 ? "" : "s"} detected`,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Risk Score Breakdown</CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={cn(bandStyles[severityBand])}>{severityBand}</Badge>
            <Badge variant="outline" className="tabular-nums font-mono">
              {riskScore}/100
            </Badge>
          </div>
        </div>
        <CardDescription>How the composite score is composed across 5 factors</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {factors.map(({ icon: Icon, label, weight, contrib, maxWeight, detail }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 font-medium">
                <Icon className="size-3.5 text-muted-foreground" />
                {label}
                <span className="text-muted-foreground font-normal">({weight})</span>
              </span>
              <span className="tabular-nums text-muted-foreground text-xs">
                {contrib.toFixed(1)} / {maxWeight} pts
              </span>
            </div>
            {/* Progress value is contrib as % of maxWeight, scaled to 100 */}
            <Progress
              value={(contrib / maxWeight) * 100}
              className={cn("h-1.5", factorBarClass(contrib, maxWeight))}
            />
            <p className="text-muted-foreground text-xs">{detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/risk-score-breakdown.tsx
git commit -m "feat(frontend): add RiskScoreBreakdown component with 5-factor progress bars"
```

---

## Task 7: Build `WhatIfPanel` — interactive 5-slider real-time simulation

**Files:**
- Create: `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/what-if-panel.tsx`

**Interfaces:**
- Consumes: `computeRiskScore()` from `@/lib/sentinel/risk-formula`; `simulateRisk()` from `@/lib/sentinel/api`; `WhatIfResponse` from `@/lib/sentinel/types`
- Produces: `<WhatIfPanel>` component

Props:
```typescript
interface WhatIfPanelProps {
  siteId: string;
  currentScore: number;
  currentBand: SeverityBand;
  liveIncidentCount: number;
  liveCritHighCount: number;
  liveDaysSinceAudit: number;
  liveRejectedRate: number;   // 0.0-1.0
  livePressureSpikes: number;
}
```

- [ ] **Step 1: Create `what-if-panel.tsx`**

Create `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/what-if-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Activity, Calendar, Gauge, RotateCcw, ShieldAlert, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { simulateRisk } from "@/lib/sentinel/api";
import { computeRiskScore } from "@/lib/sentinel/risk-formula";
import type { SeverityBand, WhatIfResponse } from "@/lib/sentinel/types";
import { cn } from "@/lib/utils";

interface WhatIfPanelProps {
  siteId: string;
  currentScore: number;
  currentBand: SeverityBand;
  liveIncidentCount: number;
  liveCritHighCount: number;
  liveDaysSinceAudit: number;
  liveRejectedRate: number;
  livePressureSpikes: number;
}

const bandStyles: Record<SeverityBand, string> = {
  Critical: "bg-red-500/10 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  High: "bg-orange-500/10 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  Medium: "bg-yellow-500/10 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-400",
  Low: "bg-green-500/10 text-green-700 dark:bg-green-500/15 dark:text-green-400",
};

const deltaClass = (delta: number) =>
  delta > 0 ? "text-red-600 dark:text-red-400" : delta < 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground";

export function WhatIfPanel({
  siteId,
  currentScore,
  currentBand,
  liveIncidentCount,
  liveCritHighCount,
  liveDaysSinceAudit,
  liveRejectedRate,
  livePressureSpikes,
}: WhatIfPanelProps) {
  // Initialise sliders from live values
  const liveCritHighPct = liveIncidentCount > 0
    ? Math.round((liveCritHighCount / liveIncidentCount) * 100) : 0;

  const [incidentCount,  setIncidentCount]  = useState(liveIncidentCount);
  const [critHighPct,    setCritHighPct]    = useState(liveCritHighPct);
  const [auditDays,      setAuditDays]      = useState(liveDaysSinceAudit);
  const [rejectionPct,   setRejectionPct]   = useState(Math.round(liveRejectedRate * 100));
  const [pressureSpikes, setPressureSpikes] = useState(livePressureSpikes);

  // Server-confirmed breakdown (updates on onValueCommit — once per gesture)
  const [serverResult, setServerResult] = useState<WhatIfResponse | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  // ── Real-time score: pure JS, zero network, updates on every onValueChange ──
  const critHighCount = Math.round(incidentCount * critHighPct / 100);
  const rejectedRate  = rejectionPct / 100;
  const { score: simScore, band: simBand, contribs } = computeRiskScore(
    incidentCount,
    critHighCount,
    auditDays,
    rejectedRate,
    pressureSpikes,
  );
  const delta = simScore - currentScore;

  // ── Server confirmation: fires once on mouse-up (onValueCommit) ──
  const confirmWithServer = async () => {
    setIsConfirming(true);
    try {
      const result = await simulateRisk(siteId, {
        incidentCountOverride:    incidentCount,
        critHighPercentOverride:  critHighPct,
        daysSinceAuditOverride:   auditDays,
        rejectionRateOverride:    rejectedRate,
        pressureSpikesOverride:   pressureSpikes,
      });
      setServerResult(result);
    } catch {
      // Server confirmation is non-blocking — local compute already showed the score
    } finally {
      setIsConfirming(false);
    }
  };

  const reset = () => {
    setIncidentCount(liveIncidentCount);
    setCritHighPct(liveCritHighPct);
    setAuditDays(liveDaysSinceAudit);
    setRejectionPct(Math.round(liveRejectedRate * 100));
    setPressureSpikes(livePressureSpikes);
    setServerResult(null);
  };

  const isAtLiveValues =
    incidentCount  === liveIncidentCount &&
    critHighPct    === liveCritHighPct &&
    auditDays      === liveDaysSinceAudit &&
    rejectionPct   === Math.round(liveRejectedRate * 100) &&
    pressureSpikes === livePressureSpikes;

  const displayContribs = serverResult
    ? {
        incidentFrequency: serverResult.incidentFrequencyContrib,
        severityMix:       serverResult.severityMixContrib,
        auditRecency:      serverResult.auditRecencyContrib,
        rejectionRate:     serverResult.rejectionRateContrib,
        pressureSpikes:    serverResult.pressureSpikesContrib,
      }
    : contribs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">What-If: Risk Drivers</CardTitle>
        <CardDescription>
          Adjust any factor to see how the score changes in real time.
          Audit frequency is the leading indicator in the Kimeu v. KPC judgment.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── Sliders ── */}
        <div className="space-y-4">

          {/* Incident count */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Activity className="size-3.5 text-muted-foreground" />
                Incident count
              </span>
              <span className="tabular-nums font-mono text-xs">{incidentCount} / 200</span>
            </div>
            <Slider
              value={[incidentCount]}
              min={0} max={200} step={1}
              onValueChange={([v]) => setIncidentCount(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0</span><span>200</span>
            </div>
          </div>

          {/* Critical/High % */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="size-3.5 text-muted-foreground" />
                Critical/High severity
              </span>
              <span className="tabular-nums font-mono text-xs">{critHighPct}%</span>
            </div>
            <Slider
              value={[critHighPct]}
              min={0} max={100} step={1}
              onValueChange={([v]) => setCritHighPct(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0%</span><span>100%</span>
            </div>
          </div>

          {/* Audit recency */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-muted-foreground" />
                Days since last audit
              </span>
              <span className="tabular-nums font-mono text-xs">{auditDays}d</span>
            </div>
            <Slider
              value={[auditDays]}
              min={0} max={365} step={1}
              onValueChange={([v]) => setAuditDays(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>Audited today</span><span>Never (365d)</span>
            </div>
          </div>

          {/* Rejection rate */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Gauge className="size-3.5 text-muted-foreground" />
                Data rejection rate
              </span>
              <span className="tabular-nums font-mono text-xs">{rejectionPct}%</span>
            </div>
            <Slider
              value={[rejectionPct]}
              min={0} max={100} step={1}
              onValueChange={([v]) => setRejectionPct(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0%</span><span>100%</span>
            </div>
          </div>

          {/* Pressure spikes */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5">
                <Zap className="size-3.5 text-muted-foreground" />
                Pressure spike events
              </span>
              <span className="tabular-nums font-mono text-xs">{pressureSpikes}</span>
            </div>
            <Slider
              value={[pressureSpikes]}
              min={0} max={20} step={1}
              onValueChange={([v]) => setPressureSpikes(v)}
              onValueCommit={confirmWithServer}
            />
            <div className="flex justify-between text-muted-foreground text-[10px]">
              <span>0</span><span>20</span>
            </div>
          </div>
        </div>

        {/* ── Score result ── */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Current:&nbsp;
              <span className="font-mono font-medium text-foreground">{currentScore}</span>
              &nbsp;<Badge className={cn("text-[10px]", bandStyles[currentBand])}>{currentBand}</Badge>
            </div>
            <div className="text-sm">
              Simulated:&nbsp;
              <span className="font-mono font-semibold text-base">{simScore}</span>
              &nbsp;<Badge className={cn("text-[10px]", bandStyles[simBand])}>{simBand}</Badge>
            </div>
          </div>
          {!isAtLiveValues && (
            <p className={cn("text-sm font-medium tabular-nums", deltaClass(delta))}>
              {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "No change"} points
              {isConfirming && (
                <span className="ml-2 text-muted-foreground text-xs font-normal">confirming…</span>
              )}
            </p>
          )}
        </div>

        {/* ── Per-component breakdown (updates on server confirm) ── */}
        {!isAtLiveValues && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {serverResult ? "Server-confirmed breakdown" : "Live breakdown"}
            </p>
            {isConfirming ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-3 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {(
                  [
                    ["Incident freq",   displayContribs.incidentFrequency, 30],
                    ["Severity mix",    displayContribs.severityMix,       30],
                    ["Audit recency",   displayContribs.auditRecency,      20],
                    ["Rejection rate",  displayContribs.rejectionRate,     10],
                    ["Pressure spikes", displayContribs.pressureSpikes,    10],
                  ] as [string, number, number][]
                ).map(([label, contrib, max]) => (
                  <div key={label} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
                    <Progress
                      value={(contrib / max) * 100}
                      className="h-1.5 flex-1"
                    />
                    <span className="w-14 text-right tabular-nums font-mono text-muted-foreground">
                      {contrib.toFixed(1)} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reset button ── */}
        {!isAtLiveValues && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5"
            onClick={reset}
          >
            <RotateCcw className="size-3" />
            Reset to live values
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Check TypeScript compiles**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/what-if-panel.tsx
git commit -m "feat(frontend): add WhatIfPanel with real-time slider score and server confirmation"
```

---

## Task 8: Wire both panels into `SiteDetailView`

**Files:**
- Modify: `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/site-detail-view.tsx`

**Interfaces:**
- Consumes: `RiskScoreBreakdown` props (Task 6), `WhatIfPanel` props (Task 7), `SiteDetail` extended type (Task 4)

- [ ] **Step 1: Add imports for the two new components**

Open `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/site-detail-view.tsx`.

Add these two import lines after the existing component imports:

```typescript
import { RiskScoreBreakdown } from "./risk-score-breakdown";
import { WhatIfPanel } from "./what-if-panel";
```

- [ ] **Step 2: Insert the 2-column analysis grid between the header and incidents card**

In `SiteDetailView`, find the comment `{/* Incidents Timeline */}` and insert the following block immediately before it:

```tsx
{/* Risk Analysis — Breakdown + What-If */}
<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
  <RiskScoreBreakdown
    riskScore={site.riskScore}
    severityBand={site.severityBand}
    incidentCount={site.incidentCount}
    critHighCount={site.critHighCount}
    daysSinceAudit={site.daysSinceAudit}
    rejectedRate={site.rejectedRate}
    pressureSpikeCount={site.pressureSpikeCount}
  />
  <WhatIfPanel
    siteId={site.siteId}
    currentScore={site.riskScore}
    currentBand={site.severityBand}
    liveIncidentCount={site.incidentCount}
    liveCritHighCount={site.critHighCount}
    liveDaysSinceAudit={site.daysSinceAudit}
    liveRejectedRate={site.rejectedRate}
    livePressureSpikes={site.pressureSpikeCount}
  />
</div>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Start the frontend dev server and visually verify the page**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-frontend
npm run dev &
sleep 8
```

Open http://localhost:3000/dashboard/sentinel/sites/site-003 in a browser.

Verify:
1. The breakdown card appears above the incidents timeline showing 5 factor rows with progress bars
2. The what-if panel appears beside the breakdown card (2 columns on large screens)
3. Dragging any slider updates the score number **instantly** without any network delay
4. Releasing a slider (mouse-up) triggers a server confirmation — the breakdown bars update after ~300ms
5. The "Reset to live values" button appears only when sliders have been moved, and clicking it restores all sliders
6. The delta display shows `▲ +N` in red when score increases, `▼ -N` in green when it decreases

- [ ] **Step 5: Commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/site-detail-view.tsx
git commit -m "feat(frontend): wire RiskScoreBreakdown and WhatIfPanel into site drill-down"
```

---

## Task 9: End-to-end smoke test and delta display enhancement

**Files:**
- Modify: `sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/what-if-panel.tsx` (minor delta display improvement)

This task validates the full flow and adds one UX fix identified in the bottleneck analysis: the delta is shown prominently so even a same-band result reads as meaningful.

- [ ] **Step 1: Full end-to-end test with site-003**

With both backend and frontend running:

```bash
# Confirm backend returns 4 new fields
curl -s http://localhost:8080/api/sites/site-003 | python3 -m json.tool | \
  grep -E '"incidentCount|critHighCount|daysSinceAudit|rejectedRate|riskScore|severityBand"'

# Confirm simulate with max audit days
curl -s -X POST http://localhost:8080/api/sites/site-003/simulate \
  -H "Content-Type: application/json" \
  -d '{"daysSinceAuditOverride": 365}' | python3 -m json.tool
```

Expected from simulate call: `scoreDelta` is positive, `auditRecencyContrib` is `20.0`, `simulatedScore` is higher than `currentScore`.

- [ ] **Step 2: Add a score decomposition label to the result area**

In `what-if-panel.tsx`, find the score result block and add a small legend showing each factor's max weight. Replace the `<p className={cn(...)}` delta line with:

```tsx
{!isAtLiveValues && (
  <div className="space-y-0.5">
    <p className={cn("text-sm font-semibold tabular-nums", deltaClass(delta))}>
      {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "▶ No change"} points
      {isConfirming && (
        <span className="ml-2 text-muted-foreground text-xs font-normal">confirming…</span>
      )}
    </p>
    <p className="text-muted-foreground text-xs">
      Factors: incident&nbsp;freq 30% · severity 30% · audit 20% · rejection 10% · spikes 10%
    </p>
  </div>
)}
```

- [ ] **Step 3: Final TypeScript check**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/sentinel-frontend
npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors.

- [ ] **Step 4: Final commit**

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG
git add sentinel-frontend/src/app/(main)/dashboard/sentinel/_components/what-if-panel.tsx
git commit -m "feat(frontend): enhance what-if delta display with factor weight legend"
```

---

## Bottleneck Fixes Incorporated

| Bottleneck | Where Fixed |
|---|---|
| 4 scalar fields missing from `SiteDetailDto` | Task 1 |
| `getPressureSpikeCountForSite()` scans all sites | Task 2 (new targeted query + index) |
| `SiteDetail` TypeScript type missing 4 fields | Task 4 |
| Formula duplicated in Java + TypeScript with no sync contract | Task 5 (shared `risk-formula.ts` with explicit contract comment) |
| critHighCount must depend on current incidentCount slider, not live value | Task 7 (`critHighCount = Math.round(incidentCount * critHighPct / 100)` recalculated on every render) |
| `simulateRisk()` must not use `authedOpts()` | Task 4 (plain fetch with explicit comment) |
| `SiteDetailView` grows too large | Tasks 6–7 (extracted into separate files, wired in Task 8) |
| Audit weight produces weak visual drama | Task 9 (prominent delta display + factor weight legend) |
| Audit history fully loaded for one date in simulate path | Task 2 (`findLatestAuditDateForSite` single-site MAX query) |
