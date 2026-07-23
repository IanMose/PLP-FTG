"""
Tests for src/validate.py

One test per validation rule, plus a test that --fail-below actually exits 1
on a bad-data fixture.
"""

import subprocess
import sys
import json
import os

import pandas as pd
import pytest

from src.validate import (
    validate_no_future_incidents,
    validate_severity,
    validate_score_bounds,
    validate_date_order,
    validate_uniqueness,
    validate_all,
    compute_pass_rate,
)


class TestValidateNoFutureIncidents:
    """incident_date cannot be later than ingestion date (now)."""

    def test_past_date_is_valid(self):
        df = pd.DataFrame({"incident_date": ["2020-01-01"]})
        result = validate_no_future_incidents(df)
        assert result.iloc[0] is True or result.iloc[0] == True

    def test_future_date_is_invalid(self):
        df = pd.DataFrame({"incident_date": ["2099-12-31T00:00:00Z"]})
        result = validate_no_future_incidents(df)
        assert result.iloc[0] == False

    def test_missing_column_all_valid(self):
        df = pd.DataFrame({"other_col": [1, 2, 3]})
        result = validate_no_future_incidents(df)
        assert result.all()

    def test_nan_date_is_valid(self):
        df = pd.DataFrame({"incident_date": [None]})
        result = validate_no_future_incidents(df)
        assert result.iloc[0] == True


class TestValidateSeverity:
    """severity must be one of Low / Medium / High / Critical."""

    def test_valid_severities(self):
        df = pd.DataFrame({"severity": ["Low", "Medium", "High", "Critical"]})
        result = validate_severity(df)
        assert result.all()

    def test_invalid_severity(self):
        df = pd.DataFrame({"severity": ["Extreme", "Unknown"]})
        result = validate_severity(df)
        assert not result.any()

    def test_missing_column_all_valid(self):
        df = pd.DataFrame({"other_col": [1, 2]})
        result = validate_severity(df)
        assert result.all()

    def test_nan_severity_is_valid(self):
        df = pd.DataFrame({"severity": [None, "Low"]})
        result = validate_severity(df)
        assert result.all()


class TestValidateScoreBounds:
    """compliance_score must be between 0 and 100."""

    def test_valid_scores(self):
        df = pd.DataFrame({"compliance_score": [0, 50, 100]})
        result = validate_score_bounds(df)
        assert result.all()

    def test_score_below_zero(self):
        df = pd.DataFrame({"compliance_score": [-1]})
        result = validate_score_bounds(df)
        assert result.iloc[0] == False

    def test_score_above_100(self):
        df = pd.DataFrame({"compliance_score": [101]})
        result = validate_score_bounds(df)
        assert result.iloc[0] == False

    def test_boundary_values(self):
        df = pd.DataFrame({"compliance_score": [0, 100]})
        result = validate_score_bounds(df)
        assert result.all()

    def test_missing_column_all_valid(self):
        df = pd.DataFrame({"other_col": [1]})
        result = validate_score_bounds(df)
        assert result.all()


class TestValidateDateOrder:
    """closed_date cannot precede inspection_date."""

    def test_closed_after_inspection_valid(self):
        df = pd.DataFrame({
            "inspection_date": ["2024-01-01T00:00:00Z"],
            "closed_date": ["2024-01-15T00:00:00Z"],
        })
        result = validate_date_order(df)
        assert result.iloc[0] == True

    def test_closed_before_inspection_invalid(self):
        df = pd.DataFrame({
            "inspection_date": ["2024-01-15T00:00:00Z"],
            "closed_date": ["2024-01-01T00:00:00Z"],
        })
        result = validate_date_order(df)
        assert result.iloc[0] == False

    def test_same_date_valid(self):
        df = pd.DataFrame({
            "inspection_date": ["2024-01-15T00:00:00Z"],
            "closed_date": ["2024-01-15T00:00:00Z"],
        })
        result = validate_date_order(df)
        assert result.iloc[0] == True

    def test_missing_dates_valid(self):
        df = pd.DataFrame({
            "inspection_date": [None],
            "closed_date": [None],
        })
        result = validate_date_order(df)
        assert result.iloc[0] == True

    def test_missing_columns_all_valid(self):
        df = pd.DataFrame({"other_col": [1]})
        result = validate_date_order(df)
        assert result.all()


