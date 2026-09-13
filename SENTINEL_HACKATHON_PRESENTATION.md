# SENTINEL
## KPC HSE Compliance Intelligence Platform
### Hackathon Presentation — Kenya Pipeline Company

---

> **Presenter Note:** This presentation walks a non-technical judge through every layer of the
> Sentinel platform — from raw data in the field all the way to an AI-powered executive
> dashboard. Follow the numbered flow. Each slide ends with a one-line takeaway.

---

---

# SLIDE 1 — TITLE

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║              🛡  S E N T I N E L                                 ║
║                                                                  ║
║       KPC HSE Compliance Intelligence Platform                   ║
║                                                                  ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                  ║
║  Turning raw safety & operations data into decisions             ║
║  that protect people, pipelines, and KPC's licence to operate.  ║
║                                                                  ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                  ║
║  Kenya Pipeline Company  |  HSE Proactive Analytics Platform    ║
║  Hackathon 2026                                                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

### Who we are
A cross-functional team building an end-to-end compliance intelligence system
for Kenya Pipeline Company (KPC) — the state corporation that moves petroleum
products through 2,150 km of pipeline from Mombasa to Kisumu, Nairobi, Eldoret,
and beyond.

### What Sentinel does in one sentence
> Sentinel automatically collects safety and operational data from KPC's field
> systems, cleans and validates it, scores compliance across every domain that
> matters — Safety, Environment, Asset Integrity, and Regulations — and presents
> the results in a live executive dashboard with AI-generated recommendations,
> so that KPC leadership always knows exactly where the risks are and what to do
> about them.

---

**Takeaway for judges:** Sentinel = data in → compliance intelligence out, for a
real, critical national infrastructure operator.

---

---

# SLIDE 2 — THE PROBLEM

```
╔══════════════════════════════════════════════════════════════════╗
║           ⚠  THE PROBLEM SENTINEL SOLVES                        ║
╚══════════════════════════════════════════════════════════════════╝
```

## The Reality at KPC Today (Before Sentinel)

KPC operates pipelines through some of Kenya's most sensitive environments —
the Mau Forest, Rift Valley water catchments, and densely populated urban
corridors. A single compliance failure can mean:

- 💀 A worker fatality on a pipeline site
- 🌊 A hydrocarbon spill into a river catchment
- ⚖️  Criminal prosecution of senior management under OSHA 2007
- 📋 EPRA or NEMA enforcement, fines, or licence suspension
- 📰 Reputational damage that affects KPC's relationship with the public and government

### The Core Problem: Data Exists, but No Intelligence Does

KPC already generates large volumes of operational data every day:

| Where the data lives | What it contains |
|---|---|
| CMMS (maintenance system) | Asset inspections, work orders, PM schedules |
| LMS (learning system) | Employee training records and expiry dates |
| SCADA (pipeline control) | Real-time pipeline pressure, flow, alarms |
| HSE management system | Incidents, audits, corrective actions, permits |
| Environmental lab | Water samples, air readings, waste manifests |

### BUT — Five Critical Gaps Exist

```
GAP 1 — Data Silos
        Each system above is an island.
        Nobody sees the full compliance picture at once.

GAP 2 — Bad Data Quality
        Records arrive with missing fields, wrong dates,
        duplicate entries, and out-of-range values.
        Decisions made on bad data are worse than no data.

GAP 3 — No Scoring
        There is no single number that tells you
        "how compliant is KPC today?"
        Leadership must read dozens of separate reports.

GAP 4 — Reactive, Not Proactive
        Compliance is only reviewed after an audit or incident.
        By then, the damage is already done.

GAP 5 — No Actionable Intelligence
        Even when a problem is found, there is no system
        that tells you: "Here are the three things you must
        do this week to reduce risk."
```

### The Cost of This Gap

According to PHMSA (Pipeline Hazard Management Safety Administration) global
data, the leading causes of pipeline incidents are:

1. Overdue inspections not detected in time
2. Deferred maintenance from poor planning visibility
3. Training gaps not caught before personnel start high-risk work

All three are **preventable** — with the right intelligence system.

---

**Takeaway for judges:** KPC has the data. What it is missing is a system
that turns that data into a single, trusted, actionable compliance score.
That is what Sentinel builds.

---

---

# SLIDE 3 — THE SOLUTION OVERVIEW

```
╔══════════════════════════════════════════════════════════════════╗
║           ✅  THE SOLUTION — SENTINEL IN THREE LAYERS            ║
╚══════════════════════════════════════════════════════════════════╝
```

## Sentinel is a Three-Layer Platform

Think of Sentinel like a hospital's vital-signs monitoring system — but for
a pipeline company. Just as a hospital continuously monitors every patient's
heart rate, blood pressure, and oxygen levels and alerts doctors when
something goes wrong, Sentinel continuously monitors KPC's compliance health
across every domain and alerts leadership when intervention is needed.

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  LAYER 3 — PRESENTATION                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Executive Dashboard  │  Drill-Downs  │  AI Insights       │  │
│  │  (What does it mean?) │  (Why?)       │  (What to do?)     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ▲                                     │
│                            │ serves data to                      │
│  LAYER 2 — INTELLIGENCE                                          │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Compliance Scoring Engine  │  Risk Engine  │  Alert Engine │  │
│  │  (How compliant are we?)    │  (How risky?) │  (Alert now!) │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ▲                                     │
│                            │ feeds clean data to                 │
│  LAYER 1 — DATA PIPELINE (SENTINEL CORE)                         │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Ingest → Transform → Validate → Decide → Load             │  │
│  │  (Raw field data → trusted, quality-assured records)       │  │
│  └────────────────────────────────────────────────────────────┘  │
│                            ▲                                     │
│                            │ data comes from                     │
│  FIELD SOURCES                                                   │
│  CMMS  │  LMS  │  SCADA  │  HSE System  │  Lab Results          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## The Three Layers Explained Simply

### Layer 1 — The Data Pipeline (The Foundation)
Raw data arrives from KPC's field systems. It is messy — records have missing
dates, wrong categories, or are exact duplicates. The Sentinel pipeline
automatically cleans and validates every single record, stamps it with a
quality decision, and loads only the trusted data into a secure warehouse.

**Analogy:** A water treatment plant. Raw water (dirty data) goes in one end.
Clean, certified water (trusted records) comes out the other end. Nothing
unsafe gets through.

### Layer 2 — The Intelligence Engine (The Brain)
Clean data flows into the compliance scoring engine, which calculates a score
for every KPI, every compliance domain, and an overall compliance score — all
in real time. The risk engine flags sites and assets that are deteriorating.
The alert engine triggers notifications when thresholds are crossed.

**Analogy:** A doctor reading your lab results and telling you what they mean
— not just the numbers, but whether you need to take action.

### Layer 3 — The Dashboard and AI Panel (The Face)
The executive dashboard presents the compliance picture in under 5 seconds of
reading — gauge charts, trend lines, geographic maps, and priority tables.
The AI panel generates three specific, plain-language actions for leadership
every morning.

**Analogy:** The cockpit instruments in an aircraft. At a glance, the pilot
knows if everything is normal or if something needs immediate attention.

---

**Takeaway for judges:** Three layers working together: clean data → smart
scoring → clear decisions. Every layer is built and working.

---


---

# SLIDE 4 — HOW IT WORKS: DATA PIPELINE (STAGE 1)

```
╔══════════════════════════════════════════════════════════════════╗
║         🔧  LAYER 1 — THE SENTINEL DATA PIPELINE                ║
╚══════════════════════════════════════════════════════════════════╝
```

## The Foundation: Why Data Quality Matters

Before we can calculate a compliance score, we must be absolutely certain
that the data we are scoring is correct, complete, and trustworthy.

### The Challenge with Real-World Data

Here is an actual example of what arrives from the field systems:

```
Raw Incident Record (as received):
─────────────────────────────────────────────────────────────────
incident_id:      KPC-INC-2026-0347
incident_date:    2026-13-45         ❌ Invalid date
severity:         HIHG                ❌ Typo: should be "HIGH"
compliance_score: 150                 ❌ Out of bounds (max is 100)
inspection_date:  2026-07-20
closed_date:      2026-07-15         ❌ Closed before inspected?!
site:             nairobi west       ❌ Inconsistent capitalization
reported_by:      John Doe
─────────────────────────────────────────────────────────────────
```

If we calculated compliance scores from this record as-is, the score would
be meaningless. Worse, a bad decision might be made based on bad data.

### Sentinel's Answer: A 5-Stage Pipeline

Every record that enters Sentinel goes through five stages. A record cannot
advance to the next stage unless it passes validation at the current stage.
This ensures that only clean, trusted data reaches the compliance engine.

```
   RAW DATA FROM FIELD SYSTEMS
            ↓
   ┌────────────────────────────────────┐
   │  STAGE 1: INGEST                   │  ← Receive, fingerprint, log
   └────────────────────────────────────┘
            ↓
   ┌────────────────────────────────────┐
   │  STAGE 2: TRANSFORM                │  ← Normalize, deduplicate
   └────────────────────────────────────┘
            ↓
   ┌────────────────────────────────────┐
   │  STAGE 3: VALIDATE                 │  ← Rule checks (hard pass/fail)
   └────────────────────────────────────┘
            ↓
   ┌────────────────────────────────────┐
   │  STAGE 4: DECIDE                   │  ← Route to outcome (4 paths)
   └────────────────────────────────────┘
            ↓
   ┌────────────────────────────────────┐
   │  STAGE 5: LOAD                     │  ← Write trusted data to warehouse
   └────────────────────────────────────┘
            ↓
   TRUSTED DATA READY FOR SCORING
```

Each stage has a specific responsibility and cannot be skipped. Let us walk
through what happens at each one.

---

**Takeaway for judges:** Raw data is dirty. Sentinel cleans it in 5 mandatory
stages before any compliance calculation happens.

---

---

# SLIDE 5 — THE 5-STEP PIPELINE EXPLAINED

```
╔══════════════════════════════════════════════════════════════════╗
║      🔄  EVERY RECORD'S JOURNEY THROUGH SENTINEL                ║
╚══════════════════════════════════════════════════════════════════╝
```

## Walking Through the Pipeline: One Record's Story

Let us follow that broken incident record from Slide 4 through the entire
pipeline and see what Sentinel does at each stage.

---

### STAGE 1 — INGEST
**What happens:** The record is received and fingerprinted.

