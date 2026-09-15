"""Tests for sentinel/src/explainability.py SHAP-based explanations."""

import numpy as np
import pytest
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from src.explainability import explain_predictions, get_feature_attributions


FEATURE_NAMES = ["f1", "f2", "f3", "f4", "f5", "f6", "f7"]


@pytest.fixture
def linear_pipeline():
    """Fitted logistic regression pipeline."""
    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(random_state=42)),
    ])
    X = np.random.randn(100, 7)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    pipe.fit(X, y)
    return pipe


class TestGetFeatureAttributions:

    def test_returns_correct_shape(self, linear_pipeline):
        """Attributions should have shape (n_samples, n_features)."""
        X = np.random.randn(5, 7)
        
        attributions = get_feature_attributions(linear_pipeline, X, FEATURE_NAMES)
        
        assert attributions.shape == (5, 7)

    def test_attributions_are_numeric(self, linear_pipeline):
        """All attribution values should be finite numbers."""
        X = np.random.randn(3, 7)
        
        attributions = get_feature_attributions(linear_pipeline, X, FEATURE_NAMES)
        
        assert np.all(np.isfinite(attributions))


class TestExplainPredictions:

    def test_returns_list_of_lists(self, linear_pipeline):
        """explain_predictions should return nested list structure."""
        X = np.random.randn(3, 7)
        
        explanations = explain_predictions(linear_pipeline, X, FEATURE_NAMES, top_k=3)
        
        assert isinstance(explanations, list)
        assert len(explanations) == 3
        assert all(isinstance(exp, list) for exp in explanations)

    def test_top_k_limits_features(self, linear_pipeline):
        """Each explanation should have at most top_k features."""
        X = np.random.randn(2, 7)
        
        explanations = explain_predictions(linear_pipeline, X, FEATURE_NAMES, top_k=3)
        
        for exp in explanations:
            assert len(exp) <= 3

    def test_explanation_dict_format(self, linear_pipeline):
        """Each feature explanation should have 'feature' and 'contribution' keys."""
        X = np.random.randn(1, 7)
        
        explanations = explain_predictions(linear_pipeline, X, FEATURE_NAMES, top_k=2)
        
        for feat_dict in explanations[0]:
            assert "feature" in feat_dict
            assert "contribution" in feat_dict
            assert feat_dict["feature"] in FEATURE_NAMES
            assert isinstance(feat_dict["contribution"], float)

    def test_features_sorted_by_magnitude(self, linear_pipeline):
        """Features should be sorted by absolute contribution (descending)."""
        X = np.random.randn(1, 7)
        
        explanations = explain_predictions(linear_pipeline, X, FEATURE_NAMES, top_k=7)
        
        contributions = [abs(f["contribution"]) for f in explanations[0]]
        assert contributions == sorted(contributions, reverse=True)