class TestValidateUniqueness:
    """incident_id / audit_id must be unique within a batch."""

    def test_unique_ids_valid(self):
        df = pd.DataFrame({"incident_id": ["A", "B", "C"]})
        result = validate_uniqueness(df)
        assert result.all()

    def test_duplicate_ids_invalid(self):
        df = pd.DataFrame({"incident_id": ["A", "A", "B"]})
        result = validate_uniqueness(df)
        # Both rows with "A" should be marked invalid
        assert result.iloc[0] == False
        assert result.iloc[1] == False
        assert result.iloc[2] == True

    def test_audit_id_checked_if_no_incident_id(self):
        df = pd.DataFrame({"audit_id": ["X", "X", "Y"]})
        result = validate_uniqueness(df)
        assert result.iloc[0] == False
        assert result.iloc[1] == False
        assert result.iloc[2] == True

    def test_no_id_columns_all_valid(self):
        df = pd.DataFrame({"other_col": [1, 2, 3]})
        result = validate_uniqueness(df)
        assert result.all()


class TestValidateAll:
    """Integration test for validate_all."""

    def test_all_valid_record(self):
        df = pd.DataFrame({
            "incident_id": ["INC-001"],
            "severity": ["High"],
            "compliance_score": [85],
            "incident_date": ["2024-01-15T00:00:00Z"],
        })
        results = validate_all(df)
        assert results["valid"].iloc[0] == True

    def test_invalid_record(self):
        df = pd.DataFrame({
            "incident_id": ["INC-001"],
            "severity": ["Invalid"],
            "compliance_score": [150],
            "incident_date": ["2099-12-31T00:00:00Z"],
        })
        results = validate_all(df)
        assert results["valid"].iloc[0] == False


class TestComputePassRate:
    """Tests for the pass rate computation."""

    def test_all_trusted(self):
        counts = {"trusted": 100}
        assert compute_pass_rate(counts) == 1.0

    def test_all_rejected(self):
        counts = {"rejected": 100}
        assert compute_pass_rate(counts) == 0.0

    def test_mixed(self):
        counts = {"trusted": 70, "corrected": 20, "review": 5, "rejected": 5}
        assert compute_pass_rate(counts) == 0.9

    def test_empty_counts(self):
        assert compute_pass_rate({}) == 0.0

    def test_trusted_plus_corrected(self):
        counts = {"trusted": 50, "corrected": 40, "rejected": 10}
        assert compute_pass_rate(counts) == 0.9


class TestGateCLI:
    """Test that --fail-below CLI actually exits non-zero on bad data."""

    def test_gate_fails_on_bad_data(self, tmp_path):
        """The gate must exit 1 when pass rate is below threshold."""
        # Create a decision_summary.json with mostly rejected records
        warehouse_dir = tmp_path / "data" / "warehouse"
        warehouse_dir.mkdir(parents=True)
        summary = {"trusted": 5, "corrected": 5, "review": 10, "rejected": 80}
        summary_path = warehouse_dir / "decision_summary.json"
        summary_path.write_text(json.dumps(summary))

        # Run the validate gate CLI
        result = subprocess.run(
            [sys.executable, "-m", "src.validate", "--fail-below", "0.90"],
            capture_output=True,
            text=True,
            cwd=str(tmp_path),
            env={**os.environ, "PYTHONPATH": os.path.dirname(os.path.dirname(__file__))},
        )
        assert result.returncode == 1
        assert "GATE FAILED" in result.stdout

    def test_gate_passes_on_good_data(self, tmp_path):
        """The gate must exit 0 when pass rate is above threshold."""
        warehouse_dir = tmp_path / "data" / "warehouse"
        warehouse_dir.mkdir(parents=True)
        summary = {"trusted": 80, "corrected": 15, "review": 3, "rejected": 2}
        summary_path = warehouse_dir / "decision_summary.json"
        summary_path.write_text(json.dumps(summary))

        result = subprocess.run(
            [sys.executable, "-m", "src.validate", "--fail-below", "0.90"],
            capture_output=True,
            text=True,
            cwd=str(tmp_path),
            env={**os.environ, "PYTHONPATH": os.path.dirname(os.path.dirname(__file__))},
        )
        assert result.returncode == 0
        assert "GATE PASSED" in result.stdout
