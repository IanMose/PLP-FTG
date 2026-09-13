"""Tests for sentinel/src/model_registry.py model versioning."""

import json
from datetime import datetime
from pathlib import Path

import pytest
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import numpy as np

from src.model_registry import ModelRegistry


@pytest.fixture
def temp_registry(tmp_path):
    """Create a registry in a temp directory."""
    models_dir = tmp_path / "models"
    models_dir.mkdir()
    return ModelRegistry(models_dir=models_dir)


@pytest.fixture
def mock_pipeline():
    """Create a simple fitted pipeline."""
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(random_state=42)),
    ])
    X = np.random.randn(50, 7)
    y = (X[:, 0] > 0).astype(int)
    pipe.fit(X, y)
    return pipe


@pytest.fixture
def mock_report():
    """Create a minimal backtest report."""
    return {
        "model_version": "test_v1",
        "auc_roc": 0.75,
        "precision": 0.72,
        "recall": 0.68,
        "f1": 0.70,
        "n_train": 714,
        "n_test": 366,
        "positive_rate_train": 0.51,
        "positive_rate_test": 0.52,
        "train_cutoff": "2026-06-12",
        "features": ["f1", "f2", "f3"],
    }


class TestModelRegistrySave:

    def test_save_creates_versioned_file(self, temp_registry, mock_pipeline, mock_report):
        """save() should create a timestamped pkl file."""
        version_id = temp_registry.save(mock_pipeline, mock_report)
        
        assert version_id is not None
        assert len(version_id) > 0
        
        # Check file exists
        pkl_path = temp_registry.models_dir / f"{version_id}.pkl"
        assert pkl_path.exists()

    def test_save_updates_registry_json(self, temp_registry, mock_pipeline, mock_report):
        """save() should append entry to registry.json."""
        version_id = temp_registry.save(mock_pipeline, mock_report)
        
        registry_path = temp_registry.models_dir / "registry.json"
        assert registry_path.exists()
        
        with open(registry_path) as f:
            registry = json.load(f)
        
        assert version_id in registry["versions"]
        assert registry["versions"][version_id]["auc_roc"] == 0.75

    def test_save_sets_as_current(self, temp_registry, mock_pipeline, mock_report):
        """save() should set the new version as current."""
        version_id = temp_registry.save(mock_pipeline, mock_report)
        
        registry_path = temp_registry.models_dir / "registry.json"
        with open(registry_path) as f:
            registry = json.load(f)
        
        assert registry["current"] == version_id


class TestModelRegistryLoad:

    def test_load_current_returns_latest(self, temp_registry, mock_pipeline, mock_report):
        """load_current() should return the most recently saved model."""
        version_id = temp_registry.save(mock_pipeline, mock_report)
        
        loaded = temp_registry.load_current()
        
        assert loaded is not None
        assert hasattr(loaded, "predict")

    def test_load_by_version_id(self, temp_registry, mock_pipeline, mock_report):
        """load(version_id) should return specific version."""
        version_id = temp_registry.save(mock_pipeline, mock_report)
        
        loaded = temp_registry.load(version_id)
        
        assert loaded is not None
        assert hasattr(loaded, "predict")

    def test_load_nonexistent_raises(self, temp_registry):
        """load() with invalid version_id should raise FileNotFoundError."""
        with pytest.raises(FileNotFoundError):
            temp_registry.load("nonexistent_version")


class TestModelRegistryMetadata:

    def test_list_versions(self, temp_registry, mock_pipeline, mock_report):
        """list_versions() should return all saved versions."""
        v1 = temp_registry.save(mock_pipeline, mock_report)
        mock_report["auc_roc"] = 0.80
        v2 = temp_registry.save(mock_pipeline, mock_report)
        
        versions = temp_registry.list_versions()
        
        assert v1 in versions
        assert v2 in versions
        assert len(versions) == 2

    def test_get_metadata(self, temp_registry, mock_pipeline, mock_report):
        """get_metadata() should return the report for a version."""
        version_id = temp_registry.save(mock_pipeline, mock_report)
        
        metadata = temp_registry.get_metadata(version_id)
        
        assert metadata["auc_roc"] == 0.75
        assert metadata["n_train"] == 714


class TestModelRegistryRollback:

    def test_set_current_changes_active_model(self, temp_registry, mock_pipeline, mock_report):
        """set_current() should change which model load_current() returns."""
        v1 = temp_registry.save(mock_pipeline, mock_report)
        mock_report["auc_roc"] = 0.80
        v2 = temp_registry.save(mock_pipeline, mock_report)
        
        # v2 is now current
        assert temp_registry.get_current_version() == v2
        
        # Roll back to v1
        temp_registry.set_current(v1)
        
        assert temp_registry.get_current_version() == v1
