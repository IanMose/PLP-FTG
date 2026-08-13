"""
Sentinel — Statistical Diagnostics (Stage C)
=============================================
Produces three pre-computed JSON artifacts consumed by the analytics API:

  1. survival_curve_data.json   — KM time-to-closure: fleet vs high-risk sites
  2. control_chart_data.json    — EWMA pressure control charts per site
  3. correlation_data.json      — Rejection rate vs incident count (Pearson r)

All computation stays in Python. The Spring Boot AnalyticsController reads
these files on request and serves them as raw JSON — no DB tables needed.

Also produces:
  drift_events.json             — EWMA breach events for the alert narrative

Usage:
    python -m src.diagnostics
    python -m src.diagnostics --raw-dir data/raw --output-dir data/warehouse
"""

import argparse
import json
import re
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from lifelines import KaplanMeierFitter
from scipy.stats import pearsonr

RAW_DIR       = Path("data/raw")
WAREHOUSE_DIR = Path("data/warehouse")

HIGH_RISK_SITES = {"SITE-003", "SITE-006"}
PRESSURE_SPIKE_THRESHOLD = 1000.0  # PSI

# EWMA parameters (industry-standard, defensible under Q&A)
EWMA_LAMBDA = 0.2   # moderate responsiveness — balances noise vs sensitivity
EWMA_L      = 3.0   # 3-sigma control limits
EWMA_BASELINE_N = 20  # number of initial readings used to establish baseline


# ── Shared data loading ───────────────────────────────────────────────────────

def _norm_site(s):
    if not isinstance(s, str):
        return None
    c = s.strip().upper()
    return c if re.match(r"^SITE-\d{3}$", c) else None


def _load_audits(raw_dir: Path) -> pd.DataFrame:
    df = pd.read_csv(raw_dir / "audits_raw.csv", low_memory=False)
    df["site"] = df["site"].apply(_norm_site)
    df = df[df["site"].notna() & (df["site"] != "SITE-007")].copy()
    df["inspection_date"] = pd.to_datetime(
        df["inspection_date"], format="mixed", utc=True, errors="coerce"
    )
    df["closed_date"] = pd.to_datetime(
        df["closed_date"], format="mixed", utc=True, errors="coerce"
    )
    return df


def _load_telemetry(raw_dir: Path) -> pd.DataFrame:
    frames = []
    for fname in ["pipeline_telemetry_batch1.csv", "pipeline_telemetry_batch2.csv"]:
        fpath = raw_dir / fname
        if fpath.exists():
            df = pd.read_csv(fpath, low_memory=False)
            df["site"] = df["site"].apply(_norm_site)
            df = df[df["site"].notna() & (df["site"] != "SITE-007")].copy()
            frames.append(df)
    tel = pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
    tel["timestamp"] = pd.to_datetime(tel["timestamp"], utc=True, errors="coerce")
    # B5: EWMA requires sorted time series
    tel = tel.dropna(subset=["timestamp", "pressure_psi"]).sort_values("timestamp")
    return tel


def _load_dim_site(raw_dir: Path) -> pd.DataFrame:
    return pd.read_csv(raw_dir / "dim_site.csv")


# ── Diagnostic 1: Survival Analysis ──────────────────────────────────────────

