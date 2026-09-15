"""
Explainability — SHAP-based feature attribution for any model type.

Provides a unified interface for explaining predictions from both linear
models (LogisticRegression) and tree-based models (XGBoost, RandomForest).

For linear models: Uses SHAP LinearExplainer (mathematically equivalent to
the manual X_scaled * coef decomposition, but in a standard interface).

For tree models: Uses SHAP TreeExplainer.

Output format matches the existing top_features contract:
    [{"feature": "name", "contribution": 0.123}, ...]
"""

import numpy as np
import shap
from sklearn.pipeline import Pipeline


def _get_explainer(pipe: Pipeline, X_background: np.ndarray):
    """
    Create the appropriate SHAP explainer for the model type.
    
    Args:
        pipe: Fitted sklearn Pipeline with a final estimator
        X_background: Background data for explainer (ALREADY TRANSFORMED through preprocessing)
    
    Returns:
        SHAP Explainer instance
    """
    # Get the final estimator
    clf = pipe.steps[-1][1]
    clf_name = type(clf).__name__.lower()
    
    # Note: X_background is already transformed through preprocessing steps
    # in get_feature_attributions() before being passed here
    
    # Select explainer based on model type
    if "xgb" in clf_name or "randomforest" in clf_name or "gradient" in clf_name:
        return shap.TreeExplainer(clf)
    elif "logistic" in clf_name or "linear" in clf_name:
        return shap.LinearExplainer(clf, X_background)
    else:
        # Fallback to KernelExplainer (slower but works for any model)
        return shap.KernelExplainer(clf.predict_proba, X_background)


def get_feature_attributions(
    pipe: Pipeline,
    X: np.ndarray,
    feature_names: list[str],
) -> np.ndarray:
    """
    Compute SHAP values for each prediction.
    
    Args:
        pipe: Fitted sklearn Pipeline
        X: Input features (n_samples, n_features)
        feature_names: List of feature names
    
    Returns:
        SHAP values array (n_samples, n_features)
    """
    # Transform X through the pipeline's preprocessing steps
    X_transformed = X.copy()
    for name, step in pipe.steps[:-1]:  # All steps except final estimator
        if step is not None:
            X_transformed = step.transform(X_transformed)
    
    # Create explainer with a sample of the data as background
    # Use min(100, len(X)) to avoid excessive computation
    background_size = min(100, len(X))
    X_background = X_transformed[:background_size]
    
    explainer = _get_explainer(pipe, X_background)
    
    # Compute SHAP values
    shap_values = explainer.shap_values(X_transformed)
    
    # For binary classification, shap_values may be a list [class_0, class_1]
    # We want class 1 (positive class) attributions
    if isinstance(shap_values, list):
        shap_values = shap_values[1]
    
    return shap_values


def explain_predictions(
    pipe: Pipeline,
    X: np.ndarray,
    feature_names: list[str],
    top_k: int = 3,
) -> list[list[dict]]:
    """
    Generate per-prediction explanations in the top_features format.
    
    Args:
        pipe: Fitted sklearn Pipeline
        X: Input features (n_samples, n_features)
        feature_names: List of feature names
        top_k: Number of top features to include per prediction
    
    Returns:
        List of explanations, one per sample. Each explanation is a list of dicts:
        [{"feature": "name", "contribution": 0.123}, ...]
        sorted by absolute contribution (descending).
    """
    shap_values = get_feature_attributions(pipe, X, feature_names)
    
    explanations = []
    for i in range(len(X)):
        sample_shap = shap_values[i]
        
        # Pair features with their SHAP values
        feature_contribs = list(zip(feature_names, sample_shap))
        
        # Sort by absolute contribution (descending)
        feature_contribs.sort(key=lambda x: abs(x[1]), reverse=True)
        
        # Take top K and format as dicts
        top_features = [
            {"feature": name, "contribution": round(float(contrib), 4)}
            for name, contrib in feature_contribs[:top_k]
        ]
        
        explanations.append(top_features)
    
    return explanations
