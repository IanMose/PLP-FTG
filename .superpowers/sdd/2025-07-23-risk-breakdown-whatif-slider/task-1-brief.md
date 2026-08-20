# Task 1 Brief — Add 4 scalar fields to SiteDetailDto and populate in getSiteDetail()

## Context
You are implementing Task 1 of a 9-task plan that adds a risk score breakdown panel and
what-if slider to the Sentinel site drill-down page. This is a Spring Boot 3 / JPA / Lombok
backend project.

All work goes in the git worktree at:
  /home/kariioke/IdeaProjects/PLP-FTG/.worktrees/feat-risk-breakdown-whatif

## Global Constraints (binding on this task)
- All backend DTOs use Lombok @Data @Builder — follow this pattern exactly
- Backend package names: new DTOs go in com.sentinel.risk.dto (not needed this task)
- Do NOT change SecurityConfig
- No new npm packages

## What This Task Builds
SiteDetailDto currently returns riskScore, severityBand, pressureSpikeCount — but
NOT the 4 scalar values the frontend needs to pre-populate sliders and render the breakdown.
Those values (incidentCount, critHighCount, daysSinceAudit, rejectedRate) are already
computed inside getSiteDetail() but silently discarded.

This task adds them to the DTO and populates them. Zero new queries needed.

## Files to Modify
1. sentinel-backend/src/main/java/com/sentinel/common/dto/SiteDetailDto.java
2. sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java

## Exact Changes Required

### SiteDetailDto.java — add 4 fields after pressureSpikeCount:
```java
private int incidentCount;
private int critHighCount;
private int daysSinceAudit;
private double rejectedRate;
```

Full file after edit:
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

### RiskService.java — getSiteDetail() builder call
The variables incidents.size(), critHigh, daysSinceAudit, and rejectedRate are already
computed earlier in getSiteDetail(). Add them to the SiteDetailDto.builder() chain:

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

## Verification
Start the backend and confirm all 4 fields appear in the response:

```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/.worktrees/feat-risk-breakdown-whatif/sentinel-backend
./mvnw spring-boot:run &
sleep 25
curl -s http://localhost:8080/api/sites/site-003 | python3 -m json.tool | grep -E '"incidentCount|critHighCount|daysSinceAudit|rejectedRate'
```

All 4 fields must be present. incidentCount and critHighCount must be > 0 for site-003.

## Commit
```bash
cd /home/kariioke/IdeaProjects/PLP-FTG/.worktrees/feat-risk-breakdown-whatif
git add sentinel-backend/src/main/java/com/sentinel/common/dto/SiteDetailDto.java
git add sentinel-backend/src/main/java/com/sentinel/risk/RiskService.java
git commit -m "feat(risk): expose scalar risk inputs in SiteDetailDto"
```

## Report File
Write your full report to:
  /home/kariioke/IdeaProjects/PLP-FTG/.superpowers/sdd/2025-07-23-risk-breakdown-whatif-slider/task-1-report.md

Report must include:
- Status: DONE | DONE_WITH_CONCERNS | NEEDS_CONTEXT | BLOCKED
- Commits made (short hash + message)
- Test summary (command run + output)
- Any concerns

Return ONLY: status line, commits, one-line test summary, concerns (if any).