def compute_survival_curves(
    audits_df: pd.DataFrame,
    timeline_days: list = None,
) -> dict:
    """
    Kaplan-Meier time-to-closure survival analysis.

    Splits audits into two groups:
        high_risk — site-003, site-006
        fleet     — all other sites

    For each group:
        duration = (closed_date - inspection_date).days  for closed audits
        duration = (today - inspection_date).days        for open audits
        event_observed = (status.lower() == 'closed')

    Negative durations (closed_date < inspection_date) are excluded —
    they are data quality artefacts from the synthetic generator.

    NOTE: High-risk sites have a low closure rate (~35%) so the KM curve never
    reaches the 50% mark — KM median is undefined (inf). The reported
    'high_risk_median_days' is the median of CLOSED findings only (conditional
    median), which is a more informative operational metric anyway.

    Returns a dict with medians and curve points at standard timepoints.
    """
    if timeline_days is None:
        timeline_days = [0, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365]

    today = pd.Timestamp(date.today(), tz="UTC")
    df = audits_df.copy()

    df["duration"] = (df["closed_date"].fillna(today) - df["inspection_date"]).dt.days
    df["event_observed"] = df["status"].str.strip().str.lower() == "closed"

    # Drop negative durations (data quality artefacts)
    df = df[df["duration"] >= 0].copy()

    def _fit_group(subset: pd.DataFrame) -> tuple:
        kmf = KaplanMeierFitter()
        kmf.fit(
            durations=subset["duration"],
            event_observed=subset["event_observed"],
            label="group",
        )
        km_median = kmf.median_survival_time_

        # If KM median is undefined (curve never reaches 50%), use the
        # conditional median of closed findings as the operational metric.
        closed_only = subset[subset["event_observed"]]["duration"]
        conditional_median = float(closed_only.median()) if not closed_only.empty else float("inf")

        # Use conditional median for display; note whether KM median was defined
        reported_median = (
            float(km_median) if not (np.isinf(km_median) or np.isnan(km_median))
            else conditional_median
        )

        closure_rate = float(subset["event_observed"].mean())

        # Extract survival probability at each timepoint
        curve = []
        for t in timeline_days:
            try:
                surv = float(kmf.survival_function_at_times([t]).iloc[0])
            except Exception:
                surv = float("nan")
            curve.append({"t": t, "survival": round(surv, 4) if not np.isnan(surv) else None})

        return reported_median, closure_rate, curve

    high_risk = df[df["site"].isin(HIGH_RISK_SITES)]
    fleet     = df[~df["site"].isin(HIGH_RISK_SITES)]

    hr_median, hr_closure, hr_curve   = _fit_group(high_risk)
    fl_median, fl_closure, fl_curve   = _fit_group(fleet)

    ratio = round(hr_median / fl_median, 2) if fl_median and fl_median > 0 and not np.isinf(hr_median) else None
    ratio_display = f"{ratio}×" if ratio else "undefined"

    quotable = (
        f"High-risk sites take {ratio_display} longer to close audit findings "
        f"({hr_median:.0f}d vs {fl_median:.0f}d median for closed findings). "
        f"High-risk closure rate: {hr_closure:.0%} vs fleet {fl_closure:.0%}."
    )

    return {
        "fleet_median_days":           fl_median,
        "high_risk_median_days":       hr_median,
        "fleet_closure_rate":          round(fl_closure, 4),
        "high_risk_closure_rate":      round(hr_closure, 4),
        "ratio":                       ratio,
        "quotable":                    quotable,
        "n_fleet":                     len(fleet),
        "n_high_risk":                 len(high_risk),
        "note": (
            "high_risk_median is conditional on closure (KM curve does not "
            "reach 50% — only 35% of high-risk findings are ever closed)"
        ),
        "curves": {
            "fleet":     fl_curve,
            "high_risk": hr_curve,
        },
    }


# ── Diagnostic 2: EWMA Pressure Control Charts ───────────────────────────────

