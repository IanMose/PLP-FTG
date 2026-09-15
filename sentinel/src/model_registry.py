"""
Model Registry — Versioned model persistence with rollback support.

Instead of overwriting a single model file, each training run produces a
timestamped artifact. A registry.json file tracks all versions and which
one is "current" for scoring.

Usage:
    registry = ModelRegistry()
    version_id = registry.save(pipe, report)  # Save with auto-generated ID
    pipe = registry.load_current()             # Load the active model
    pipe = registry.load(version_id)           # Load specific version
    registry.set_current(old_version_id)       # Rollback
"""

import json
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

import joblib


class ModelRegistry:
    """
    Manages versioned model artifacts and metadata.
    
    Directory structure:
        models/
            registry.json           # Version metadata and current pointer
            20260913_143052_abc123.pkl  # Versioned model files
            20260914_091530_def456.pkl
    """
    
    def __init__(self, models_dir: Path = Path("models")):
        self.models_dir = Path(models_dir)
        self.registry_path = self.models_dir / "registry.json"
        self.models_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_registry()
    
    def _ensure_registry(self):
        """Create registry.json if it doesn't exist."""
        if not self.registry_path.exists():
            self._write_registry({"current": None, "versions": {}})
    
    def _read_registry(self) -> dict:
        """Load registry.json."""
        with open(self.registry_path) as f:
            return json.load(f)
    
    def _write_registry(self, data: dict):
        """Write registry.json atomically."""
        tmp_path = self.registry_path.with_suffix(".tmp")
        with open(tmp_path, "w") as f:
            json.dump(data, f, indent=2)
        tmp_path.replace(self.registry_path)
    
    def _generate_version_id(self) -> str:
        """Generate a unique version ID: timestamp_gitsha."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Try to get git short SHA
        try:
            result = subprocess.run(
                ["git", "rev-parse", "--short", "HEAD"],
                capture_output=True,
                text=True,
                timeout=5,
            )
            git_sha = result.stdout.strip() if result.returncode == 0 else "nogit"
        except Exception:
            git_sha = "nogit"
        
        return f"{timestamp}_{git_sha}"
    
    def save(self, pipe, report: dict, set_as_current: bool = True) -> str:
        """
        Save a model with versioning.
        
        Args:
            pipe: Fitted sklearn Pipeline
            report: Backtest report dict (must contain metrics)
            set_as_current: If True, make this the active model for scoring
        
        Returns:
            version_id: The unique identifier for this model version
        """
        version_id = self._generate_version_id()
        pkl_path = self.models_dir / f"{version_id}.pkl"
        
        # Save the model artifact
        joblib.dump(pipe, pkl_path)
        
        # Update registry
        registry = self._read_registry()
        registry["versions"][version_id] = {
            "created_at": datetime.now().isoformat(),
            "pkl_path": str(pkl_path.name),
            "auc_roc": report.get("auc_roc"),
            "precision": report.get("precision"),
            "recall": report.get("recall"),
            "f1": report.get("f1"),
            "n_train": report.get("n_train"),
            "n_test": report.get("n_test"),
            "train_cutoff": report.get("train_cutoff"),
            "features": report.get("features"),
        }
        
        if set_as_current:
            registry["current"] = version_id
        
        self._write_registry(registry)
        return version_id
    
    def load(self, version_id: str):
        """Load a specific model version by ID."""
        registry = self._read_registry()
        
        if version_id not in registry["versions"]:
            raise FileNotFoundError(f"Model version '{version_id}' not found in registry")
        
        pkl_path = self.models_dir / registry["versions"][version_id]["pkl_path"]
        if not pkl_path.exists():
            raise FileNotFoundError(f"Model file not found: {pkl_path}")
        
        return joblib.load(pkl_path)
    
    def load_current(self):
        """Load the current (active) model version."""
        registry = self._read_registry()
        current = registry.get("current")
        
        if current is None:
            raise FileNotFoundError(
                "No current model set. Run training first or set_current() to an existing version."
            )
        
        return self.load(current)
    
    def get_current_version(self) -> Optional[str]:
        """Get the version ID of the current model."""
        registry = self._read_registry()
        return registry.get("current")
    
    def set_current(self, version_id: str):
        """Set a specific version as the current model (rollback)."""
        registry = self._read_registry()
        
        if version_id not in registry["versions"]:
            raise FileNotFoundError(f"Model version '{version_id}' not found in registry")
        
        registry["current"] = version_id
        self._write_registry(registry)
    
    def list_versions(self) -> list[str]:
        """List all available model version IDs."""
        registry = self._read_registry()
        return list(registry["versions"].keys())
    
    def get_metadata(self, version_id: str) -> dict:
        """Get metadata for a specific version."""
        registry = self._read_registry()
        
        if version_id not in registry["versions"]:
            raise FileNotFoundError(f"Model version '{version_id}' not found in registry")
        
        return registry["versions"][version_id]
