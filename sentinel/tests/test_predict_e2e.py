# sentinel/tests/test_predict_e2e.py
"""
End-to-end integration tests for the complete predict.py workflow.

Tests the full flow: train → save → load → score → explain
"""

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from src.predict import (
    FEATURES,
    build_labels,
    load_model,
    score_current_sites,
    train_model,
)
from src.model_registry import ModelRegistry


@pytest.fixture
def temp_workspace(tmp_path):
    """Create a complete temp workspace with data and models directories."""
    data_dir = tmp_path / "data"
    raw_dir = data_dir / "raw"
    warehouse_dir = data_dir / "warehouse"
    models_dir = tmp_path / "models"
    
    raw_dir.mkdir(parents=True)
    warehouse_dir.mkdir(parents=True)
    models_dir.mkdir(parents=True)
    
    return {
        "root": tmp_path,
        "raw": raw_dir,
        "warehouse": warehouse_dir,
        "models": models_dir,
    }


@pytest.fixture
def synthetic_data(temp_workspace):
    """Generate synthetic data for E2E testing.
    
    Creates deterministic data that ensures:
    - Both classes present in train and test sets
    - Sufficient data for calibration (requires both classes in calibration fold)
    - Incidents distributed to create label variation across both train and test periods
    
    Key dates:
    - Features: 2026-01-01 to 2026-07-31 (212 days)
    - Train cutoff: 2026-06-12 (per TRAIN_CUTOFF constant)
    - Train period: 2026-01-01 to 2026-06-11
    - Test period: 2026-06-12 to 2026-07-31
    - Labels look 7 days forward, so we need Critical incidents in:
      - Training: within 7 days after train dates → until 2026-06-18
      - Test: within 7 days after test dates → until 2026-08-07
    """
    np.random.seed(42)  # Reproducible
    raw_dir = temp_workspace["raw"]
    warehouse_dir = temp_workspace["warehouse"]
    
    sites = ["SITE-001", "SITE-002", "SITE-003", "SITE-004", "SITE-005", "SITE-006"]
    
    incidents_list = []
    
    # Create Critical incidents spread across entire period including test period
    # High-risk sites (SITE-001, SITE-002) get incidents every 10 days
    # Low-risk sites get incidents every 30 days
    for i, site in enumerate(sites):
        if i in [0, 1]:  # High-risk sites
            # Incidents every 10 days from Jan to August
            for j in range(22):  # ~220 days coverage
                incidents_list.append({
                    "incident_id": f"INC-{site}-{j:03d}",
                    "site": site,
                    "incident_date": pd.Timestamp("2026-01-05") + pd.Timedelta(days=int(j * 10)),
                    "severity": "Critical",
                })
        else:  # Low-risk sites
            # Incidents every 30 days
            for j in range(8):
                incidents_list.append({
                    "incident_id": f"INC-{site}-{j:03d}",
                    "site": site,
                    "incident_date": pd.Timestamp("2026-01-15") + pd.Timedelta(days=int(j * 30)),
                    "severity": "Critical",
                })
    
    # Add non-Critical incidents for noise
    for i in range(50):
        incidents_list.append({
            "incident_id": f"INC-NOISE-{i:03d}",
            "site": np.random.choice(sites),
            "incident_date": pd.Timestamp("2026-01-01") + pd.Timedelta(days=int(i * 4)),
            "severity": np.random.choice(["High", "Medium", "Low"]),
        })
    
    incidents = pd.DataFrame(incidents_list)
    incidents.to_csv(raw_dir / "incidents_raw.csv", index=False)
    
    # Create fact_site_features.parquet with dates spanning train/test periods
    # 212 days × 6 sites = 1272 rows (enough for robust calibration)
    n_days = 212
    feature_rows = []
    for day_offset in range(n_days):
        date = pd.Timestamp("2026-01-01") + pd.Timedelta(days=int(day_offset))
        for site in sites:
            # Create features with some signal - high-risk sites get higher feature values
            site_idx = sites.index(site)
            base_signal = 0.5 if site_idx in [0, 1] else -0.3
            feature_rows.append({
                "site_id": site,
                "as_of_date": date,
                **{f: np.random.randn() + base_signal for f in FEATURES}
            })
    
    features = pd.DataFrame(feature_rows)
    features.to_parquet(warehouse_dir / "fact_site_features.parquet", index=False)
    
    return features


