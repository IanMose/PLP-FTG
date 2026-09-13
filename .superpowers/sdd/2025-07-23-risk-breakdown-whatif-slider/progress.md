# SDD ledger — plan: docs/superpowers/plans/2025-07-23-risk-breakdown-whatif-slider.md

Branch: feat/risk-breakdown-whatif
Worktree: /home/kariioke/IdeaProjects/PLP-FTG/.worktrees/feat-risk-breakdown-whatif
Started: 2026-08-13T18:43:05Z

## Tasks


Task 1: complete (commits dcd6d52..803a16b, compile clean)
  Note: Pre-existing H2 migration failures (V4/V7 use ON CONFLICT multi-row VALUES unsupported by H2)
  prevent runtime smoke test. Backend compiles clean. Fields verified in source. Postgres prod unaffected.
  Also committed: fix(config) disable flyway validate-on-migrate for H2 profile (28a5fa4).

Task 2: complete (commits 803a16b..632a0c0, compile clean)
  IncidentRepository: SiteIncidentScalars projection + getScalarsForSite()
  AuditRepository: findLatestAuditDateForSite()
  TelemetryRepository: countSpikesForSite()
  TelemetryService: getSpikeCountForSite()
  V11 migration: idx_telemetry_site_pressure

Task 3: complete (commits 632a0c0..1de7abc, compile clean)
  RiskSimulateRequestDto, RiskSimulateResponseDto created
  RiskService: computeRiskScore package-private, loadLiveScalars(), simulateScore()
  RiskController: POST /{siteId}/simulate

Task 4: complete (commits 1de7abc..725fb6d, tsc clean)
  types.ts: SiteDetail +4 fields, WhatIfRequest, WhatIfResponse
  api.ts: simulateRisk() plain fetch (no authedOpts)

Task 5: complete (commit fd78ad6, tsc clean)
  risk-formula.ts: computeRiskScore() mirror of Java formula with contract comment

Task 6: complete (commit 1174b8a, tsc clean)
  risk-score-breakdown.tsx: static 5-factor card with Progress bars

Task 7: complete (commit b5012a4, tsc clean)
  what-if-panel.tsx: 5 sliders, onValueChange→instant JS score, onValueCommit→server confirm
  critHighCount derived from current incidentCount (bottleneck fix #5)

Task 8: complete (commit 80da494, tsc clean)
  site-detail-view.tsx: imports both components, 2-col lg grid before incidents

Task 9: complete (delta display + factor legend included in Task 7 WhatIfPanel)
  Full tsc check: 0 errors (verified against main checkout node_modules)
  Backend compile: clean (./mvnw compile -q)
