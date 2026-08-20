# Sentinel — Stage 2 Progress & ROI Calculator Review

> Date: 18 August 2026 — Day 16 of 18-day build window  
> Purpose: Progress assessment against the Stage 2 Build Plan + ROI implementation brainstorm  
> Status: READ-ONLY — no code changes proposed here

---

## 1. Build Progress Assessment

### Overall Estimate: ~75–80% complete

The Python analytics core and frontend chart components are effectively done.
The primary gaps are the ROI calculator (Feature 6), a few wiring/correctness
blockers from the validation report, and CI coverage for the new analytics modules.

---

### 1.1 Phase 1 — Graded Core

| Feature                          | Plan Requirements                                                                                                     | What's Built                                                                                                                                   | Status                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F1 — Feature Engineering**     | `features.py`, `fact_site_features.parquet`, `test_features.py`, 7+ tests                                             | `features.py` complete; 14 tests across 5 classes; `fact_site_features.parquet` populated (180-day, 6 sites)                                   | ✅ Done                                                                                                                                                          |
| **F2 — Predictive Model**        | Logistic regression, time-split backtest, `fact_predictions.parquet`, `backtest_report.json`, per-site top-3 features | `predict.py` complete; `logreg_v1.pkl` trained; precision=0.619, recall=0.677, F1=0.647; `predictions_export.json` sidecar for backend         | ✅ Done — model deviates from plan (7-day Critical label vs 30-day High/Critical). Documented and justified in `backtest_report.json` — hold this line under Q&A |
| **F3 — Statistical Diagnostics** | KM survival curves, EWMA control charts, correlation scatter, 3 JSON artifacts                                        | `diagnostics.py` complete; KM: 56d vs 23d (2.41× gap); EWMA: **17.1 days** avg lead time; Pearson r=0.703; all 4 JSON files in warehouse       | ✅ Done — the 17.1-day lead time number is the single most valuable number in the entire build for the ROI narrative                                             |
| **F4 — Feature Importance**      | Standardized coefficients, `feature_importance.json`, per-prediction top-3, frontend bar chart                        | `feature_importance.json` written by `predict.py`; `top_features` column in predictions parquet; `feature-importance-bar.tsx` component exists | ✅ Done                                                                                                                                                          |
| **Backend analytics endpoints**  | `AnalyticsController`, 3+ GET endpoints serving JSON artifacts                                                        | `AnalyticsService` + `AnalyticsController` confirmed in backend                                                                                | ✅ Done — full verification against Swagger still needed                                                                                                         |
| **Frontend analytics charts**    | 4 chart components on analytics page                                                                                  | `survival-curve-chart.tsx`, `pressure-control-chart.tsx`, `correlation-scatter-chart.tsx`, `feature-importance-bar.tsx` all exist              | ✅ Done — need live data verification                                                                                                                            |

**Phase 1 verdict: ~95% complete.** All Python modules, warehouse artifacts, tests, and frontend components are in place. Remaining work is verification that backend endpoints return real data and frontend charts render against live backend.

---

### 1.2 Phase 2 — Differentiators

| Feature                          | Plan Status                 | Reality                                                                                                                      | Gap                                                                                               |
| -------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **F5 — Alert Narratives**        | Day 8–9, non-negotiable     | `AlertRulesEngine` exists in backend (ahead of plan); `drift_events.json` written by diagnostics pipeline as narrative input | Needs verification that the alert feed in the UI shows narrative text, not just structured fields |
| **F6 — ROI Calculator**          | Day 9–10, non-negotiable    | **Not started** — no `sentinel/src/roi/` directory, no reference data file, no backend endpoints, no frontend page           | **This is the biggest gap. Full implementation plan in Section 2 below.**                         |
| **F7 — What-If Slider**          | Day 11, cut-second          | Backend `RiskService` formula needs confirmation it's parameterized; frontend slider component not confirmed                 | Not assessed — lower priority than ROI                                                            |
| **F8 — Live Demo Form**          | Day 12, protect if possible | Synchronous validate→decide path exists in the pipeline; frontend form not confirmed                                         | Not assessed                                                                                      |
| **F9 — Cross-Site Benchmarking** | Day 13, cut-second          | Feature data and site aggregates exist; ranked table page not confirmed                                                      | Not assessed                                                                                      |