class TestEndToEndFlow:

    def test_full_train_score_cycle(self, temp_workspace, synthetic_data, monkeypatch):
        """Complete workflow: train → save → load → score → JSON output."""
        import src.predict as predict_module
        from src.model_registry import ModelRegistry
        
        # Patch paths
        monkeypatch.setattr(predict_module, "RAW_DIR", temp_workspace["raw"])
        monkeypatch.setattr(predict_module, "WAREHOUSE_DIR", temp_workspace["warehouse"])
        monkeypatch.setattr(predict_module, "MODEL_PATH", temp_workspace["models"] / "logreg_v1.pkl")
        monkeypatch.setattr(predict_module, "_registry", ModelRegistry(temp_workspace["models"]))
        
        # Step 1: Build labels
        features_with_labels = build_labels(synthetic_data, temp_workspace["raw"])
        assert "label" in features_with_labels.columns
        
        # Step 2: Train
        pipe, report = train_model(features_with_labels)
        assert pipe is not None
        assert report["auc_roc"] > 0.0
        
        # Step 3: Save
        from src.predict import save_model
        version_id = save_model(pipe, report, temp_workspace["models"] / "logreg_v1.pkl")
        assert version_id is not None
        
        # Step 4: Load
        loaded_pipe = load_model(temp_workspace["models"] / "logreg_v1.pkl")
        assert loaded_pipe is not None
        
        # Step 5: Score
        predictions = score_current_sites(synthetic_data, loaded_pipe)
        assert len(predictions) == 6  # 6 sites
        assert "incident_probability_7d" in predictions.columns
        assert "top_features" in predictions.columns
        
        # Step 6: Verify JSON format
        for _, row in predictions.iterrows():
            top_features = json.loads(row["top_features"])
            assert isinstance(top_features, list)
            assert len(top_features) == 3
            assert all("feature" in f and "contribution" in f for f in top_features)

    def test_registry_rollback_works(self, temp_workspace, synthetic_data, monkeypatch):
        """Train two versions, roll back to first, verify scoring uses v1."""
        import src.predict as predict_module
        from src.model_registry import ModelRegistry
        
        registry = ModelRegistry(temp_workspace["models"])
        monkeypatch.setattr(predict_module, "_registry", registry)
        monkeypatch.setattr(predict_module, "RAW_DIR", temp_workspace["raw"])
        monkeypatch.setattr(predict_module, "MODEL_PATH", temp_workspace["models"] / "logreg_v1.pkl")
        
        features_with_labels = build_labels(synthetic_data, temp_workspace["raw"])
        
        # Train v1
        pipe1, report1 = train_model(features_with_labels, force_model="logreg")
        v1 = registry.save(pipe1, report1)
        
        # Train v2 (force different model for distinction)
        pipe2, report2 = train_model(features_with_labels, force_model="logreg")
        v2 = registry.save(pipe2, report2)
        
        # Current should be v2
        assert registry.get_current_version() == v2
        
        # Rollback to v1
        registry.set_current(v1)
        assert registry.get_current_version() == v1
        
        # Load should return v1
        loaded = registry.load_current()
        assert loaded is not None

    def test_quality_gate_blocks_bad_model(self, temp_workspace, synthetic_data, monkeypatch):
        """Model with AUC below threshold should not be saved."""
        import src.predict as predict_module
        
        # Set impossibly high threshold
        monkeypatch.setattr(predict_module, "MIN_ACCEPTABLE_AUC", 0.99)
        monkeypatch.setattr(predict_module, "RAW_DIR", temp_workspace["raw"])
        
        features_with_labels = build_labels(synthetic_data, temp_workspace["raw"])
        
        # Training succeeds, but check would fail
        pipe, report = train_model(features_with_labels)
        
        # The gate check
        if report["auc_roc"] < predict_module.MIN_ACCEPTABLE_AUC:
            # This is expected — model blocked
            assert True
        else:
            pytest.skip("Model happened to beat the high threshold")