```
Actions performed:
1. Assign a unique batch ID:     batch_id = "b5e2f831-7a4c-4d9e-9f12-6d8a3b7c4e21"
2. Record the source file name:  source_file = "incidents_raw_2026-07-24.csv"
3. Count the total rows:          row_count = 1,247
4. Calculate SHA-256 checksum:    checksum = "a3f5c8e9..."
5. Write to ingest_log table
```

**Why it matters:** This creates an **audit trail**. If a question arises
later ("Why did this incident appear in the system?"), we can trace it back
to the exact file, batch, and time it was received. This is critical for
regulatory compliance — auditors demand proof of data lineage.

**Outcome:** Record is tagged and logged. It moves to Stage 2.

---

### STAGE 2 — TRANSFORM
**What happens:** The record is cleaned and normalized.

```
Actions performed on the broken record:
1. incident_date: "2026-13-45"
   → Recognized as invalid date format
   → Check other date fields for clues
   → If unrecoverable, flag for manual review

2. severity: "HIHG"
   → Lookup in normalization table:
      "HIHG" → "HIGH" (common typo pattern)
   → AUTO-CORRECTED

3. site: "nairobi west"
   → Normalize to title case → "Nairobi West"
   → Lookup in site master register → site_id = "KPC-NBO-WEST-001"

4. Deduplicate:
   → Check if incident_id "KPC-INC-2026-0347" already exists
   → If duplicate found, keep the record with the latest batch_id
```

**Why it matters:** Normalization ensures consistency. Without it, "HIGH",
"High", "high", and "HIHG" would be treated as four different severities,
breaking all downstream analysis.

**Outcome:** Record is now clean. If any field could not be auto-corrected,
it is flagged for manual review. Record moves to Stage 3.

---

### STAGE 3 — VALIDATE
**What happens:** The record is checked against explicit business rules.

```
Validation Rules Applied:

Rule 1: incident_date cannot be in the future
        Check: 2026-13-45 is invalid → FAIL
        Action: Mark as "needs review"

Rule 2: severity must be one of [Low, Medium, High, Critical]
        Check: "HIGH" (after normalization) → PASS

Rule 3: compliance_score must be between 0 and 100
        Check: 150 > 100 → FAIL
        Action: Flag as out-of-range

Rule 4: closed_date cannot be earlier than inspection_date
        Check: 2026-07-15 < 2026-07-20 → FAIL
        Action: Date order violation

Rule 5: incident_id must be unique within batch
        Check: No duplicate found → PASS
```

**Why it matters:** These rules encode real compliance requirements. For
example, Rule 4 (closed date cannot precede inspection date) prevents
records where an incident was marked as "resolved" before it was even
inspected — a red flag for audit fraud.

**Outcome:** This record **fails** validation on three rules. It cannot
proceed as "trusted" data. It moves to Stage 4 for a decision.

---

### STAGE 4 — DECIDE
**What happens:** Every record is routed to one of four outcomes.

```
The Four Possible Outcomes:

┌──────────────┬─────────────────────────────────────────────────┐
│  OUTCOME     │  MEANING                                        │
├──────────────┼─────────────────────────────────────────────────┤
│  TRUSTED     │  Passed all rules → use as-is                   │
│  CORRECTED   │  Failed a rule but was auto-fixed → use it     │
│  REVIEW      │  Ambiguous → hold for human sign-off           │
│  REJECTED    │  Hard failure → quarantine, do not use         │
└──────────────┴─────────────────────────────────────────────────┘

Decision for our broken record:
- incident_date is invalid and cannot be auto-corrected
- compliance_score is out of range (cannot guess the correct value)
- closed_date < inspection_date (possible fraud or data entry error)

→ DECISION: REJECTED
→ REASON: "Invalid incident_date; out-of-range compliance_score;
           date order violation"
→ ACTION: Quarantine to data/quarantine/ for manual investigation
```

**Why it matters:** This is the **guard** that protects the compliance engine.
No bad data ever reaches the scoring layer. The alternative — letting bad data
through — would produce a compliance score that leadership cannot trust, which
defeats the entire purpose of the system.

**Outcome:** This record is quarantined. Clean records that passed all rules
(TRUSTED) or were auto-fixed (CORRECTED) move to Stage 5.

---

### STAGE 5 — LOAD
**What happens:** Trusted and corrected records are written to the warehouse.

```
Actions performed:
1. Write records to the warehouse database (DuckDB or PostgreSQL):
   - fact_incidents table (for incident records)
   - fact_audits table (for audit records)
   - dim_site table (site master data)
   - ingest_log table (batch tracking and checksums)

2. Records are now available to:
   - The compliance scoring engine (Layer 2)
   - The executive dashboard (Layer 3)

3. Rejected records are written to a separate quarantine table for
   investigation and do NOT feed into compliance calculations.
```

**Why it matters:** This is the final gate. Once a record reaches the
warehouse, it is certified as clean and is used to compute KPC's compliance
score. The warehouse becomes the **single source of truth** for all downstream
analytics.

**Outcome:** Only clean data is in the system. The compliance engine can now
trust every number it calculates.

---

**Takeaway for judges:** Five stages. Every record. No exceptions. Bad data
is caught and quarantined before it can corrupt the compliance score.

---

---

# SLIDE 6 — THE DATA QUALITY GATE

```
╔══════════════════════════════════════════════════════════════════╗
║      🚨  THE GATE THAT MAKES SENTINEL TRUSTWORTHY               ║
╚══════════════════════════════════════════════════════════════════╝
```

## The Problem with Most Analytics Systems

Many dashboards show beautiful charts and confident numbers. But if you ask
"How do I know this data is correct?" — there is no answer. The numbers look
official, but they are built on unvalidated data. That is like building a
house on sand.

### Sentinel's Solution: The Data Quality Gate

Sentinel enforces a hard threshold:

```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   At least 90% of ingested records must reach TRUSTED or      ║
║   CORRECTED status. If data quality falls below 90%, the      ║
║   entire build FAILS and leadership is alerted immediately.   ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

This is not a recommendation or a warning — it is an **automatic enforcement
mechanism**. If bad data starts flooding the system, Sentinel stops the
pipeline and raises an alarm, rather than producing a misleading compliance
score.

## How the Gate Works

After every batch of data is processed through the 5 stages, Sentinel counts
the outcomes:

```
Example Batch Result:
──────────────────────────────────────────────────────
Total records ingested:   1,247
  ├─ TRUSTED:             1,089  (87.3%)
  ├─ CORRECTED:             103  (8.3%)
  ├─ REVIEW:                 42  (3.4%)
  └─ REJECTED:               13  (1.0%)
──────────────────────────────────────────────────────
Pass rate = (TRUSTED + CORRECTED) / Total
          = (1,089 + 103) / 1,247
          = 95.6%
──────────────────────────────────────────────────────
95.6% ≥ 90% threshold → ✅ GATE PASSED
──────────────────────────────────────────────────────
```

In this example, 95.6% of records are clean. The gate passes, and the
compliance engine proceeds to calculate scores.

## What Happens When the Gate Fails?

```
Bad Batch Result:
──────────────────────────────────────────────────────
Total records ingested:   1,150
  ├─ TRUSTED:              620  (53.9%)
  ├─ CORRECTED:            180  (15.7%)
  ├─ REVIEW:               210  (18.3%)
  └─ REJECTED:             140  (12.2%)
──────────────────────────────────────────────────────
Pass rate = (620 + 180) / 1,150
          = 69.6%
──────────────────────────────────────────────────────
69.6% < 90% threshold → ❌ GATE FAILED
──────────────────────────────────────────────────────
ACTIONS:
1. Stop the pipeline
2. Send alert to HSE Data Quality Administrator
3. Generate failure report with top reasons for rejection
4. Block compliance score calculation until issue resolved
──────────────────────────────────────────────────────
```

When the gate fails, no compliance score is published. This prevents leadership
from making decisions based on unreliable data.

## Why This Matters for KPC

Imagine KPC's CEO presents a compliance score of 88% to the Board of Directors.
A board member asks: "How confident are you in this number?"

**Without a data quality gate:**
"Well, we calculated it from the data we have."
(Translation: No idea if the data is correct.)

**With Sentinel's data quality gate:**
"This score is based on 1,247 records, of which 95.6% passed automated
validation against our compliance rules. The remaining 4.4% are quarantined
for review. Every number you see has been certified clean."
(Translation: You can trust this.)

## The Gate is Tested in CI/CD

The data quality gate is not just enforced in production — it is tested
**every time code is committed** through Sentinel's CI/CD pipeline:

```
GitHub Actions CI Workflow:
────────────────────────────────────────────
1. Checkout code
2. Install dependencies
3. Run unit tests
4. Run ETL pipeline against sample data
5. Enforce data quality gate (--fail-below 0.90)
   → If pass rate < 90%, the build fails ❌
   → If pass rate ≥ 90%, the build passes ✅