**Phase 2 verdict: ~30% complete.** Alert narratives are partially built on the backend. The ROI calculator — the plan's single strongest differentiator — has zero implementation. Everything else is unverified or unbuilt.

---

### 1.3 Phase 3 — UAT, Hardening & Rehearsal

Today is **Day 16 (Aug 18)**, which was scheduled as the fix-pass day after UAT (Day 15). Based on the open validation report items, UAT either has not been run or its findings haven't been resolved.

**Open blockers from `current-stage-validation-report.md`:**

| Blocker                        | Description                                                               | Impact                                                       |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Site ID case mismatch          | ETL produces `SITE-001`, DB seeds `site-001` — FK violations on live load | All live ETL → DB writes silently fail                       |
| V2 seed data: Australian sites | `dim_site` contains Melbourne/Brisbane, not Nairobi/Mombasa               | Every site drill-down shows wrong names when backend is live |
| `acknowledgedBy` hardcoded     | `AlertService.acknowledgeAlert()` stubs all acks to `"api-user"`          | Audit trail is meaningless                                   |
| SITE_COORDS case mismatch      | `RiskService` map may still use uppercase keys vs lowercase DB IDs        | Sites render at 0,0 (off West Africa) in heatmap             |
| `/dashboard` blank page        | Root dashboard URL renders nothing                                        | First impression for any judge who navigates directly        |

**Phase 3 verdict: Not yet started in any meaningful sense.** With the pitch on Aug 21, there are 3 days remaining. The fix-pass day was today. Rehearsal is tomorrow (Aug 19). These blockers need to be resolved today.

---

### 1.4 Evidence Slide Numbers (from actual pipeline output)

The following are real, pulled-from-pipeline numbers ready to use:

| Metric                             | Source                     | Value                                                                |
| ---------------------------------- | -------------------------- | -------------------------------------------------------------------- |
| Model precision                    | `backtest_report.json`     | **0.619**                                                            |
| Model recall                       | `backtest_report.json`     | **0.677**                                                            |
| Model F1                           | `backtest_report.json`     | **0.647**                                                            |
| EWMA lead time                     | `control_chart_data.json`  | **17.1 days** before hard pressure breach                            |
| KM audit closure — fleet           | `survival_curve_data.json` | **23 days** median                                                   |
| KM audit closure — high-risk       | `survival_curve_data.json` | **56 days** median (2.41× gap)                                       |
| High-risk closure rate             | `survival_curve_data.json` | **35%** vs fleet **71%**                                             |
| Pearson r (rejection vs incidents) | `correlation_data.json`    | **r=0.703** (strong, p=0.119 — not sig. at n=6; state this honestly) |
| Top predictive feature             | `feature_importance.json`  | `audit_finding_open_count` (95.2% of standardized importance)        |

These five numbers are the Evidence Slide. They already exist on disk. Pull them verbatim.

---

## 2. ROI Calculator — Implementation Brainstorm

The ROI calculator is the biggest unbuilt item and, per the build plan, the single strongest differentiator available to this team. The implementation document (ROI-Calculator-Thange-Implementation-Plan.docx) is thorough. This section distills it into a pragmatic, time-constrained execution plan.

---

### 2.1 The Core Argument

> _"The EWMA detector flagged statistical drift **17.1 days** before each hard pressure breach in our synthetic data. Had an operator acted on that signal in a Thange-shaped scenario, the window to intervene was 17 days. Under explicit, visible assumptions, that window is worth estimating."_

Everything in the ROI calculator flows from that one number. It already exists in `control_chart_data.json`. The calculator's job is to make the financial consequence of that window traceable.

---

### 2.2 What Needs to Be Built

The implementation plan prescribes an 8-phase full-stack build. Given 3 days remain, the pragmatic version is:

**Must build (non-negotiable for the pitch):**

- Python: reference data file + EWMA simulation wrapper + ROI formula
- A single backend endpoint returning the calculation
- A single frontend page rendering the worksheet

**Can defer to "what's next" framing:**

- Scenario presets beyond the Thange-shaped case
- Saved analysis persistence
- Full provenance badge system

---

### 2.3 Python Layer — `sentinel/src/roi/`