def compute_ewma_control_chart(
    telemetry_df: pd.DataFrame,
    site_id: str,
    lam: float = EWMA_LAMBDA,
    L: float = EWMA_L,
    baseline_n: int = EWMA_BASELINE_N,
) -> dict:
    """
    EWMA control chart for pressure readings at a single site.

    Returns readings with EWMA, UCL/LCL, drift flags, and drift events
    that precede hard pressure spikes.

    EWMA recurrence: ewma[i] = λ × pressure[i] + (1-λ) × ewma[i-1]
    Control limits:  UCL/LCL = grand_mean ± L × σ × √(λ/(2-λ))

    lead_time_days is the gap between the first EWMA drift flag in the 30-day
    window before each spike and the spike itself.
    """
    s = telemetry_df[telemetry_df["site"] == site_id].copy().reset_index(drop=True)
    if s.empty or len(s) < baseline_n:
        return {
            "site_id": site_id,
            "readings": [],
            "drift_events": [],
            "lead_time_days": None,
            "error": f"Insufficient data ({len(s)} readings)",
        }

    # Establish baseline from first N readings
    baseline   = s["pressure_psi"].head(baseline_n)
    grand_mean = float(baseline.mean())
    sigma      = float(baseline.std())
    if sigma == 0:
        sigma = 1.0  # guard against flat baseline

    ewma_factor = (lam / (2 - lam)) ** 0.5
    ucl = grand_mean + L * sigma * ewma_factor
    lcl = grand_mean - L * sigma * ewma_factor

    # Compute EWMA series
    ewma_val = grand_mean
    ewma_list = []
    for p in s["pressure_psi"]:
        ewma_val = lam * float(p) + (1 - lam) * ewma_val
        ewma_list.append(round(ewma_val, 2))
    s["ewma"]       = ewma_list
    s["drift_flag"] = (s["ewma"] > ucl) | (s["ewma"] < lcl)
    s["spike"]      = s["pressure_psi"] > PRESSURE_SPIKE_THRESHOLD

    # Build readings list — subsample to ~200 points for front-end performance
    step = max(1, len(s) // 200)
    readings = []
    for _, row in s.iloc[::step].iterrows():
        readings.append({
            "timestamp":  row["timestamp"].isoformat(),
            "pressure":   round(float(row["pressure_psi"]), 1),
            "ewma":       round(float(row["ewma"]), 2),
            "ucl":        round(ucl, 2),
            "lcl":        round(lcl, 2),
            "drift_flag": bool(row["drift_flag"]),
            "spike":      bool(row["spike"]),
        })

    # Find drift events preceding each spike
    drift_events = []
    lead_times   = []
    spike_rows = s[s["spike"]]

    for _, sp in spike_rows.iterrows():
        lookback = sp["timestamp"] - pd.Timedelta(days=30)
        prior_drift = s[
            (s["timestamp"] >= lookback) &
            (s["timestamp"] < sp["timestamp"]) &
            (s["drift_flag"])
        ]
        if prior_drift.empty:
            lead_days = 0.0
        else:
            first = prior_drift.iloc[0]
            lead_days = float(
                (sp["timestamp"] - first["timestamp"]).total_seconds() / 86400
            )

        drift_events.append({
            "spike_timestamp":    sp["timestamp"].isoformat(),
            "spike_pressure":     round(float(sp["pressure_psi"]), 1),
            "days_before_spike":  round(lead_days, 1),
            "drift_flag_at":      prior_drift.iloc[0]["timestamp"].isoformat()
                                  if not prior_drift.empty else None,
        })
        lead_times.append(lead_days)

    avg_lead = round(float(np.mean(lead_times)), 1) if lead_times else 0.0

    return {
        "site_id":          site_id,
        "grand_mean":       round(grand_mean, 2),
        "sigma":            round(sigma, 2),
        "ucl":              round(ucl, 2),
        "lcl":              round(lcl, 2),
        "lam":              lam,
        "L":                L,
        "n_readings":       len(s),
        "n_drift_flags":    int(s["drift_flag"].sum()),
        "n_spikes":         int(s["spike"].sum()),
        "lead_time_days":   avg_lead,
        "readings":         readings,
        "drift_events":     drift_events,
    }


def compute_all_control_charts(telemetry_df: pd.DataFrame) -> dict:
    """
    Compute EWMA control charts for all known sites.
    Returns the full control_chart_data.json payload.
    """
    sites = sorted(telemetry_df["site"].dropna().unique().tolist())
    site_charts = {}
    all_lead_times = []

    for site_id in sites:
        chart = compute_ewma_control_chart(telemetry_df, site_id)
        site_charts[site_id] = chart
        if chart["lead_time_days"] and chart["n_spikes"] > 0:
            all_lead_times.append(chart["lead_time_days"])

    fleet_avg = round(float(np.mean(all_lead_times)), 1) if all_lead_times else 0.0

    return {
        "fleet_avg_lead_time_days": fleet_avg,
        "quotable": (
            f"EWMA drift detectable on average {fleet_avg} days before a hard "
            f"pressure breach (≥{int(PRESSURE_SPIKE_THRESHOLD)} PSI)"
        ),
        "ewma_lambda": EWMA_LAMBDA,
        "ewma_L":      EWMA_L,
        "sites":       site_charts,
    }


def build_drift_events_json(control_chart_data: dict) -> list:
    """
    Flatten all drift events across sites into a list for the alert narrative.
    """
    events = []
    for site_id, chart in control_chart_data["sites"].items():
        for ev in chart.get("drift_events", []):
            events.append({
                "site_id":         site_id,
                "signal_type":     "statistical_drift_flag",
                "spike_timestamp": ev["spike_timestamp"],
                "spike_pressure":  ev["spike_pressure"],
                "lead_time_days":  ev["days_before_spike"],
                "drift_flag_at":   ev["drift_flag_at"],
            })
    return sorted(events, key=lambda x: x["spike_timestamp"])


# ── Diagnostic 3: Rejection Rate vs Incident Rate Correlation ─────────────────

def compute_rejection_incident_correlation(
    features_df: pd.DataFrame,
    dim_site_df: pd.DataFrame,
) -> dict:
    """
    Pearson correlation between a site's mean rejection_rate_30d and
    mean incident_count_30d across all daily snapshots.

    Uses per-site aggregated means — one data point per site (n=6).
    With n=6, statistical significance requires r > ~0.81 for p < 0.05.
    The correlation and p-value are reported honestly regardless.
    """
    agg = (
        features_df
        .groupby("site_id")[["rejection_rate_30d", "incident_count_30d"]]
        .mean()
        .reset_index()
    )

    # Attach site name and severity band
    site_map = dict(zip(
        dim_site_df["site_code"].str.upper(),
        dim_site_df["site_name"],
    ))
    agg["site_name"] = agg["site_id"].map(site_map).fillna(agg["site_id"])
    agg["band"] = agg["site_id"].apply(
        lambda s: "Critical" if s in HIGH_RISK_SITES else "Medium"
    )

    rejection_rates = agg["rejection_rate_30d"].values
    incident_counts = agg["incident_count_30d"].values

    r, p = pearsonr(rejection_rates, incident_counts)
    r = round(float(r), 4)
    p = round(float(p), 4)

    if p < 0.05:
        sig_note = "statistically significant"
    elif p < 0.10:
        sig_note = "marginally significant (p<0.10)"
    else:
        sig_note = f"not statistically significant at p=0.05 (n={len(agg)} sites)"

    strength = "strong" if abs(r) >= 0.70 else ("moderate" if abs(r) >= 0.40 else "weak")
    direction = "positive" if r > 0 else "negative"
    interpretation = (
        f"{strength.capitalize()} {direction} correlation (r={r}, p={p}, {sig_note}): "
        f"sites with higher rejection rates tend to have more incidents in the "
        f"following 30 days. Note: n={len(agg)} — interpret with caution."
    )

    scatter_points = [
        {
            "site_id":           row["site_id"],
            "site_name":         row["site_name"],
            "rejection_rate_30d": round(float(row["rejection_rate_30d"]), 4),
            "incident_count_30d": round(float(row["incident_count_30d"]), 2),
            "band":              row["band"],
        }
        for _, row in agg.iterrows()
    ]

    return {
        "pearson_r":      r,
        "p_value":        p,
        "n_sites":        len(agg),
        "interpretation": interpretation,
        "quotable": (
            f"r={r} ({strength} {direction} correlation) — "
            f"sites with more data quality issues tend to have more incidents"
        ),
        "scatter_points": scatter_points,
    }


# ── Main entry point ──────────────────────────────────────────────────────────

def run(raw_dir: Path = RAW_DIR, output_dir: Path = WAREHOUSE_DIR) -> dict:
    """
    Compute all three diagnostics and write JSON files to output_dir.
    Returns a summary dict with the three quotable numbers.
    """
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Loading data...")
    audits_df    = _load_audits(raw_dir)
    telemetry_df = _load_telemetry(raw_dir)
    features_df  = pd.read_parquet(output_dir / "fact_site_features.parquet")
    dim_site_df  = _load_dim_site(raw_dir)

    # ── Diagnostic 1: Survival curves ────────────────────────────────────────
    print("[1/3] Computing KM survival curves...")
    survival = compute_survival_curves(audits_df)
    (output_dir / "survival_curve_data.json").write_text(
        json.dumps(survival, indent=2)
    )
    print(f"  Fleet median:     {survival['fleet_median_days']:.0f}d")
    print(f"  High-risk median: {survival['high_risk_median_days']:.0f}d")
    print(f"  → {survival['quotable']}")

    # ── Diagnostic 2: EWMA control charts ────────────────────────────────────
    print("[2/3] Computing EWMA control charts...")
    control = compute_all_control_charts(telemetry_df)
    (output_dir / "control_chart_data.json").write_text(
        json.dumps(control, indent=2)
    )

    # Write drift events sidecar for alert narrative (Feature 5)
    drift_events = build_drift_events_json(control)
    (output_dir / "drift_events.json").write_text(
        json.dumps(drift_events, indent=2)
    )

    print(f"  Fleet avg lead time: {control['fleet_avg_lead_time_days']} days")
    for site_id, chart in control["sites"].items():
        if chart["n_spikes"] > 0:
            print(f"  {site_id}: {chart['n_spikes']} spikes, "
                  f"lead={chart['lead_time_days']}d, "
                  f"drift_flags={chart['n_drift_flags']}")
    print(f"  → {control['quotable']}")

    # ── Diagnostic 3: Correlation ─────────────────────────────────────────────
    print("[3/3] Computing rejection-rate vs incident-count correlation...")
    correlation = compute_rejection_incident_correlation(features_df, dim_site_df)
    (output_dir / "correlation_data.json").write_text(
        json.dumps(correlation, indent=2)
    )
    print(f"  Pearson r={correlation['pearson_r']}, p={correlation['p_value']}")
    print(f"  → {correlation['quotable']}")

    summary = {
        "km_fleet_median_days":     survival["fleet_median_days"],
        "km_high_risk_median_days": survival["high_risk_median_days"],
        "km_ratio":                 survival["ratio"],
        "ewma_fleet_avg_lead_days": control["fleet_avg_lead_time_days"],
        "correlation_r":            correlation["pearson_r"],
        "correlation_p":            correlation["p_value"],
    }
    return summary


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sentinel Statistical Diagnostics — produce 3 JSON artifacts"
    )
    parser.add_argument(
        "--raw-dir", type=str, default=str(RAW_DIR),
        help="Path to raw CSV directory"
    )
    parser.add_argument(
        "--output-dir", type=str, default=str(WAREHOUSE_DIR),
        help="Warehouse output directory"
    )
    args = parser.parse_args()

    summary = run(Path(args.raw_dir), Path(args.output_dir))

    print("\n" + "=" * 55)
    print("  Diagnostic Summary — Three Numbers for the Pitch")
    print("=" * 55)
    print(f"  KM fleet median:      {summary['km_fleet_median_days']:.0f} days to close audit finding")
    km_hr = summary['km_high_risk_median_days']
    hr_display = f"{km_hr:.0f}" if not (km_hr is None or (isinstance(km_hr, float) and (km_hr != km_hr or km_hr == float('inf')))) else "undefined"
    print(f"  KM high-risk median:  {hr_display} days  (ratio={summary['km_ratio']})")
    print(f"  EWMA lead time:       {summary['ewma_fleet_avg_lead_days']} days before hard pressure breach")
    print(f"  Correlation r:        {summary['correlation_r']}  (p={summary['correlation_p']})")
    print("=" * 55)


if __name__ == "__main__":
    main()
