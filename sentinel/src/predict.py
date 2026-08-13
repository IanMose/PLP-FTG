"""
Sentinel — Predictive Model (Stage B)
======================================
Trains a logistic regression classifier that outputs the probability of a
Critical incident occurring at a site within the next 7 days.

Label definition:
    label = 1  if ANY incident with severity == 'Critical' exists for that
               site_id in (as_of_date, as_of_date + 7 days]
    label = 0  otherwise

Why 7-day window instead of the plan's 30-day?
    The raw data has ~6 181 incidents with 2 449 High/Critical spread across
    6 sites over 3+ years. A 30-day forward window yields a 97.5% positive rate
    (every site has an H/C incident somewhere in the next 30 days). That gives a
    trivial model that always predicts 1.  A 7-day Critical-only window yields
    51% positive overall — nearly balanced — with strong site differentiation:
    SITE-003=92%, SITE-006=75% vs SITE-004=27%, SITE-001=34%.
    This is documented in backtest_report.json as label_definition.

Time split:
    train: as_of_date < 2026-06-12   (~2/3 of the 180-day window, 714 rows)
    test:  as_of_date >= 2026-06-12  (~1/3, 366 rows)
    Never shuffle before splitting — forward simulation of real deployment.

Missing value imputation:
    days_since_last_audit: NULL → 999 (sentinel for "never audited")
    All other feature columns are fully populated by Stage A.

Usage:
    python -m src.predict                    # train + score (default)
    python -m src.predict --train            # rebuild model from scratch
    python -m src.predict --score            # score using existing pkl
"""

import argparse
import json
import re
import warnings
from datetime import date
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score, precision_score, recall_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

# ── Config ───────────────────────────────────────────────────────────────────
FEATURES = [
    "days_since_last_audit",
    "rejection_rate_7d",
    "rejection_rate_30d",
    "incident_count_30d",
    "incident_severity_score_30d",
    "pressure_anomaly_count_14d",
    "audit_finding_open_count",
]

MODEL_VERSION = "logreg_v1"
MODEL_PATH = Path("models/logreg_v1.pkl")

# Label: any Critical incident in next N days
LABEL_DAYS = 7
LABEL_SEVERITY = "Critical"

# Null sentinel for days_since_last_audit
NULL_AUDIT_SENTINEL = 999

# Time split cutoff — day 120 of the 180-day window
TRAIN_CUTOFF = date(2026, 6, 12)

RAW_DIR = Path("data/raw")
WAREHOUSE_DIR = Path("data/warehouse")


# ── Label construction ────────────────────────────────────────────────────────

def _load_incidents_for_labelling(raw_dir: Path) -> pd.DataFrame:
    """
    Load raw incidents, normalise site IDs and severity, return all records.
    Uses the full raw CSV (not the warehouse parquet) to avoid data leakage
    through the quality gate — we want ground-truth incident occurrence
    regardless of data quality decision.
    """
    df = pd.read_csv(raw_dir / "incidents_raw.csv", low_memory=False)
    df["incident_date"] = pd.to_datetime(
        df["incident_date"], format="mixed", utc=True, errors="coerce"
    )

    def _norm_site(s):
        if not isinstance(s, str):
            return None
        c = s.strip().upper()
        return c if re.match(r"^SITE-\d{3}$", c) else None

    df["site"] = df["site"].apply(_norm_site)
    df = df[df["site"].notna() & (df["site"] != "SITE-007")].copy()

    sev_map = {
        "hi": "High", "high": "High",
        "med": "Medium", "medium": "Medium",
        "lo": "Low", "low": "Low",
        "crit": "Critical", "critical": "Critical",
    }
    df["severity"] = (
        df["severity"]
        .fillna("")
        .str.strip()
        .str.lower()
        .map(lambda s: sev_map.get(s, s.capitalize()) if s else None)
    )
    return df[df["severity"] == LABEL_SEVERITY].copy()


def build_labels(features_df: pd.DataFrame, raw_dir: Path = RAW_DIR) -> pd.DataFrame:
    """
    Add a binary label column to the feature DataFrame via a forward-looking
    7-day join on Critical incidents.

    label = 1  if a Critical incident exists for site_id in
               (as_of_date, as_of_date + 7 days]
    label = 0  otherwise
    """
    crit_df = _load_incidents_for_labelling(raw_dir)
    df = features_df.copy()
    df["as_of_date"] = pd.to_datetime(df["as_of_date"])

    labels = []
    for _, row in df.iterrows():
        ao = pd.Timestamp(row["as_of_date"], tz="UTC")
        fwd = ao + pd.Timedelta(days=LABEL_DAYS)
        hit = (
            (crit_df["site"] == row["site_id"]) &
            (crit_df["incident_date"] > ao) &
            (crit_df["incident_date"] <= fwd)
        ).any()
        labels.append(int(hit))

    df["label"] = labels
    return df


# ── Training ──────────────────────────────────────────────────────────────────

def _impute(df: pd.DataFrame) -> pd.DataFrame:
    """Fill NULL days_since_last_audit with the sentinel value 999."""
    out = df.copy()
    out["days_since_last_audit"] = out["days_since_last_audit"].fillna(NULL_AUDIT_SENTINEL)
    return out