Four files as specified in the implementation plan:

#### `sentinel/data/reference/thange_kimeu_2025.json`

This is the immutable court-record anchor. **Never calculate with this number — use it as the benchmark reference only.**

```json
{
  "case_id": "thange_kimeu_2025",
  "case_name": "Kimeu & 3074 others v Kenya Pipeline Company Ltd & another",
  "citation": "[2025] KEELC 5239 (KLR)",
  "court": "Environment and Land Court, Makueni",
  "judges": ["Ochieng", "Murigi", "Nyukuri"],
  "incident_date": "2015-05-12",
  "judgment_date": "2025-07-11",
  "liability_kpc_pct": 80,
  "liability_nema_pct": 20,
  "damages_kes": 2118831676,
  "environmental_restoration_kes": 900000000,
  "gross_award_kes": 3018831676,
  "source": "Kenya Law [2025] KEELC 5239 (KLR)",
  "source_type": "COURT_RECORD",
  "note": "Use gross_award_kes as reference benchmark only. Never treat as generic cost of a pipeline incident."
}
```

**Do not editorialize this file. These are court-record facts.**

#### `sentinel/src/roi/models.py`

Typed data structures. Key concepts:

```python
@dataclass
class Assumption:
    value: float
    unit: str
    source_type: str   # "ESTIMATE" | "COURT_RECORD" | "EXTERNAL_SOURCE" | "SYNTHETIC"
    source: str
    note: str

@dataclass
class RoiInput:
    cleanup_cost_per_litre_kes: Assumption       # estimate
    spill_volume_litres: Assumption              # scenario-specific
    incident_exposure_kes: Assumption            # estimate by severity band
    intervention_probability: Assumption         # 0–1, user-adjustable
    n_high_risk_alerts: Assumption               # count from pipeline
    annual_platform_cost_kes: Optional[Assumption]  # optional

@dataclass
class RoiResult:
    lead_time_days: float                    # from control_chart_data.json
    lead_time_source: str                    # "EWMA simulation — synthetic Thange-shaped scenario"
    expected_avoided_cost_kes: float
    net_benefit_kes: Optional[float]
    roi_pct: Optional[float]
    calculation_breakdown: dict              # every intermediate value, labeled
```

**The core formula** (from both documents):

```
Expected avoided cost = intervention_probability × incident_exposure_kes × n_high_risk_alerts
```

The optional net benefit and ROI are:

```
Net benefit = expected_avoided_cost − annual_platform_cost
ROI = net_benefit / annual_platform_cost
```

#### `sentinel/src/roi/scenarios.py`

The key function is `simulate_reference_scenario()`. **Critical design rule: do not create a second EWMA implementation. Reuse `diagnostics.compute_ewma_control_chart()`.**

```python
def simulate_reference_scenario(
    pressure_profile: list[float],
    lam: float = 0.2,
    L: float = 3.0,
) -> dict:
    """
    Run the existing EWMA logic against a synthetic pressure profile.
    Returns:
        lead_time_days — calculated from simulation, never hardcoded
        drift_events   — list of drift flag timestamps before breach
        baseline_stats — mean, sigma, UCL, LCL
        signal         — "drift_detected" | "no_signal"
    """
    # Build a minimal DataFrame that diagnostics.compute_ewma_control_chart() expects
    # Call compute_ewma_control_chart() with that DataFrame
    # Parse the result for lead_time_days and drift_events
    # If n_spikes == 0: return {"signal": "no_signal", "lead_time_days": None}
```

The deterministic Thange-shaped synthetic scenario:

```python
THANGE_SYNTHETIC_PROFILE = {
    "id": "thange_shaped_synthetic",
    "name": "Thange-Shaped Synthetic Scenario",
    "type": "SYNTHETIC",
    "description": (
        "A synthetic pressure profile modelled on the documented pattern "
        "in the Thange case: gradual build-up over ~3 weeks, then a hard "
        "breach. NOT a reconstruction of KPC's actual 2015 readings."
    ),
    "pressure_profile": [
        # ~30 baseline readings, then gradual rise, then spike
        # e.g. [400, 405, 410, ..., 650, 750, 900, 1050, 1200]
        # Values chosen so the EWMA flags drift ~17 days before breach
        # to match the real simulation output in control_chart_data.json
    ],
    "detector_config": {"lam": 0.2, "L": 3.0},
}
```