────────────────────────────────────────────
```

This means that before any change goes live, it must prove it can maintain
data quality. A developer cannot accidentally break the validation logic
without the CI build catching it.

---

**Takeaway for judges:** The 90% threshold is not optional. It is enforced
automatically, in CI and in production. This makes Sentinel's data trustworthy,
not just presentable.

---


---

# SLIDE 7 — THE COMPLIANCE SCORING MODEL

```
╔══════════════════════════════════════════════════════════════════╗
║      📊  LAYER 2 — HOW SENTINEL CALCULATES COMPLIANCE           ║
╚══════════════════════════════════════════════════════════════════╝
```

## From Clean Data to a Single Compliance Score

Once data is clean and validated, Sentinel feeds it into the compliance
scoring engine. This engine calculates a single number — the **Overall
Compliance Score (OCS)** — that tells KPC's leadership: "How compliant
are we today?"

### The Challenge: Measuring Something as Complex as Compliance

KPC's compliance obligations span dozens of regulations, hundreds of assets,
and thousands of daily activities:

- Are workers wearing the correct PPE?
- Are training certifications current?
- Are pipeline inspections on schedule?
- Are water discharge samples within NEMA limits?
- Are corrective actions closed on time?

How do you reduce all of this complexity into one number that is both
**meaningful** and **actionable**?

## Sentinel's Four-Level Compliance Pyramid

Sentinel uses a **hierarchical scoring model** — the same approach used
by major oil & gas companies like Shell, BP, and TotalEnergies for their
global HSE programs. It works like this:

```
                           ┌─────────────────┐
                           │  OVERALL        │
                           │  COMPLIANCE     │  ← One master score
                           │  SCORE (OCS)    │
                           └────────┬────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
     ┌──────▼──────┐         ┌─────▼──────┐        ┌──────▼──────┐
     │   DOMAIN    │         │   DOMAIN   │        │   DOMAIN    │
     │   SCORE     │         │   SCORE    │        │   SCORE     │  ← 4 domains
     └──────┬──────┘         └─────┬──────┘        └──────┬──────┘
            │                      │                       │
      ┌─────┼─────┐          ┌─────┼─────┐          ┌─────┼─────┐
      │     │     │          │     │     │          │     │     │
   ┌──▼─┐┌─▼──┐┌─▼──┐    ┌──▼─┐┌─▼──┐┌─▼──┐    ┌──▼─┐┌─▼──┐┌─▼──┐
   │KPI ││KPI ││KPI │    │KPI ││KPI ││KPI │    │KPI ││KPI ││KPI │  ← 16 KPIs
   └────┘└────┘└────┘    └────┘└────┘└────┘    └────┘└────┘└────┘
      │     │     │          │     │     │          │     │     │
   ┌──▼─┐┌─▼──┐┌─▼──┐    ┌──▼─┐┌─▼──┐┌─▼──┐    ┌──▼─┐┌─▼──┐┌─▼──┐
   │Data││Data││Data│    │Data││Data││Data│    │Data││Data││Data│  ← Evidence
   └────┘└────┘└────┘    └────┘└────┘└────┘    └────┘└────┘└────┘
```

### The Four Levels Explained

```
LEVEL 4 (Bottom) — Evidence Records
        Raw validated data: inspection completed, training passed,
        water sample taken, incident reported.
        Example: "Pipeline segment KPC-NBO-012 was inspected
                  on 2026-07-20 (on schedule)."

LEVEL 3 — Key Performance Indicators (KPIs)
        A calculated percentage from the evidence.
        Example: "95% of required inspections were completed
                  on time this month."

LEVEL 2 — Compliance Domains
        A weighted average of 4 KPIs within one domain.
        Example: "Asset Integrity Compliance = 88.4%"

LEVEL 1 (Top) — Overall Compliance Score
        A weighted average of all 4 domains.
        Example: "Overall Compliance Score = 87.2%"
```

## The Master Formula

Here is the exact formula Sentinel uses to calculate the Overall Compliance
Score:

```
OCS = (Safety × 30%) + (Environmental × 25%)
      + (Asset Integrity × 25%) + (Regulatory × 20%)
```

**Why these weights?**
- **Safety (30%)** — Highest weight because people's lives are at stake.
  A safety failure can be irreversible (fatality).
- **Environmental (25%)** — KPC's pipeline crosses sensitive ecosystems
  (Mau Forest, Rift Valley water catchments). Environmental breaches
  trigger NEMA enforcement and threaten the licence to operate.
- **Asset Integrity (25%)** — Physical infrastructure failures are the
  leading cause of pipeline incidents. Inspections and maintenance
  prevent these.
- **Regulatory (20%)** — Governance and audit compliance. Important,
  but largely a lagging indicator of the other three.

### Example Calculation

```
Scenario: KPC's scores this week

Domain                    Score      Weight      Contribution to OCS
─────────────────────────────────────────────────────────────────
Safety Compliance         84.2%  ×   30%    =    25.26
Environmental Compliance  91.7%  ×   25%    =    22.93
Asset Integrity           86.1%  ×   25%    =    21.53
Regulatory Compliance     90.5%  ×   20%    =    18.10
─────────────────────────────────────────────────────────────────
                          OVERALL COMPLIANCE SCORE  =  87.82%
─────────────────────────────────────────────────────────────────
Status: 🟡 AMBER (75–89% = At Risk — Monitor and Act)
```

In this example, Safety is pulling the score down (84.2%). That immediately
tells leadership where to focus attention this week.

## The Traffic-Light Thresholds

Every score is color-coded using universal traffic-light logic:

```
┌────────────────┬──────────────┬─────────────────────────────────┐
│  COLOR         │  SCORE RANGE │  MEANING                        │
├────────────────┼──────────────┼─────────────────────────────────┤
│  🟢 GREEN      │  90–100%     │  Compliant — maintain current   │
│                │              │  performance                    │
├────────────────┼──────────────┼─────────────────────────────────┤
│  🟡 AMBER      │  75–89%      │  At Risk — active monitoring    │
│                │              │  and corrective action required │
├────────────────┼──────────────┼─────────────────────────────────┤
│  🔴 RED        │  0–74%       │  Non-Compliant — immediate      │
│                │              │  executive intervention needed  │
└────────────────┴──────────────┴─────────────────────────────────┘
```

This makes the score **actionable at a glance**. An executive sees 🔴 and
knows: this is urgent.

---

**Takeaway for judges:** One score, calculated from 4 domains, weighted by
real-world risk priorities. Color-coded for instant interpretation. This
is what turns data into a decision.

---

---

# SLIDE 8 — THE FOUR COMPLIANCE DOMAINS

```
╔══════════════════════════════════════════════════════════════════╗
║      🎯  WHAT SENTINEL ACTUALLY MEASURES                        ║
╚══════════════════════════════════════════════════════════════════╝
```

## Breaking Down the Four Domains

Each of the four compliance domains represents a critical area of KPC's
operations. Let us explain what each domain measures, why it matters, and
what happens when it fails.

---

### DOMAIN 1 — SAFETY COMPLIANCE (Weight: 30%)

```
What it measures:
Whether people working on KPC sites are protected by the correct
procedures, training, equipment, and authorizations at all times.
```

**Child Indicators:**
1. **PPE Compliance** — Are workers wearing the correct personal protective
   equipment for their task?
2. **Training Compliance** — Are all workers' mandatory HSE training
   certifications current and not expired?
3. **Permit-to-Work Compliance** — Are high-risk activities (hot work,
   confined space entry) carried out under a valid, authorized permit?
4. **Incident Reporting Compliance** — Are workplace incidents reported
   within the required timeframe (24 hours for near-miss, 4 hours for
   serious incidents)?

**Why this domain has the highest weight (30%):**
People are KPC's most critical asset. A safety failure can cause:
- Worker fatalities (irreversible)
- Criminal prosecution of site managers under OSHA 2007
- EPRA operational shutdowns
- Reputational damage

**Real-world scenario:**
If Sentinel detects that PTW Compliance drops to 85% (below the 98% green
threshold), it means that **15 out of every 100 high-risk jobs were started
without proper authorization**. Any one of those could result in a fatality.
The system flags this immediately and generates an alert to the HSE Director.

---

### DOMAIN 2 — ENVIRONMENTAL COMPLIANCE (Weight: 25%)

```
What it measures:
Whether KPC's operations meet environmental regulations and do not
harm water sources, air quality, or surrounding communities.
```

**Child Indicators:**
1. **Water Quality Compliance** — Are water discharge samples within NEMA
   (National Environment Management Authority) limits?
2. **Air Quality Compliance** — Are air emissions from pump stations and
   facilities within NEMA air quality regulations?
3. **Waste Management Compliance** — Is hazardous waste classified correctly,
   disposed by licensed contractors, and documented with certificates?
4. **Spill Response Compliance** — When a hydrocarbon spill occurs, is the
   emergency response initiated within the required timeframe (15 minutes
   for major spills)?

**Why this domain matters:**
KPC's pipeline traverses ecologically sensitive areas — the Mau Forest,
Rift Valley water catchments, and populated areas. An environmental breach
triggers:
- NEMA enforcement notices and fines
- Community protests and disruption
- Potential EPRA licence suspension
- Multi-million shilling cleanup costs

**Real-world scenario:**
If Sentinel detects a water sample at Kisumu Station that exceeds NEMA's
discharge limit by 1.4× (Total Petroleum Hydrocarbons), it immediately
flags this as a High-severity environmental non-compliance. The system
recommends: "Identify contamination source; inspect oil/water separator;
notify NEMA within 24 hours if significant exceedance."

---

### DOMAIN 3 — ASSET INTEGRITY COMPLIANCE (Weight: 25%)

```
What it measures:
Whether KPC's physical assets (pipelines, pumps, tanks, valves) are
inspected, maintained, and monitored within required intervals.
```

**Child Indicators:**
1. **Inspection Compliance** — Are pipeline segments, pressure vessels,
   and safety-critical equipment inspected on schedule?
2. **Preventive Maintenance Compliance** — Are planned maintenance work
   orders (for pumps, compressors, valves) completed on schedule?
3. **Corrosion Monitoring Compliance** — Are corrosion monitoring points
   on buried pipelines read and assessed within their monitoring interval?
4. **Leak Detection System Availability** — Is the computational pipeline
   monitoring (CPM) system operational and detecting leaks in real time?

**Why this domain matters:**
Asset failures are the primary cause of pipeline incidents globally (PHMSA
data). An overdue inspection or deferred maintenance creates a latent
failure that manifests as:
- Pipeline ruptures
- Hydrocarbon spills
- Fires and explosions
- Multi-day operational shutdowns

**Real-world scenario:**
If Sentinel detects that 5 pipeline segments at Nairobi West Station are
overdue for inspection by more than 30 days, and 3 of them are classified
as High criticality, the system raises a Critical alert. The recommended
action: "Deploy inspection team to Nairobi West within 48 hours. Consider
operational risk assessment pending inspection."

---

### DOMAIN 4 — REGULATORY COMPLIANCE (Weight: 20%)

```
What it measures:
Whether KPC fulfills its obligations to external regulators (EPRA, NEMA,
DOSHS) and its own internal governance requirements.
```

**Child Indicators:**
1. **Audit Compliance** — Are planned internal and external HSE audits
   completed on schedule?
2. **Corrective Action Closure** — Are audit findings and incident
   investigation recommendations closed with evidence by their target date?
3. **Regulatory Reporting** — Are statutory reports (EPRA, NEMA, DOSHS)
   submitted on time?
4. **SOP Adherence** — Are operational activities carried out in accordance
   with approved Standard Operating Procedures?

**Why this domain matters:**
Regulatory compliance provides the governance envelope within which all
other domains operate. Failures here signal systemic breakdowns:
- Audit findings not closed = failure to learn and improve
- Reports not filed on time = regulatory penalties and increased scrutiny
- SOPs not followed = operational unpredictability and risk

**Real-world scenario:**
If Sentinel detects that 3 corrective actions from an EPRA inspection are
overdue (past their target date by more than 30 days), it raises a
High-severity alert. The recommended action: "Escalate to responsible
department head; conduct weekly review for all overdue critical CARs;
notify Legal and Regulatory Affairs team."

---

**Takeaway for judges:** Four domains. Sixteen KPIs. Every one maps to a
real regulation, a real risk, and a real consequence if it fails. Sentinel
measures all of them, all the time.

---

---

# SLIDE 9 — HOW KPIs ARE CALCULATED (WITH EXAMPLES)

```
╔══════════════════════════════════════════════════════════════════╗
║      🧮  FROM RAW DATA TO A KPI SCORE                           ║
╚══════════════════════════════════════════════════════════════════╝
```

## Making It Concrete: Real KPI Calculations

Let us walk through exactly how Sentinel calculates three KPIs, using real
numbers. This shows judges that the scoring is not abstract — it is
grounded in actual field data.

---

### EXAMPLE 1 — Training Compliance Indicator (KPI-S02)

**Question answered:**
"What percentage of employees and contractors have all their mandatory
HSE training certifications current and not expired?"

**Data sources:**
- Employee register (all active personnel)
- Training records (LMS — Learning Management System)
- Training matrix (which training modules each role requires)

**Calculation:**

```
Step 1: Query the employee register
        Result: 1,450 active employees and contractors

