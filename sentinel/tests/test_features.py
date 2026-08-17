"""
Tests for sentinel/src/features.py

Uses hand-crafted minimal DataFrames with exactly known values so each
feature function can be verified in isolation without reading from disk.
"""

from datetime import date

import pandas as pd
import pytest

from src.features import (
    compute_days_since_last_audit,
    compute_incident_features,
    compute_open_findings,
    compute_pressure_anomalies,
    compute_rejection_rates,
)


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture
def minimal_audits():
    """Two audits for site-003: one closed on 2026-07-01, one still open."""
    return pd.DataFrame({
        "site":             ["SITE-003", "SITE-003", "SITE-001"],
        "inspection_date":  [
            pd.Timestamp("2026-06-01", tz="UTC"),
            pd.Timestamp("2026-07-01", tz="UTC"),
            pd.Timestamp("2026-07-15", tz="UTC"),
        ],
        "closed_date": [
            pd.Timestamp("2026-06-15", tz="UTC"),
            pd.NaT,
            pd.Timestamp("2026-07-20", tz="UTC"),
        ],
        "compliance_score": [55.0, 62.0, 80.0],
        "status":           ["Closed", "Open", "Closed"],
    })


@pytest.fixture
def minimal_incidents():
    """
    Six incidents for SITE-003 spanning different time windows.
    Two in last 7d, four in last 30d (relative to as_of=2026-08-01).
    One has no severity (simulates data quality rejection).
    """
    as_of = pd.Timestamp("2026-08-01", tz="UTC")
    return pd.DataFrame({
        "site": ["SITE-003"] * 6,
        "incident_date": [
            as_of - pd.Timedelta(days=2),   # in 7d window  → severity: Critical
            as_of - pd.Timedelta(days=5),   # in 7d window  → severity: High
            as_of - pd.Timedelta(days=15),  # in 30d window → severity: Medium
            as_of - pd.Timedelta(days=25),  # in 30d window → severity: Low
            as_of - pd.Timedelta(days=20),  # in 30d window → severity: None (bad data)
            as_of - pd.Timedelta(days=45),  # outside 30d   → severity: Critical
        ],
        "severity": ["Critical", "High", "Medium", "Low", None, "Critical"],
    })


@pytest.fixture
def minimal_telemetry():
    """
    Telemetry for SITE-003 with two pressure anomalies (>1000 PSI) in the
    14-day window before 2026-08-01 and one outside.
    """
    as_of = pd.Timestamp("2026-08-01", tz="UTC")
    return pd.DataFrame({
        "site": ["SITE-003"] * 5,
        "timestamp": [
            as_of - pd.Timedelta(days=1),    # in 14d window, HIGH pressure
            as_of - pd.Timedelta(days=10),   # in 14d window, HIGH pressure
            as_of - pd.Timedelta(days=7),    # in 14d window, normal
            as_of - pd.Timedelta(days=20),   # OUTSIDE 14d window, HIGH pressure
            as_of - pd.Timedelta(days=3),    # in 14d window, normal
        ],
        "pressure_psi": [1100.0, 1050.5, 400.0, 1200.0, 350.0],
    })


# ── Tests ─────────────────────────────────────────────────────────────────────

class TestDaysSinceLastAudit:

    def test_returns_correct_delta(self, minimal_audits):
        """Most recent audit for SITE-003 is 2026-07-01; as_of is 2026-08-01 → 31 days."""
        result = compute_days_since_last_audit(
            minimal_audits, "SITE-003", date(2026, 8, 1)
        )
        assert result == 31

    def test_returns_none_when_no_prior_audit(self, minimal_audits):
        """SITE-002 has no audits at all → None."""
        result = compute_days_since_last_audit(
            minimal_audits, "SITE-002", date(2026, 8, 1)
        )
        assert result is None

    def test_ignores_future_audits(self, minimal_audits):
        """as_of is before the SITE-001 audit (2026-07-15) → None since no earlier audit."""
        result = compute_days_since_last_audit(
            minimal_audits, "SITE-001", date(2026, 7, 10)
        )
        assert result is None

    def test_returns_zero_on_audit_day(self, minimal_audits):
        """as_of equals the inspection_date of the most recent audit → 0 days."""
        result = compute_days_since_last_audit(
            minimal_audits, "SITE-003", date(2026, 7, 1)
        )
        assert result == 0