**Determinism requirement (from the implementation plan):** the same synthetic inputs must produce the same lead-time result on every run. This is guaranteed as long as the pressure profile is a fixed list and the EWMA implementation has no random state.

#### `sentinel/src/roi/calculator.py`

```python
def calculate_roi(roi_input: RoiInput, lead_time_days: float) -> RoiResult:
    """
    Core formula:
        expected_avoided_cost = intervention_probability × incident_exposure_kes × n_high_risk_alerts

    Every intermediate value goes into calculation_breakdown for frontend display.
    """
    p   = roi_input.intervention_probability.value
    exp = roi_input.incident_exposure_kes.value
    n   = roi_input.n_high_risk_alerts.value

    expected_avoided = p * exp * n

    breakdown = {
        "intervention_probability":        p,
        "incident_exposure_kes":           exp,
        "n_high_risk_alerts":              n,
        "expected_avoided_cost_kes":       expected_avoided,
    }

    net_benefit = None
    roi_pct = None
    if roi_input.annual_platform_cost_kes:
        cost = roi_input.annual_platform_cost_kes.value
        net_benefit = expected_avoided - cost
        roi_pct = (net_benefit / cost) * 100 if cost > 0 else None
        breakdown["annual_platform_cost_kes"] = cost
        breakdown["net_benefit_kes"] = net_benefit
        breakdown["roi_pct"] = roi_pct

    return RoiResult(
        lead_time_days=lead_time_days,
        lead_time_source="EWMA simulation — synthetic Thange-shaped scenario",
        expected_avoided_cost_kes=expected_avoided,
        net_benefit_kes=net_benefit,
        roi_pct=roi_pct,
        calculation_breakdown=breakdown,
    )
```

---

### 2.4 Default Assumptions Table

These are the assumptions the UI must display, label clearly, and allow the user to edit.

| Input                        | Default Value        | Unit        | Label                                             | Source Type   |
| ---------------------------- | -------------------- | ----------- | ------------------------------------------------- | ------------- |
| Cleanup cost                 | 100                  | KES / litre | Environmental cleanup cost per litre spilled      | ESTIMATE      |
| Typical spill volume         | 500,000              | litres      | Prevented spill volume (Thange-shaped scenario)   | SYNTHETIC     |
| Incident exposure — Critical | 150,000,000          | KES         | Unmitigated exposure per Critical incident        | ESTIMATE      |
| Incident exposure — High     | 50,000,000           | KES         | Unmitigated exposure per High incident            | ESTIMATE      |
| Intervention probability     | 0.70                 | 0–1         | Probability an early alert leads to intervention  | ESTIMATE      |
| High-risk alerts (period)    | pulled from pipeline | count       | High-risk alerts raised in representative period  | PIPELINE_DATA |
| Annual platform cost         | (optional)           | KES         | Annual Sentinel platform cost                     | USER_INPUT    |
| Thange reference benchmark   | 3,018,831,676        | KES         | Gross court award — Kimeu v KPC [2025] KEELC 5239 | COURT_RECORD  |

**The Thange benchmark row is display-only.** It never feeds the calculation. It appears in the worksheet so a judge can see the scale of consequence that motivates the whole exercise.

---

### 2.5 Backend API

Two new endpoints on a new `RoiController`:

```
GET  /api/analytics/roi/reference-cases
     → Returns the thange_kimeu_2025.json data + default assumptions table
     → Always returns the court record with its provenance badge

POST /api/analytics/roi/calculate
     Body: RoiInputDto (all assumptions, intervention probability, alert count)
     → Runs simulate_reference_scenario() via Python subprocess or pre-computed JSON
     → Returns full RoiResultDto with breakdown
```

**Recommended approach for the 3-day window:** pre-compute the simulation result once in Python (write `roi_simulation_result.json` to the warehouse), have `AnalyticsService` read that file, and have the calculate endpoint apply the formula server-side against user-provided assumptions. This avoids a real-time Python subprocess call from Java during the demo.

The `RoiResultDto` structure:

```java
public class RoiResultDto {
    String caseId;
    String caseName;
    String citation;
    Long grossAwardKes;          // COURT_RECORD — read-only display
    Double leadTimeDays;          // from simulation
    String leadTimeSource;        // provenance label
    RoiInputDto inputs;           // echoed back with provenance labels
    Map<String, Object> breakdown;
    Double expectedAvoidedCostKes;
    Double netBenefitKes;         // null if no platform cost provided
    Double roiPct;                // null if no platform cost provided
    String disclaimer;            // required: see section 2.6
}
```

---

### 2.6 Frontend Worksheet

One page at `/dashboard/sentinel/roi`. The plan calls for a transparent, interactive worksheet.

**Layout (top to bottom):**

1. **Reference case header** — COURT RECORD badge, case name, citation, incident date, gross award in KES with exact figure (3,018,831,676). Source link. One sentence: _"This case is displayed as a reference benchmark for the scale of consequence. It does not claim Sentinel could have predicted the 2015 incident."_

2. **Assumptions table** — editable rows. Each row shows: label, current value, unit, provenance badge (COURT RECORD / ESTIMATE / SYNTHETIC / PIPELINE DATA). A judge can change any ESTIMATE row and click "Recalculate".

3. **Lead-time evidence** — a mini control chart panel (reuse `PressureControlChart`) showing the Thange-shaped synthetic scenario with the drift flag and the spike visible. Label: _"SYNTHETIC — not KPC's actual 2015 data."_ Dynamic stat: _"Drift detectable X days before breach."_ X is pulled from the simulation result, not hardcoded.

4. **Calculation breakdown** — table showing every intermediate value: intervention probability × incident exposure × alert count = expected avoided cost. No hidden arithmetic.

5. **Main result** — large display of `expected_avoided_cost_kes` in KES. If platform cost is provided, show net benefit and ROI %.

6. **Disclaimer (mandatory)** — _"All financial figures derive from explicit, user-visible assumptions. This is not a guarantee of savings, a reconstruction of the 2015 incident, or a legal finding. The KES 3.02B court award is a reference benchmark for consequence scale only."_

**Provenance badge component** (reusable):

```tsx
// <ProvenanceBadge type="COURT_RECORD" | "ESTIMATE" | "SYNTHETIC" | "PIPELINE_DATA" />
// Each renders a coloured chip:
//   COURT_RECORD  → amber/gold   "COURT RECORD"
//   ESTIMATE      → blue         "ESTIMATE"
//   SYNTHETIC     → purple       "SYNTHETIC"
//   PIPELINE_DATA → green        "LIVE DATA"
```

---

### 2.7 The Pitch Narrative

From the implementation plan (Section 15), the recommended framing is precise and should be memorized verbatim:

> _"Thange shows the scale of consequences that can follow delayed detection. Sentinel does not claim to have predicted the 2015 incident. Instead, we run the same pressure-drift method against a synthetic scenario shaped by the documented lead-up, quantify the intervention window, and let an operator trace exactly what that window could be worth under explicit assumptions."_

The **17.1-day** EWMA lead time from the existing `control_chart_data.json` is the number that makes this narrative concrete. The ROI calculator is the tool that makes it financially legible.

---

### 2.8 Critical Do-Nots

These must be enforced at every layer:

| Do NOT                                             | Why                                                  |
| -------------------------------------------------- | ---------------------------------------------------- |
| Use KES 3,018,831,676 in the calculation formula   | It is a court record, not a generic incident cost    |
| Hardcode the lead time                             | It must be computed from the simulation on every run |
| Label synthetic scenarios as historical data       | Misleading; will fail under any Q&A                  |
| Claim Sentinel would have prevented the 2015 spill | Unprovable and legally reckless                      |
| Return a no-signal result as a non-zero lead time  | If drift isn't detected, report no-signal explicitly |
| Calculate financial outputs in React               | Business logic stays on the server                   |

---

### 2.9 Sequencing for 3 Days Remaining

Given today is Aug 18 (Day 16) and the presentation is Aug 21:

**Today (Day 16 — fix-pass day):**