def train_model(
    features_with_labels: pd.DataFrame,
    cutoff: date = TRAIN_CUTOFF,
) -> tuple:
    """
    Time-split train/test. Fit a Pipeline(StandardScaler + LogisticRegression).

    Returns:
        (fitted_pipeline, backtest_report_dict)
    """
    df = _impute(features_with_labels)
    df["as_of_date"] = pd.to_datetime(df["as_of_date"])
    cutoff_ts = pd.Timestamp(cutoff)

    train_df = df[df["as_of_date"] < cutoff_ts]
    test_df  = df[df["as_of_date"] >= cutoff_ts]

    X_train = train_df[FEATURES].values
    y_train = train_df["label"].values
    X_test  = test_df[FEATURES].values
    y_test  = test_df["label"].values

    pipe = Pipeline([
        ("scaler", StandardScaler()),
        ("clf",    LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            random_state=42,
            solver="lbfgs",
        )),
    ])

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        pipe.fit(X_train, y_train)

    report = evaluate_model(pipe, X_test, y_test, train_df, test_df)
    return pipe, report


def evaluate_model(pipe, X_test, y_test, train_df: pd.DataFrame, test_df: pd.DataFrame) -> dict:
    """Compute precision, recall, F1 and return a structured backtest report."""
    y_pred = pipe.predict(X_test)
    y_prob = pipe.predict_proba(X_test)[:, 1]

    prec   = float(precision_score(y_test, y_pred, zero_division=0))
    rec    = float(recall_score(y_test, y_pred, zero_division=0))
    f1     = float(f1_score(y_test, y_pred, zero_division=0))

    # Feature importances from standardised logistic coefficients
    scaler = pipe.named_steps["scaler"]
    clf    = pipe.named_steps["clf"]
    raw_coef = clf.coef_[0]
    std_coef = np.abs(raw_coef) * scaler.scale_  # unstandardise for magnitude
    importances = std_coef / std_coef.sum() if std_coef.sum() > 0 else std_coef

    feat_importance = [
        {
            "name": name,
            "importance": round(float(imp), 4),
            "direction": "positive" if coef > 0 else "negative",
            "coefficient": round(float(coef), 4),
        }
        for name, imp, coef in sorted(
            zip(FEATURES, importances, raw_coef),
            key=lambda x: -x[1],
        )
    ]

    report = {
        "model_version":        MODEL_VERSION,
        "label_definition":     f"Any Critical incident in next {LABEL_DAYS} days",
        "label_severity":       LABEL_SEVERITY,
        "label_days":           LABEL_DAYS,
        "train_cutoff":         str(TRAIN_CUTOFF),
        "null_audit_sentinel":  NULL_AUDIT_SENTINEL,
        "features":             FEATURES,
        "n_train":              len(train_df),
        "n_test":               len(test_df),
        "positive_rate_train":  round(float(train_df["label"].mean()), 4),
        "positive_rate_test":   round(float(test_df["label"].mean()), 4),
        "precision":            round(prec, 4),
        "recall":               round(rec, 4),
        "f1":                   round(f1, 4),
        "feature_importances":  feat_importance,
        "classification_report": classification_report(y_test, y_pred, output_dict=True),
    }
    return report


# ── Persistence ───────────────────────────────────────────────────────────────

def save_model(pipe, path: Path = MODEL_PATH):
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, path)


def load_model(path: Path = MODEL_PATH):
    if not path.exists():
        raise FileNotFoundError(
            f"Model artifact not found at {path}. "
            "Run 'python -m src.predict --train' to train first."
        )
    return joblib.load(path)


# ── Scoring ───────────────────────────────────────────────────────────────────

def score_current_sites(features_df: pd.DataFrame, pipe) -> pd.DataFrame:
    """
    Score the most recent as_of_date row for each site.

    Returns a DataFrame with columns:
        site_id, as_of_date, incident_probability_7d, model_version, top_features
    """
    df = _impute(features_df.copy())
    df["as_of_date"] = pd.to_datetime(df["as_of_date"])

    # Take the latest snapshot per site
    latest = df.loc[df.groupby("site_id")["as_of_date"].idxmax()].copy()

    X = latest[FEATURES].values
    probs = pipe.predict_proba(X)[:, 1]

    # Per-prediction top-3 contributing features
    scaler = pipe.named_steps["scaler"]
    clf    = pipe.named_steps["clf"]
    X_scaled = scaler.transform(X)
    contributions = X_scaled * clf.coef_[0]  # shape: (n_sites, n_features)

    top_features_list = []
    for contribs in contributions:
        top3_idx = np.argsort(np.abs(contribs))[::-1][:3]
        top3 = [
            {"feature": FEATURES[i], "contribution": round(float(contribs[i]), 4)}
            for i in top3_idx
        ]
        top_features_list.append(json.dumps(top3))

    result = latest[["site_id", "as_of_date"]].copy()
    result["incident_probability_7d"]  = np.round(probs, 4)
    result["model_version"]            = MODEL_VERSION
    result["top_features"]             = top_features_list
    result = result.reset_index(drop=True)
    return result


