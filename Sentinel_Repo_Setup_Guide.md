# Sentinel — Stage 1 Repo Setup Guide (End-to-End)

Source: extracted from *Sentinel Combined Execution Methodology*, Part B.4
(Repository & CI), B.3.5 (Decision layer / guard), and B.3.4 (Validation rules).

Goal: stand up `sentinel/` so that a fresh clone can run the full
pipeline and see the CI gate pass/fail on real data, in under five minutes.

---

## 1. Repo layout (from B.4.1)

Create exactly this structure — names are frozen for Stage 2, don't improvise:

```
sentinel/
├── data/
│   ├── raw/            # untouched inputs, git-ignored
│   ├── quarantine/      # rejected records
│   └── warehouse/       # trusted parquet/duckdb output
├── src/
│   ├── ingest.py
│   ├── transform.py
│   ├── validate.py      # pandera schemas / rule checks
│   ├── decide.py        # trusted/corrected/review/reject
│   └── load.py
├── tests/
│   ├── test_transform.py
│   └── test_validate.py
├── .github/workflows/ci.yml
├── docs/problem_framing_memo.md
├── README.md
└── requirements.txt
```

Scaffold it:

```bash
mkdir -p sentinel/{data/raw,data/quarantine,data/warehouse,src,tests,.github/workflows,docs}
cd sentinel
touch src/{ingest,transform,validate,decide,load}.py
touch tests/{test_transform,test_validate}.py
touch docs/problem_framing_memo.md README.md requirements.txt
git init
```

`.gitignore` — `data/raw` must never be committed (untouched inputs only, per B.4.1):

```bash
cat > .gitignore << 'EOF'
data/raw/
data/warehouse/*.duckdb
data/warehouse/*.parquet
__pycache__/
*.pyc
.pytest_cache/
.venv/
EOF
```

---

## 2. The guard (from B.3.4 + B.3.5)

The "guard" is two layers working together — don't build only one:

**a) Row-level validation rules (`validate.py`)** — pandera or plain
assertions wired into pytest:

| Rule | Field | Condition |
|---|---|---|
| No future incidents | `incident_date` | Cannot be later than ingestion date |
| Valid severity | `severity` | One of Low / Medium / High / Critical, post-normalization |
| Score bounds | `compliance_score` | Between 0 and 100 |
| Date order | `closed_date` | Cannot precede `inspection_date`, if present |
| Uniqueness | `incident_id` / `audit_id` | Unique within a batch |

**b) The decision layer (`decide.py`)** — every record routes to exactly
one of four outcomes, with the reason persisted:

- **trusted** — passes every rule as-is
- **corrected** — failed a recoverable rule, auto-corrected, reason logged
- **review** — ambiguous, held for human sign-off
- **rejected** — fails a hard rule, quarantined with reason

**c) The threshold that makes the gate actually gate:** the build must
**fail if fewer than 90% of ingested records reach `trusted` or
`corrected`** state. This is invoked as:

```bash
python -m src.validate --fail-below 0.90
```

`validate.py` needs a CLI entrypoint that:
1. Reads the decided output (trusted/corrected/review/rejected counts).
2. Computes `(trusted + corrected) / total`.
3. Exits non-zero if that ratio is below the `--fail-below` threshold.

Minimal shape to implement in `src/validate.py`:

```python
import argparse
import sys

def compute_pass_rate(counts: dict) -> float:
    total = sum(counts.values())
    if total == 0:
        return 0.0
    return (counts.get("trusted", 0) + counts.get("corrected", 0)) / total

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--fail-below", type=float, default=0.90)
    args = parser.parse_args()

    # TODO: load real counts from data/warehouse (ingest_log / decided output)
    counts = load_decision_counts()

    rate = compute_pass_rate(counts)
    print(f"Trusted+corrected rate: {rate:.2%} (threshold {args.fail_below:.0%})")
    if rate < args.fail_below:
        print("GATE FAILED: data-quality threshold not met.")
        sys.exit(1)
    print("GATE PASSED.")

if __name__ == "__main__":
    main()
```

This is the mechanism the CI workflow calls in the final step below.

---

## 3. CI pipeline (from B.4.2)

Order matters: **checkout → install deps → run unit tests → run ETL
against sample data → enforce the data-quality threshold.**

`.github/workflows/ci.yml`:

```yaml
name: Sentinel Stage 1 CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  pipeline:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run unit tests
        run: pytest tests/ -v

      - name: Run ETL against sample data
        run: |
          python -m src.ingest --input data/raw/sample
          python -m src.transform
          python -m src.decide
          python -m src.load

      - name: Enforce data-quality gate
        run: python -m src.validate --fail-below 0.90
```

`requirements.txt` starter (adjust to what you actually use):

```
pandas
pandera
pytest
duckdb
pyarrow
```

Add the badge to `README.md` once the workflow file is pushed
(replace `ORG/REPO`):

```markdown
![CI](https://github.com/ORG/REPO/actions/workflows/ci.yml/badge.svg)
```