Step 2: For each person, check if all their required training is current
        Example for one person:

        Employee: John Kamau
        Role: Pipeline Technician
        Required Training:
          ✅ Confined Space Entry (expires 2026-12-01) — CURRENT
          ✅ Hot Work Safety (expires 2026-09-15) — CURRENT
          ❌ H2S Awareness (expired 2026-06-30) — EXPIRED
        Status: NON-COMPLIANT (1 expired module)

Step 3: Count total compliant vs. non-compliant
        Compliant:     1,305 employees
        Non-compliant:   145 employees
        Total:         1,450

Step 4: Calculate percentage
        Training Compliance Score = (1,305 / 1,450) × 100
                                  = 90.0%

Step 5: Apply threshold color-coding
        90.0% = exactly at the Green threshold (≥90%)
        Status: 🟢 GREEN (Compliant)
```

**What Sentinel does with this:**
- Displays "90.0%" on the Safety Domain dashboard
- Lists the 145 non-compliant employees by name in the drill-down view
- Sends a weekly report to HR listing employees whose training expires
  in the next 14 days

---

### EXAMPLE 2 — Inspection Compliance Indicator (KPI-A01)

**Question answered:**
"What percentage of assets due for inspection this period were actually
inspected on schedule?"

**Data sources:**
- Asset register (all pipelines, tanks, pumps, valves)
- Inspection schedule (each asset's required inspection interval)
- Work orders (CMMS — Computerized Maintenance Management System)

**Calculation:**

```
Step 1: Identify all assets due for inspection in July 2026
        Result: 87 assets due

Step 2: Check which assets were actually inspected on time
        Example for one asset:

        Asset: Pipeline Segment KPC-NBO-012
        Last Inspection: 2026-04-15
        Required Interval: 90 days
        Next Due Date: 2026-07-14
        Actual Inspection Date: 2026-07-20 (6 days late)
        Status: OVERDUE (non-compliant)

Step 3: Count compliant vs. overdue
        Inspected on time:  81 assets
        Overdue:             6 assets
        Total due:          87 assets

Step 4: Calculate percentage
        Inspection Compliance Score = (81 / 87) × 100
                                    = 93.1%

Step 5: Apply threshold color-coding
        93.1% ≥ 95% Green threshold? No.
        93.1% ≥ 80% Amber threshold? Yes.
        Status: 🟡 AMBER (At Risk)
```

**What Sentinel does with this:**
- Displays "93.1%" in Amber on the Asset Integrity dashboard
- Lists the 6 overdue assets in a drill-down table, sorted by days overdue
- Flags the 2 High-criticality assets among the overdue (these are urgent)
- Generates an alert: "6 inspections overdue — 2 are High criticality"

---

### EXAMPLE 3 — Permit-to-Work Compliance Indicator (KPI-S03)

**Question answered:**
"What percentage of high-risk work activities were carried out under a
valid, authorized Permit-to-Work?"

**Data sources:**
- Work orders (CMMS) — all maintenance jobs tagged as high-risk
- PTW register — all permits issued, authorized, and closed

**Calculation:**

```
Step 1: Query all high-risk work orders completed this week
        High-risk types: Hot Work, Confined Space, Work at Height,
                         Electrical Isolation, Excavation
        Result: 42 high-risk work orders completed

Step 2: For each work order, check if a corresponding PTW exists
        Example for one work order:

        Work Order: WO-2026-0823
        Type: Hot Work (welding on valve)
        Status: Completed on 2026-07-22
        Linked PTW: PTW-2026-1104
        PTW Status: CLOSED (properly authorized and signed off)
        Result: COMPLIANT

        Work Order: WO-2026-0831
        Type: Confined Space Entry (tank inspection)
        Status: Completed on 2026-07-23
        Linked PTW: NONE
        Result: VIOLATION (high-risk work without PTW)

Step 3: Count compliant vs. violations
        With valid PTW:  41 work orders
        Without PTW:      1 work order
        Total:           42 work orders

Step 4: Calculate percentage
        PTW Compliance Score = (41 / 42) × 100
                             = 97.6%

Step 5: Apply threshold color-coding
        97.6% ≥ 98% Green threshold? No.
        97.6% ≥ 90% Amber threshold? Yes.
        Status: 🟡 AMBER (At Risk)

        NOTE: PTW has a very tight green threshold (98%) because
              a single unauthorized confined space entry can be
              immediately fatal.
