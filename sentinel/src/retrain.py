"""
sentinel/src/retrain.py
=======================
Trains a challenger logistic regression model using accumulated model_feedback.

Usage:
    python -m src.retrain                 # triggered by POST /api/ml/trigger-retrain
    python -m src.retrain --dry-run       # validate data without training

Steps:
    1. Fetch feedback from GET /api/ml/feedback-export
    2. Load fact_site_features from PostgreSQL
    3. Merge feedback labels into training data
    4. Train challenger pipeline
    5. Evaluate on holdout set
    6. Save PKL artifact
    7. POST /api/ml/model-registry (register challenger)
    8. POST /api/ml/training-run   (record run)
"""

import argparse
import base64
import json
import logging
import os
import sys
from datetime import datetime, date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import requests
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score, precision_score, recall_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

log = logging.getLogger(__name__)

API_BASE = os.environ.get("API_BASE", "http://localhost:8080")
SERVICE_TOKEN = os.environ.get("SERVICE_TOKEN", "")
MODELS_DIR = Path("models")
MIN_FEEDBACK = int(os.environ.get("MIN_FEEDBACK_ROWS", "5"))
TRAIN_CUTOFF = date(2026, 6, 12)

FEATURES = [
    "days_since_last_audit",
    "rejection_rate_7d",
    "rejection_rate_30d",
    "incident_count_30d",
    "incident_severity_score_30d",
    "pressure_anomaly_count_14d",
    "audit_finding_open_count",
]

# Fallback feature parquet path (for when DB table is empty)
FALLBACK_FEATURES_PATH = Path("data/warehouse/fact_site_features.parquet")


def _headers():
    """Return headers for API requests."""
    return {"X-Service-Token": SERVICE_TOKEN}


def fetch_feedback() -> pd.DataFrame:
    """
    Fetch model feedback from the backend API.
    Returns DataFrame with columns: siteId, predictionId, rating, etc.
    Exits if insufficient feedback rows are available.
    """
    log.info("Fetching feedback from %s/api/ml/feedback-export", API_BASE)
    resp = requests.get(
        f"{API_BASE}/api/ml/feedback-export",
        headers=_headers(),
        params={"excludeUncertain": "true"},
        timeout=10,
    )
    resp.raise_for_status()
    data = resp.json()

    if len(data) < MIN_FEEDBACK:
        log.warning(
            "Insufficient feedback (%d rows, minimum %d). Exiting without training.",
            len(data), MIN_FEEDBACK
        )
        sys.exit(0)

    log.info("Fetched %d feedback rows", len(data))
    return pd.DataFrame(data)