---

## 4. End-to-end setup sequence

Run in order:

```bash
# 1. Scaffold (section 1 above)
mkdir -p sentinel/{data/raw,data/quarantine,data/warehouse,src,tests,.github/workflows,docs}
cd sentinel
git init

# 2. Add .gitignore, requirements.txt, ci.yml, README.md (sections 1-3 above)

# 3. Implement in this order — each stage depends on the last:
#    src/ingest.py     -> IngestionManager: batch_id (uuid), source filename,
#                          row count, SHA-256 checksum -> ingest_log
#    src/transform.py  -> normalize categorical text via lookup table,
#                          ISO 8601 UTC timestamps, dedupe on natural key
#                          (keep latest by ingestion batch)
#    src/validate.py   -> pandera/assertion rules (table in section 2)
#                          + --fail-below CLI gate
#    src/decide.py     -> route every record to trusted/corrected/review/rejected
#                          with persisted reason
#    src/load.py       -> write trusted output to DuckDB or Parquet in
#                          data/warehouse/

# 4. Write tests alongside each module:
#    tests/test_transform.py  -> one test per transform function
#    tests/test_validate.py   -> one test per rule in the table, plus a
#                                 test that --fail-below actually exits 1
#                                 on a bad-data fixture

# 5. Commit and connect remote
git add .
git commit -m "Stage 1 skeleton: repo layout, ingest/transform/validate/decide/load stubs, CI"
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main

# 6. Confirm the gate works both ways before Friday:
#    - Run against clean sample data -> CI passes, badge green
#    - Run against a deliberately bad-data fixture -> CI fails, badge red
#    A gate that only ever passes is not proof it gates anything.
```

---

## 5. Definition of done for Stage 1 repo setup

- [ ] Repo pushed with the exact structure in section 1
- [ ] `data/raw/` present locally but git-ignored (never committed)
- [ ] `ingest.py` produces `batch_id`, filename, row count, SHA-256 into `ingest_log`
- [ ] `transform.py` normalizes text, ISO 8601 timestamps, dedupes with a documented tie-break
- [ ] `validate.py` implements every rule in the table and a working `--fail-below` CLI
- [ ] `decide.py` labels every record trusted/corrected/review/rejected with a reason
- [ ] `load.py` writes trusted/corrected output to `data/warehouse/`
- [ ] `tests/` cover every transform function and every validation rule
- [ ] `.github/workflows/ci.yml` runs checkout → deps → tests → ETL → gate, in that order
- [ ] README has a live CI badge and lets a stranger reproduce the run in under 5 minutes
- [ ] Demonstrated once green and once red (proves the gate is real, not decorative)

---

## 6. Stage 2 — Backend + Frontend Architecture (Design Only, from Part C)

> **Scope guardrail (from the source doc):** nothing in this section gets
> implemented before the Stage 1 CI gate is green and the memo + pitch are
> locked. No Spring Boot project, no Next.js project, no repo for this part
> yet — design only, this week. This section exists so Stage 2 starts from
> a decided architecture instead of debating one under new time pressure.

### 6.1 Three-tier system, extending — not replacing — the Stage 1 warehouse

- **Data layer:** the Stage 1 DuckDB/Parquet warehouse (`fact_incidents`,
  `fact_audits`, `dim_site`) becomes the source tables for a proper
  OLTP/analytics store (Postgres) once Stage 2 begins. Migration is a
  **load step, not a redesign**, because keys and names were fixed in Stage 1.
- **Backend (Spring Boot):** exposes the trusted, corrected, review, and
  rejected record streams as REST APIs; computes derived risk signals;
  owns alerting and the data-quality-summary logic.
- **Frontend (Next.js):** consumes the backend APIs and renders the risk
  heatmap, alert feed, data-quality panel, and supporting visualizations —
  this is where the Stage 1 data actually gets *presented*.

### 6.2 High-level component map

| Layer | Component | Responsibility |
|---|---|---|
| Data | Postgres (migrated from Stage 1 warehouse) | System of record for incidents, audits, sites, `ingest_log` |
| Data | Flyway migrations | Versioned schema evolution, seeded from Stage 1 table DDL |
| Backend | `ingestion-service` module | Wraps Stage 1 `IngestionManager` logic as a scheduled/triggered Spring job |
| Backend | `quality-service` module | Recomputes trusted/corrected/review/rejected rates; exposes DQ summary API |
| Backend | `risk-service` module | Scores sites by incident frequency, severity, and audit follow-through gaps |
| Backend | `alert-service` module | Generates and persists alerts when risk or DQ thresholds are crossed |
| Backend | `api-gateway` (Spring Web/REST) | Auth, pagination, filtering — the only surface the frontend talks to |
| Frontend | Risk Heatmap view | Site-by-site risk visualization, geographic or grid-based |
| Frontend | Alert Feed view | Chronological, filterable stream of triggered alerts |
| Frontend | Data Quality panel | Trusted/corrected/review/rejected rates, CI gate status, ingest history |
| Frontend | Site Drill-down view | Per-site incident + audit history, joined on `site + date` |