1. Resolve the 5 validation report blockers (site ID case, V2 seed, ack attribution, coordinates, root redirect) — these affect every demo page, not just the ROI calculator
2. Create `sentinel/data/reference/thange_kimeu_2025.json`
3. Write `sentinel/src/roi/models.py` and `sentinel/src/roi/calculator.py`
4. Run the Python ROI simulation once and write `data/warehouse/roi_simulation_result.json`

**Tomorrow (Day 17 — rehearsal day per plan):**

1. Wire the backend `RoiController` with two endpoints reading the pre-computed JSON
2. Build the frontend worksheet page (`/dashboard/sentinel/roi`)
3. Run a full end-to-end verification: assumptions table → recalculate → see result change

**Day 18 (Aug 20 — final rehearsal only per plan):**

1. No new features per the plan
2. Verify the ROI page is stable
3. Full timed pitch run including the ROI worksheet walkthrough

**If time runs out:** A static frontend worksheet with hardcoded default assumptions is acceptable as a fallback. It must still be interactive (editable assumptions with visible recalculation). The backend calculation endpoint is the priority — a purely Python-computed result loaded as a JSON file is better than a calculation baked into the UI.

---

## 3. What's Actually Ready to Demo on Aug 21

If the validation blockers are fixed today, the following are demonstrable:

| Feature                                                           | Demo-Ready?                              |
| ----------------------------------------------------------------- | ---------------------------------------- |
| Live ETL pipeline (generate → ingest → transform → decide → load) | ✅                                       |
| Site risk heatmap with KPC coordinates                            | ✅ (after case fix)                      |
| Alert feed                                                        | ✅                                       |
| Predictive model score per site                                   | ✅                                       |
| Feature importance explanation                                    | ✅                                       |
| Statistical diagnostics — survival curves                         | ✅                                       |
| Statistical diagnostics — EWMA control charts                     | ✅                                       |
| Statistical diagnostics — rejection/incident correlation          | ✅                                       |
| Evidence slide (5 real numbers)                                   | ✅ — all numbers are on disk             |
| ROI calculator worksheet                                          | ⚠️ Not built — needs 1.5 days            |
| Alert narratives (sentence form)                                  | ⚠️ Backend exists, needs UI verification |
| What-if slider                                                    | ❓ Not assessed                          |
| Live demo form                                                    | ❓ Not assessed                          |
| Cross-site league table                                           | ❓ Not assessed                          |

---

## 4. Kimeu Case Brief — Q&A Readiness

The case facts are documented in the build plan. For completeness:

- **Citation:** Kimeu & 3074 others v Kenya Pipeline Company Ltd & another [2025] KEELC 5239 (KLR)
- **Incident:** 12 May 2015 pipeline leak near source of Thange River, Makueni County
- **Liability:** KPC 80%, NEMA 20%
- **Award:** KES 2,118,831,676 damages + KES 900,000,000 environmental restoration = **KES 3,018,831,676 gross** (use this exact figure)
- **Current status:** KPC has appealed; enforcement (asset attachment for ~KES 2.8B) was attempted Nov 2025, currently paused by court order — this is a live liability, not a closed one
- **If asked "Is this judgment final?"** → No. Useful for the ROI argument: an unresolved KES 3B liability is more motivating than a historical footnote.
- **If asked about the "Sh3.8B" media figure** → That folds in additional compensation line items. The judgment's own gross award is KES 3,018,831,676. State this precisely.
- **If asked "Does Sentinel's data reflect this case?"** → The synthetic dataset resembles this failure pattern (overdue audits, escalating pressure anomalies at a high-risk site) — it is not a reconstruction of KPC's actual historical records.

---

## 5. Summary

| Area                        | Progress          | Priority Action                              |
| --------------------------- | ----------------- | -------------------------------------------- |
| Python analytics (F1–F4)    | ✅ ~100%          | None — verify CI coverage                    |
| Backend analytics endpoints | ✅ Built          | Verify 200 responses in Swagger              |
| Frontend chart components   | ✅ Built          | Verify render against live backend           |
| ROI calculator              | ❌ 0%             | Build today and tomorrow                     |
| Validation blockers         | ❌ Open           | Fix today — everything else depends on these |
| UAT + notes document        | ❓ Status unclear | Run today if not done; write the artifact    |
| Pitch rehearsal             | 📅 Tomorrow       | Hold the Aug 20 line — no features           |
