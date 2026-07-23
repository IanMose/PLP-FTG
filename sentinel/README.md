# Sentinel

![CI](https://github.com/ORG/REPO/actions/workflows/ci.yml/badge.svg)

**Data-quality pipeline for safety incident and compliance audit records.**

Sentinel ingests raw data, normalizes it, validates against explicit rules, routes every record to a decision (trusted/corrected/review/rejected), and loads quality-assured output to a warehouse — with a CI gate that fails the build if data quality drops below 90%.

---

## Quick Start (< 5 minutes)

```bash
# 1. Clone and enter the repo
git clone <your-repo-url>
cd sentinel

# 2. Create virtual environment and install dependencies
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Add sample data to data/raw/sample/
#    (place a CSV with columns: incident_id, severity, compliance_score,
#     incident_date, inspection_date, closed_date)
mkdir -p data/raw/sample

# 4. Run the full pipeline
python -m src.ingest --input data/raw/sample
python -m src.transform
python -m src.decide
python -m src.load

# 5. Check the data-quality gate
python -m src.validate --fail-below 0.90

# 6. Run tests
pytest tests/ -v
```

---

## Pipeline Stages

| Stage | Module | Responsibility |
|-------|--------|----------------|
| 1 | `src/ingest.py` | Assign batch_id, record filename, row count, SHA-256 checksum |
| 2 | `src/transform.py` | Normalize categorical text, ISO 8601 UTC timestamps, deduplicate |
| 3 | `src/validate.py` | Row-level rule checks + CLI `--fail-below` gate |
| 4 | `src/decide.py` | Route every record to trusted/corrected/review/rejected with reason |
| 5 | `src/load.py` | Write trusted+corrected output to Parquet and DuckDB in `data/warehouse/` |

---

## Validation Rules

| Rule | Field | Condition |
|------|-------|-----------|
| No future incidents | `incident_date` | Cannot be later than ingestion date |
| Valid severity | `severity` | One of Low / Medium / High / Critical |
| Score bounds | `compliance_score` | Between 0 and 100 |
| Date order | `closed_date` | Cannot precede `inspection_date` |
| Uniqueness | `incident_id` / `audit_id` | Unique within a batch |

---

## Decision Model

Every record is routed to exactly one outcome:

- **trusted** — passes every rule as-is
- **corrected** — failed a recoverable rule, auto-corrected, reason logged
- **review** — ambiguous, held for human sign-off
- **rejected** — fails a hard rule, quarantined with reason

---

## Data-Quality Gate

The CI gate enforces a minimum 90% trusted+corrected rate:

```bash
python -m src.validate --fail-below 0.90
```

Exits non-zero if the threshold is not met. This ensures the gate is real, not decorative.

---

## Project Structure

```
sentinel/
├── data/
│   ├── raw/            # untouched inputs (git-ignored)
│   ├── quarantine/     # rejected records
│   └── warehouse/      # trusted parquet/duckdb output
├── src/
│   ├── ingest.py       # ingestion with batch tracking
│   ├── transform.py    # normalization, dedup
│   ├── validate.py     # rule checks + CLI gate
│   ├── decide.py       # four-outcome decision layer
│   └── load.py         # warehouse writer
├── tests/
│   ├── test_transform.py
│   └── test_validate.py
├── .github/workflows/ci.yml
├── docs/problem_framing_memo.md
├── README.md
└── requirements.txt
```

---

## CI Pipeline

GitHub Actions runs on every push/PR to `main`:

1. Checkout
2. Install dependencies
3. Run unit tests (`pytest tests/ -v`)
4. Run ETL against sample data
5. Enforce data-quality gate (`--fail-below 0.90`)

---

## Requirements

- Python 3.11+
- pandas, pandera, pytest, duckdb, pyarrow

Install: `pip install -r requirements.txt`

---

## License

Internal use only.
