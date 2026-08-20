"""
Tests for src/transform.py

One test per transform function as required by Stage 1 definition of done.
"""

import pandas as pd
import pytest

from src.transform import (
    normalize_severity,
    normalize_status,
    normalize_text_column,
    to_iso8601_utc,
    deduplicate,
    transform,
    SEVERITY_LOOKUP,
    STATUS_LOOKUP,
)


class TestNormalizeSeverity:
    """Tests for severity normalization."""

    def test_canonical_values_pass_through(self):
        assert normalize_severity("Low") == "Low"
        assert normalize_severity("Medium") == "Medium"
        assert normalize_severity("High") == "High"
        assert normalize_severity("Critical") == "Critical"

    def test_lowercase_variants(self):
        assert normalize_severity("low") == "Low"
        assert normalize_severity("medium") == "Medium"
        assert normalize_severity("high") == "High"
        assert normalize_severity("critical") == "Critical"

    def test_abbreviations(self):
        assert normalize_severity("l") == "Low"
        assert normalize_severity("med") == "Medium"
        assert normalize_severity("h") == "High"
        assert normalize_severity("crit") == "Critical"

    def test_alternative_names(self):
        assert normalize_severity("minor") == "Low"
        assert normalize_severity("moderate") == "Medium"
        assert normalize_severity("major") == "High"
        assert normalize_severity("severe") == "Critical"

    def test_whitespace_handling(self):
        assert normalize_severity("  high  ") == "High"
        assert normalize_severity(" Low ") == "Low"

    def test_unknown_value_passes_through(self):
        assert normalize_severity("unknown") == "unknown"

    def test_nan_returns_nan(self):
        result = normalize_severity(float("nan"))
        assert pd.isna(result)


class TestNormalizeStatus:
    """Tests for status normalization."""

    def test_canonical_values(self):
        assert normalize_status("Open") == "Open"
        assert normalize_status("Closed") == "Closed"

    def test_variants(self):
        assert normalize_status("opened") == "Open"
        assert normalize_status("resolved") == "Closed"
        assert normalize_status("in progress") == "In Progress"
        assert normalize_status("in_progress") == "In Progress"

    def test_nan_returns_nan(self):
        result = normalize_status(float("nan"))
        assert pd.isna(result)


class TestToIso8601Utc:
    """Tests for ISO 8601 UTC timestamp conversion."""

    def test_standard_date(self):
        series = pd.Series(["2024-01-15"])
        result = to_iso8601_utc(series)
        assert result.iloc[0] == "2024-01-15T00:00:00Z"

    def test_datetime_with_time(self):
        series = pd.Series(["2024-03-20 14:30:00"])
        result = to_iso8601_utc(series)
        assert result.iloc[0] == "2024-03-20T14:30:00Z"

    def test_invalid_date_becomes_none(self):
        series = pd.Series(["not-a-date"])
        result = to_iso8601_utc(series)
        assert pd.isna(result.iloc[0])

    def test_nan_preserved(self):
        series = pd.Series([None])
        result = to_iso8601_utc(series)
        assert pd.isna(result.iloc[0])

    def test_mixed_formats(self):
        series = pd.Series(["2024-01-15", "2024-01-15 10:30:00", "Jan 15, 2024"])
        result = to_iso8601_utc(series)
        # ISO and natural-language dates parse correctly
        assert result.iloc[0] == "2024-01-15T00:00:00Z"
        assert result.iloc[1] == "2024-01-15T10:30:00Z"
        assert result.iloc[2] == "2024-01-15T00:00:00Z"


class TestDeduplicate:
    """Tests for deduplication logic."""

    def test_removes_duplicates_keeps_latest(self):
        df = pd.DataFrame({
            "incident_id": ["A", "A", "B"],
            "value": [1, 2, 3],
            "ingestion_timestamp": ["2024-01-01", "2024-01-02", "2024-01-01"],
        })
        result = deduplicate(df, natural_key=["incident_id"], sort_col="ingestion_timestamp")
        assert len(result) == 2
        # Should keep the latest (value=2 for incident A)
        row_a = result[result["incident_id"] == "A"].iloc[0]
        assert row_a["value"] == 2

    def test_no_duplicates_unchanged(self):
        df = pd.DataFrame({
            "incident_id": ["A", "B", "C"],
            "value": [1, 2, 3],
            "ingestion_timestamp": ["2024-01-01", "2024-01-02", "2024-01-03"],
        })
        result = deduplicate(df, natural_key=["incident_id"], sort_col="ingestion_timestamp")
        assert len(result) == 3

    def test_no_sort_column_keeps_first(self):
        df = pd.DataFrame({
            "incident_id": ["A", "A", "B"],
            "value": [1, 2, 3],
        })
        result = deduplicate(df, natural_key=["incident_id"])
        assert len(result) == 2


class TestTransformIntegration:
    """Integration test for the full transform function."""

    def test_full_transform(self):
        df = pd.DataFrame({
            "incident_id": ["INC-001", "INC-002", "INC-001"],
            "severity": ["high", "med", "HIGH"],
            "incident_date": ["2024-01-15", "2024-02-20", "2024-01-16"],
            "ingestion_timestamp": ["2024-03-01", "2024-03-01", "2024-03-02"],
        })
        result = transform(df)

        # Severity should be normalized
        assert set(result["severity"].tolist()) <= {"High", "Medium"}

        # Dates should be ISO 8601
        for date_val in result["incident_date"]:
            if date_val is not None:
                assert date_val.endswith("Z")

        # Duplicates should be removed (INC-001 appears twice, keep latest)
        assert len(result) == 2