class TestRejectionRates:

    def test_7d_rate_correct(self, minimal_incidents):
        """2 of 2 incidents in 7d window have severity → 0% rejection rate."""
        result = compute_rejection_rates(minimal_incidents, "SITE-003", date(2026, 8, 1))
        assert result["rejection_rate_7d"] == 0.0

    def test_30d_rate_includes_missing_severity(self, minimal_incidents):
        """
        5 incidents in 30d window: 1 has severity=None → rejection_rate_30d = 0.2.
        (The 45-day-old incident is outside the window.)
        """
        result = compute_rejection_rates(minimal_incidents, "SITE-003", date(2026, 8, 1))
        # 5 incidents in last 30d, 1 with None severity
        assert result["rejection_rate_30d"] == pytest.approx(0.2, abs=0.01)

    def test_returns_zero_for_site_with_no_incidents(self, minimal_incidents):
        """Site with no incidents in any window → 0.0 rejection rate."""
        result = compute_rejection_rates(minimal_incidents, "SITE-099", date(2026, 8, 1))
        assert result["rejection_rate_7d"] == 0.0
        assert result["rejection_rate_30d"] == 0.0


class TestIncidentFeatures:

    def test_count_excludes_outside_window(self, minimal_incidents):
        """Only 5 incidents fall within 30d of 2026-08-01 (the 6th is 45d ago)."""
        result = compute_incident_features(minimal_incidents, "SITE-003", date(2026, 8, 1))
        assert result["incident_count_30d"] == 5

    def test_severity_score_correct(self, minimal_incidents):
        """
        Incidents in 30d window: Critical(4) + High(3) + Medium(2) + Low(1) + None(0) = 10.
        """
        result = compute_incident_features(minimal_incidents, "SITE-003", date(2026, 8, 1))
        assert result["incident_severity_score_30d"] == pytest.approx(10.0)

    def test_returns_zeros_for_empty_window(self, minimal_incidents):
        """No incidents for SITE-003 before 2020 → count=0, score=0."""
        result = compute_incident_features(minimal_incidents, "SITE-003", date(2020, 1, 1))
        assert result["incident_count_30d"] == 0
        assert result["incident_severity_score_30d"] == 0.0


class TestPressureAnomalies:

    def test_counts_only_in_14d_window(self, minimal_telemetry):
        """2 readings > 1000 PSI within 14d; 1 is outside the window → count=2."""
        result = compute_pressure_anomalies(
            minimal_telemetry, "SITE-003", date(2026, 8, 1)
        )
        assert result == 2

    def test_returns_zero_when_no_anomalies(self, minimal_telemetry):
        """SITE-001 has no telemetry → 0 anomalies."""
        result = compute_pressure_anomalies(
            minimal_telemetry, "SITE-001", date(2026, 8, 1)
        )
        assert result == 0

    def test_normal_pressure_not_counted(self, minimal_telemetry):
        """Readings at 400 PSI and 350 PSI do not trigger the anomaly threshold."""
        normal_tel = pd.DataFrame({
            "site": ["SITE-003"] * 3,
            "timestamp": [
                pd.Timestamp("2026-07-30", tz="UTC"),
                pd.Timestamp("2026-07-29", tz="UTC"),
                pd.Timestamp("2026-07-28", tz="UTC"),
            ],
            "pressure_psi": [400.0, 350.0, 999.9],  # 999.9 is just under threshold
        })
        result = compute_pressure_anomalies(normal_tel, "SITE-003", date(2026, 8, 1))
        assert result == 0


class TestOpenFindings:

    def test_counts_open_and_in_progress(self, minimal_audits):
        """SITE-003 has 2 audits as of 2026-08-01: one Closed, one Open → count=1."""
        result = compute_open_findings(minimal_audits, "SITE-003", date(2026, 8, 1))
        assert result == 1

    def test_ignores_audits_after_as_of(self, minimal_audits):
        """
        SITE-001 audit is on 2026-07-15 with status=Closed.
        as_of=2026-07-10 (before the audit) → nothing counted → 0.
        """
        result = compute_open_findings(minimal_audits, "SITE-001", date(2026, 7, 10))
        assert result == 0

    def test_returns_zero_for_site_with_no_audits(self, minimal_audits):
        """SITE-099 has no audits → 0 open findings."""
        result = compute_open_findings(minimal_audits, "SITE-099", date(2026, 8, 1))
        assert result == 0
