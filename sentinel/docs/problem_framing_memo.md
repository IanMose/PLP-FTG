# Sentinel — Problem Framing Memo

## Problem Statement

Organizations managing multiple sites face a growing volume of safety incidents and compliance audits. Without a systematic, data-driven approach, critical patterns are missed, high-risk sites go unnoticed until catastrophic failures occur, and audit follow-through gaps erode regulatory compliance.

## Core Challenge

Raw incident and audit data arrives in inconsistent formats, with varying quality levels, from multiple sources. Before any meaningful risk analysis can happen, this data must be:

1. **Ingested** — with full traceability (batch IDs, checksums, row counts)
2. **Transformed** — normalized to a common vocabulary and timeline
3. **Validated** — checked against explicit, auditable quality rules
4. **Decided** — routed to trusted/corrected/review/rejected with reasons
5. **Loaded** — only quality-assured records reach the analytical warehouse

## What "Done" Looks Like (Stage 1)

A working ETL pipeline with a CI gate that **provably rejects bad data** and **provably accepts good data**. The gate is not decorative — it must fail when quality drops below 90% trusted+corrected rate.

## Key Design Decisions

- **Traceability over speed:** every record carries a `batch_id` and every decision carries a `reason`. Audit trail is non-negotiable.
- **Transparent rules over black-box scoring:** validation rules are explicit, named, and individually testable.
- **Four-outcome decision model:** trusted/corrected/review/rejected covers the full spectrum from clean data to hard failures, with a human-in-the-loop path for ambiguous cases.
- **Gate as proof:** a data-quality gate that only passes is not proof of quality. The CI must demonstrate both green (good data) and red (bad data) states.

## Success Metrics

| Metric | Target |
|--------|--------|
| Trusted + corrected rate on clean sample data | ≥ 90% |
| Gate fails on deliberately bad fixture | 100% (must always catch) |
| Time from fresh clone to running pipeline | < 5 minutes |
| Every validation rule has a corresponding test | 100% coverage |

## Stakeholders

- **Data Engineering:** owns the pipeline code and CI
- **Compliance/Risk:** consumes the warehouse output and DQ reports
- **Site Managers:** will see risk scores and alerts in Stage 2 frontend

## Constraints

- No external API dependencies in Stage 1 — everything runs locally
- Python 3.11+ with pandas, pandera, duckdb, pyarrow
- CI via GitHub Actions
- Stage 2 (Spring Boot backend + Next.js frontend) does not begin until Stage 1 gate is green
