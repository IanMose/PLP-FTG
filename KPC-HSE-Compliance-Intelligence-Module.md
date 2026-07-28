# KPC HSE Compliance Intelligence Module
## Enterprise Design Framework — Kenya Pipeline Company
**Classification:** Internal Strategic Document
**Version:** 1.0
**Date:** 2026-07-24
**Prepared By:** HSE Compliance Intelligence Design Team

---

## Table of Contents

1. [Compliance Hierarchy & Framework](#1-compliance-hierarchy--framework)
2. [Compliance Scoring Model & KPI Catalogue](#2-compliance-scoring-model--kpi-catalogue)
3. [Data Requirements](#3-data-requirements)
4. [Business Rule Catalogue](#4-business-rule-catalogue)
5. [Executive Dashboard Design](#5-executive-dashboard-design)
6. [Drill-Down Experience](#6-drill-down-experience)
7. [Actionable Insights Framework](#7-actionable-insights-framework)
8. [AI Executive Decision Support Panel](#8-ai-executive-decision-support-panel)
9. [Recommended Visualizations](#9-recommended-visualizations)
10. [Future-Proof Architecture](#10-future-proof-architecture)

---

---

# 1. Compliance Hierarchy & Framework

## 1.1 Design Philosophy

The compliance hierarchy is structured as a **four-level pyramid**: from atomic evidence at the bottom, through indicators and domains, to an overall organisational score at the top. This mirrors the architecture used by majors such as Shell, TotalEnergies, and BP, and aligns with:

- **ISO 45001:2018** — Occupational Health & Safety Management
- **ISO 14001:2015** — Environmental Management
- **Kenya OSHA 2007** — Occupational Safety and Health Act
- **EMCA 1999 (Cap 387)** — Environmental Management & Coordination Act
- **Energy Act 2019** — Petroleum pipeline operations
- **KPC HSE Policy & Internal SOPs**

The philosophy distinguishes between:
- **Leading indicators** — proactive measures that predict future incidents (training completion, inspections due, PTW issued on time)
- **Lagging indicators** — reactive measures that record what already happened (incidents reported, spills occurred)

The module **weights leading indicators more heavily** because they reflect the organisation's capacity to prevent harm before it occurs.

---

## 1.2 Compliance Hierarchy

```
Overall Compliance Score (OCS)
│
├── [W=30%] Safety Compliance Domain (SCD)
│      ├── PPE Compliance Indicator (PCI)
│      ├── Training Compliance Indicator (TCI)
│      ├── Permit-to-Work Compliance Indicator (PTWCI)
│      └── Incident Reporting Compliance Indicator (IRCI)
│
├── [W=25%] Environmental Compliance Domain (ECD)
│      ├── Water Quality Compliance Indicator (WQCI)
│      ├── Air Quality Compliance Indicator (AQCI)
│      ├── Waste Management Compliance Indicator (WMCI)
│      └── Spill Response Compliance Indicator (SRCI)
│
├── [W=25%] Asset Integrity Compliance Domain (AICD)
│      ├── Inspection Compliance Indicator (ICI)
│      ├── Preventive Maintenance Compliance Indicator (PMCI)
│      ├── Corrosion Monitoring Compliance Indicator (CMCI)
│      └── Leak Detection Compliance Indicator (LDCI)
│
└── [W=20%] Regulatory Compliance Domain (RCD)
       ├── Audit Compliance Indicator (ACI)
       ├── Corrective Action Closure Indicator (CACI)
       ├── Regulatory Reporting Indicator (RRI)
       └── Internal SOP Compliance Indicator (SOPCI)
```

---

## 1.3 Domain Definitions

### Domain 1 — Safety Compliance (Weight: 30%)

**Purpose:** Measures whether people operating on KPC sites are protected by the correct procedures, authorisations, training, and equipment at all times.

**Why it contributes to Overall Compliance:** People are KPC's most critical asset. Safety failures directly cause fatalities, injuries, legal liability under OSHA 2007, reputational damage, and operational shutdowns. Because safety failures are often irreversible, this domain carries the highest weight.

**Regulatory basis:** OSHA 2007 (Sections 6, 13, 15), ISO 45001 Clauses 8.1, 8.2, 9.1, KPC Safety Procedures Manual.

**Child Indicators:**
| Indicator | Type | Rationale |
|---|---|---|
| PPE Compliance | Leading | Prevents direct exposure to hazards |
| Training Compliance | Leading | Builds competence before incidents occur |
| Permit-to-Work Compliance | Leading | Controls high-risk activities in real time |
| Incident Reporting Compliance | Lagging | Ensures all events are captured for learning |

---

### Domain 2 — Environmental Compliance (Weight: 25%)

**Purpose:** Measures KPC's adherence to environmental regulations and internal standards covering water, air, waste, and spill response across all pipeline corridors, pump stations, and depots.

**Why it contributes to Overall Compliance:** Pipeline operations cross ecologically sensitive zones (Mau Forest, Rift Valley water catchments). Environmental breaches trigger EMCA penalties, NEMA enforcement, community disruption, and reputational damage that affects KPC's licence to operate.

**Regulatory basis:** EMCA 1999, NEMA Environmental Standards, Water Act 2016, KPC Environmental Management Plan.

**Child Indicators:**
| Indicator | Type | Rationale |
|---|---|---|
| Water Quality Compliance | Leading/Lagging | Monitors discharges that could contaminate water sources |
| Air Quality Compliance | Leading/Lagging | Monitors fugitive emissions at pump stations |
| Waste Management Compliance | Leading | Ensures hazardous waste is classified and disposed correctly |
| Spill Response Compliance | Lagging | Measures adequacy and speed of spill containment |

---

### Domain 3 — Asset Integrity Compliance (Weight: 25%)

**Purpose:** Measures the extent to which KPC's physical assets — pipelines, valves, pumps, storage tanks — are inspected, maintained, and monitored within required intervals.

**Why it contributes to Overall Compliance:** Asset failures are the primary cause of pipeline incidents. Overdue inspections and deferred maintenance create latent failures that manifest as leaks, ruptures, and fires. This domain reflects the engineering backbone of HSE compliance.

**Regulatory basis:** Energy Act 2019, PIMS Standards, API 570/580/581, KPC Integrity Management Plan.

**Child Indicators:**
| Indicator | Type | Rationale |
|---|---|---|
| Inspection Compliance | Leading | Prevents failures by detecting degradation early |
| Preventive Maintenance Compliance | Leading | Reduces unplanned failures |
| Corrosion Monitoring Compliance | Leading | Specific to buried pipeline risk |
| Leak Detection Compliance | Leading | Enables rapid response before escalation |

---

### Domain 4 — Regulatory Compliance (Weight: 20%)

**Purpose:** Measures whether KPC fulfils its obligations to external regulators (EPRA, NEMA, DOSHS, KEBS) and its own internal governance requirements — audits, corrective actions, reporting, and SOPs.

**Why it contributes to Overall Compliance:** Regulatory compliance provides the governance envelope within which all other domains operate. Failures here signal systemic breakdowns: audit findings not closed, reports not filed on time, or SOPs not followed.

**Regulatory basis:** Energy Act 2019, EPRA Licensing Conditions, OSHA 2007 (Section 11), EMCA, ISO 45001 Clause 10.2.

**Child Indicators:**
| Indicator | Type | Rationale |
|---|---|---|
| Audit Compliance | Lagging | Measures completion of planned HSE audits |
| Corrective Action Closure | Lagging | Tracks whether findings are resolved |
| Regulatory Reporting | Lagging | Monitors statutory report submissions |
| Internal SOP Compliance | Leading/Lagging | Verifies procedures are followed in operations |

---

---

# 2. Compliance Scoring Model & KPI Catalogue

## 2.1 Scoring Philosophy

Each compliance indicator produces a score between **0 and 100**. Scores are computed from raw operational data using defined formulas. Domain scores are the weighted average of their indicators. The Overall Compliance Score is the weighted average of all domain scores.

All weights within a domain sum to 100%. All domain weights sum to 100%.

**Threshold bands (universal):**

| Band | Score Range | Meaning |
|---|---|---|
| 🟢 Green | 90–100 | Compliant — maintain |
| 🟡 Amber | 75–89 | At risk — monitor and act |
| 🔴 Red | 0–74 | Non-compliant — immediate action required |

---

## 2.2 Scoring Formulas

### Domain Compliance Score

```
Domain Score (D) = Σ (Indicator Score_i × Indicator Weight_i)
```

### Overall Compliance Score

```
OCS = (SCD × 0.30) + (ECD × 0.25) + (AICD × 0.25) + (RCD × 0.20)
```

Where:
- SCD = Safety Compliance Domain score
- ECD = Environmental Compliance Domain score
- AICD = Asset Integrity Compliance Domain score
- RCD = Regulatory Compliance Domain score

---

## 2.3 KPI Catalogue — Safety Compliance Domain (Weight: 30%)

### KPI-S01: PPE Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | PPE Compliance Rate |
| **Description** | Percentage of workers observed or recorded as wearing the correct PPE for their task and zone, out of all workers subject to PPE requirements during the reporting period. |
| **Formula** | `(Workers with correct PPE observed / Total workers subject to PPE requirement) × 100` |
| **Indicator Weight** | 25% of Safety Domain |
| **Data Required** | PPE inspection records, site access logs, workforce deployment records, HSE observation reports |
| **Green Threshold** | ≥ 95% |
| **Amber Threshold** | 80–94% |
| **Red Threshold** | < 80% |
| **Indicator Type** | Leading |
| **Frequency** | Daily / Weekly |

---

### KPI-S02: Training Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Training Compliance Rate |
| **Description** | Percentage of employees and contractors who have completed all mandatory HSE training modules that are current and not expired, relative to the total workforce requiring that training. |
| **Formula** | `(Employees with all current mandatory training completed / Total employees requiring training) × 100` |
| **Indicator Weight** | 30% of Safety Domain |
| **Data Required** | Training records (LMS), employee/contractor register, training matrix, training expiry dates |
| **Green Threshold** | ≥ 90% |
| **Amber Threshold** | 75–89% |
| **Red Threshold** | < 75% |
| **Indicator Type** | Leading |
| **Frequency** | Weekly / Monthly |

*Note: Training carries the highest weight in the Safety domain because it is the foundational competency that underpins safe execution of all other activities.*

---

### KPI-S03: Permit-to-Work Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Permit-to-Work Compliance Rate |
| **Description** | Percentage of high-risk work activities that were carried out under a valid, correctly authorised, and closed Permit-to-Work, out of all high-risk activities that required a PTW in the reporting period. |
| **Formula** | `(High-risk activities with valid PTW issued and closed / Total high-risk activities requiring PTW) × 100` |
| **Indicator Weight** | 30% of Safety Domain |
| **Data Required** | PTW register, work order records, maintenance job cards, contractor activity logs |
| **Green Threshold** | ≥ 98% |
| **Amber Threshold** | 90–97% |
| **Red Threshold** | < 90% |
| **Indicator Type** | Leading |
| **Frequency** | Daily |

*Note: PTW compliance has a very tight green threshold (98%) because a single unauthorised hot work or confined space entry can be immediately fatal.*

---

### KPI-S04: Incident Reporting Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Incident Reporting Timeliness Rate |
| **Description** | Percentage of workplace incidents (near-misses, first aid, LTI, dangerous occurrences) that were reported within the required timeframe (24 hours for near-miss/first aid, 4 hours for LTI/dangerous occurrence), out of all known incidents. |
| **Formula** | `(Incidents reported within required timeframe / Total incidents identified) × 100` |
| **Indicator Weight** | 15% of Safety Domain |
| **Data Required** | Incident register, incident notification timestamps, shift handover logs |
| **Green Threshold** | ≥ 95% |
| **Amber Threshold** | 80–94% |
| **Red Threshold** | < 80% |
| **Indicator Type** | Lagging |
| **Frequency** | Daily |

---

**Safety Domain Score:**
```
SCD = (PCI × 0.25) + (TCI × 0.30) + (PTWCI × 0.30) + (IRCI × 0.15)
```

---

## 2.4 KPI Catalogue — Environmental Compliance Domain (Weight: 25%)

### KPI-E01: Water Quality Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Water Quality Discharge Compliance Rate |
| **Description** | Percentage of water discharge samples from KPC operations (pump stations, tank farms, washdown water) that meet NEMA discharge standards within the reporting period. |
| **Formula** | `(Water discharge samples within NEMA limits / Total water discharge samples taken) × 100` |
| **Indicator Weight** | 25% of Environmental Domain |
| **Data Required** | Water quality monitoring records, lab analysis results, NEMA discharge permit conditions, sampling register |
| **Green Threshold** | ≥ 95% |
| **Amber Threshold** | 80–94% |
| **Red Threshold** | < 80% |
| **Indicator Type** | Leading/Lagging |
| **Frequency** | Monthly |

---

### KPI-E02: Air Quality Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Air Emissions Compliance Rate |
| **Description** | Percentage of air quality monitoring readings (VOC, SO₂, NOₓ, particulate matter) at KPC facilities that are within NEMA Air Quality Regulations limits. |
| **Formula** | `(Air quality readings within permitted limits / Total air quality readings taken) × 100` |
| **Indicator Weight** | 20% of Environmental Domain |
| **Data Required** | Air quality monitoring logs, sensor readings, stack emission test results, NEMA air quality permits |
| **Green Threshold** | ≥ 95% |
| **Amber Threshold** | 80–94% |
| **Red Threshold** | < 80% |
| **Indicator Type** | Leading/Lagging |
| **Frequency** | Weekly / Continuous for automated sensors |

---

### KPI-E03: Waste Management Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Waste Management Compliance Rate |
| **Description** | Percentage of waste streams (oily rags, contaminated soil, chemical containers, sewage) that have been correctly classified, segregated, stored, transported, and disposed of by a licensed waste handler within regulatory timeframes. |
| **Formula** | `(Waste consignments with full compliant documentation and licensed disposal / Total waste consignments generated) × 100` |
| **Indicator Weight** | 30% of Environmental Domain |
| **Data Required** | Waste manifest register, waste contractor licences, disposal certificates, waste generation logs |
| **Green Threshold** | ≥ 90% |
| **Amber Threshold** | 75–89% |
| **Red Threshold** | < 75% |
| **Indicator Type** | Leading |
| **Frequency** | Monthly |

*Note: Waste management carries the highest environmental weight because improper disposal of hydrocarbon waste is a persistent enforcement risk for KPC.*

---

### KPI-E04: Spill Response Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Spill Response Compliance Rate |
| **Description** | Percentage of hydrocarbon or chemical spills where the emergency response was initiated within the required timeframe (≤ 15 minutes for major spills, ≤ 30 minutes for minor spills) and the spill response report was submitted within 24 hours. |
| **Formula** | `(Spills with compliant response initiation and documentation / Total spills recorded) × 100` |
| **Indicator Weight** | 25% of Environmental Domain |
| **Data Required** | Spill register, SCADA event logs, emergency response activation records, spill response reports |
| **Green Threshold** | ≥ 95% |
| **Amber Threshold** | 80–94% |
| **Red Threshold** | < 80% |
| **Indicator Type** | Lagging |
| **Frequency** | Per-event / Monthly |

---

**Environmental Domain Score:**
```
ECD = (WQCI × 0.25) + (AQCI × 0.20) + (WMCI × 0.30) + (SRCI × 0.25)
```

---

## 2.5 KPI Catalogue — Asset Integrity Compliance Domain (Weight: 25%)

### KPI-A01: Inspection Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Asset Inspection Compliance Rate |
| **Description** | Percentage of pipeline segments, pressure vessels, storage tanks, and safety-critical equipment items that have been inspected within their required inspection interval during the reporting period. |
| **Formula** | `(Assets inspected within required interval / Total assets due for inspection in period) × 100` |
| **Indicator Weight** | 30% of Asset Integrity Domain |
| **Data Required** | Asset register, inspection schedules, inspection completion records, inspection certificates |
| **Green Threshold** | ≥ 95% |
| **Amber Threshold** | 80–94% |
| **Red Threshold** | < 80% |
| **Indicator Type** | Leading |
| **Frequency** | Monthly |

---

### KPI-A02: Preventive Maintenance Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Preventive Maintenance Completion Rate |
| **Description** | Percentage of planned preventive maintenance work orders (for pumps, compressors, valves, control systems, cathodic protection systems) that were completed on schedule within the reporting period. |
| **Formula** | `(PM work orders completed on schedule / Total PM work orders planned for period) × 100` |
| **Indicator Weight** | 30% of Asset Integrity Domain |
| **Data Required** | CMMS work order records, PM schedules, equipment register, work order completion timestamps |
| **Green Threshold** | ≥ 90% |
| **Amber Threshold** | 75–89% |
| **Red Threshold** | < 75% |
| **Indicator Type** | Leading |
| **Frequency** | Monthly |

---

### KPI-A03: Corrosion Monitoring Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Corrosion Monitoring Coverage Rate |
| **Description** | Percentage of designated corrosion monitoring points on the pipeline network that have been read/measured within their required monitoring interval, and where readings have been assessed and actioned where threshold exceedances exist. |
| **Formula** | `(Corrosion monitoring points read within interval with assessment completed / Total corrosion monitoring points due in period) × 100` |
| **Indicator Weight** | 20% of Asset Integrity Domain |
| **Data Required** | Corrosion monitoring programme schedule, coupon reading records, ultrasonic thickness measurement logs, CP system readings |
| **Green Threshold** | ≥ 90% |
| **Amber Threshold** | 75–89% |
| **Red Threshold** | < 75% |
| **Indicator Type** | Leading |
| **Frequency** | Monthly / Quarterly |

---

### KPI-A04: Leak Detection Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Leak Detection System Availability Rate |
| **Description** | Percentage of time that the computational pipeline monitoring (CPM) and/or field leak detection systems are operational and functional across all monitored pipeline segments, measured against total required operating time. |
| **Formula** | `(Total hours leak detection system operational / Total required operating hours in period) × 100` |
| **Indicator Weight** | 20% of Asset Integrity Domain |
| **Data Required** | SCADA availability logs, CPM system uptime records, maintenance outage records, alarm management logs |
| **Green Threshold** | ≥ 99% |
| **Amber Threshold** | 95–98% |
| **Red Threshold** | < 95% |
| **Indicator Type** | Leading |
| **Frequency** | Daily / Real-time |

*Note: Leak detection has a very tight green threshold (99%) because even brief system unavailability creates a window of undetected release risk.*

---

**Asset Integrity Domain Score:**
```
AICD = (ICI × 0.30) + (PMCI × 0.30) + (CMCI × 0.20) + (LDCI × 0.20)
```

---

## 2.6 KPI Catalogue — Regulatory Compliance Domain (Weight: 20%)

### KPI-R01: Audit Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | HSE Audit Completion Rate |
| **Description** | Percentage of planned internal and external HSE audits (site audits, management system audits, regulatory inspections) that were completed within their scheduled date for the reporting period. |
| **Formula** | `(Planned audits completed on schedule / Total planned audits for period) × 100` |
| **Indicator Weight** | 25% of Regulatory Domain |
| **Data Required** | Annual audit plan, audit completion records, audit reports, external regulator inspection records |
| **Green Threshold** | ≥ 95% |
| **Amber Threshold** | 80–94% |
| **Red Threshold** | < 80% |
| **Indicator Type** | Lagging |
| **Frequency** | Monthly |

---

### KPI-R02: Corrective Action Closure Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Corrective Action Closure Rate |
| **Description** | Percentage of audit findings, incident investigation recommendations, and regulatory observations that have been formally closed with verified evidence within their assigned target date. |
| **Formula** | `(Corrective actions closed with evidence by target date / Total corrective actions due for closure in period) × 100` |
| **Indicator Weight** | 30% of Regulatory Domain |
| **Data Required** | Corrective action register, finding source records (audits/incidents), closure evidence records, target dates |
| **Green Threshold** | ≥ 90% |
| **Amber Threshold** | 75–89% |
| **Red Threshold** | < 75% |
| **Indicator Type** | Lagging |
| **Frequency** | Monthly |

*Note: Corrective action closure carries the highest regulatory weight because it represents the organisation's ability to learn and improve from identified deficiencies.*

---

### KPI-R03: Regulatory Reporting Indicator
| Field | Detail |
|---|---|
| **KPI Name** | Regulatory Report Submission Compliance Rate |
| **Description** | Percentage of statutory HSE reports required by EPRA, NEMA, DOSHS, and other regulators that were submitted on time and with complete required content, out of all reports due in the reporting period. |
| **Formula** | `(Regulatory reports submitted on time and complete / Total regulatory reports due in period) × 100` |
| **Indicator Weight** | 25% of Regulatory Domain |
| **Data Required** | Regulatory reporting calendar, report submission records, regulator acknowledgement receipts |
| **Green Threshold** | ≥ 100% |
| **Amber Threshold** | 90–99% |
| **Red Threshold** | < 90% |
| **Indicator Type** | Lagging |
| **Frequency** | Per-report / Monthly |

*Note: Regulatory reporting has a green threshold of 100% — all required reports must be submitted. There is no acceptable partial compliance with statutory obligations.*

---

### KPI-R04: Internal SOP Compliance Indicator
| Field | Detail |
|---|---|
| **KPI Name** | SOP Adherence Rate |
| **Description** | Percentage of HSE-critical operational activities (pipeline operations, product transfers, emergency drills, chemical handling) observed or audited to have been carried out in accordance with the relevant approved KPC SOP. |
| **Formula** | `(Observed activities in full compliance with applicable SOP / Total observed activities reviewed) × 100` |
| **Indicator Weight** | 20% of Regulatory Domain |
| **Data Required** | HSE observation records, field audit checklists, SOP register, non-conformance reports |
| **Green Threshold** | ≥ 90% |
| **Amber Threshold** | 75–89% |
| **Red Threshold** | < 75% |
| **Indicator Type** | Leading/Lagging |
| **Frequency** | Monthly |

---

**Regulatory Domain Score:**
```
RCD = (ACI × 0.25) + (CACI × 0.30) + (RRI × 0.25) + (SOPCI × 0.20)
```

---

## 2.7 Weighting Strategy Justification

| Domain | Weight | Justification |
|---|---|---|
| Safety | 30% | Directly protects human life. OSHA 2007 creates personal criminal liability for responsible persons. Pipeline fatalities are irreversible. |
| Environmental | 25% | Pipeline network traverses sensitive catchment areas and forests. EMCA enforcement and licence revocation risk. Community relations depend on environmental performance. |
| Asset Integrity | 25% | Physical infrastructure is the source of most environmental and safety events. Inspection and maintenance failures are the leading root cause of pipeline incidents globally (PHMSA, EC data). |
| Regulatory | 20% | Provides governance envelope. Critical, but largely dependent on the other three domains performing well. A healthy operational programme naturally produces good regulatory compliance. |

**Within-domain weights** are higher for leading indicators because the platform's philosophy is proactive intelligence — identifying deterioration before incidents occur, not counting incidents after the fact.

---

---

# 3. Data Requirements

## 3.1 Design Principle

Data requirements are derived directly from the 16 KPI formulas defined in Section 2. No speculative or aspirational data sources are introduced. Every dataset listed is either already operated by a pipeline company of KPC's profile, or is a minimal addition needed to make a specific KPI calculable.

---

## 3.2 Existing Datasets (Reusable)

These datasets are expected to already exist in KPC's systems and can be integrated with minimal transformation.

### DS-01: Asset Register
| Field | Detail |
|---|---|
| **Description** | Master list of all KPC physical assets: pipeline segments, pump stations, storage tanks, pressure vessels, valves, cathodic protection systems |
| **System** | GIS / CMMS (e.g., Maximo, SAP PM) |
| **Mandatory Fields** | asset_id, asset_name, asset_type, location_id, pipeline_segment_id, criticality_rating, installation_date, design_life |
| **Used By** | KPI-A01 (Inspection), KPI-A02 (PM), KPI-A03 (Corrosion), KPI-A04 (Leak Detection) |
| **Quality Requirement** | Zero tolerance for missing asset_id or criticality_rating. All assets must be registered before they can be compliance-monitored. |

---

### DS-02: Work Order / CMMS Records
| Field | Detail |
|---|---|
| **Description** | All planned and corrective maintenance work orders raised, scheduled, and completed |
| **System** | CMMS (Maximo / SAP PM / equivalent) |
| **Mandatory Fields** | wo_id, asset_id, wo_type (PM/CM/Inspection), planned_date, completion_date, status, technician_id, station_id |
| **Used By** | KPI-A01 (Inspection), KPI-A02 (PM) |
| **Quality Requirement** | Completion timestamps must be populated at closure. Status values must be controlled vocabulary (Open / In Progress / Completed / Deferred / Cancelled). |

---

### DS-03: Incident Register
| Field | Detail |
|---|---|
| **Description** | Record of all workplace incidents including near-misses, first aid cases, medical treatment cases, lost time incidents, and dangerous occurrences |
| **System** | HSE Management System / ERP |
| **Mandatory Fields** | incident_id, incident_type, date_occurred, date_reported, location_id, asset_id (if applicable), reported_by, investigation_status, severity_level |
| **Used By** | KPI-S04 (Incident Reporting) |
| **Quality Requirement** | date_reported must be system-stamped at time of submission (not editable). date_occurred must be within 365 days of date_reported or flagged for review. |

---

### DS-04: Training Records (LMS)
| Field | Detail |
|---|---|
| **Description** | Employee and contractor training completions, certifications, and expiry dates |
| **System** | Learning Management System (LMS) / HR System |
| **Mandatory Fields** | employee_id, training_module_id, training_name, completion_date, expiry_date, pass_fail_status, employee_type (staff/contractor) |
| **Used By** | KPI-S02 (Training Compliance) |
| **Quality Requirement** | expiry_date must be populated for all time-limited certifications. LMS must be integrated with the HR system to catch new joiners within 5 working days. |

---

### DS-05: Employee & Contractor Register
| Field | Detail |
|---|---|
| **Description** | Master register of all persons working at or for KPC |
| **System** | HR System / Contractor Management System |
| **Mandatory Fields** | person_id, name, role, department, station_id, employment_type, active_status, start_date, end_date |
| **Used By** | KPI-S01 (PPE), KPI-S02 (Training) |
| **Quality Requirement** | Active status must be updated within 24 hours of contract end or termination. |

---

### DS-06: Audit Register
| Field | Detail |
|---|---|
| **Description** | Schedule and completion records for all planned internal, external, and regulatory audits |
| **System** | HSE Management System |
| **Mandatory Fields** | audit_id, audit_type, scheduled_date, completed_date, lead_auditor, scope, status, report_reference |
| **Used By** | KPI-R01 (Audit Compliance) |
| **Quality Requirement** | Scheduled audits must be entered at the start of the year. Completion date must not be back-dated. |

---

### DS-07: Corrective Action Register (CAR)
| Field | Detail |
|---|---|
| **Description** | All corrective and preventive actions arising from audits, incident investigations, regulatory inspections, and internal observations |
| **System** | HSE Management System |
| **Mandatory Fields** | car_id, source_id (audit_id / incident_id), finding_description, responsible_person_id, department, target_date, completion_date, status, evidence_reference, severity |
| **Used By** | KPI-R02 (CAR Closure) |
| **Quality Requirement** | Every audit finding and incident recommendation must generate a CAR. status must be a controlled vocabulary (Open / In Progress / Closed / Overdue / Rejected). |

---

### DS-08: SCADA / Operational Data
| Field | Detail |
|---|---|
| **Description** | Real-time and historical pipeline operational data from the SCADA system |
| **System** | SCADA / Historian (OSIsoft PI, Wonderware, or equivalent) |
| **Mandatory Fields** | timestamp, station_id, segment_id, flow_rate, pressure, temperature, alarm_type, alarm_status, system_availability_flag |
| **Used By** | KPI-A04 (Leak Detection availability) |
| **Quality Requirement** | system_availability_flag must be calculated automatically from system heartbeat signals, not manually entered. |

---

## 3.3 Additional Datasets Required

These datasets may need to be formalised or created if they do not yet exist in structured form.

### DS-09: PPE Inspection Records
| Field | Detail |
|---|---|
| **Description** | Results of HSE officer field observations and formal PPE inspections, recording whether workers were wearing correct PPE for their task |
| **System** | HSE Management System (new module or paper-digitised) |
| **Mandatory Fields** | observation_id, observer_id, observed_person_id (or count), station_id, task_type, ppe_required, ppe_worn_correctly (boolean), date_observed, non_compliance_description |
| **Used By** | KPI-S01 (PPE Compliance) |
| **New/Existing** | Likely exists on paper — must be digitised |
| **Quality Requirement** | Minimum 3 observations per station per week. Observer must be trained HSE Officer. |

---

### DS-10: Permit-to-Work Register
| Field | Detail |
|---|---|
| **Description** | All PTW (hot work, confined space, working at height, electrical isolation, excavation) issued, their authorisation chain, and closure confirmation |
| **System** | PTW System (digital) or HSE Management System |
| **Mandatory Fields** | ptw_id, work_order_id (if linked), ptw_type, issuing_authority_id, approved_by_id, issue_datetime, expiry_datetime, closure_datetime, location_id, task_description, gas_test_results (for hot work), status |
| **Used By** | KPI-S03 (PTW Compliance) |
| **New/Existing** | May exist on paper — digitisation is mandatory for this KPI |
| **Quality Requirement** | All high-risk work orders in the CMMS must have a corresponding PTW record. PTW without a linked work order must be flagged. |

---

### DS-11: Environmental Monitoring Records
| Field | Detail |
|---|---|
| **Description** | Results of water quality sampling, air quality monitoring, and effluent testing from KPC facilities |
| **System** | Environmental Management System / Laboratory LIMS |
| **Mandatory Fields** | sample_id, sample_type (water/air/effluent), station_id, sample_date, parameter_name, measured_value, unit, regulatory_limit, within_limit (boolean), lab_reference |
| **Used By** | KPI-E01 (Water Quality), KPI-E02 (Air Quality) |
| **New/Existing** | Likely on paper or in spreadsheets — needs formalisation into LIMS or HSE system |
| **Quality Requirement** | Lab must be KEBS-accredited. Results must be entered within 5 working days of sample date. |

---

### DS-12: Waste Management Records
| Field | Detail |
|---|---|
| **Description** | Waste generation logs, waste contractor manifests, and licensed disposal certificates |
| **System** | Environmental Management System |
| **Mandatory Fields** | waste_id, station_id, waste_type, waste_classification (hazardous/non-hazardous), quantity, unit, generation_date, disposal_contractor_id, contractor_licence_number, manifest_number, disposal_date, disposal_certificate_reference |
| **Used By** | KPI-E03 (Waste Management) |
| **New/Existing** | Likely partially documented — needs a structured register |
| **Quality Requirement** | Disposal contractor licence must be validated against NEMA's licensed contractor register. Licence expiry must be checked automatically. |

---

### DS-13: Spill Register
| Field | Detail |
|---|---|
| **Description** | Record of all hydrocarbon or chemical spills, their volume, response initiation time, containment status, and reporting |
| **System** | HSE Management System |
| **Mandatory Fields** | spill_id, station_id, segment_id, spill_date, spill_type, estimated_volume, unit, response_initiated_datetime, containment_completed_datetime, report_submitted_datetime, report_reference, regulatory_notification_sent (boolean) |
| **Used By** | KPI-E04 (Spill Response) |
| **New/Existing** | Likely exists but may be inconsistently maintained — must be formalised |
| **Quality Requirement** | Response initiation time must be system-stamped from emergency response activation. Must be linked to SCADA alarm data. |

---

### DS-14: Corrosion Monitoring Records
| Field | Detail |
|---|---|
| **Description** | Readings from corrosion monitoring points including corrosion coupons, UT thickness measurements, and cathodic protection potential readings |
| **System** | Integrity Management System / GIS-linked database |
| **Mandatory Fields** | reading_id, monitoring_point_id, asset_id, segment_id, reading_type (coupon/UT/CP potential), reading_date, measured_value, unit, alert_threshold, within_threshold (boolean), assessment_date, assessor_id, action_required (boolean) |
| **Used By** | KPI-A03 (Corrosion Monitoring) |
| **New/Existing** | Data likely exists but may be in spreadsheets — needs structured database |
| **Quality Requirement** | monitoring_point_id must be registered in the Asset Register. All exceedances must trigger a mandatory assessment within 30 days. |

---

### DS-15: Regulatory Reporting Calendar
| Field | Detail |
|---|---|
| **Description** | Master schedule of all statutory reports required by regulators (EPRA, NEMA, DOSHS, KEBS), their due dates, and submission status |
| **System** | Compliance Management System |
| **Mandatory Fields** | report_id, report_name, regulator, reporting_period, due_date, responsible_person_id, submission_date, submission_reference, status (Pending/Submitted/Overdue) |
| **Used By** | KPI-R03 (Regulatory Reporting) |
| **New/Existing** | Likely managed in spreadsheets — must be formalised |
| **Quality Requirement** | Calendar must be updated at start of each year. New regulatory requirements must be added within 30 days of enactment. |

---

### DS-16: SOP Register & Observation Records
| Field | Detail |
|---|---|
| **Description** | Library of approved KPC SOPs and field observation records documenting whether operational activities were carried out in compliance with the relevant SOP |
| **System** | Document Management System + HSE Observation System |
| **Mandatory Fields (SOP)** | sop_id, sop_title, applicable_activity, version, approval_date, review_date, status (Active/Superseded) |
| **Mandatory Fields (Observation)** | obs_id, sop_id, activity_observed, station_id, date_observed, observer_id, in_compliance (boolean), deviation_description |
| **Used By** | KPI-R04 (SOP Compliance) |
| **New/Existing** | SOP library likely exists in DMS — observation records may need digitising |
| **Quality Requirement** | All active SOPs must have a review_date within 3 years. Observations must be linked to the specific SOP version in use at the time. |

---

## 3.4 Dataset Relationships

```
Employees (DS-05) ──────────── Training Records (DS-04)
     │                                │
     └──────── PPE Observations (DS-09)
                    │
                    └── Station (location_id)

Asset Register (DS-01) ──┬── Work Orders / CMMS (DS-02) ── PTW Register (DS-10)
                          ├── Inspection Records (DS-02)
                          ├── Corrosion Monitoring (DS-14)
                          └── SCADA / Operational (DS-08)

Incidents (DS-03) ─────────── Corrective Action Register (DS-07)
Audits (DS-06) ────────────── Corrective Action Register (DS-07)
Regulatory Calendar (DS-15) ── Corrective Action Register (DS-07)

Environmental Monitoring (DS-11) ── Station (location_id)
Waste Records (DS-12) ──────────── Station (location_id)
Spill Register (DS-13) ─────────── SCADA (DS-08) ── Asset Register (DS-01)

SOP Register (DS-16a) ──── SOP Observations (DS-16b)
```

---

## 3.5 Data Quality Requirements Summary

| Requirement | Standard |
|---|---|
| Completeness | Mandatory fields must not be null. Any record with a missing mandatory field is excluded from KPI calculations and flagged as a data quality defect. |
| Timeliness | Records must be entered within defined SLA windows (e.g., incidents within 24 hours, PM completions within 48 hours of job close). Late entries are flagged. |
| Accuracy | Numeric values must be within physically plausible ranges. Out-of-range values are quarantined for review. |
| Consistency | Controlled vocabulary fields (status, type) must use approved code tables. Free-text fields are supplementary only. |
| Uniqueness | No duplicate IDs for assets, persons, work orders, incidents, or regulatory reports. |
| Traceability | Every compliance calculation must be traceable to its source record(s) with a direct link available in the drill-down. |

---

---

# 4. Business Rule Catalogue

## 4.1 Design Principle

Business rules translate compliance requirements into deterministic, machine-executable logic. Each rule is defined with enough precision to be implemented as a SQL query, a scheduled job, or a streaming evaluation on incoming data. Rules are versioned and configuration-driven — thresholds are stored in a rules configuration table, not hardcoded.

Rules are evaluated at defined intervals (real-time, daily, weekly, monthly) and results feed directly into KPI score calculations.

---

## 4.2 Rule Format

Each rule follows this structure:

| Field | Description |
|---|---|
| **Rule ID** | Unique identifier |
| **Rule Name** | Human-readable name |
| **KPI** | Which KPI this rule evaluates |
| **Business Rule** | Plain-language statement of the compliance requirement |
| **Evaluation Logic** | How the rule is computed (SQL pseudocode) |
| **Violation Condition** | Exact condition under which a non-compliance is recorded |
| **Severity** | Low / Medium / High / Critical |
| **Recommended Action** | What must happen when the rule fires |
| **Evaluation Frequency** | How often the rule runs |

---

## 4.3 Safety Compliance Rules

### BR-S01: PPE Compliance Check
| Field | Detail |
|---|---|
| **Rule ID** | BR-S01 |
| **Rule Name** | PPE Field Observation Compliance |
| **KPI** | KPI-S01 |
| **Business Rule** | Every person working on a KPC site must be wearing the correct PPE for their designated work zone and task type. Compliance is assessed from field observations recorded by HSE officers. |
| **Evaluation Logic** | `SELECT station_id, COUNT(*) FILTER (WHERE ppe_worn_correctly = TRUE) AS compliant, COUNT(*) AS total FROM ppe_observations WHERE observation_date BETWEEN [period_start] AND [period_end] GROUP BY station_id` — Score = (compliant / total) × 100 |
| **Violation Condition** | Any observation record where `ppe_worn_correctly = FALSE`. Station score < 95%. |
| **Severity** | High — direct exposure to injury risk |
| **Recommended Action** | Issue immediate verbal warning; record non-compliance; require site supervisor to conduct toolbox talk within 24 hours; re-inspect within 48 hours |
| **Evaluation Frequency** | Daily |

---

### BR-S02: Training Currency Check
| Field | Detail |
|---|---|
| **Rule ID** | BR-S02 |
| **Rule Name** | Mandatory HSE Training Currency |
| **KPI** | KPI-S02 |
| **Business Rule** | Every employee and contractor must have all mandatory HSE training modules completed and current (not expired). An employee is non-compliant if any one of their required modules is expired or not yet completed. |
| **Evaluation Logic** | `SELECT e.employee_id, e.station_id, COUNT(tm.module_id) AS total_required, COUNT(tr.module_id) FILTER (WHERE tr.expiry_date >= CURRENT_DATE AND tr.pass_fail = 'PASS') AS current_completed FROM employees e JOIN training_matrix tm ON e.role = tm.role LEFT JOIN training_records tr ON e.employee_id = tr.employee_id AND tm.module_id = tr.module_id GROUP BY e.employee_id, e.station_id` — Flag where current_completed < total_required |
| **Violation Condition** | `current_completed < total_required` for any active employee or contractor |
| **Severity** | High for safety-critical roles (confined space, hot work); Medium for general roles |
| **Recommended Action** | Notify employee and line manager immediately; restrict from safety-critical tasks until training is current; schedule training within 14 days |
| **Evaluation Frequency** | Daily (automated, via LMS integration) |

---

### BR-S03: Permit-to-Work Authorisation Check
| Field | Detail |
|---|---|
| **Rule ID** | BR-S03 |
| **Rule Name** | PTW Authorisation Before High-Risk Work |
| **KPI** | KPI-S03 |
| **Business Rule** | Every work order classified as high-risk (hot work, confined space entry, working at height, electrical isolation, excavation) must have an associated PTW record that was issued before work commencement and closed after work completion. Work orders completed without a corresponding closed PTW are violations. |
| **Evaluation Logic** | `SELECT wo.wo_id, wo.station_id, wo.wo_type, wo.completion_date, ptw.ptw_id, ptw.status FROM work_orders wo LEFT JOIN ptw_register ptw ON wo.wo_id = ptw.work_order_id WHERE wo.wo_type IN ('HOT_WORK','CONFINED_SPACE','WORK_AT_HEIGHT','ELECTRICAL_ISOLATION','EXCAVATION') AND wo.status = 'COMPLETED' AND (ptw.ptw_id IS NULL OR ptw.status != 'CLOSED')` |
| **Violation Condition** | Any high-risk work order completed without a corresponding CLOSED PTW record |
| **Severity** | Critical — represents a fundamental safety system failure |
| **Recommended Action** | Immediate stop-work on any open similar activities; mandatory HSE investigation; report to HSE Manager within 4 hours; review authorisation chain |
| **Evaluation Frequency** | Real-time / Daily |

---

### BR-S04: Incident Reporting Timeliness Check
| Field | Detail |
|---|---|
| **Rule ID** | BR-S04 |
| **Rule Name** | Incident Notification Within Required Timeframe |
| **KPI** | KPI-S04 |
| **Business Rule** | Near-misses and first-aid incidents must be reported within 24 hours of occurrence. Lost-time incidents and dangerous occurrences must be reported within 4 hours. |
| **Evaluation Logic** | `SELECT incident_id, incident_type, date_occurred, date_reported, EXTRACT(EPOCH FROM (date_reported - date_occurred))/3600 AS hours_to_report, CASE WHEN incident_type IN ('LTI','DANGEROUS_OCCURRENCE') AND hours_to_report > 4 THEN 'LATE' WHEN incident_type IN ('NEAR_MISS','FIRST_AID') AND hours_to_report > 24 THEN 'LATE' ELSE 'ON_TIME' END AS reporting_status FROM incident_register WHERE date_occurred BETWEEN [period_start] AND [period_end]` |
| **Violation Condition** | `reporting_status = 'LATE'` |
| **Severity** | High (LTI/Dangerous Occurrence), Medium (Near-miss/First Aid) |
| **Recommended Action** | Investigate reason for late reporting; conduct refresher on incident reporting procedure; station supervisor accountable review |
| **Evaluation Frequency** | Daily |

---

## 4.4 Environmental Compliance Rules

### BR-E01: Water Quality Discharge Compliance
| Field | Detail |
|---|---|
| **Rule ID** | BR-E01 |
| **Rule Name** | Water Discharge Parameter Within NEMA Limits |
| **KPI** | KPI-E01 |
| **Business Rule** | Every water discharge sample taken from KPC facilities must be within the NEMA Water Quality (Discharge) Regulations limits for all measured parameters. A single parameter exceedance constitutes a non-compliant sample. |
| **Evaluation Logic** | `SELECT sample_id, station_id, sample_date, parameter_name, measured_value, regulatory_limit, CASE WHEN measured_value > regulatory_limit THEN 'EXCEEDANCE' ELSE 'COMPLIANT' END AS compliance_status FROM environmental_monitoring WHERE sample_type = 'WATER_DISCHARGE' AND sample_date BETWEEN [period_start] AND [period_end]` — Score = compliant samples / total samples |
| **Violation Condition** | `measured_value > regulatory_limit` for any parameter in any sample |
| **Severity** | High (significant exceedance > 2× limit); Medium (minor exceedance ≤ 2× limit) |
| **Recommended Action** | Identify discharge source; cease discharge if above 2× limit; notify NEMA within 24 hours of significant exceedance; investigate and remediate |
| **Evaluation Frequency** | Per-sample (on data ingestion) |

---

### BR-E02: Air Quality Monitoring Compliance
| Field | Detail |
|---|---|
| **Rule ID** | BR-E02 |
| **Rule Name** | Air Emissions Within Permitted Limits |
| **KPI** | KPI-E02 |
| **Business Rule** | All air quality monitoring readings (continuous sensor or periodic manual) at KPC facilities must be within the limits specified in KPC's NEMA Air Quality Permit and the Environmental Management and Co-ordination (Air Quality) Regulations. |
| **Evaluation Logic** | `SELECT reading_id, station_id, reading_date, parameter_name, measured_value, permit_limit, CASE WHEN measured_value > permit_limit THEN 'EXCEEDANCE' ELSE 'COMPLIANT' END AS compliance_status FROM environmental_monitoring WHERE sample_type = 'AIR_QUALITY' AND reading_date BETWEEN [period_start] AND [period_end]` |
| **Violation Condition** | `measured_value > permit_limit` |
| **Severity** | Critical (> 150% of limit); High (110–150%); Medium (100–110%) |
| **Recommended Action** | Identify emission source; increase ventilation; check for equipment malfunction; submit exceedance report to NEMA if limit exceeded for > 1 hour |
| **Evaluation Frequency** | Continuous (sensor) / Per-sample (manual) |

---

### BR-E03: Waste Disposal Documentation Compliance
| Field | Detail |
|---|---|
| **Rule ID** | BR-E03 |
| **Rule Name** | Hazardous Waste Disposed by Licensed Contractor With Certificate |
| **KPI** | KPI-E03 |
| **Business Rule** | Every hazardous waste consignment must be disposed of by a NEMA-licensed waste handler. A valid waste manifest must exist. A disposal certificate must be received and filed within 30 days of waste handover. The contractor licence must be current at the time of disposal. |
| **Evaluation Logic** | `SELECT w.waste_id, w.station_id, w.generation_date, w.disposal_date, c.licence_number, c.licence_expiry, w.disposal_certificate_reference, CASE WHEN w.disposal_certificate_reference IS NULL THEN 'MISSING_CERTIFICATE' WHEN c.licence_expiry < w.disposal_date THEN 'EXPIRED_LICENCE' WHEN w.disposal_date > w.generation_date + INTERVAL '30 days' AND w.waste_classification = 'HAZARDOUS' THEN 'STORAGE_EXCEEDED' ELSE 'COMPLIANT' END AS compliance_status FROM waste_records w JOIN contractor_register c ON w.disposal_contractor_id = c.contractor_id WHERE w.generation_date BETWEEN [period_start] AND [period_end]` |
| **Violation Condition** | `compliance_status != 'COMPLIANT'` |
| **Severity** | High (missing certificate or expired licence); Medium (late disposal) |
| **Recommended Action** | Obtain missing certificate urgently; replace expired-licence contractor; review waste storage conditions; escalate to Environmental Officer |
| **Evaluation Frequency** | Daily |

---

### BR-E04: Spill Response Timeliness
| Field | Detail |
|---|---|
| **Rule ID** | BR-E04 |
| **Rule Name** | Spill Emergency Response Initiated Within Required Time |
| **KPI** | KPI-E04 |
| **Business Rule** | Major spills (> 100 litres) require emergency response initiation within 15 minutes. Minor spills (≤ 100 litres) require response within 30 minutes. A spill response report must be submitted within 24 hours of the spill event. |
| **Evaluation Logic** | `SELECT spill_id, station_id, spill_date, estimated_volume, response_initiated_datetime, EXTRACT(EPOCH FROM (response_initiated_datetime - spill_date))/60 AS response_minutes, report_submitted_datetime, CASE WHEN estimated_volume > 100 AND response_minutes > 15 THEN 'LATE_MAJOR' WHEN estimated_volume <= 100 AND response_minutes > 30 THEN 'LATE_MINOR' WHEN EXTRACT(EPOCH FROM (report_submitted_datetime - spill_date))/3600 > 24 THEN 'LATE_REPORT' ELSE 'COMPLIANT' END AS compliance_status FROM spill_register WHERE spill_date BETWEEN [period_start] AND [period_end]` |
| **Violation Condition** | `compliance_status != 'COMPLIANT'` |
| **Severity** | Critical (late major spill response); High (late minor response or late report) |
| **Recommended Action** | Review emergency response drills; check on-call roster coverage; conduct post-incident review; improve SCADA-to-emergency-notification integration |
| **Evaluation Frequency** | Per-event |

---

## 4.5 Asset Integrity Compliance Rules

### BR-A01: Overdue Inspection Check
| Field | Detail |
|---|---|
| **Rule ID** | BR-A01 |
| **Rule Name** | Asset Inspection Not Overdue |
| **KPI** | KPI-A01 |
| **Business Rule** | Every asset classified in the inspection schedule must be inspected within its defined inspection interval. An asset is overdue if the current date exceeds the date of last inspection plus the required interval. |
| **Evaluation Logic** | `SELECT a.asset_id, a.asset_name, a.criticality_rating, MAX(wo.completion_date) AS last_inspection_date, s.inspection_interval_days, MAX(wo.completion_date) + s.inspection_interval_days AS next_due_date, CASE WHEN MAX(wo.completion_date) + s.inspection_interval_days < CURRENT_DATE THEN 'OVERDUE' ELSE 'CURRENT' END AS inspection_status FROM asset_register a JOIN inspection_schedule s ON a.asset_id = s.asset_id LEFT JOIN work_orders wo ON a.asset_id = wo.asset_id AND wo.wo_type = 'INSPECTION' AND wo.status = 'COMPLETED' GROUP BY a.asset_id, a.asset_name, a.criticality_rating, s.inspection_interval_days` |
| **Violation Condition** | `inspection_status = 'OVERDUE'` |
| **Severity** | Critical (safety-critical assets overdue > 30 days); High (overdue ≤ 30 days); Medium (due within 14 days) |
| **Recommended Action** | Immediately schedule inspection; if safety-critical, consider operational risk assessment pending inspection; escalate to Asset Integrity Manager |
| **Evaluation Frequency** | Daily |

---

### BR-A02: Preventive Maintenance Schedule Compliance
| Field | Detail |
|---|---|
| **Rule ID** | BR-A02 |
| **Rule Name** | PM Work Order Completed Within Schedule |
| **KPI** | KPI-A02 |
| **Business Rule** | All preventive maintenance work orders must be completed within ±5 days of their planned date. Work orders completed more than 5 days late are non-compliant. |
| **Evaluation Logic** | `SELECT wo_id, asset_id, station_id, planned_date, completion_date, CASE WHEN status = 'COMPLETED' AND completion_date <= planned_date + INTERVAL '5 days' THEN 'ON_TIME' WHEN status = 'COMPLETED' AND completion_date > planned_date + INTERVAL '5 days' THEN 'LATE_COMPLETED' WHEN status IN ('OPEN','IN_PROGRESS') AND planned_date < CURRENT_DATE THEN 'OVERDUE' ELSE 'FUTURE' END AS pm_status FROM work_orders WHERE wo_type = 'PM' AND planned_date BETWEEN [period_start] AND [period_end]` |
| **Violation Condition** | `pm_status IN ('LATE_COMPLETED', 'OVERDUE')` |
| **Severity** | High (rotating equipment / safety-critical); Medium (general assets) |
| **Recommended Action** | Reschedule overdue PM immediately; identify resource constraint; review PM backlog and escalate to Maintenance Superintendent |
| **Evaluation Frequency** | Daily |

---

### BR-A03: Corrosion Monitoring Point Coverage
| Field | Detail |
|---|---|
| **Rule ID** | BR-A03 |
| **Rule Name** | Corrosion Monitoring Point Read Within Interval |
| **KPI** | KPI-A03 |
| **Business Rule** | Every corrosion monitoring point must be read within its defined monitoring interval. Where a reading exceeds the alert threshold, a formal assessment must be completed within 30 days. |
| **Evaluation Logic** | `SELECT cm.monitoring_point_id, cm.asset_id, cm.reading_date, cm.measured_value, cm.alert_threshold, cm.within_threshold, s.monitoring_interval_days, cm.reading_date + s.monitoring_interval_days AS next_due, CASE WHEN cm.reading_date + s.monitoring_interval_days < CURRENT_DATE THEN 'OVERDUE_READING' WHEN cm.within_threshold = FALSE AND cm.assessment_date IS NULL THEN 'PENDING_ASSESSMENT' WHEN cm.within_threshold = FALSE AND cm.assessment_date > cm.reading_date + INTERVAL '30 days' THEN 'LATE_ASSESSMENT' ELSE 'COMPLIANT' END AS status FROM (SELECT DISTINCT ON (monitoring_point_id) * FROM corrosion_monitoring ORDER BY monitoring_point_id, reading_date DESC) cm JOIN monitoring_schedule s ON cm.monitoring_point_id = s.monitoring_point_id` |
| **Violation Condition** | `status IN ('OVERDUE_READING', 'PENDING_ASSESSMENT', 'LATE_ASSESSMENT')` |
| **Severity** | Critical (alert threshold exceeded, no assessment); High (overdue reading on high-criticality segment); Medium (overdue on low-criticality segment) |
| **Recommended Action** | Dispatch corrosion technician; if threshold exceeded, conduct risk assessment and consider pressure reduction or isolation pending investigation |
| **Evaluation Frequency** | Daily |

---

### BR-A04: Leak Detection System Availability
| Field | Detail |
|---|---|
| **Rule ID** | BR-A04 |
| **Rule Name** | Pipeline Leak Detection System Online and Functional |
| **KPI** | KPI-A04 |
| **Business Rule** | The pipeline leak detection system (CPM and/or field sensors) must be operational and producing valid readings at all times. Any period of system unavailability is a non-compliance event. |
| **Evaluation Logic** | `SELECT segment_id, DATE_TRUNC('day', timestamp) AS report_date, SUM(CASE WHEN system_availability_flag = TRUE THEN 1 ELSE 0 END) AS available_hours, COUNT(*) AS total_hours, (SUM(CASE WHEN system_availability_flag = TRUE THEN 1 ELSE 0 END)::FLOAT / COUNT(*)) * 100 AS availability_pct FROM scada_availability WHERE timestamp BETWEEN [period_start] AND [period_end] GROUP BY segment_id, report_date` |
| **Violation Condition** | `availability_pct < 99.0` for any segment on any day |
| **Severity** | Critical (> 1 hour downtime on active segment); High (downtime 15–60 minutes); Medium (< 15 minutes) |
| **Recommended Action** | Immediate SCADA/instrumentation team alert; manual patrol of affected segment during downtime; investigate root cause; restore service within SLA |
| **Evaluation Frequency** | Real-time / Hourly rollup |

---

## 4.6 Regulatory Compliance Rules

### BR-R01: Planned Audit Completion
| Field | Detail |
|---|---|
| **Rule ID** | BR-R01 |
| **Rule Name** | Scheduled HSE Audit Completed On Time |
| **KPI** | KPI-R01 |
| **Business Rule** | All audits in the annual HSE Audit Plan must be completed by their scheduled date. An audit is non-compliant if it is more than 14 days past its scheduled date without completion or rescheduling with documented justification. |
| **Evaluation Logic** | `SELECT audit_id, audit_type, scheduled_date, completed_date, CASE WHEN completed_date IS NOT NULL AND completed_date <= scheduled_date + INTERVAL '14 days' THEN 'COMPLIANT' WHEN completed_date IS NULL AND CURRENT_DATE > scheduled_date + INTERVAL '14 days' THEN 'OVERDUE' WHEN completed_date > scheduled_date + INTERVAL '14 days' THEN 'LATE_COMPLETED' ELSE 'UPCOMING' END AS audit_status FROM audit_register WHERE scheduled_date BETWEEN [period_start] AND [period_end]` |
| **Violation Condition** | `audit_status IN ('OVERDUE', 'LATE_COMPLETED')` |
| **Severity** | High (regulatory/external audit); Medium (internal site audit) |
| **Recommended Action** | Reschedule within 30 days with documented approval; escalate to HSE Director if external regulatory audit is overdue |
| **Evaluation Frequency** | Daily |

---

### BR-R02: Corrective Action Overdue
| Field | Detail |
|---|---|
| **Rule ID** | BR-R02 |
| **Rule Name** | Corrective Action Closed By Target Date |
| **KPI** | KPI-R02 |
| **Business Rule** | Every corrective action in the register must be closed with verified evidence by its target date. An overdue corrective action is one whose target date has passed without closure or an approved extension. |
| **Evaluation Logic** | `SELECT car_id, source_id, finding_description, responsible_person_id, target_date, completion_date, status, severity, CASE WHEN status = 'CLOSED' AND completion_date <= target_date THEN 'ON_TIME' WHEN status = 'CLOSED' AND completion_date > target_date THEN 'LATE_CLOSED' WHEN status != 'CLOSED' AND CURRENT_DATE > target_date THEN 'OVERDUE' ELSE 'IN_PROGRESS' END AS car_status FROM corrective_action_register WHERE target_date BETWEEN [period_start] AND [period_end + INTERVAL '30 days']` |
| **Violation Condition** | `car_status IN ('OVERDUE', 'LATE_CLOSED')` |
| **Severity** | Critical (from LTI investigation or regulatory enforcement); High (audit finding — major); Medium (audit finding — minor/observation) |
| **Recommended Action** | Escalate to responsible department head; conduct weekly review for all overdue critical CARs; consider revised target with documented risk acceptance if extension is needed |
| **Evaluation Frequency** | Daily |

---

### BR-R03: Regulatory Report Submission
| Field | Detail |
|---|---|
| **Rule ID** | BR-R03 |
| **Rule Name** | Statutory Report Submitted By Due Date |
| **KPI** | KPI-R03 |
| **Business Rule** | All statutory reports on the Regulatory Reporting Calendar must be submitted to the relevant regulator by the specified due date. Late submission is a compliance violation regardless of cause. |
| **Evaluation Logic** | `SELECT report_id, report_name, regulator, due_date, submission_date, CASE WHEN submission_date IS NOT NULL AND submission_date <= due_date THEN 'SUBMITTED_ON_TIME' WHEN submission_date IS NOT NULL AND submission_date > due_date THEN 'SUBMITTED_LATE' WHEN submission_date IS NULL AND CURRENT_DATE > due_date THEN 'OVERDUE' ELSE 'PENDING' END AS submission_status FROM regulatory_reporting_calendar WHERE due_date BETWEEN [period_start] AND [period_end + INTERVAL '30 days']` |
| **Violation Condition** | `submission_status IN ('SUBMITTED_LATE', 'OVERDUE')` |
| **Severity** | Critical (EPRA, NEMA statutory report); High (DOSHS/KEBS periodic report); Medium (internal management report) |
| **Recommended Action** | Submit immediately with cover letter explaining delay; notify Legal and Regulatory Affairs team; log as regulatory risk item |
| **Evaluation Frequency** | Daily |

---

### BR-R04: SOP Adherence Observation
| Field | Detail |
|---|---|
| **Rule ID** | BR-R04 |
| **Rule Name** | Operational Activity Conducted Per Approved SOP |
| **KPI** | KPI-R04 |
| **Business Rule** | All HSE-critical operational activities must be carried out in accordance with the current approved SOP. Any observed deviation constitutes a non-compliance. |
| **Evaluation Logic** | `SELECT obs_id, sop_id, activity_observed, station_id, date_observed, in_compliance, CASE WHEN in_compliance = FALSE THEN 'NON_COMPLIANT' ELSE 'COMPLIANT' END AS observation_status FROM sop_observations WHERE date_observed BETWEEN [period_start] AND [period_end]` — Score = (COMPLIANT / total) × 100 |
| **Violation Condition** | `in_compliance = FALSE` |
| **Severity** | High (safety-critical activity SOP deviation); Medium (environmental activity); Low (administrative SOP) |
| **Recommended Action** | Issue non-conformance report; conduct immediate toolbox talk on correct procedure; re-assess SOP clarity (may indicate SOP needs updating); require sign-off that procedure is understood |
| **Evaluation Frequency** | Daily (on observation upload) |

---

---

# 5. Executive Dashboard Design

## 5.1 Dashboard Philosophy

The executive dashboard presents the full compliance picture in a single view. It is designed for the HSE Director, CEO, and Station Managers — people who need to make decisions in under 2 minutes of looking at the screen. It follows the "5-second rule": the overall compliance status must be immediately readable without scrolling or clicking.

The layout follows a hierarchy: macro status at the top, domain breakdown in the middle, operational detail at the bottom.

---

## 5.2 Dashboard Layout (Wireframe)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ KPC HSE Compliance Intelligence          [Period: Jul 2026 ▼] [Station: All ▼]  │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────────┤
│  WIDGET 1    │   WIDGET 2   │   WIDGET 3   │   WIDGET 4   │     WIDGET 5        │
│  Overall     │   Safety     │Environmental │    Asset     │    Regulatory       │
│  Compliance  │  Compliance  │  Compliance  │  Integrity   │    Compliance       │
│  🟢 88.4%    │  🟡 84.2%   │  🟢 91.7%   │  🟡 86.1%   │    🟢 90.5%        │
│  [Gauge]     │  [Gauge]     │  [Gauge]     │  [Gauge]     │    [Gauge]          │
├──────────────┴──────────────┴──────────────┴──────────────┴─────────────────────┤
│  WIDGET 6: Compliance Trend (12-week rolling)                                    │
│  [Line chart — OCS + 4 domain lines — with threshold bands shaded]              │
├───────────────────────────────────────┬─────────────────────────────────────────┤
│  WIDGET 7: Top Non-Compliant Assets   │  WIDGET 8: Compliance Heat Map          │
│  [Drill-down table — Asset / Score /  │  [Geographic pipeline map with          │
│   Domain / Overdue Days]              │   RAG colour by station/segment]        │
├───────────────────────────────────────┼─────────────────────────────────────────┤
│  WIDGET 9: Overdue Inspections        │  WIDGET 10: Open Corrective Actions     │
│  [Stacked bar by station — Critical / │  [Donut chart — Open / In Progress /    │
│   High / Medium priority]             │   Overdue — with count breakdown]       │
├───────────────────────────────────────┼─────────────────────────────────────────┤
│  WIDGET 11: Overdue Maintenance       │  WIDGET 12: Risk Distribution           │
│  [Stacked bar by asset type — count   │  [Risk matrix — Likelihood × Consequence│
│   and days overdue]                   │   — plotted from open non-compliances]  │
├───────────────────────────────────────┴─────────────────────────────────────────┤
│  WIDGET 13: AI Recommendations Panel                                             │
│  [3 AI-generated insight cards — highest priority actions — plain language]      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5.3 Widget Specifications

### Widget 1 — Overall Compliance Score
| Field | Detail |
|---|---|
| **Purpose** | Provide a single, unambiguous number representing KPC's total HSE compliance state at the current moment |
| **Business Value** | Enables CEO/MD to assess compliance at a glance; provides a single metric for board reporting and regulatory submissions |
| **Visualization** | Large gauge chart (speedometer style) with RAG colour fill. Central number displayed prominently. Delta vs. previous period shown below (e.g., ▼ 2.1% from last week). |
| **Required Data** | All 16 KPI scores → Domain scores → OCS formula |
| **Drill-Down** | Click → domain breakdown view → indicator detail → affected assets |
| **Refresh** | Daily (recalculated each morning from prior day's data) |

---

### Widget 2–5 — Domain Compliance Gauges (Safety / Environmental / Asset Integrity / Regulatory)
| Field | Detail |
|---|---|
| **Purpose** | Show each domain's compliance score independently so the viewer can identify which domain is dragging the overall score |
| **Business Value** | Enables domain owners to be accountable for their score; surfaces the specific area needing attention |
| **Visualization** | Four smaller gauge charts arranged horizontally. Each shows domain score, RAG colour, and delta from prior period. |
| **Required Data** | Calculated domain scores from KPI weighted averages |
| **Drill-Down** | Click any domain → domain detail view with all 4 indicators and their individual scores |
| **Refresh** | Daily |

---

### Widget 6 — Compliance Trend (12-Week Rolling)
| Field | Detail |
|---|---|
| **Purpose** | Show whether compliance is improving, stable, or deteriorating over time across all domains |
| **Business Value** | Trend is more important than any single week's score. A score of 85% that is rising is a better situation than 87% that is falling. This widget surfaces the direction of travel. |
| **Visualization** | Multi-line chart. X-axis = weeks. Y-axis = 0–100%. One line per domain + one thicker line for OCS. Green (≥90), Amber (75–89), and Red (<75) threshold bands shaded as horizontal ribbons. |
| **Required Data** | Historical weekly KPI scores and domain scores (minimum 12 weeks of history) |
| **Drill-Down** | Click any data point → weekly breakdown showing which KPIs moved that week |
| **Refresh** | Weekly |

---

### Widget 7 — Top Non-Compliant Assets
| Field | Detail |
|---|---|
| **Purpose** | Identify the specific physical assets (pipeline segments, pump stations, tanks) contributing most to non-compliance |
| **Business Value** | Translates abstract compliance scores into concrete assets that can be acted upon. Maintenance and operations teams can be immediately directed to the right location. |
| **Visualization** | Ranked table with columns: Rank / Asset Name / Location / Compliance Domain / Non-Compliance Type / Days Overdue / Risk Rating. Rows colour-coded by severity. |
| **Required Data** | DS-01 (Asset Register), DS-02 (Work Orders), DS-14 (Corrosion), DS-13 (Spills) |
| **Drill-Down** | Click any row → asset detail page with full history, all open findings, and corrective actions |
| **Refresh** | Daily |

---

### Widget 8 — Compliance Heat Map (Geographic)
| Field | Detail |
|---|---|
| **Purpose** | Show compliance status geographically across KPC's pipeline network so that problem areas can be located spatially |
| **Business Value** | Pipeline compliance has a geographic dimension — a failing station or segment can be isolated for field response. This widget is critical for field managers dispatching inspection teams. |
| **Visualization** | KPC pipeline network map (Mombasa–Nairobi–Kisumu–Eldoret corridors). Each station and pipeline segment coloured by its compliance score (Green/Amber/Red). Bubble size = number of open non-compliances. |
| **Required Data** | Station compliance scores (aggregated from all KPIs), GIS/spatial data for pipeline network |
| **Drill-Down** | Click any station/segment → station compliance card showing all domain scores for that location |
| **Refresh** | Daily |

---

### Widget 9 — Overdue Inspections
| Field | Detail |
|---|---|
| **Purpose** | Surface inspection backlogs before they become safety or regulatory incidents |
| **Business Value** | Overdue inspections are a leading indicator of future failures. This widget enables the Integrity team to prioritise their inspection schedule. |
| **Visualization** | Stacked horizontal bar chart. X-axis = count of overdue assets. Y-axis = station. Bars segmented by overdue severity (0–30 days / 31–90 days / >90 days). |
| **Required Data** | DS-01 (Asset Register), DS-02 (Work Orders), inspection schedules |
| **Drill-Down** | Click any bar → list of specific overdue assets with scheduled date, overdue days, criticality rating, and last inspection result |
| **Refresh** | Daily |

---

### Widget 10 — Open Corrective Actions
| Field | Detail |
|---|---|
| **Purpose** | Track the organisation's ability to close out identified deficiencies — a key governance metric |
| **Business Value** | Unclosed corrective actions represent systemic failure to learn and improve. Regulators specifically examine this during inspections. |
| **Visualization** | Donut chart showing total open CARs segmented by status (Open / In Progress / Overdue). Below the donut: KPI cards for Critical CARs count, Average days open, and CARs closed this month. |
| **Required Data** | DS-07 (Corrective Action Register) |
| **Drill-Down** | Click any segment → filtered table of CARs with source, responsible person, target date, and days overdue |
| **Refresh** | Daily |

---

### Widget 11 — Overdue Preventive Maintenance
| Field | Detail |
|---|---|
| **Purpose** | Highlight maintenance backlog by asset type and station |
| **Business Value** | Deferred maintenance is the leading cause of pipeline equipment failures. Surfacing this at executive level creates accountability for the maintenance function. |
| **Visualization** | Stacked bar chart. X-axis = count of overdue PM work orders. Y-axis = station. Segmented by asset type (Pump / Valve / Compressor / Control System / Cathodic Protection). |
| **Required Data** | DS-02 (CMMS Work Orders) |
| **Drill-Down** | Click → filtered work order list with asset, planned date, overdue days, and assigned technician |
| **Refresh** | Daily |

---

### Widget 12 — Risk Distribution (Risk Matrix)
| Field | Detail |
|---|---|
| **Purpose** | Plot all active non-compliance violations on a likelihood × consequence matrix to show the risk profile of the current compliance state |
| **Business Value** | Converts compliance failures into risk language that executives understand. Allows prioritisation of corrective actions by risk rather than by count. |
| **Visualization** | 5×5 Risk Matrix (likelihood vs. consequence). Each cell coloured by risk level (Green → Yellow → Orange → Red). Dots represent individual non-compliance findings, sized by the number of affected assets. |
| **Required Data** | All active business rule violations, each tagged with a likelihood and consequence rating derived from the rule's severity and asset criticality |
| **Drill-Down** | Click any cell → list of non-compliances in that risk category |
| **Refresh** | Daily |

---

### Widget 13 — AI Recommendations Panel
| Field | Detail |
|---|---|
| **Purpose** | Surface the three most important compliance actions in plain business language, generated by the AI engine based on current data |
| **Business Value** | Reduces cognitive load on executives. Instead of reading through every widget, they receive the top three things that need their attention right now. |
| **Visualization** | Three card-style panels. Each card has: an icon (warning/trend/action), a headline in bold (e.g., "Training compliance at Kisumu Station has fallen 8 points in 14 days"), a 2-sentence explanation, a recommended action, and a "View Details" link. |
| **Required Data** | All KPI scores, trend data, open non-compliances, corrective action register |
| **Drill-Down** | "View Details" links to the relevant drill-down page |
| **Refresh** | Daily (AI model runs overnight) |

---

---

# 6. Drill-Down Experience

## 6.1 Navigation Philosophy

Every number on the executive dashboard is a gateway, not a dead end. The drill-down experience follows the principle of **progressive disclosure** — the user sees a summary first and can always go deeper to the next level of detail. Navigation is always breadcrumb-tracked so users can return to any level instantly.

The seven-level navigation path applies uniformly across all compliance domains.

---

## 6.2 Full Navigation Flow

```
LEVEL 1: Overall Compliance Score
         [Dashboard — OCS Gauge + 4 Domain Gauges]
                │
                ▼ Click domain gauge or "View Domain"
LEVEL 2: Compliance Domain View
         [Domain Score + 4 Indicator Gauges + Domain Trend Line]
                │
                ▼ Click indicator gauge or "View Indicator"
LEVEL 3: Compliance Indicator Detail
         [Indicator Score + Formula display + Contributing records list
          + Threshold bands + Period comparison + Business rule fired]
                │
                ▼ Click any non-compliant record row
LEVEL 4: Affected Asset Profile
         [Asset card: Name / Location / Criticality / Last Inspection /
          All open non-compliances / PM status / Corrosion status / PTW history]
                │
                ▼ Click "View Evidence"
LEVEL 5: Evidence Record
         [Source record: Work order / Observation / Sample result / SCADA log
          with full field display, timestamps, responsible person, attachments]
                │
                ▼ Click "View Corrective Action" or "Raise CAR"
LEVEL 6: Corrective Action
         [CAR detail: Description / Source finding / Responsible person /
          Target date / Status / Evidence of closure / Escalation history]
                │
                ▼ Click "View Asset History" or "View Trend"
LEVEL 7: Historical Trend
         [Asset-level compliance trend over 12 months: score / violations /
          inspections / maintenance completions — full audit trail]
```

---

## 6.3 Level-by-Level Design

### Level 1 — Overall Compliance Score (Executive Dashboard)

The entry point. Described in full in Section 5.

**Navigation triggers:**
- Click any domain gauge → Level 2 for that domain
- Click "Top Non-Compliant Assets" row → Level 4 for that asset
- Click heat map station → Level 2 filtered to that station
- Click AI recommendation "View Details" → deepest relevant level

---

### Level 2 — Compliance Domain View

**Layout:**
```
Breadcrumb: Dashboard > [Domain Name]

[Domain Score Gauge — large]   [Period selector]   [Station filter]

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Indicator 1  │ Indicator 2  │ Indicator 3  │ Indicator 4  │
│ 🟡 82.4%    │ 🟢 94.1%    │ 🔴 71.2%    │ 🟢 91.8%    │
│ [Gauge]      │ [Gauge]      │ [Gauge]      │ [Gauge]      │
└──────────────┴──────────────┴──────────────┴──────────────┘

[Domain 12-week trend line — all 4 indicators + domain average]

[Non-compliant records for this domain — sortable table]
Columns: Asset / Station / Indicator / Rule Violated / Severity / Days Open
```

**Navigation:** Click indicator gauge → Level 3 for that indicator.

---

### Level 3 — Compliance Indicator Detail

**Layout:**
```
Breadcrumb: Dashboard > [Domain] > [Indicator Name]

[Indicator Score Gauge]  [Formula used]  [Threshold: Green/Amber/Red]

[Period breakdown — bar chart showing score per week for last 12 weeks]

[Full list of non-compliant records contributing to this indicator]
Columns: Record ID / Asset / Station / Violation Description / Date / Severity / Status

[Data quality note: X records excluded from calculation due to missing fields]
```

**Navigation:** Click any record row → Level 4 for that asset.

---

### Level 4 — Affected Asset Profile

**Layout:**
```
Breadcrumb: Dashboard > [Domain] > [Indicator] > [Asset Name]

┌──────────────────────────────────────────────────┐
│ Asset: [Name]     Type: [Type]    Criticality: 🔴 HIGH │
│ Station: [Name]   Segment: [ID]   Installed: [Date]    │
│ Design Life: [X years]   Remaining Life: [Y years]     │
└──────────────────────────────────────────────────┘

COMPLIANCE SUMMARY FOR THIS ASSET:
┌────────────────────┬───────┬──────────────────────────┐
│ Domain             │ Score │ Open Non-Compliances      │
├────────────────────┼───────┼──────────────────────────┤
│ Safety             │ 🟢 96%│ 0                         │
│ Asset Integrity    │ 🔴 65%│ 3 (2 inspection overdue)  │
│ Environmental      │ 🟡 82%│ 1 (water sample exceeded) │
│ Regulatory         │ 🟢 90%│ 0                         │
└────────────────────┴───────┴──────────────────────────┘

[Tabs: Open Findings | PM History | Inspection History | Incident History | Corrective Actions]
```

**Navigation:** Click any finding row → Level 5. Click "View Corrective Action" → Level 6.

---

### Level 5 — Evidence Record

Full display of the source data record (work order, observation sheet, sample result, SCADA event) with all fields visible. Supports document attachments (PDFs of inspection reports, lab certificates, photos).

**Key elements:**
- Record ID and source system
- All data fields with values
- Timestamps (created, modified, closed)
- Responsible person with contact info
- Linked asset, station, and segment
- Attachments viewer
- "Raise CAR" button (if no CAR exists yet)
- "View Existing CAR" button (if CAR already raised)

---

### Level 6 — Corrective Action Detail

Full CAR record with complete workflow history.

**Key elements:**
- CAR ID and source (audit/incident/observation)
- Finding description
- Responsible person and department
- Target date and days remaining (or overdue in red)
- Action steps taken (timestamped log)
- Evidence of closure (attachments)
- Escalation history
- Status timeline (Open → In Progress → Closed)
- "Escalate" button for overdue CARs

---

### Level 7 — Historical Trend

Asset-level performance chart over the last 12 months.

**Displays:**
- Monthly compliance score for this asset across all domains
- Inspection events (green markers on timeline)
- Incident events (red markers on timeline)
- Maintenance completions (blue markers)
- CAR opens and closures
- Any period of system unavailability (for SCADA-linked assets)

This is the complete audit trail that proves due diligence and is exportable as a PDF for regulatory submissions.

---

---

# 7. Actionable Insights Framework

## 7.1 Design Principle

Every compliance indicator must generate actionable intelligence, not just a number. This section defines, for each of the 16 indicators, the possible causes of non-compliance, the business impact, the risk level, the recommended corrective action, the responsible department, and the expected improvement timeline.

---

## 7.2 Safety Compliance Insights

### Insight-S01: PPE Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Inadequate PPE stock (wrong sizes, worn-out equipment); supervisors not enforcing requirements; workers unaware of zone-specific PPE requirements; heat stress causing workers to remove PPE; inadequate safety culture |
| **Business Impact** | Direct injury risk; OSHA 2007 Section 13 violation; personal liability for site supervisors; potential fatality leading to coroner inquest and criminal prosecution |
| **Risk Level** | High |
| **Recommended Action** | Audit PPE stock and reorder within 48 hours; conduct targeted observation blitz for 2 weeks; activate Stop-Work Authority if repeated critical violations; run PPE awareness toolbox talk |
| **Responsible Department** | HSE Department + Station Operations Manager |
| **Expected Improvement** | Score improvement of 8–12 points within 3 weeks with consistent enforcement |

---

### Insight-S02: Training Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Training not scheduled despite expiry approaching; high contractor turnover creating onboarding backlog; LMS not sending expiry notifications; training budget frozen; operations refusing to release staff for training |
| **Business Impact** | Increased probability of procedural errors; OSHA Section 6 violation; insurance invalidation if an incident involves an untrained worker; regulatory enforcement |
| **Risk Level** | High |
| **Recommended Action** | Generate training gap report by individual; schedule sessions within 14 days; restrict untrained personnel from safety-critical tasks immediately; resolve LMS notification settings |
| **Responsible Department** | HR / Training + HSE Department |
| **Expected Improvement** | 10–15 point improvement within 4 weeks if resources committed |

---

### Insight-S03: PTW Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Pressure to complete work quickly bypassing controls; PTW system not accessible in the field; supervisors approving work informally; inadequate understanding of which activities require a PTW; paper PTW system causing administrative delays |
| **Business Impact** | Catastrophic incident risk (explosion, fatality); OSHA criminal liability; regulatory shutdown of operations; insurance void; reputational damage |
| **Risk Level** | Critical |
| **Recommended Action** | Immediate stop-work on all open non-PTW activities; mandatory re-briefing of PTW procedure for all supervisors; consider digital PTW system implementation; disciplinary process for bypass of controls |
| **Responsible Department** | Operations + HSE Department |
| **Expected Improvement** | Should reach 100% compliance within 2 weeks — this is non-negotiable |

---

### Insight-S04: Incident Reporting Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Fear of blame or disciplinary action; normalisation of minor incidents ("it happens all the time"); inadequate reporting channels; supervisors discouraging reporting to protect station statistics; workers unaware of reporting obligation |
| **Business Impact** | Loss of learning opportunities; hidden incident rate understating true risk; OSHA Section 49 offence (failure to report dangerous occurrence); regulatory compliance exposure |
| **Risk Level** | High |
| **Recommended Action** | Reinforce no-blame reporting culture at management level; simplify reporting process (mobile app, QR code); conduct anonymous survey to understand barriers; management visibly act on reported incidents |
| **Responsible Department** | HSE Department + Executive Management |
| **Expected Improvement** | Significant improvement within 6 weeks if culture is addressed; quick win in 2 weeks if process barriers are removed |

---

## 7.3 Environmental Compliance Insights

### Insight-E01: Water Quality Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Undetected hydrocarbon leak contaminating drainage; wash-down water not passing through oil/water separator; separator not functioning correctly; heavy rainfall causing runoff from contaminated areas; third-party activity upstream |
| **Business Impact** | NEMA enforcement notice; potential prosecution under Water Act 2016; community protests near water sources; EPRA licence review; clean-up costs |
| **Risk Level** | High |
| **Recommended Action** | Identify and isolate contamination source; inspect oil/water separator for functionality; take additional confirmatory samples; notify NEMA within 24 hours if limit exceeded significantly; commence remediation plan |
| **Responsible Department** | Environmental + Asset Integrity |
| **Expected Improvement** | Depends on source — separator repair: 2 weeks; leak remediation: 4–8 weeks |

---

### Insight-E02: Air Quality Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Venting from tanks during product transfer exceeding permit; pump engine emissions from poorly maintained engines; fugitive emissions from valve gland packing; flaring event; diesel generator operating beyond normal duration |
| **Business Impact** | NEMA air quality exceedance notice; community health complaints; potential EPRA operational restriction |
| **Risk Level** | High |
| **Recommended Action** | Identify emission source from monitoring network; check equipment maintenance status; review operational procedures for transfers; consider vapour recovery unit maintenance |
| **Responsible Department** | Environmental + Maintenance |
| **Expected Improvement** | 4–8 weeks depending on root cause |

---

### Insight-E03: Waste Management Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Contractor licence expired without renewal check; disposal certificate not obtained after waste handover; waste held on-site beyond regulatory storage period; hazardous waste mixed with general waste; informal disposal by station staff |
| **Business Impact** | NEMA enforcement; criminal liability for Environmental Officer; clean-up costs; reputational damage |
| **Risk Level** | High |
| **Recommended Action** | Verify all current contractor licences immediately; chase missing disposal certificates; conduct waste storage audit; provide refresher training on waste segregation |
| **Responsible Department** | Environmental + Station Operations |
| **Expected Improvement** | 3–4 weeks to regularise documentation; immediate for behavioural issues |

---

### Insight-E04: Spill Response Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Emergency response team not on standby; spill containment equipment not pre-positioned; delay in detecting spill (leak detection gap); SCADA-to-emergency notification not integrated; response drills insufficient |
| **Business Impact** | Greater environmental damage per spill event; NEMA enforcement for inadequate response; clean-up costs proportional to response delay; community relations damage |
| **Risk Level** | Critical |
| **Recommended Action** | Review emergency response plan and on-call roster; verify spill kit locations and quantities; conduct unannounced spill response drill within 30 days; integrate SCADA spill alarm with emergency notification |
| **Responsible Department** | Emergency Response Team + Environmental + SCADA Operations |
| **Expected Improvement** | Drill-based improvement achievable within 6 weeks |

---

## 7.4 Asset Integrity Compliance Insights

### Insight-A01: Inspection Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Inspection team understaffed; inspection access blocked by operations schedule; inspection equipment unavailable; prioritisation of corrective maintenance over planned inspections; budget constraints |
| **Business Impact** | Undetected degradation leading to potential pipeline failure; API 570 deviation; Energy Act 2019 non-compliance; escalating repair costs when failures eventually occur |
| **Risk Level** | Critical |
| **Recommended Action** | Generate priority inspection list by criticality; mobilise additional inspection resources; negotiate with operations for access windows; escalate budget constraint to executive level |
| **Responsible Department** | Asset Integrity + Operations |
| **Expected Improvement** | High-criticality backlog clearable in 4–6 weeks with dedicated resources |

---

### Insight-A02: Preventive Maintenance Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Maintenance workforce shortage; parts and materials not available; operations refusing to release equipment; maintenance planning not generating work orders on time; competing corrective maintenance demand |
| **Business Impact** | Increased unplanned failures; higher emergency maintenance costs; reduced equipment availability; safety incidents from failed equipment |
| **Risk Level** | High |
| **Recommended Action** | Review maintenance backlog prioritisation; resolve spares stockout; escalate resource conflict between corrective and preventive maintenance; implement predictive maintenance for highest-criticality assets |
| **Responsible Department** | Maintenance + Operations + Procurement |
| **Expected Improvement** | 8–12 point improvement in 2 months with resource commitment |

---

### Insight-A03: Corrosion Monitoring Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Corrosion monitoring programme not resourced; monitoring points not physically accessible; data not being entered into the system after field readings; CP system malfunction creating accelerated corrosion not detected |
| **Business Impact** | Undetected wall-loss leading to leak or rupture; safety and environmental incident; EPRA pipeline integrity audit findings |
| **Risk Level** | Critical |
| **Recommended Action** | Dispatch corrosion technician to overdue monitoring points; verify CP system functionality; review monitoring point accessibility; integrate field readings into digital system in real time |
| **Responsible Department** | Asset Integrity / Corrosion Engineering |
| **Expected Improvement** | Coverage improvement in 4–6 weeks; CP repairs may take 8–12 weeks |

---

### Insight-A04: Leak Detection System Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | SCADA server downtime; communication link failure between field RTUs and control centre; CPM software configuration error; power supply issues at remote stations; maintenance activity causing planned outage without mitigation |
| **Business Impact** | Period of undetected release risk; Energy Act violation; insurance implications; EPRA reporting obligation |
| **Risk Level** | Critical |
| **Recommended Action** | Immediate SCADA/instrumentation engineer response; manual pipeline patrol during downtime; investigate and resolve root cause; implement redundancy for communication links on critical segments |
| **Responsible Department** | SCADA Operations + ICT |
| **Expected Improvement** | System restoration within SLA (typically 4 hours); root cause resolution within 2 weeks |

---

## 7.5 Regulatory Compliance Insights

### Insight-R01: Audit Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Lead auditor unavailable; site access refused; audit resources reallocated to incident investigation; audit plan not reviewed since year-start; external regulator rescheduled without KPC updating its calendar |
| **Business Impact** | Gap in compliance assurance; regulatory embarrassment if overdue when inspected; accumulation of unidentified deficiencies |
| **Risk Level** | High |
| **Recommended Action** | Reschedule immediately; ensure external audits are given priority in resource planning; assign backup lead auditors |
| **Responsible Department** | HSE Compliance |
| **Expected Improvement** | All overdue audits resolvable within 4 weeks |

---

### Insight-R02: Corrective Action Overdue

| Field | Detail |
|---|---|
| **Possible Causes** | Responsible person changed role without transfer of accountability; resource not available to implement action; root cause is more complex than originally assessed; management not prioritising closure; evidence of closure not documented properly |
| **Business Impact** | Demonstrates systemic failure to learn; high-profile risk during regulatory inspection; repeat incidents from unclosed findings |
| **Risk Level** | High (Critical if from LTI investigation) |
| **Recommended Action** | Weekly overdue CAR review chaired by HSE Manager; escalate critical CARs to HSE Director; implement CAR dashboard for department heads; consider root cause re-analysis for CARs open > 90 days |
| **Responsible Department** | HSE Department + All Departments |
| **Expected Improvement** | All overdue CARs should be resolved or have approved extensions within 4 weeks |

---

### Insight-R03: Regulatory Reporting Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | Reporting calendar not maintained; responsible person unaware of due date; data not available in time; report template not prepared; regulator contact details outdated |
| **Business Impact** | Regulatory fine; increased scrutiny in future inspections; potential licence condition breach |
| **Risk Level** | High |
| **Recommended Action** | Submit immediately with cover note; implement automated reminders 30/14/7/1 days before each due date; designate backup reporting officer |
| **Responsible Department** | Legal & Regulatory Affairs + HSE |
| **Expected Improvement** | Immediate fix for pending reports; systemic improvement within 1 reporting cycle |

---

### Insight-R04: SOP Non-Compliance

| Field | Detail |
|---|---|
| **Possible Causes** | SOP outdated and no longer reflects actual practice; workers not aware of latest SOP version; SOPs too complex or impractical; no consequence for deviation; supervisors modelling non-compliant behaviour |
| **Business Impact** | Inconsistent operational performance; incident risk from improvised procedures; difficulty defending KPC in legal proceedings without demonstrated SOP adherence |
| **Risk Level** | High |
| **Recommended Action** | Review SOP for practical applicability; conduct targeted SOP awareness training; supervisor accountability for team adherence; increase observation frequency for non-compliant activities |
| **Responsible Department** | Operations + HSE Department |
| **Expected Improvement** | 6–10 point improvement within 6 weeks with active supervision |

---

---

# 8. AI Executive Decision Support Panel

## 8.1 Design Purpose

The AI Executive Decision Support Panel transforms raw compliance data into narrative intelligence. It answers the questions that executives actually ask — in plain business language, without requiring them to interpret charts or query data themselves.

The panel is not a chatbot. It is a structured intelligence feed that runs a predefined set of analytical queries each night, generates narrative answers from the results, and presents the most significant findings at the top of the dashboard and available on-demand.

---

## 8.2 Question-Answer Framework

The AI panel is designed around eight executive questions. Each question maps to a specific analytical method and data source set.

---

### Q1: "Why did compliance decrease this week?"

**Analytical Method:**
- Compare this week's OCS and domain scores against last week
- Identify which domains decreased and by how much
- Within declining domains, identify which specific KPIs drove the decrease
- Identify the top 3 business rule violations that fired this week but did not fire last week

**Sample Output:**
> *"Overall compliance fell by 3.2 points this week (from 91.4% to 88.2%), driven primarily by a 7.1-point drop in Asset Integrity Compliance. The decline is attributable to 8 new overdue inspection records at Nairobi West Station and Eldoret Station — 5 of these are pipeline segments classified as High criticality and are now more than 14 days past their required inspection date. Training compliance also declined by 2.3 points following expiry of confined space entry certification for 12 contractors at the Nakuru Depot."*

---

### Q2: "Which assets are contributing most to non-compliance?"

**Analytical Method:**
- Query all active business rule violations grouped by asset_id
- Count violations per asset, weighted by severity
- Rank by weighted violation score
- Cross-reference with asset criticality from Asset Register

**Sample Output:**
> *"Three assets are disproportionately responsible for current non-compliance: (1) Pipeline Segment KPC-NBO-012 [Nairobi–Nakuru corridor] has 4 active violations — 2 overdue inspections, 1 corrosion monitoring point overdue, and 1 PM work order 22 days late. It is a High criticality asset. (2) Pump Unit KPC-ELD-P03 at Eldoret Station has 3 active PM overdue violations and a pending CAR from the March 2026 audit that is 18 days past its target date. (3) Tank TK-MSA-003 at Mombasa has a water quality sample that exceeded NEMA limits last week — the source has not yet been investigated."*

---

### Q3: "Which corrective actions are overdue?"

**Analytical Method:**
- Query CAR register for all records where `status != 'CLOSED' AND target_date < CURRENT_DATE`
- Group by severity, responsible department, and days overdue
- Highlight CARs from LTI investigations and external regulatory inspections as priority

**Sample Output:**
> *"There are currently 14 overdue corrective actions. Of these, 3 are classified Critical — all arising from the Q1 2026 EPRA inspection. The most overdue is CAR-2026-0047 (Calibration of Leak Detection Equipment — Nakuru Station), now 41 days past its 15 June target date. Responsible: Maintenance Department. This action is blocking closure of an EPRA observation and must be prioritised. Additionally, 6 CARs relating to training gaps identified in the February internal audit have not been progressed, with the responsible department (HR) not having updated status in 30 days."*

---

### Q4: "Which pipeline segment presents the highest environmental risk?"

**Analytical Method:**
- Overlay active environmental non-compliances (water quality, spill records) with pipeline GIS data
- Cross-reference with proximity to sensitive receptors (water catchments, populated areas) from environmental sensitivity map
- Combine with asset integrity compliance score for that segment

**Sample Output:**
> *"Pipeline Segment KPC-KSM-007 [Kisumu–Eldoret corridor, KM 34–51] presents the highest current environmental risk. This segment traverses the Nzoia River catchment. There is a water quality exceedance at Kakamega Pump Station immediately downstream, with TPH levels at 1.4× the NEMA discharge limit, and an open CAR for the separator maintenance. The segment's last inspection was 67 days ago against a 60-day interval requirement. Combined, these factors represent an elevated risk of a discharge event with high environmental sensitivity exposure."*

---

### Q5: "Which stations require immediate inspection?"

**Analytical Method:**
- Query all overdue inspections (BR-A01 violations)
- Filter for High and Critical criticality assets
- Sort by days overdue × criticality weight
- Output as prioritised list with station location and recommended inspection type

**Sample Output:**
> *"Four stations require immediate inspection attention: (1) Nairobi West Station — 5 critical-asset inspections overdue, longest overdue by 38 days. (2) Eldoret Station — 3 high-criticality pump unit inspections overdue. (3) Nakuru Station — corrosion monitoring overdue on 4 pipeline segments plus 2 inspection overdue items. (4) Kisumu Station — tank inspection overdue by 22 days. Recommend deploying inspection team to Nairobi West immediately and to Nakuru within 5 working days."*

---

### Q6: "Which compliance area is deteriorating fastest?"

**Analytical Method:**
- Calculate week-on-week change rate for each of the 16 KPIs over the last 6 weeks
- Compute linear regression slope for each indicator's trend
- Rank by steepest negative slope
- Report the top 3 deteriorating indicators with cause analysis

**Sample Output:**
> *"The three fastest-deteriorating compliance indicators are: (1) Training Compliance (KPI-S02): declining at 2.8 points per week for 5 consecutive weeks. Root cause: mass contractor mobilisation at Mombasa Depot without corresponding training onboarding — 34 contractors are currently unqualified for the activities they are performing. (2) Corrosion Monitoring Coverage (KPI-A03): declining at 1.9 points per week. The corrosion technician for the northern corridor has been on leave for 3 weeks and a replacement has not been arranged. (3) Corrective Action Closure (KPI-R02): declining at 1.4 points per week as the Q2 audit actions fall due simultaneously."*

---

### Q7: "What is the current risk to our regulatory licence?"

**Analytical Method:**
- Identify all KPI scores below the Red threshold
- Identify all open CARs from external regulatory bodies (EPRA, NEMA, DOSHS)
- Identify all overdue statutory reports
- Assess combined regulatory exposure

**Sample Output:**
> *"KPC's regulatory risk posture is currently Amber. Regulatory Reporting compliance is at 96.4% — one EPRA monthly operations report was submitted 3 days late last period. There are 3 open EPRA inspection findings that are overdue, which is the most acute regulatory risk. NEMA has one open enforcement notice from the March Kisumu water exceedance — the response plan is in place but closure evidence has not been formally submitted. No regulatory reports are currently pending that are past due date."*

---

### Q8: "What are my top three actions for this week?"

**Analytical Method:**
- Combine all active violations weighted by severity × asset criticality × days overdue
- Group into actionable clusters (single action that resolves multiple violations)
- Write as three specific, time-bound executive directives

**Sample Output:**
> *"Your three highest-priority actions this week are: (1) Direct the Asset Integrity Manager to mobilise an inspection team to Nairobi West Station by Monday — 5 critical asset inspections are overdue, creating a direct pipeline integrity risk. (2) Instruct HR to resolve the contractor training gap at Mombasa Depot within 5 working days — 34 contractors are operating without current certification, representing a potential OSHA 2007 violation. (3) Escalate the closure of CAR-2026-0047 to the Maintenance Superintendent — this is blocking an EPRA finding closure and the target date was missed 41 days ago."*

---

## 8.3 AI Panel Technical Design

The AI panel uses a **template-based narrative generation** engine, not a free-form large language model. This ensures outputs are:
- Auditable (every sentence is traceable to a data query)
- Consistent (same logic applied every day)
- Explainable (the underlying data can be viewed by clicking "Show Data" on any insight card)

**Architecture:**
1. Nightly batch job runs all analytical queries against the compliance database
2. Query results populate predefined narrative templates
3. Significant findings (score drops > 2 points, new critical violations, overdue items crossing severity thresholds) trigger narrative insertion
4. Top 3 findings are ranked by combined impact score and presented as "Priority Insights"
5. All 8 question-answers are available on demand via the "Ask" interface

**Explainability:** Every AI-generated statement has a "Why did I say this?" link that opens the underlying data query and results.

---

---

# 9. Recommended Visualizations

## 9.1 Design Principle

Every visualization is chosen because it matches the cognitive task the user needs to perform at that point — comparing, tracking, locating, prioritising, or understanding proportion. No visualization is chosen for aesthetic reasons.

---

## 9.2 Visualization Catalogue

### VIZ-01: Gauge Chart (Speedometer) — OCS and Domain Scores

**Used For:** Widget 1 (Overall Compliance Score), Widgets 2–5 (Domain Scores)

**Why Appropriate:** The gauge chart is the most effective single-number visualization because it encodes three pieces of information simultaneously — the numeric value, the RAG status (through colour fill), and the direction relative to thresholds. Executives recognise the format immediately. The semicircular layout leaves visual space for the delta indicator (change from prior period) below the needle.

**Design Specification:**
- 0–100% scale
- Green zone: 90–100% (right third)
- Amber zone: 75–89% (middle)
- Red zone: 0–74% (left third)
- Needle position matches current score
- Score number displayed prominently in centre
- Delta displayed below: ▲ +1.2% or ▼ -3.1% (green/red colouring)

---

### VIZ-02: Multi-Line Trend Chart — Compliance Trend Over Time

**Used For:** Widget 6 (Compliance Trend), Level 2/3 Drill-Down Period Chart

**Why Appropriate:** Line charts are the correct choice for continuous time-series data because they make trend direction (rising, falling, flat) and rate of change immediately visible. Multiple lines on one chart allow domain comparison without cluttering. Threshold bands shaded horizontally (green/amber/red) allow immediate recognition of when a domain entered amber or red territory.

**Design Specification:**
- X-axis: Weekly periods (last 12 weeks, configurable to 6 months or 12 months)
- Y-axis: 0–100%, with threshold lines at 75% and 90%
- 5 lines: OCS (thick, dark) + 4 domain lines (distinct colours, thinner)
- Threshold bands as subtle horizontal fills
- Hover tooltip: shows all 5 values for that week
- Annotations: major events (regulatory inspection, incident) as vertical dashed lines

---

### VIZ-03: Ranked Drill-Down Table — Non-Compliant Assets

**Used For:** Widget 7 (Top Non-Compliant Assets), Level 3 (Non-compliant Records List)

**Why Appropriate:** When the user needs to act (dispatch a team, escalate a finding), they need a list they can sort, filter, and export — not a chart. Tables are the right choice here because the actionable unit is the individual record. Row-level RAG colour coding (red rows for critical, amber for high) guides the eye to the most urgent items.

**Design Specification:**
- Columns: Rank / Asset Name / Station / Domain / Rule Violated / Severity / Days Overdue
- Row background: critical = light red, high = light amber, medium = light yellow
- Default sort: severity DESC, days overdue DESC
- Search and column filter available
- "Export to CSV" and "Export to PDF" buttons
- Click any row → Level 4 (Asset Profile)

---

### VIZ-04: Geographic Pipeline Map (Heat Map) — Compliance by Location

**Used For:** Widget 8 (Compliance Heat Map)

**Why Appropriate:** Pipeline compliance has an inherent geographic dimension. Failures affect specific physical locations that field teams must travel to. A map communicates location, connectivity (which segments connect which stations), and compliance status simultaneously — information that a table or chart cannot provide in the same spatial context.

**Design Specification:**
- Base map: KPC pipeline network (Mombasa → Nairobi → Nakuru → Eldoret → Kisumu)
- Pipeline segments coloured by compliance score: Green/Amber/Red
- Station markers: circles sized by count of open non-compliances
- Hover tooltip: station name, OCS score, top non-compliance
- Click station: flies to station compliance card
- Layers toggle: Safety / Environmental / Asset Integrity / Regulatory

---

### VIZ-05: Stacked Horizontal Bar Chart — Overdue Inspections and PM

**Used For:** Widget 9 (Overdue Inspections), Widget 11 (Overdue PM)

**Why Appropriate:** The stacked bar chart is ideal for showing a total count split by sub-categories across multiple stations. The horizontal orientation (with stations on the Y-axis) allows long station names to display clearly. Stacking (by overdue severity band) shows both total backlog volume and the distribution of urgency within it.

**Design Specification:**
- Y-axis: Station names (all active stations)
- X-axis: Count of overdue items
- Stack segments: 0–30 days overdue (amber), 31–90 days (orange), >90 days (red)
- Hover: shows exact count and list of assets for that band
- Sort: total count descending (worst station at top)

---

### VIZ-06: Donut Chart — Corrective Action Status Distribution

**Used For:** Widget 10 (Open Corrective Actions)

**Why Appropriate:** The donut chart is appropriate for showing the proportion of a whole split into mutually exclusive status categories. The central number (total open CARs) provides context. The ring segments show the distribution across Open / In Progress / Overdue states without requiring the user to do mental arithmetic. KPI cards below the donut add the numerically critical counts.

**Design Specification:**
- Segments: Open (blue), In Progress (amber), Overdue (red)
- Central label: total count
- Legend below ring
- Below the donut: three KPI micro-cards: Critical CARs | Avg Days Open | Closed This Month

---

### VIZ-07: Risk Matrix — Compliance Risk Distribution

**Used For:** Widget 12 (Risk Distribution)

**Why Appropriate:** The risk matrix is the universal risk communication tool in HSE. It maps findings onto a grid that executives already understand from risk register reviews. It communicates both the number of findings and their risk severity in two dimensions, enabling risk-based prioritisation that a simple count cannot provide.

**Design Specification:**
- 5×5 matrix (Likelihood: Rare → Almost Certain; Consequence: Insignificant → Catastrophic)
- Cells coloured: Green (low) → Yellow (medium) → Orange (high) → Red (very high/extreme)
- Dots plotted per cell: each dot = one active non-compliance violation
- Dot size: proportional to number of assets affected
- Hover: lists the violations in that risk cell
- Click cell: opens filtered violation list

---

### VIZ-08: KPI Cards — Micro-Metric Display

**Used For:** Supplementary metrics across dashboard and drill-down pages

**Why Appropriate:** KPI cards (also called "scorecard tiles" or "metric cards") are the right choice for single important numbers that need to be read quickly alongside other information. They avoid the cognitive overhead of a chart for a value that speaks for itself.

**Recommended KPI Cards:**
| Card | Value | Context Indicator |
|---|---|---|
| Critical CARs Open | Count | ▲/▼ vs last month |
| Inspections Overdue | Count | Broken down by criticality |
| Regulatory Reports Due (30 days) | Count | Days to next submission |
| Leak Detection Uptime | % (last 30 days) | Target: 99% |
| Training Expiring (14 days) | Count | Names available on click |
| PTW Compliance (This Week) | % | RAG colour |

---

### VIZ-09: Compliance Tree / Hierarchy Map

**Used For:** Module overview, Level 1 navigation aid

**Why Appropriate:** The compliance tree visualises the entire hierarchy — OCS → Domains → Indicators — as an interactive collapsible tree. It gives users a mental model of how the score is built and allows navigation by clicking any node. The colour of each node reflects its RAG status, making the full compliance picture scannable in one view.

**Design Specification:**
- Root node: OCS (large circle, colour = RAG status)
- Four branch nodes: Domains (medium circles)
- Sixteen leaf nodes: Indicators (small circles)
- Lines between nodes weighted by the indicator's contribution weight
- Click any node: navigates to that level's detail page
- Optional: shown as sunburst chart alternatively (OCS at centre, domains in middle ring, indicators in outer ring)

---

### VIZ-10: Sankey Diagram — Compliance Score Flow

**Used For:** Executive presentation / explanation view

**Why Appropriate:** The Sankey diagram shows how the OCS score is built from domains and indicators in proportion to their weights. It makes the weighting model visually transparent — executives can see that if PTW compliance (30% of Safety × 30% of OCS = 9% of total) drops significantly, the flow to the OCS narrows. This is used for explaining the scoring model to non-technical stakeholders.

**Design Specification:**
- Left column: 16 indicators
- Middle column: 4 domains (flow width proportional to weighted score contribution)
- Right column: OCS
- Flow colours: Green/Amber/Red based on score
- Hover: shows score, weight, and contribution to OCS

---

### VIZ-11: Heatmap Table — Station × KPI Performance Grid

**Used For:** Station comparison view (accessible from drill-down Level 2)

**Why Appropriate:** When comparing multiple stations across multiple KPIs simultaneously, a heatmap table is more information-dense than individual charts per station. It allows pattern recognition across both axes — a column that is all red identifies a systemic KPI problem; a row that is all red identifies a failing station.

**Design Specification:**
- Rows: Stations (all KPC stations)
- Columns: 16 KPI indicators (grouped by domain)
- Cell colour: RAG based on KPI score at that station
- Cell value: numeric score (optional toggle)
- Click cell: navigates to Level 3 for that station + indicator combination

---

---

# 10. Future-Proof Architecture

## 10.1 Design Philosophy

The Compliance Intelligence Module is built on the principle that **compliance requirements change but the architecture should not**. New regulations are enacted, KPIs are redefined, weightings are adjusted after board review, and new compliance domains (e.g., social compliance, cyber security) emerge over time. None of these changes should require a developer to modify application code.

The architecture separates three layers that change at different rates:

| Layer | Change Frequency | Managed By |
|---|---|---|
| **Data Layer** (source systems, data pipelines) | Infrequent | Data Engineering Team |
| **Configuration Layer** (rules, weights, thresholds, domains) | Regular (quarterly, annually) | HSE Compliance Administrator |
| **Presentation Layer** (dashboards, reports, drill-downs) | Occasional | BI / Frontend Team |

---

## 10.2 Core Architectural Components

### Component 1 — Compliance Configuration Store

A database-driven configuration store that defines all compliance rules, weights, and thresholds as data, not code.

```sql
-- Domain Configuration Table
CREATE TABLE compliance_domains (
    domain_id       VARCHAR(10) PRIMARY KEY,  -- e.g. 'SCD'
    domain_name     VARCHAR(100),
    domain_weight   DECIMAL(5,4),             -- e.g. 0.3000
    is_active       BOOLEAN DEFAULT TRUE,
    created_by      VARCHAR(50),
    created_date    TIMESTAMP,
    version         INT
);

-- Indicator Configuration Table
CREATE TABLE compliance_indicators (
    indicator_id        VARCHAR(10) PRIMARY KEY,  -- e.g. 'PCI'
    indicator_name      VARCHAR(100),
    domain_id           VARCHAR(10) REFERENCES compliance_domains(domain_id),
    indicator_weight    DECIMAL(5,4),             -- weight within domain
    green_threshold     DECIMAL(5,2),
    amber_threshold     DECIMAL(5,2),
    red_threshold       DECIMAL(5,2),
    formula_ref         VARCHAR(50),              -- reference to calculation function
    data_source_ids     TEXT[],                   -- array of DS-xx references
    is_active           BOOLEAN DEFAULT TRUE,
    effective_from      DATE,
    effective_to        DATE,                     -- NULL = currently active
    version             INT
);

-- Business Rule Configuration Table
CREATE TABLE compliance_rules (
    rule_id             VARCHAR(10) PRIMARY KEY,
    rule_name           VARCHAR(200),
    indicator_id        VARCHAR(10) REFERENCES compliance_indicators(indicator_id),
    rule_query_ref      VARCHAR(100),    -- reference to the stored procedure/view
    violation_condition TEXT,
    severity            VARCHAR(20),    -- LOW/MEDIUM/HIGH/CRITICAL
    recommended_action  TEXT,
    evaluation_schedule VARCHAR(50),    -- REALTIME/DAILY/WEEKLY/MONTHLY
    is_active           BOOLEAN DEFAULT TRUE,
    regulatory_basis    VARCHAR(200),
    version             INT
);
```

**What this enables:**
- A new regulation is added by inserting a new domain record and indicator records — no code change required
- Weightings can be adjusted by updating `domain_weight` or `indicator_weight` — the scoring engine reads these dynamically
- A KPI can be deactivated (`is_active = FALSE`) during a period of data unavailability without removing it
- Weight changes are versioned so historical scores remain reproducible at their original weights

---

### Component 2 — Dynamic Scoring Engine

A calculation service that reads from the Configuration Store and computes scores at runtime.

```
Scoring Engine Flow:
1. Read active domains and weights from compliance_domains
2. For each domain, read active indicators and their weights
3. For each indicator, execute the formula_ref calculation function
4. Apply weighted average to compute domain score
5. Apply domain weights to compute OCS
6. Write results to compliance_scores table with timestamp and config_version
7. Persist all input records used for traceability
```

**Key properties:**
- **Config-version-stamped**: Every score record stores the configuration version used, enabling historical score recalculation with any past or present weighting scheme
- **Incremental**: Only recalculates indicators whose source data has changed since last run
- **Explainable**: Every score is linked to the specific records that contributed to it

---

### Component 3 — Rule Engine (Configurable Business Rules)

Business rules are stored as configuration references to calculation functions (stored procedures or views). Adding a new rule requires:
1. Writing a new SQL view or function implementing the rule logic
2. Registering it in `compliance_rules` with its `rule_query_ref`
3. Associating it with the relevant indicator

No changes to application code are required. The rule engine discovers and executes all active rules by querying `compliance_rules` where `is_active = TRUE`.

---

### Component 4 — Threshold Management Interface

A web-based admin interface accessible to the HSE Compliance Administrator that allows:
- Viewing and editing all thresholds (green/amber/red) for every indicator
- Adjusting domain and indicator weights
- Activating and deactivating compliance rules
- Setting effective dates for configuration changes (future-dated configurations for new regulations)
- Full audit trail: every configuration change is logged with who made it, when, and what the previous value was

**Access Control:**
- View only: All dashboard users
- Edit thresholds: HSE Compliance Administrator
- Edit weights: HSE Director (approval required)
- Add new domains/indicators: System Administrator + HSE Director approval

---

### Component 5 — Compliance Data Pipeline

A data integration layer that ingests from all source systems (DS-01 to DS-16) into a centralised Compliance Analytics Database.

```
Source Systems                    Integration Layer              Compliance Database
───────────────                   ─────────────────              ───────────────────
CMMS (Maximo/SAP) ──────────────► ETL / Data Pipeline ────────► compliance_raw_data
LMS ─────────────────────────────►  (Scheduled jobs +  ────────► compliance_scores
SCADA / Historian ───────────────►   real-time events) ────────► compliance_violations
HSE Mgmt System ─────────────────►                     ────────► compliance_trends
Environmental LIMS ──────────────►                     ────────► audit_trail
```

**Data quality gate:** Every inbound record passes validation rules (completeness, range, consistency) before entering the compliance database. Records failing validation are quarantined and flagged on a Data Quality Dashboard — they do not silently distort KPI calculations.

---

### Component 6 — Modular Dashboard Framework

The front-end is built on a widget-registry pattern. Each dashboard widget is a self-contained component registered in a widget catalogue. New KPIs and domains automatically generate new widgets through configuration, not code.

```
Widget Registry:
{
  widget_id: "DOMAIN_GAUGE",
  template: "gauge_chart",
  data_binding: "compliance_scores.domain_score",
  config_params: ["domain_id", "period", "station_filter"]
}
```

When a new compliance domain is added to the Configuration Store, the dashboard framework automatically includes it in the domain gauge row and the compliance tree — zero front-end development required.

---

## 10.3 Future Expansion Scenarios

### Scenario A: New Regulation Added
*Example: Government introduces Hydrogen Safety regulations as KPC transitions to hydrogen blending.*

**Steps required:**
1. HSE Administrator creates new domain: "Hydrogen Safety Compliance" in `compliance_domains`
2. HSE Administrator defines new indicators in `compliance_indicators` with weights and thresholds
3. Data engineer creates new data source connection (DS-17: Hydrogen Monitoring Records)
4. Data engineer writes SQL views for each new business rule and registers in `compliance_rules`
5. HSE Director reviews and approves configuration via admin interface

**Code changes required:** Zero (only configuration and SQL view additions)

---

### Scenario B: Weighting Review After Board Decision
*Example: Board decides to increase Environmental weight from 25% to 30% following a major spill incident industry-wide.*

**Steps required:**
1. HSE Director logs into admin interface
2. Updates `domain_weight` for ECD from 0.25 to 0.30 and SCD from 0.30 to 0.25 (weights must sum to 1.00)
3. Adds a future effective date if the change takes effect from next quarter
4. System logs the change with full audit trail
5. Scoring engine applies new weights from effective date forward; historical scores remain at original weights

**Code changes required:** Zero

---

### Scenario C: New Compliance Category (Social Compliance)
*Example: KPC introduces a Social Impact compliance domain to measure community engagement, local procurement, and grievance management.*

**Steps required:**
1. Identify data sources (Community Relations register, procurement records)
2. Register new domain and indicators in configuration store
3. Integrate data sources through the data pipeline
4. Write business rule SQL views
5. Domain automatically appears in dashboard, drill-down, and trend charts

**Code changes required:** Zero (new data pipeline connections are configuration-level additions)

---

## 10.4 Technology Stack Recommendations

| Layer | Recommended Technology | Rationale |
|---|---|---|
| Compliance Database | PostgreSQL or SQL Server | Mature, reliable, supports complex analytical queries |
| Data Pipeline | Apache Airflow (orchestration) + Python / dbt (transformation) | Industry standard for scheduled ETL; dbt enables version-controlled SQL transformations |
| Scoring Engine | Python (FastAPI service) or PL/pgSQL stored procedures | Maintainable, testable, configuration-driven |
| Dashboard/Frontend | Apache Superset or Power BI Embedded or custom React app | Superset recommended for full configurability; Power BI for faster deployment |
| Geographic Map | Leaflet.js or Mapbox GL | Open-source, supports custom pipeline layers |
| Admin Interface | React + REST API | Web-based, role-controlled configuration management |
| Authentication | KPC's existing Active Directory / SSO | Integrate rather than rebuild access control |
| Audit Trail | Immutable append-only log table or dedicated audit schema | Required for regulatory defensibility |

---

## 10.5 Governance Model

| Role | Responsibilities |
|---|---|
| **HSE Director** | Approves domain weights, reviews OCS monthly, signs off on architectural changes |
| **HSE Compliance Administrator** | Manages KPI thresholds, activates/deactivates rules, monitors data quality, onboards new compliance requirements |
| **Data Engineer** | Maintains data pipelines, writes new rule SQL views, manages source system integrations |
| **System Administrator** | Manages user access, server infrastructure, database backups |
| **Dashboard Users** | Read-only access to dashboards and drill-downs; can export data for their scope |

---

## 10.6 Compliance Intelligence Module — Summary Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                                │
│  Executive Dashboard │ Drill-Down Views │ AI Insights │ Admin UI    │
└─────────────────────────────┬───────────────────────────────────────┘
                               │
┌─────────────────────────────▼───────────────────────────────────────┐
│                    APPLICATION LAYER                                 │
│  Scoring Engine │ Rule Engine │ AI Narrative Engine │ Report Engine │
└─────────────────────────────┬───────────────────────────────────────┘
                               │
┌─────────────────────────────▼───────────────────────────────────────┐
│                 COMPLIANCE CONFIGURATION STORE                       │
│  Domains │ Indicators │ Weights │ Thresholds │ Rules │ Audit Log    │
└─────────────────────────────┬───────────────────────────────────────┘
                               │
┌─────────────────────────────▼───────────────────────────────────────┐
│                   COMPLIANCE ANALYTICS DATABASE                      │
│  Raw Data │ Scores │ Violations │ Trends │ Evidence Links            │
└─────────────────────────────┬───────────────────────────────────────┘
                               │
┌─────────────────────────────▼───────────────────────────────────────┐
│                      DATA PIPELINE LAYER                             │
│  ETL Jobs │ Data Quality Gate │ Real-time Event Consumers           │
└─────────────────────────────┬───────────────────────────────────────┘
                               │
┌──────────┬────────┬──────────┼──────────┬───────────┬──────────────┐
│  CMMS    │  LMS   │  SCADA   │  HSE Sys │  Env LIMS │  Other DS    │
│ (DS-01/2)│ (DS-04)│ (DS-08)  │ (DS-03/  │ (DS-11/12)│  (DS-09 to  │
│          │        │          │  06/07)  │           │   DS-16)     │
└──────────┴────────┴──────────┴──────────┴───────────┴──────────────┘
```

---

# Appendix: Quick Reference

## Compliance Scoring Formula Summary

```
OCS  = (SCD × 0.30) + (ECD × 0.25) + (AICD × 0.25) + (RCD × 0.20)

SCD  = (PCI × 0.25) + (TCI × 0.30) + (PTWCI × 0.30) + (IRCI × 0.15)
ECD  = (WQCI × 0.25) + (AQCI × 0.20) + (WMCI × 0.30) + (SRCI × 0.25)
AICD = (ICI × 0.30) + (PMCI × 0.30) + (CMCI × 0.20) + (LDCI × 0.20)
RCD  = (ACI × 0.25) + (CACI × 0.30) + (RRI × 0.25) + (SOPCI × 0.20)
```

## KPI Indicator Quick Reference

| ID | Name | Domain | Type | Green |
|---|---|---|---|---|
| PCI | PPE Compliance | Safety | Leading | ≥95% |
| TCI | Training Compliance | Safety | Leading | ≥90% |
| PTWCI | Permit-to-Work Compliance | Safety | Leading | ≥98% |
| IRCI | Incident Reporting Timeliness | Safety | Lagging | ≥95% |
| WQCI | Water Quality Compliance | Environmental | Mixed | ≥95% |
| AQCI | Air Quality Compliance | Environmental | Mixed | ≥95% |
| WMCI | Waste Management Compliance | Environmental | Leading | ≥90% |
| SRCI | Spill Response Compliance | Environmental | Lagging | ≥95% |
| ICI | Inspection Compliance | Asset Integrity | Leading | ≥95% |
| PMCI | Preventive Maintenance Compliance | Asset Integrity | Leading | ≥90% |
| CMCI | Corrosion Monitoring Coverage | Asset Integrity | Leading | ≥90% |
| LDCI | Leak Detection Availability | Asset Integrity | Leading | ≥99% |
| ACI | Audit Completion Rate | Regulatory | Lagging | ≥95% |
| CACI | Corrective Action Closure | Regulatory | Lagging | ≥90% |
| RRI | Regulatory Reporting | Regulatory | Lagging | 100% |
| SOPCI | SOP Adherence | Regulatory | Mixed | ≥90% |

## Business Rule Quick Reference

| Rule ID | Name | KPI | Severity | Frequency |
|---|---|---|---|---|
| BR-S01 | PPE Observation | PCI | High | Daily |
| BR-S02 | Training Currency | TCI | High | Daily |
| BR-S03 | PTW Authorisation | PTWCI | Critical | Real-time |
| BR-S04 | Incident Timeliness | IRCI | High | Daily |
| BR-E01 | Water Discharge Limits | WQCI | High | Per-sample |
| BR-E02 | Air Emissions Limits | AQCI | High | Continuous |
| BR-E03 | Waste Documentation | WMCI | High | Daily |
| BR-E04 | Spill Response Time | SRCI | Critical | Per-event |
| BR-A01 | Overdue Inspection | ICI | Critical | Daily |
| BR-A02 | PM Schedule Adherence | PMCI | High | Daily |
| BR-A03 | Corrosion Point Coverage | CMCI | Critical | Daily |
| BR-A04 | Leak Detection Uptime | LDCI | Critical | Real-time |
| BR-R01 | Audit Completion | ACI | High | Daily |
| BR-R02 | CAR Overdue | CACI | High | Daily |
| BR-R03 | Regulatory Report Submission | RRI | Critical | Daily |
| BR-R04 | SOP Observation | SOPCI | High | Daily |

---

*End of Document — KPC HSE Compliance Intelligence Module Enterprise Design Framework v1.0*
*Kenya Pipeline Company | HSE Proactive Analytics Platform*