# ── JSON sidecar for backend ──────────────────────────────────────────────────

def write_predictions_json(preds_df: pd.DataFrame, output_dir: Path = WAREHOUSE_DIR):
    """
    Write predictions_export.json alongside the parquet file.
    The Spring Boot EtlReloadService reads this to upsert predictions into
    the fact_predictions DB table (avoids a Java Parquet dependency).
    """
    records = []
    for _, row in preds_df.iterrows():
        records.append({
            "site_id":                row["site_id"],
            "as_of_date":             str(row["as_of_date"])[:10],
            "incident_probability_7d": float(row["incident_probability_7d"]),
            "model_version":          row["model_version"],
            "top_features":           row["top_features"],
        })
    path = output_dir / "predictions_export.json"
    path.write_text(json.dumps(records, indent=2))
    return path


# ── Feature importance JSON ───────────────────────────────────────────────────

def write_feature_importance(report: dict, output_dir: Path = WAREHOUSE_DIR):
    """Write feature_importance.json from the backtest report."""
    fi = {
        "model_version": report["model_version"],
        "label_definition": report["label_definition"],
        "features": report["feature_importances"],
    }
    path = output_dir / "feature_importance.json"
    path.write_text(json.dumps(fi, indent=2))
    return path


# ── CLI ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Sentinel Predictive Model — train and/or score"
    )
    parser.add_argument(
        "--train", action="store_true",
        help="Rebuild model from scratch, write pkl + backtest_report.json"
    )
    parser.add_argument(
        "--score", action="store_true",
        help="Load existing pkl, score current features, write fact_predictions.parquet"
    )
    parser.add_argument(
        "--features-path", type=str,
        default=str(WAREHOUSE_DIR / "fact_site_features.parquet"),
        help="Path to fact_site_features.parquet"
    )
    parser.add_argument(
        "--raw-dir", type=str, default=str(RAW_DIR),
        help="Path to raw CSV directory (for label construction)"
    )
    parser.add_argument(
        "--output-dir", type=str, default=str(WAREHOUSE_DIR),
        help="Warehouse output directory"
    )
    args = parser.parse_args()

    # Default: do both if neither flag given
    do_train = args.train or (not args.train and not args.score)
    do_score = args.score or (not args.train and not args.score)

    raw_dir    = Path(args.raw_dir)
    output_dir = Path(args.output_dir)
    feat_path  = Path(args.features_path)

    if not feat_path.exists():
        print(f"ERROR: Feature table not found at {feat_path}")
        print("Run 'python -m src.features' first.")
        raise SystemExit(1)

    features_df = pd.read_parquet(feat_path)
    print(f"Loaded {len(features_df)} feature rows from {feat_path}")

    if do_train:
        print("\n[TRAIN] Building labels...")
        features_with_labels = build_labels(features_df, raw_dir)
        pos_rate = features_with_labels["label"].mean()
        print(f"  Label positive rate: {pos_rate:.3f}  "
              f"({features_with_labels['label'].sum()} of {len(features_with_labels)} rows)")

        print("[TRAIN] Fitting LogisticRegression (balanced, time-split)...")
        pipe, report = train_model(features_with_labels, TRAIN_CUTOFF)

        print(f"  Train: {report['n_train']} rows  pos={report['positive_rate_train']:.3f}")
        print(f"  Test:  {report['n_test']} rows  pos={report['positive_rate_test']:.3f}")
        print(f"  Precision: {report['precision']:.3f}")
        print(f"  Recall:    {report['recall']:.3f}")
        print(f"  F1:        {report['f1']:.3f}")

        save_model(pipe, MODEL_PATH)
        print(f"  Model saved → {MODEL_PATH}")

        report_path = output_dir / "backtest_report.json"
        report_path.write_text(json.dumps(report, indent=2))
        print(f"  Backtest report → {report_path}")

        fi_path = write_feature_importance(report, output_dir)
        print(f"  Feature importance → {fi_path}")

        print("\nTop features by standardised importance:")
        for f in report["feature_importances"][:4]:
            bar = "█" * int(f["importance"] * 40)
            print(f"  {f['name']:35s}  {f['importance']:.4f}  {bar}")

    if do_score:
        print("\n[SCORE] Loading model...")
        pipe = load_model(MODEL_PATH)

        preds_df = score_current_sites(features_df, pipe)
        preds_path = output_dir / "fact_predictions.parquet"
        preds_df.to_parquet(preds_path, index=False)
        json_path = write_predictions_json(preds_df, output_dir)
        print(f"  Scored {len(preds_df)} sites → {preds_path}")
        print(f"  JSON export → {json_path}")
        print()
        display = preds_df[["site_id", "incident_probability_7d"]].copy()
        display["risk"] = display["incident_probability_7d"].apply(
            lambda p: "HIGH" if p >= 0.70 else ("MODERATE" if p >= 0.40 else "LOW")
        )
        print(display.to_string(index=False))


if __name__ == "__main__":
    main()