def load_features_from_db() -> pd.DataFrame:
    """
    Load fact_site_features from PostgreSQL.
    Falls back to local parquet if the DB table is empty or unavailable.
    """
    try:
        from src.db import get_connection
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT site_id, as_of_date,
                           days_since_last_audit, rejection_rate_7d,
                           rejection_rate_30d, incident_count_30d,
                           incident_severity_score_30d, pressure_anomaly_count_14d,
                           audit_finding_open_count
                    FROM fact_site_features
                    ORDER BY as_of_date
                """)
                rows = cur.fetchall()
                cols = [d[0] for d in cur.description]

        if rows:
            log.info("Loaded %d feature rows from PostgreSQL", len(rows))
            return pd.DataFrame(rows, columns=cols)
        else:
            log.warning("fact_site_features table is empty, falling back to parquet")
    except Exception as e:
        log.warning("Could not load features from DB (%s), falling back to parquet", e)

    # Fallback to local parquet
    if not FALLBACK_FEATURES_PATH.exists():
        log.error("Fallback features parquet not found at %s", FALLBACK_FEATURES_PATH)
        sys.exit(1)

    df = pd.read_parquet(FALLBACK_FEATURES_PATH)
    log.info("Loaded %d feature rows from %s", len(df), FALLBACK_FEATURES_PATH)
    return df


def load_ground_truth_labels(features_df: pd.DataFrame) -> pd.DataFrame:
    """
    Build ground truth labels from raw incidents (same logic as predict.py).
    Label = 1 if any Critical incident exists for site_id in next 7 days.
    """
    raw_incidents_path = Path("data/raw/incidents_raw.csv")
    if not raw_incidents_path.exists():
        log.warning("incidents_raw.csv not found, defaulting all labels to 0")
        features_df = features_df.copy()
        features_df["label"] = 0
        return features_df

    import re
    incidents_df = pd.read_csv(raw_incidents_path, low_memory=False)
    incidents_df["incident_date"] = pd.to_datetime(
        incidents_df["incident_date"], format="mixed", utc=True, errors="coerce"
    )

    def _norm_site(s):
        if not isinstance(s, str):
            return None
        c = s.strip().upper()
        return c if re.match(r"^SITE-\d{3}$", c) else None

    incidents_df["site"] = incidents_df["site"].apply(_norm_site)

    # Filter to Critical severity only
    sev_map = {
        "hi": "High", "high": "High",
        "med": "Medium", "medium": "Medium",
        "lo": "Low", "low": "Low",
        "crit": "Critical", "critical": "Critical",
    }
    incidents_df["severity"] = (
        incidents_df["severity"]
        .fillna("")
        .str.strip()
        .str.lower()
        .map(lambda s: sev_map.get(s, s.capitalize()) if s else None)
    )
    crit_df = incidents_df[
        (incidents_df["site"].notna()) &
        (incidents_df["site"] != "SITE-007") &
        (incidents_df["severity"] == "Critical")
    ].copy()

    # Build labels
    df = features_df.copy()
    df["as_of_date"] = pd.to_datetime(df["as_of_date"])

    labels = []
    for _, row in df.iterrows():
        ao = pd.Timestamp(row["as_of_date"], tz="UTC")
        fwd = ao + pd.Timedelta(days=7)
        hit = (
            (crit_df["site"] == row["site_id"].upper()) &
            (crit_df["incident_date"] > ao) &
            (crit_df["incident_date"] <= fwd)
        ).any()
        labels.append(int(hit))

    df["label"] = labels
    return df


def merge_feedback(features_df: pd.DataFrame, feedback_df: pd.DataFrame) -> pd.DataFrame:
    """
    Merge feedback labels into the feature dataset.
    'accurate'   -> keep original label (no change)
    'inaccurate' -> flip the label
    Rows with no feedback retain their original ground truth label.
    """
    # First, build ground truth labels
    df = load_ground_truth_labels(features_df)

    # Build lookup: site_id -> list of ratings
    feedback_lookup = {}
    for _, fb_row in feedback_df.iterrows():
        site_id = fb_row.get("siteId", "").lower()
        rating = fb_row.get("rating", "")
        if site_id and rating:
            feedback_lookup.setdefault(site_id, []).append(rating)

    def apply_feedback(row):
        site_id = row["site_id"].lower()
        site_ratings = feedback_lookup.get(site_id, [])
        if not site_ratings:
            return row["label"]
        inaccurate_count = site_ratings.count("inaccurate")
        accurate_count = site_ratings.count("accurate")
        if inaccurate_count > accurate_count:
            return 1 - row["label"]  # flip
        return row["label"]

    df["label"] = df.apply(apply_feedback, axis=1)
    log.info("Merged feedback: %d sites had feedback applied", len(feedback_lookup))
    return df


def train(enriched: pd.DataFrame) -> tuple:
    """
    Time-split train/test and fit a LogisticRegression pipeline.

    Returns:
        (pipeline, metrics_dict, feature_importance_dict, n_train_rows)
    """
    train_df = enriched[enriched["as_of_date"] < pd.Timestamp(TRAIN_CUTOFF)].copy()
    test_df = enriched[enriched["as_of_date"] >= pd.Timestamp(TRAIN_CUTOFF)].copy()

    if train_df.empty or test_df.empty:
        log.error("Insufficient data for train/test split. Exiting.")
        sys.exit(1)

    # Impute nulls
    X_train = train_df[FEATURES].fillna({"days_since_last_audit": 999})
    y_train = train_df["label"]
    X_test = test_df[FEATURES].fillna({"days_since_last_audit": 999})
    y_test = test_df["label"]

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("model", LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)),
    ])
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    metrics = {
        "precision": float(precision_score(y_test, y_pred, zero_division=0)),
        "recall": float(recall_score(y_test, y_pred, zero_division=0)),
        "f1": float(f1_score(y_test, y_pred, zero_division=0)),
    }
    log.info("Challenger metrics: P=%.3f R=%.3f F1=%.3f",
             metrics["precision"], metrics["recall"], metrics["f1"])

    # Feature importance (absolute coefficient, normalised)
    coefs = np.abs(pipeline["model"].coef_[0])
    feature_importance = dict(zip(FEATURES, (coefs / coefs.sum()).round(4).tolist()))

    return pipeline, metrics, feature_importance, len(train_df)


def get_next_version() -> str:
    """Get the next version string based on existing registry entries."""
    try:
        resp = requests.get(f"{API_BASE}/api/ml/model-registry", headers=_headers(), timeout=5)
        resp.raise_for_status()
        existing = resp.json()
        return f"logreg_v{len(existing) + 1}"
    except Exception as e:
        log.warning("Could not fetch registry for versioning (%s), defaulting to v2", e)
        return "logreg_v2"


def register(pipeline, version: str, metrics: dict, feature_importance: dict,
             n_rows: int, n_feedback: int) -> str:
    """
    Save the model artifact and register it in the model registry.
    Returns the model ID from the registry.
    """
    MODELS_DIR.mkdir(exist_ok=True)
    artifact_path = MODELS_DIR / f"{version}.pkl"
    joblib.dump(pipeline, artifact_path)
    log.info("Saved model artifact to %s", artifact_path)

    # Base64-encode for DB storage (ephemeral filesystem safety)
    with open(artifact_path, "rb") as f:
        artifact_blob = base64.b64encode(f.read()).decode("utf-8")

    payload = {
        "version": version,
        "algorithm": "logistic_regression",
        "precisionScore": metrics["precision"],
        "recallScore": metrics["recall"],
        "f1Score": metrics["f1"],
        "artifactPath": str(artifact_path),
        "artifactBlob": artifact_blob,
        "featureImportance": json.dumps(feature_importance),
        "notes": f"Trained on {n_rows} rows + {n_feedback} feedback rows",
    }

    resp = requests.post(
        f"{API_BASE}/api/ml/model-registry",
        json=payload,
        headers=_headers(),
        timeout=10,
    )
    resp.raise_for_status()
    model_id = resp.json().get("id", "unknown")
    log.info("Registered challenger in model registry (id=%s)", model_id)
    return model_id


def record_run(model_id: str, n_rows: int, n_feedback: int, started_at: str) -> None:
    """Record the training run in the backend."""
    payload = {
        "modelRegistryId": model_id,
        "triggeredBy": "manual",
        "rowsUsed": n_rows,
        "feedbackRowsUsed": n_feedback,
        "startedAt": started_at,
        "completedAt": datetime.utcnow().isoformat(),
        "notes": "Challenger registered by retrain.py",
    }
    try:
        resp = requests.post(
            f"{API_BASE}/api/ml/training-run",
            json=payload,
            headers=_headers(),
            timeout=10,
        )
        resp.raise_for_status()
        log.info("Recorded training run")
    except Exception as e:
        log.warning("Could not record training run: %s", e)


def main(dry_run: bool = False) -> None:
    """Main entry point for the retraining pipeline."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    started_at = datetime.utcnow().isoformat()

    log.info("retrain.py starting — API_BASE=%s", API_BASE)

    # Step 1: Fetch feedback
    feedback_df = fetch_feedback()

    # Step 2: Load features
    features_df = load_features_from_db()

    # Step 3: Merge feedback into training data
    enriched = merge_feedback(features_df, feedback_df)

    if dry_run:
        log.info("Dry run — data looks good (%d rows). Exiting without training.", len(enriched))
        return

    # Step 4-5: Train and evaluate
    pipeline, metrics, feature_importance, n_rows = train(enriched)

    # Step 6-7: Save and register
    version = get_next_version()
    model_id = register(pipeline, version, metrics, feature_importance, n_rows, len(feedback_df))

    # Step 8: Record training run
    record_run(model_id, n_rows, len(feedback_df), started_at)

    log.info("Challenger %s registered (id=%s). F1=%.3f", version, model_id[:8] if model_id else "?", metrics["f1"])


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sentinel Model Retraining")
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate data without training or registering")
    args = parser.parse_args()
    main(dry_run=args.dry_run)