### 6.3 Backend design (Spring Boot)

**Module layout** (`sentinel-backend/`):

```
sentinel-backend/
├── src/main/java/com/sentinel/
│   ├── ingestion/        # scheduled ETL trigger, batch tracking
│   ├── quality/          # DQ aggregation service + API
│   ├── risk/             # risk scoring engine + API
│   ├── alert/            # alert rules + persistence + API
│   ├── site/             # dim_site lookups, drill-down API
│   ├── common/           # shared DTOs, exceptions, config
│   └── SentinelApplication.java
├── src/main/resources/
│   ├── db/migration/     # Flyway SQL, seeded from Stage 1 DDL
│   └── application.yml
└── src/test/java/com/sentinel/   # unit + integration tests
```

**Core REST contract (sketch):**

| Endpoint | Method | Returns |
|---|---|---|
| `/api/sites/risk-summary` | GET | Per-site risk score + severity band, for the heatmap |
| `/api/sites/{siteId}` | GET | Drill-down: incidents + audits for one site |
| `/api/alerts` | GET | Paginated, filterable alert feed (by site, severity, date range) |
| `/api/alerts/{id}/ack` | POST | Acknowledge an alert (audit-logged) |
| `/api/quality/summary` | GET | Trusted/corrected/review/rejected rates, latest batch stats |
| `/api/quality/batches` | GET | Ingest history with checksums, row counts, `batch_id` |

**Risk scoring approach (Stage 2 baseline, not Stage 3 ML):** a
transparent, rule-weighted score — not a black-box model. Suggested
inputs: incident frequency per site over a rolling window, severity mix,
days since last audit, and the corrected/rejected rate for that site's
own records. Each input is judge-explainable and traceable back to the
Stage 1 data-quality layer.

### 6.4 Frontend design (Next.js)

**Page/component layout** (`sentinel-frontend/`):

```
sentinel-frontend/
├── app/
│   ├── dashboard/page.tsx       # composition: heatmap + feed + DQ panel
│   ├── sites/[siteId]/page.tsx  # drill-down view
│   └── alerts/page.tsx          # full alert history/search
├── components/
│   ├── RiskHeatmap/         # site grid or map, color by risk band
│   ├── AlertFeed/           # scrollable, filterable alert list
│   ├── DataQualityPanel/    # trusted/corrected/review/rejected bars
│   │                        #   + CI gate status + ingest history
│   └── SiteDetail/          # incident/audit timeline for one site
├── lib/api/    # typed fetch wrappers for the Spring API
└── lib/types/  # shared DTOs mirroring backend contracts
```

**Visualization notes — how Stage 1 data gets presented:**

- **Risk Heatmap:** grid or map view, sites colored by risk band
  (Low/Medium/High/Critical) — the *same* severity vocabulary defined in
  Stage 1's `validate.py`, not a new taxonomy.
- **Alert Feed:** reverse-chronological, filterable by site/severity/status;
  each alert links back to the specific record(s) and rule that produced
  it — carrying forward Stage 1's "traceable reason" principle.
- **Data Quality panel:** live trusted/corrected/review/rejected split,
  most recent CI gate result, and ingest batch history with checksums —
  this is the Stage 1 auditability story surfaced visually, not replaced.
- **Site drill-down:** incident + audit timeline joined on `site + date`,
  reusing the exact key convention fixed in Stage 1.

### 6.5 Non-functional groundwork

- **Auth:** stub with a simple role (viewer/analyst) now; do not build SSO
  before Stage 2 requires it.
- **Observability:** structured logging in Spring services keyed by
  `batch_id`, carrying the Stage 1 audit trail forward.
- **Deployment target:** containerized Spring Boot + Next.js, decided now
  so Stage 2 doesn't lose a day to infrastructure choice.

### 6.6 Migration path from Stage 1 to Stage 2

1. Freeze Stage 1 table names and keys (`site`, `date`, `incident_id`,
   `audit_id`) — done at the end of the Stage 1 build.
2. Write a single Flyway migration that recreates `fact_incidents`,
   `fact_audits`, `dim_site`, and `ingest_log` in Postgres from the Stage 1
   DDL, unchanged.
3. Load the Stage 1 warehouse output into Postgres as a one-time backfill job.
4. Point `quality-service` at `ingest_log` so the DQ panel's history starts
   with Stage 1's own batches, not from zero.
5. Layer `risk-service` and `alert-service` on top without touching the
   ingestion/transform/validate code that already won Stage 1 points.

### 6.7 What NOT to build yet (governance)

- No Spring Boot project, no Next.js project, no repo for this part — design
  only, this week.
- No risk-scoring code beyond the approach note in section 6.3.
- No UI mockups presented as if they were running — nothing gets demoed as
  real until it is real.

---

Everything in section 6 (Part C's Spring Boot / Next.js architecture) is
explicitly **design-only this week** — no code for it until the Stage 1 gate
is green and the memo + pitch are locked.