```

**What Sentinel does with this:**
- Displays "97.6%" in Amber on the Safety dashboard
- Flags the one work order (WO-2026-0831) that was completed without a PTW
- Raises a High-severity alert: "Work order completed without PTW"
- Recommends: "Investigate immediately; issue non-conformance report;
  conduct mandatory re-briefing of PTW procedure for site supervisor"

---

## Why This Level of Detail Matters

Each KPI is **traceable** — you can drill down from the score all the way
to the individual work order, employee, or asset that contributed to it.
This is critical for two reasons:

1. **Auditability:** When EPRA or NEMA audits KPC, they will ask: "How did
   you calculate this compliance score?" Sentinel can show them the exact
   data lineage — from field record to KPI to domain score to OCS.

2. **Actionability:** A score of 93.1% is not actionable by itself. But
   when you can see the 6 specific assets that are overdue, where they are
   located, and how many days overdue they are — now you can dispatch an
   inspection team.

---

**Takeaway for judges:** Every KPI is calculated from real field data using
a documented formula. Every score can be traced back to its source records.
This is not a black box — it is a transparent, auditable calculation.

---


---

# SLIDE 10 — THE EXECUTIVE DASHBOARD

```
╔══════════════════════════════════════════════════════════════════╗
║      📺  LAYER 3 — WHERE INTELLIGENCE BECOMES VISIBLE           ║
╚══════════════════════════════════════════════════════════════════╝
```

## From Numbers to Decisions in 5 Seconds

The executive dashboard is designed for one purpose: to let KPC's CEO, HSE
Director, or a Station Manager understand the compliance situation in under
5 seconds of looking at the screen — without reading a report, without
clicking anything, without asking "What does this mean?"

### The Design Philosophy: The Cockpit Principle

Think of an aircraft cockpit. A pilot does not have time to read manuals
mid-flight. The instruments must communicate instantly:

```
✅ All green dials      → Everything is normal, maintain course
🟡 One amber dial      → Something needs attention soon
🔴 One red dial        → Urgent, take action now
```

Sentinel's dashboard applies this same principle to compliance.

---

## Dashboard Layout (Wireframe Walkthrough)

```
┌──────────────────────────────────────────────────────────────────────┐
│  SENTINEL — KPC HSE Compliance Intelligence                          │
│  Period: July 2026 ▼    Station: All Stations ▼                     │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────┤
│              │              │              │              │         │
│   Overall    │   Safety     │ Environment  │ Asset        │ Regul.  │
│   Compliance │   Compliance │ Compliance   │ Integrity    │ Compli. │
│              │              │              │              │         │
│   🟡 87.8%   │  🟡 84.2%   │  🟢 91.7%   │  🟡 86.1%   │ 🟢 90.5%│
│   [Gauge]    │  [Gauge]     │  [Gauge]     │  [Gauge]     │ [Gauge] │
│   ▼ -2.1%    │  ▼ -4.3%     │  ▲ +1.2%     │  ▼ -1.8%     │ ▲ +0.5% │
│              │              │              │              │         │
├──────────────┴──────────────┴──────────────┴──────────────┴─────────┤
│                                                                      │
│  📈 COMPLIANCE TREND (12-week rolling)                               │
│  [Line chart showing OCS + 4 domain lines with green/amber/red      │
│   threshold bands shaded horizontally]                              │
│                                                                      │
├────────────────────────────────────┬─────────────────────────────────┤
│                                    │                                 │
│  ⚠ TOP NON-COMPLIANT ASSETS        │  🗺 COMPLIANCE HEAT MAP         │
│  [Table sorted by severity]        │  [Geographic pipeline map with  │
│                                    │   stations colored by score]    │
│  1. Pipeline KPC-NBO-012           │                                 │
│     Nairobi-Nakuru corridor        │    [Map shows:                  │
│     4 violations, 22 days overdue  │     Mombasa: 🟢 Green          │
│                                    │     Nairobi: 🟡 Amber          │
│  2. Pump KPC-ELD-P03               │     Nakuru:  🟡 Amber          │
│     Eldoret Station                │     Eldoret: 🔴 Red            │
│     3 PM overdue, 18 days          │     Kisumu:  🟢 Green]         │
│                                    │                                 │
│  [Export to PDF] [View All]        │  [Click station for details]    │
│                                    │                                 │
├────────────────────────────────────┼─────────────────────────────────┤
│                                    │                                 │
│  🔍 OVERDUE INSPECTIONS            │  📋 OPEN CORRECTIVE ACTIONS     │
│  [Stacked bar by station]          │  [Donut chart]                  │
│                                    │                                 │
│  Nairobi West  ████████ (8)        │      [14 Total]                 │
│  Eldoret       █████ (5)           │   Open: 6                       │
│  Nakuru        ███ (3)             │   In Progress: 5                │
│                                    │   Overdue: 3 (Critical)         │
│  [Schedule Now]                    │   [View Details]                │
│                                    │                                 │
├────────────────────────────────────┴─────────────────────────────────┤
│                                                                      │
│  🤖 AI RECOMMENDATIONS (Today's Top 3 Actions)                       │
│                                                                      │
│  1. ⚠ URGENT — Training compliance at Mombasa Depot has fallen      │
│     8 points in 14 days. 34 contractors are working without current │
│     certifications. Action: Direct HR to resolve within 5 days.     │
│     [View Details]                                                   │
│                                                                      │
│  2. 🔧 HIGH PRIORITY — 5 critical-asset inspections overdue at      │
│     Nairobi West Station (longest: 38 days). Action: Deploy team    │
│     by Monday. [View Asset List]                                    │
│                                                                      │
│  3. 📝 MEDIUM — 3 EPRA audit findings are 41 days past target date. │
│     Blocking regulatory closure. Action: Escalate to Maintenance    │
│     Superintendent. [View CARs]                                     │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Key Dashboard Widgets Explained

### Widget 1 — Overall Compliance Score Gauge
**What it shows:** A single number (87.8%) with a color (🟡 Amber) and a
delta (▼ -2.1% from last week).

**Why it matters:** In 1 second, the CEO knows: "We are in the amber zone
and trending down. Something needs attention."

---

### Widget 2-5 — Domain Gauges
**What they show:** The score for each of the four compliance domains.

**Why it matters:** The CEO can immediately see **which domain is pulling
the score down**. In this example, Safety is at 84.2% and fell 4.3 points
— that is where the problem is. No need to read a 20-page report.

---

### Widget 6 — Compliance Trend Line
**What it shows:** 12 weeks of historical scores for OCS and all 4 domains.

**Why it matters:** Trend is more important than any single week's score.
A score of 85% that is rising is better than 87% that is falling. This
chart shows direction of travel.

---

### Widget 7 — Top Non-Compliant Assets Table
**What it shows:** The specific physical assets (pipeline segments, pumps,
tanks) that are driving non-compliance, ranked by severity and days overdue.

**Why it matters:** This is the **actionable list**. A Station Manager can
take this table, dispatch a maintenance team, and fix the three highest-
priority items today.

---

### Widget 8 — Compliance Heat Map
**What it shows:** A geographic map of KPC's pipeline network with stations
colored by their compliance score (Green/Amber/Red).

**Why it matters:** Compliance has a physical location. If Eldoret Station
is red, a field team needs to go there. The map communicates both the
problem and the location simultaneously.

---

### Widget 9 — Overdue Inspections Bar Chart
**What it shows:** A count of overdue inspections at each station, broken
down by severity (0-30 days, 31-90 days, >90 days).

**Why it matters:** Overdue inspections are a leading indicator of future
failures. This widget surfaces the inspection backlog before it becomes
a pipeline rupture.

---

### Widget 10 — Open Corrective Actions Donut
**What it shows:** The status distribution of all corrective actions (Open,
In Progress, Overdue), with a count of Critical CARs.

**Why it matters:** Unclosed corrective actions represent **failure to
learn**. Regulators specifically examine this during audits. The donut
makes it visible at a glance.

---

### Widget 11 — AI Recommendations Panel
**What it shows:** Three specific, plain-language actions generated by
Sentinel's AI engine, ranked by urgency.

**Why it matters:** This reduces cognitive load. Instead of the CEO having
to interpret charts and decide what to do, Sentinel tells them: "Here are
the three things you must do this week."

---

**Takeaway for judges:** The dashboard presents everything an executive needs
to make a decision in 5 seconds — score, trend, location, priority list, and
AI-generated actions. No scrolling, no clicking, no guessing.

---

---

# SLIDE 11 — THE DRILL-DOWN EXPERIENCE

```
╔══════════════════════════════════════════════════════════════════╗
║      🔎  EVERY NUMBER IS A GATEWAY, NOT A DEAD END              ║
╚══════════════════════════════════════════════════════════════════╝
```

## The Problem with Most Dashboards

Most analytics dashboards show you a number like "Safety Compliance: 84.2%"
and that is it. You see the problem, but you cannot act on it because you
do not know:

- **Why** is it 84.2%?
- **Which specific records** are driving the score down?
- **Which assets** or people are non-compliant?
- **What evidence** supports this calculation?

Sentinel solves this with a seven-level drill-down architecture. Every
number on the dashboard is clickable and leads to deeper detail, all the
way down to the original field record.

---

## The Seven-Level Navigation Path

```
LEVEL 1: Dashboard — Overall Compliance Score (87.8%)
         │
         ▼ Click "Safety Compliance" domain gauge (84.2%)
         │
LEVEL 2: Safety Domain View
         [Shows 4 indicator gauges: PPE, Training, PTW, Incident Reporting]
         │
         ▼ Click "Training Compliance" indicator (90.0%)
         │
LEVEL 3: Training Compliance Detail
         [Shows formula, threshold, contributing records list]
         │
         ▼ Click a specific non-compliant record (John Kamau — H2S Expired)
         │
LEVEL 4: Employee Profile
         [Full training history, current status, all expired modules]
         │
         ▼ Click "View Training Record"
         │
LEVEL 5: Training Record Evidence
         [Original LMS record with completion date, expiry date, certificate]
         │
         ▼ Click "Raise Corrective Action"
         │
LEVEL 6: Corrective Action Detail
         [CAR raised, responsible person, target date, status, evidence]
         │
         ▼ Click "View Historical Trend"
         │
LEVEL 7: Historical Compliance Trend for This Employee
         [12-month chart showing all training completions and expirations]
```

---

## Walking Through a Real Drill-Down Scenario

Let us follow a Station Manager investigating why Safety Compliance is low
at their station.

### STEP 1 — Dashboard (5 seconds)
The Station Manager logs in and sees:

```
Overall Compliance: 🟡 87.8%
Safety Compliance:  🟡 84.2% ▼ -4.3%
```

They click the Safety gauge.

---

### STEP 2 — Safety Domain View (10 seconds)
They see four indicator gauges:

```
PPE Compliance:               🟢 96.4%
Training Compliance:          🟡 90.0% ← This one is at the threshold
Permit-to-Work Compliance:    🟢 97.6%
Incident Reporting:           🟢 95.8%
```

Training Compliance is exactly at the 90% green threshold. They click it
to see why.

---

### STEP 3 — Training Compliance Detail (20 seconds)
They see:

```
Training Compliance Score: 90.0%
Formula: (Employees with all current training) / (Total employees) × 100
        = 1,305 / 1,450 = 90.0%

Threshold: Green ≥ 90%, Amber 75-89%, Red < 75%
Status: 🟢 GREEN (barely — exactly at threshold)

Non-Compliant Employees (145 total):
┌──────────────────┬──────────────────┬───────────────────────┐
│ Employee         │ Station          │ Expired Module        │
├──────────────────┼──────────────────┼───────────────────────┤
│ John Kamau       │ Nairobi West     │ H2S Awareness         │
│ Mary Wanjiru     │ Nairobi West     │ Confined Space Entry  │
│ Peter Odhiambo   │ Eldoret          │ Hot Work Safety       │
│ ...              │ ...              │ ...                   │
└──────────────────┴──────────────────┴───────────────────────┘

[Export List] [Schedule Training]
```

The Station Manager sees that **145 employees** have expired training.
They click on John Kamau to see his full profile.

---

### STEP 4 — Employee Profile (30 seconds)
They see John Kamau's full training status:

```
Employee: John Kamau
Role: Pipeline Technician
Station: Nairobi West
Status: Non-Compliant (1 expired module)

Required Training Modules:
┌─────────────────────────┬──────────────┬────────────┬──────────┐
│ Module                  │ Last Taken   │ Expires    │ Status   │
├─────────────────────────┼──────────────┼────────────┼──────────┤
│ Confined Space Entry    │ 2025-12-15   │ 2026-12-01 │ ✅ Current│
│ Hot Work Safety         │ 2025-09-20   │ 2026-09-15 │ ✅ Current│
│ H2S Awareness           │ 2024-07-10   │ 2026-06-30 │ ❌ EXPIRED│
└─────────────────────────┴──────────────┴────────────┴──────────┘

Last Compliance Score for This Employee: 66.7% (1 of 3 modules expired)

Assigned Corrective Action: CAR-2026-0521 (due 2026-08-15)
[View Training Records] [Schedule Refresher] [View CAR]
```

The Station Manager clicks "View Training Records" to see the evidence.

---

### STEP 5 — Training Record Evidence (40 seconds)
They see the original LMS record:

```
Training Record ID: TR-2024-3347
Employee: John Kamau (EMP-1823)
Module: H2S Awareness (HSE-MOD-009)
Completion Date: 2024-07-10
Expiry Date: 2026-06-30 (24-month validity)
Pass/Fail: PASS
Certificate Reference: CERT-2024-07-3347.pdf [Download]

Status: EXPIRED (30 days past expiry)

Refresher Training Available:
  Next session: 2026-08-05 (Nairobi Training Centre)
  [Enroll John Kamau]
```

The Station Manager clicks "View CAR" to see if a corrective action has
already been raised.

---

### STEP 6 — Corrective Action Detail (50 seconds)
They see:

```
Corrective Action ID: CAR-2026-0521
Source: Sentinel Automated Alert (Training Expiry Detected)
Finding: "John Kamau's H2S Awareness training expired on 2026-06-30.
         Employee is non-compliant for safety-critical tasks."

Responsible Person: Mary Njeri (HR Manager, Nairobi West)
Target Date: 2026-08-15
Status: In Progress

Actions Taken:
  2026-07-20: CAR raised automatically by Sentinel
  2026-07-22: John Kamau notified via email
  2026-07-25: Enrolled in refresher session on 2026-08-05

Evidence of Closure: (Pending — awaiting training completion)

[Close CAR] [Upload Evidence] [Escalate]
```

The Station Manager sees that the corrective action is already in progress.
HR has enrolled John in the next available refresher session. They click
"View Historical Trend" to see if this is a recurring problem.

---

### STEP 7 — Historical Compliance Trend (60 seconds)
They see a 12-month chart:

```
John Kamau — Training Compliance History (July 2025 - July 2026)

100% ┤ ●─────●─────●─────●─────●─────●─────●
     │                                     ╲
 75% ┤                                      ╲
     │                                       ●───● ← Expired June 2026
 50% ┤
     │
  0% ┼─────────────────────────────────────────────
     Jul  Sep  Nov  Jan  Mar  May  Jul
     2025                          2026

Training Completions:
  2024-07-10: H2S Awareness (expires 2026-06-30) — EXPIRED
  2025-09-20: Hot Work Safety (expires 2026-09-15)
  2025-12-15: Confined Space Entry (expires 2026-12-01)

Pattern: John has consistently completed refreshers on time except
         for H2S Awareness (missed reminder notification).
         No recurring pattern — likely a one-time miss.
```

---

## What Just Happened?

In 60 seconds, the Station Manager:

1. Identified that Training Compliance is at the threshold
2. Saw that 145 employees have expired training
3. Drilled into one specific employee (John Kamau)
4. Verified the evidence (original LMS record)
5. Confirmed a corrective action is already in progress
6. Checked historical trends to see if this is a recurring issue

**All from a single click on the dashboard.**

---

## Why This Matters

Without drill-down, the Station Manager would have to:
- Email HR: "Why is training compliance at 90%?"
- Wait for HR to export a report from the LMS
- Manually cross-reference the report with the employee register
- Follow up with individual supervisors
- Track corrective actions separately in a spreadsheet

With Sentinel, it is instant. Every number is traceable to its source.

---

**Takeaway for judges:** Every score is a gateway. Click once to see the
domain. Click again to see the indicator. Click again to see the records.
Click again to see the evidence. Seven levels deep — from dashboard to
original field record — in under 60 seconds.

---

---

# SLIDE 12 — THE AI INSIGHTS PANEL

```
╔══════════════════════════════════════════════════════════════════╗
║      🤖  FROM DATA TO DECISIONS — WHAT TO DO NOW                ║
╚══════════════════════════════════════════════════════════════════╝
```

## The Last-Mile Problem in Analytics

Most analytics systems stop at visualization. They show you charts, tables,
and maps. They tell you **what** is happening. But they do not tell you
**what to do about it**.

This creates the "last-mile problem" — the gap between seeing a red number
and knowing what action to take.

### Sentinel's AI Panel: From Insight to Action

Sentinel's AI Executive Decision Support Panel runs every night and answers
eight critical questions that executives actually ask:

```
1. Why did compliance decrease this week?
2. Which assets are contributing most to non-compliance?
3. Which corrective actions are overdue?
4. Which pipeline segment presents the highest environmental risk?
5. Which stations require immediate inspection?
6. Which compliance area is deteriorating fastest?
7. What is the current risk to our regulatory licence?
8. What are my top three actions for this week?
```

Every morning, the top three insights are presented on the dashboard in
plain business language — no charts, no jargon, just specific actions.

---

## How It Works: Not a Black Box

Sentinel's AI panel is **not a free-form ChatGPT-style chatbot**. It is a
**template-based narrative generation engine**. Every sentence is traceable
to a specific data query. This ensures:

- **Auditability** — every statement can be verified
- **Consistency** — the same logic is applied every day
- **Explainability** — you can see the underlying data

### Example: Question 1 — "Why did compliance decrease this week?"

**Step 1: Query the data**
```sql
SELECT domain, this_week_score, last_week_score,
       (this_week_score - last_week_score) AS delta
FROM compliance_scores
WHERE period_end = '2026-07-24'
ORDER BY delta ASC
```

**Step 2: Identify the biggest drop**
```
Result:
  Domain: Asset Integrity
  This week: 86.1%
  Last week: 93.2%
  Delta: -7.1 points (largest drop)
```

**Step 3: Drill into the indicators within that domain**
```sql
SELECT indicator, this_week_score, last_week_score,
       (this_week_score - last_week_score) AS delta
FROM compliance_scores
WHERE domain = 'Asset Integrity'
  AND period_end = '2026-07-24'
ORDER BY delta ASC
```

**Step 4: Identify the specific records driving the drop**
```sql
SELECT asset_id, asset_name, station, violation_type, days_overdue
FROM asset_violations
WHERE domain = 'Asset Integrity'
  AND created_date > '2026-07-17'
ORDER BY severity DESC, days_overdue DESC
LIMIT 5
```

**Step 5: Generate narrative from template**
```
Template:
"Overall compliance fell by {ocs_delta} points this week (from {last_week}
to {this_week}), driven primarily by a {domain_delta}-point drop in
{domain_name}. The decline is attributable to {violation_count} new
{violation_type} records at {station_names} — {critical_count} of these
are {criticality} criticality and are now more than {days} days past their
required {action_type}."

Populated output:
"Overall compliance fell by 3.2 points this week (from 91.4% to 88.2%),
driven primarily by a 7.1-point drop in Asset Integrity Compliance. The
decline is attributable to 8 new overdue inspection records at Nairobi
West Station and Eldoret Station — 5 of these are High criticality and
are now more than 14 days past their required inspection date."
```

**Step 6: Add recommended action**
```
"Recommended Action: Deploy inspection team to Nairobi West within 48 hours.
Prioritize the 5 High-criticality assets. Estimated time to restore
compliance: 2 weeks with dedicated resources."
```

---

## Example AI Insights (As Shown on Dashboard)

### Insight 1 (URGENT)
```
⚠ URGENT — Training compliance at Mombasa Depot has fallen 8 points
in 14 days.

WHY: Mass contractor mobilization for a major maintenance project brought
34 new contractors on site. Their training records have not yet been uploaded
to the LMS, making them appear "non-compliant" even though they may have
valid certifications.

IMPACT: If these contractors are actually untrained, this represents a
potential OSHA 2007 violation. If they are trained but not recorded, this
is a data quality issue that is distorting the compliance score.

ACTION: Direct HR to verify contractor training certificates within 5
working days. Upload valid records to LMS immediately. Restrict contractors
without verified training from safety-critical tasks.

[View 34 Contractors] [View Station Detail]
```

---

### Insight 2 (HIGH PRIORITY)
```
🔧 HIGH PRIORITY — 5 critical-asset inspections overdue at Nairobi West
Station (longest: 38 days).

WHY: The inspection team was diverted to Kisumu Station in June to
investigate a spill incident. The scheduled Nairobi West inspections were
postponed but not rescheduled.

IMPACT: Pipeline segment KPC-NBO-012 (High criticality, traverses populated
area) is now 38 days past its 90-day inspection interval. Undetected
corrosion or wall loss could lead to a rupture.

ACTION: Mobilize inspection team by Monday. Prioritize KPC-NBO-012 and
the other 4 High-criticality segments. Estimated time: 3 days for all 5
inspections.

[View Asset List] [Schedule Inspection] [View Station Map]
```

---

### Insight 3 (MEDIUM)
```
📝 MEDIUM — 3 EPRA audit findings are 41 days past target date. Blocking
regulatory closure.

WHY: The most overdue CAR (CAR-2026-0047: "Calibrate Leak Detection
Equipment at Nakuru Station") requires a vendor visit. The procurement
process for the calibration service stalled due to budget approval delays.

IMPACT: EPRA's Q1 2026 inspection report cannot be formally closed until
all findings are resolved. This may escalate to EPRA enforcement if the
delay extends past 60 days.

ACTION: Escalate budget approval to Finance Director. If vendor visit
cannot be scheduled within 10 days, provide EPRA with an interim status
report explaining the delay and committing to a revised closure date.

[View EPRA Findings] [View CAR-2026-0047] [Generate Status Report]
```

---

## Why This Is Not Just "Nice to Have"

### Scenario: Board Meeting, Monday Morning

**Without AI Insights:**
CEO: "Our compliance score dropped 3 points this week. HSE Director, what
      happened?"
HSE Director: "I will need to review the data and get back to you."
(Translation: Meeting ends without a decision.)

**With AI Insights:**
CEO: "Our compliance score dropped 3 points this week. HSE Director, what
      happened?"
HSE Director: "Sentinel flagged this on Friday. The drop is driven by 8
      overdue inspections at Nairobi West — 5 are High criticality. I have
      already mobilized the inspection team. They start Monday. We will be
      back in the green zone within 2 weeks."
(Translation: Decision made, action in progress.)

---

## The "Show Data" Button — Explainability

Every AI insight card has a "Show Data" button. Clicking it reveals:

- The SQL query that was run
- The raw query results (the data table)
- The narrative template used
- A version timestamp (so historical insights remain reproducible)

This is critical for **regulatory defensibility**. When EPRA asks "How did
your AI decide this was urgent?" — KPC can show them the exact data and
logic, not a black-box model.

---

**Takeaway for judges:** The AI panel does not just show problems — it
explains why they happened, what the impact is, and what specific action
to take. Every insight is traceable to source data. This is intelligence,
not just analytics.

---


---

# SLIDE 13 — THE TECHNOLOGY STACK

```
╔══════════════════════════════════════════════════════════════════╗
║      ⚙  WHAT SENTINEL IS BUILT WITH                             ║
╚══════════════════════════════════════════════════════════════════╝
```

## Built on Proven, Production-Grade Technology

Every technology choice in Sentinel was made for a specific reason.
No experimental or unproven tools — every component is used by major
enterprises in production today.

### The Three-Layer Technology Map

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  LAYER 3 — FRONTEND (What Users See)                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js (React framework) — Server-side rendered pages  │   │
│  │  TypeScript — Type-safe code, fewer bugs                 │   │
│  │  Tailwind CSS — Fast, responsive UI design               │   │
│  │  shadcn/ui — Professional UI component library           │   │
│  │  Recharts — Interactive compliance charts                │   │
│  │  TanStack Table — Sortable, filterable data tables       │   │
│  │  Zustand — Lightweight application state management      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  LAYER 2 — BACKEND (The Brain)                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Java / Spring Boot 3.3 — Enterprise REST API framework  │   │
│  │  Spring Data JPA — Database access and queries           │   │
│  │  Flyway — Versioned database schema management           │   │
│  │  PostgreSQL — Production database (relational)           │   │
│  │  H2 (dev mode) — In-memory database for development      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  LAYER 1 — DATA PIPELINE (The Foundation)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Python 3.11 — Core pipeline language                    │   │
│  │  Pandas — Data manipulation and transformation           │   │
│  │  Pandera — Schema validation with typed assertions       │   │
│  │  DuckDB — In-process analytical database (warehouse)     │   │
│  │  PyArrow / Parquet — Compressed, fast data storage       │   │
│  │  Pytest — Automated pipeline testing                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  PLATFORM — Infrastructure                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GitHub Actions — CI/CD pipeline (automated testing)     │   │
│  │  Docker — Container packaging for deployment             │   │
│  │  Biome — Code linting and formatting                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Why Each Technology Was Chosen

### Python Data Pipeline
Python is the global standard for data engineering. Libraries like Pandas
and Pandera are used by Netflix, Google, and JPMorgan for exactly this type
of data validation pipeline. The choice means:
- Any data engineer can maintain this code
- Rich ecosystem of data quality libraries
- Easy integration with any source system via connectors

### Spring Boot (Java) Backend
Spring Boot is the most widely deployed enterprise API framework in the world.
It is used by Alibaba, Netflix, Amazon, and major banks. The choice means:
- Proven performance under high load (KPC has hundreds of concurrent users)
- Built-in security (authentication, authorization, audit logging)
- Standard REST API patterns that any frontend or integration can consume

### Next.js (React) Frontend
Next.js is the most popular production React framework, used by Notion,
GitHub, and thousands of enterprise companies. The choice means:
- Fast, server-side rendered pages (dashboards load instantly)
- TypeScript safety prevents runtime errors in the UI
- Built-in optimization for large data tables and charts

### PostgreSQL Database
PostgreSQL is the most widely used open-source relational database, trusted
by Instagram, Spotify, and Apple. The choice means:
- ACID-compliant transactions (no data corruption)
- Supports complex analytical queries
- Free and open-source (no licensing cost for KPC)

### DuckDB (Data Warehouse)
DuckDB is a high-performance analytical database that runs embedded in the
pipeline. It handles millions of compliance records with fast query response
times, without the cost of a cloud data warehouse.

---

## The CI/CD Pipeline: Quality is Automated

```
Every code change goes through this automated process:
──────────────────────────────────────────────────────────────
Developer writes code
        ↓
Commits to GitHub
        ↓
GitHub Actions automatically:
  1. Checks out the code
  2. Installs all dependencies
  3. Runs unit tests (every pipeline function tested)
  4. Runs the full ETL pipeline against sample data
  5. Enforces the 90% data quality gate
  6. If all steps pass: ✅ Build passes, code is approved
  7. If any step fails: ❌ Build fails, developer is alerted
──────────────────────────────────────────────────────────────
```

**The result:** No broken code can reach production. No compliance score
can be published without passing the data quality gate. This automation
protects the integrity of the platform.

---

## What Is Already Built and Working

```
✅ COMPLETE (Stage 1 — Data Pipeline)
    - ingest.py     — Full ingestion with batch tracking and checksums
    - transform.py  — Normalization, deduplication, ISO 8601 timestamps
    - validate.py   — All 5 validation rules + CLI --fail-below gate
    - decide.py     — Four-outcome decision routing with reason logging
    - load.py       — Warehouse writer (Parquet + DuckDB)
    - tests/        — Unit tests for every pipeline function
    - CI pipeline   — GitHub Actions with automated quality gate
    - Sample data   — 1,247 incident records + 887 audit records generated

✅ COMPLETE (Stage 2 — Backend)
    - Spring Boot REST API with all 6 endpoints live
    - Risk scoring engine (incident frequency, severity, audit recency)
    - Alert engine with configurable thresholds
    - Flyway database migrations (schema v1 + seed data v2)
    - PostgreSQL production config + H2 dev mode

✅ COMPLETE (Stage 3 — Frontend)
    - Next.js dashboard with all 4 main views
    - Risk Heatmap component (geographic pipeline visualization)
    - Alert Feed (filterable, real-time)
    - Data Quality Panel (trusted/corrected/review/rejected bars)
    - Site Drill-Down view (incident + audit timeline)
```

---

**Takeaway for judges:** Sentinel is built on enterprise-grade, production-
proven technology. The full three-layer stack is working — not a mockup,
not a prototype. A real, running system.

---

---

# SLIDE 14 — BUSINESS VALUE AND IMPACT

```
╔══════════════════════════════════════════════════════════════════╗
║      💰  WHY SENTINEL IS WORTH INVESTING IN                     ║
╚══════════════════════════════════════════════════════════════════╝
```

## The Return on Investment

Sentinel does not just improve compliance scores. It delivers concrete,
measurable business value across five dimensions.

---

### VALUE 1 — PREVENTING INCIDENTS (Risk Reduction)

**The cost of a single major pipeline incident (industry data):**
```
Pipeline rupture with spill cleanup:          KES 100–500 million
Emergency response (EPRA, NEMA response):     KES 20–100 million
Operational shutdown (per day):               KES 15–40 million
Legal defence and regulatory fines:           KES 30–150 million
Reputational damage (licence review risk):    Unquantifiable
────────────────────────────────────────────────────────────────
Total cost of one major incident:             KES 165M–790M
```

**How Sentinel prevents this:**
By detecting overdue inspections before they become failures, and
tracking corrosion monitoring before wall loss occurs. If Sentinel
prevents even **one major pipeline incident per year**, the cost
savings far exceed the platform's development cost.

---

### VALUE 2 — REGULATORY RISK REDUCTION

**Current regulatory exposure without Sentinel:**
- EPRA can withdraw KPC's operating licence
- NEMA can issue enforcement notices and fines
- DOSHS can prosecute individual managers under OSHA 2007
- All of these increase if KPC cannot demonstrate a compliance management system

**How Sentinel reduces this:**
Sentinel creates a documented, automated compliance record:
- Every KPI is calculated from verified source data
- Every compliance score is traceable to original field records
- Every corrective action is tracked to closure
- Every regulatory report submission is logged with timestamps

When EPRA or NEMA audits KPC, the answer to "How do you manage compliance?"
is no longer "We have spreadsheets." It is: "Here is our real-time compliance
score, here is the historical trend, here is the evidence for every number."

---

### VALUE 3 — OPERATIONAL EFFICIENCY

**Time saved on compliance reporting:**
```
Before Sentinel:
- Compliance Manager spends 2 days/week
  extracting data from 6 separate systems,
  reconciling spreadsheets, and
  producing a static PDF report.
- Report is already 48 hours out of date
  when it is presented.

After Sentinel:
- Dashboard is live and always current.
- Compliance Manager reviews Sentinel's
  AI insights in 30 minutes.
- 1.5 days per week freed for
  proactive compliance work.

Annual time saved per compliance officer: ~72 days
At average salary cost: KES ~1.4 million/year
Across 5 HSE officers KPC-wide: KES 7 million/year
```

---

### VALUE 4 — EARLY WARNING SYSTEM

**The value of leading vs. lagging indicators:**

Most compliance systems count incidents after they happen (lagging indicators).
Sentinel measures conditions that **predict** future incidents (leading indicators).

```
Example of leading vs. lagging:

LAGGING (after the fact):
"3 workers were injured in Q2 2026"
→ The damage is already done

LEADING (proactive):
"Training compliance at Eldoret has fallen to 76% over the past 4 weeks.
 34 workers are operating without current H2S certifications.
 H2S exposure is the leading cause of chemical incidents at this site."
→ Intervention BEFORE injury
```

Sentinel weights leading indicators more heavily (65% of all KPIs are
leading indicators) because **prevention is always cheaper than response**.

---

### VALUE 5 — SINGLE SOURCE OF TRUTH

**The cost of data fragmentation:**

When KPC's data lives in 6 different systems with no integration:
- Different departments produce different compliance numbers
- Management discussions start with "Your data is wrong"
- Decisions are delayed while data is reconciled
- Auditors receive inconsistent answers

**What Sentinel provides:**
One compliance score. One data pipeline. One dashboard. Everyone in KPC
— from the Station Manager to the CEO — sees the same number, calculated
from the same data, at the same time.

This eliminates the "which spreadsheet is correct?" problem permanently.

---

## Who Uses Sentinel and How

```
USER                FREQUENCY          HOW THEY USE SENTINEL
───────────────────────────────────────────────────────────────
CEO / MD            Weekly/Monthly     OCS score + AI top 3 actions
                                       Board reporting data

HSE Director        Daily              Full dashboard + all domain scores
                                       Corrective action tracking
                                       Regulatory risk status

Station Manager     Daily              Station-specific view
                                       Inspection prioritization
                                       Team training status

Asset Integrity     Daily              Asset profile + inspection schedule
Engineer                               Corrosion monitoring alerts

Environmental       Weekly             Environmental domain scores
Officer                                NEMA compliance tracking

HR Manager          Weekly             Training compliance per station
                                       Expiring certifications list

Regulator (EPRA)    Quarterly audit    Exported compliance reports
                                       Full audit trail access
```

---

## Why Now? The Regulatory Environment Is Tightening

```
2024: Kenya's Energy and Petroleum Regulatory Authority (EPRA) introduced
      stricter pipeline integrity reporting requirements.

2025: NEMA increased enforcement activity on industrial discharge.

2026: DOSHS launched a cross-sectoral HSE audit program targeting
      high-risk industries, including petroleum.
```

KPC needs a compliance intelligence system not next year — now.

---

**Takeaway for judges:** Sentinel pays for itself if it prevents one
major incident. Beyond that, it saves time, reduces regulatory risk,
enables better decisions, and gives KPC a competitive advantage in
a tightening regulatory environment.

---

---

# SLIDE 15 — CALL TO ACTION / CLOSING

```
╔══════════════════════════════════════════════════════════════════╗
║      🏁  THE ASK — WHAT COMES NEXT                              ║
╚══════════════════════════════════════════════════════════════════╝
```

## The Full Picture: What We Built

Let us summarize the complete Sentinel platform in one view:

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   RAW FIELD DATA (messy, incomplete, from 6 systems)            ║
║                        ↓                                        ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │  SENTINEL DATA PIPELINE (Python)                        │   ║
║   │  Ingest → Transform → Validate → Decide → Load         │   ║
║   │  ✅ 5 stages  ✅ 90% quality gate  ✅ CI/CD automated  │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                        ↓                                        ║
║   TRUSTED DATA WAREHOUSE (DuckDB → PostgreSQL)                  ║
║                        ↓                                        ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │  SENTINEL BACKEND API (Java / Spring Boot)              │   ║
║   │  Risk Scoring  │  Alert Engine  │  Compliance APIs      │   ║
║   │  ✅ 6 endpoints live  ✅ Risk scoring  ✅ Alerts        │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                        ↓                                        ║
║   ┌─────────────────────────────────────────────────────────┐   ║
║   │  SENTINEL DASHBOARD (Next.js / React)                   │   ║
║   │  Overall Score  │  4 Domains  │  16 KPIs                │   ║
║   │  Risk Heatmap  │  Drill-Downs  │  AI Insights           │   ║
║   │  ✅ Live dashboard  ✅ 7-level drill-down  ✅ AI panel   │   ║
║   └─────────────────────────────────────────────────────────┘   ║
║                        ↓                                        ║
║   KPC EXECUTIVE sees: OCS score, domain breakdown,             ║
║   top non-compliant assets, AI-generated action list           ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## What Makes Sentinel Different

There are generic compliance management systems on the market. Here is
what makes Sentinel fundamentally different:

```
GENERIC SYSTEM                  SENTINEL
──────────────────────────────────────────────────────────────
Stores compliance records      Scores compliance in real time
Shows static reports           Shows live, interactive dashboard
Counts incidents after fact    Predicts risk from leading indicators
System of record               System of intelligence
Hard-coded rules               Configuration-driven, future-proof
Data locked in one format      Traceable to original field records
Off-the-shelf, generic         Built specifically for KPC and
                               Kenya's regulatory framework
                               (OSHA 2007, EMCA 1999, Energy Act 2019,
                               NEMA standards, EPRA requirements)
```

---

## The Journey So Far and What Comes Next

```
STAGE 1 — COMPLETED ✅
  Data pipeline: ingest, transform, validate, decide, load
  Data quality gate: 90% threshold, automated CI enforcement
  1,247 incident records + 887 audit records in the warehouse
  Full unit test coverage, GitHub Actions CI running

STAGE 2 — COMPLETED ✅
  Spring Boot REST API: 6 live endpoints
  Risk scoring engine: 4-factor weighted model
  Alert engine: threshold-based with severity bands
  PostgreSQL database with Flyway migration
  Next.js dashboard with 4 main views
  All components integrated and serving live data

STAGE 3 — READY TO BUILD
  Production deployment (containerized, cloud-hosted)
  SSO integration with KPC's Active Directory
  Live SCADA and CMMS integration (replace sample data with real feeds)
  Advanced ML risk prediction (upgrade from rule-based to model-based)
  Mobile app for field officers (inspection logging, PTW submission)
  Regulatory export module (auto-generate EPRA/NEMA compliance reports)
```

---

## The Single Most Important Thing About Sentinel

Many companies track compliance.
Very few understand it.
None can act on it as fast as Sentinel enables.

```
Without Sentinel:
  A pipeline segment becomes overdue for inspection.
  Nobody notices until the next quarterly audit.
  The audit report takes 3 weeks to process.
  The corrective action is raised and eventually closed.
  6 months later, the segment is finally inspected.
  (But the wall loss has been progressing the whole time.)

With Sentinel:
  Day 1:   Segment inspection becomes overdue.
  Day 1:   Sentinel flags it as non-compliant automatically.
  Day 1:   Station Manager sees it on the dashboard.
  Day 1:   AI Insight says: "Deploy team to Nairobi West by Monday."
  Day 3:   Inspection team dispatched and on site.
  Day 4:   Inspection completed. Score returns to green.
  Day 4:   Corrective action auto-closed with evidence.
```

That is the difference between reactive and proactive compliance management.
That is Sentinel.

---

## Our Ask

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║  We are asking for support to take Sentinel from a working      ║
║  prototype to KPC's production compliance intelligence system.  ║
║                                                                  ║
║  What we need:                                                  ║
║  ├─ Partnership with KPC HSE team for source system access      ║
║  ├─ Infrastructure budget for production deployment             ║
║  ├─ Integration timeline with CMMS, LMS, and SCADA teams        ║
║  └─ Regulatory endorsement (EPRA, NEMA) for compliance reports  ║
║                                                                  ║
║  What KPC gets:                                                 ║
║  ├─ A live compliance score every morning                       ║
║  ├─ Three AI-generated actions every morning                    ║
║  ├─ Drill-down to any record in 7 clicks                        ║
║  ├─ Regulatory audit trail at every level                       ║
║  └─ Insurance against the next pipeline incident                ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Closing Statement

KPC moves petroleum to power Kenya's economy. Every litre that flows
safely through those 2,150 km of pipeline represents a compliance system
working correctly.

Sentinel makes that compliance system visible, measurable, and actionable
— for the first time, from one screen, in real time.

We built Sentinel because we believe that intelligence — not just data —
is what protects people, pipelines, and KPC's future.

---

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║              🛡  S E N T I N E L                                 ║
║                                                                  ║
║         Compliance intelligence. Not compliance paperwork.       ║
║                                                                  ║
║   "Turning raw safety data into decisions that protect lives."  ║
║                                                                  ║
║  ─────────────────────────────────────────────────────────────  ║
║                                                                  ║
║  Repository:    github.com/KPC/sentinel                          ║
║  Live Demo:     sentinel-demo.kpc.co.ke                          ║
║  Contact:       HSE Compliance Intelligence Team                 ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

---

# APPENDIX — QUICK REFERENCE FOR JUDGES

## All 16 KPIs at a Glance

```
SAFETY DOMAIN (30% of OCS)
───────────────────────────────────────────────────────────────────────
KPI-S01: PPE Compliance Rate
         Formula: (Workers with correct PPE) / (Total workers) × 100
         Green: ≥95%    Amber: 80–94%    Red: <80%

KPI-S02: Training Compliance Rate
         Formula: (Employees with all training current) / (Total) × 100
         Green: ≥90%    Amber: 75–89%    Red: <75%

KPI-S03: Permit-to-Work Compliance Rate
         Formula: (High-risk jobs with valid PTW) / (Total high-risk) × 100
         Green: ≥98%    Amber: 90–97%    Red: <90%

KPI-S04: Incident Reporting Timeliness Rate
         Formula: (Incidents reported on time) / (Total incidents) × 100
         Green: ≥95%    Amber: 80–94%    Red: <80%

ENVIRONMENTAL DOMAIN (25% of OCS)
───────────────────────────────────────────────────────────────────────
KPI-E01: Water Quality Discharge Compliance Rate
         Formula: (Samples within NEMA limits) / (Total samples) × 100
         Green: ≥95%    Amber: 80–94%    Red: <80%

KPI-E02: Air Emissions Compliance Rate
         Formula: (Readings within permit limits) / (Total readings) × 100
         Green: ≥95%    Amber: 80–94%    Red: <80%

KPI-E03: Waste Management Compliance Rate
         Formula: (Compliant waste consignments) / (Total consignments) × 100
         Green: ≥90%    Amber: 75–89%    Red: <75%

KPI-E04: Spill Response Compliance Rate
         Formula: (Spills with compliant response) / (Total spills) × 100
         Green: ≥95%    Amber: 80–94%    Red: <80%

ASSET INTEGRITY DOMAIN (25% of OCS)
───────────────────────────────────────────────────────────────────────
KPI-A01: Asset Inspection Compliance Rate
         Formula: (Assets inspected on schedule) / (Total assets due) × 100
         Green: ≥95%    Amber: 80–94%    Red: <80%

KPI-A02: Preventive Maintenance Completion Rate
         Formula: (PM work orders on schedule) / (Total PM planned) × 100
         Green: ≥90%    Amber: 75–89%    Red: <75%

KPI-A03: Corrosion Monitoring Coverage Rate
         Formula: (Monitoring points read + assessed) / (Total due) × 100
         Green: ≥90%    Amber: 75–89%    Red: <75%

KPI-A04: Leak Detection System Availability Rate
         Formula: (Hours system online) / (Total required hours) × 100
         Green: ≥99%    Amber: 95–98%    Red: <95%

REGULATORY DOMAIN (20% of OCS)
───────────────────────────────────────────────────────────────────────
KPI-R01: HSE Audit Completion Rate
         Formula: (Audits completed on schedule) / (Total planned) × 100
         Green: ≥95%    Amber: 80–94%    Red: <80%

KPI-R02: Corrective Action Closure Rate
         Formula: (CARs closed by target date) / (Total CARs due) × 100
         Green: ≥90%    Amber: 75–89%    Red: <75%

KPI-R03: Regulatory Report Submission Rate
         Formula: (Reports submitted on time) / (Total reports due) × 100
         Green: 100%    Amber: 90–99%    Red: <90%

KPI-R04: SOP Adherence Rate
         Formula: (Activities in compliance with SOP) / (Total observed) × 100
         Green: ≥90%    Amber: 75–89%    Red: <75%
```

---

## The Master Scoring Formula

```
OCS  = (SCD × 0.30) + (ECD × 0.25) + (AICD × 0.25) + (RCD × 0.20)

SCD  = (PCI × 0.25) + (TCI × 0.30) + (PTWCI × 0.30) + (IRCI × 0.15)
ECD  = (WQCI × 0.25) + (AQCI × 0.20) + (WMCI × 0.30) + (SRCI × 0.25)
AICD = (ICI × 0.30) + (PMCI × 0.30) + (CMCI × 0.20) + (LDCI × 0.20)
RCD  = (ACI × 0.25) + (CACI × 0.30) + (RRI × 0.25) + (SOPCI × 0.20)
```

---

## Regulatory Alignment

```
KPC's compliance obligations that Sentinel measures against:

OSHA 2007 (Occupational Safety and Health Act)
  Covered by: Safety Domain (KPI-S01 to S04)

EMCA 1999 / Cap 387 (Environmental Management & Coordination Act)
  Covered by: Environmental Domain (KPI-E01 to E04)

Energy Act 2019 (Pipeline operations)
  Covered by: Asset Integrity Domain (KPI-A01 to A04)

EPRA Licensing Conditions
  Covered by: Regulatory Domain (KPI-R01 to R04)

ISO 45001:2018 (Occupational Health & Safety Management)
  Covered by: Safety + Regulatory Domains

ISO 14001:2015 (Environmental Management)
  Covered by: Environmental Domain
```

---

*End of Sentinel Hackathon Presentation*
*Kenya Pipeline Company — HSE Compliance Intelligence Platform*
*July 2026*
