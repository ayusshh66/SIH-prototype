from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

MODEL_NAME = "GradientBoostingRegressor"
MODEL_VERSION = "criticality_gbr_v2"
TRAINING_SEED = 42
FEATURE_NAMES = [
    "severity",
    "urgency",
    "safety_risk",
    "traffic_density",
    "speed_class",
    "deadline_proximity",
    "text_severity",
]

SEVERITY_MAP = {
    "MINOR": 0.15,
    "MODERATE": 0.45,
    "SEVERE": 0.75,
    "CRITICAL": 1.00,
}

SPEED_CLASS_MAP = {
    "LOW": 0.20,
    "MEDIUM": 0.45,
    "HIGH": 0.75,
    "EXPRESS": 1.00,
}

DEFAULT_DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "datasets" / "criticality_v1_seed42.csv"
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"


def _encode_feature_values(df: pd.DataFrame) -> pd.DataFrame:
    encoded = df.copy()
    encoded["severity"] = encoded["severity"].map(SEVERITY_MAP).fillna(0.45)
    encoded["speed_class"] = encoded["speed_class"].map(SPEED_CLASS_MAP).fillna(0.45)
    return encoded


def _prepare_split(df: pd.DataFrame, split_name: str) -> tuple[np.ndarray, np.ndarray]:
    split_df = _encode_feature_values(df[df["split"] == split_name]).copy()
    X = split_df[FEATURE_NAMES].to_numpy(dtype=float)
    y = split_df["criticality_target"].to_numpy(dtype=float)
    return X, y


def _clip_prediction(values: np.ndarray) -> np.ndarray:
    return np.clip(values, 0.0, 1.0)


def _safe_metric(value: float) -> float:
    return float(np.round(value, 6))


def train_criticality_model(
    dataset_path: str | Path = DEFAULT_DATASET_PATH,
    seed: int = TRAINING_SEED,
    artifact_dir: str | Path | None = None,
) -> dict[str, Any]:
    dataset_path = Path(dataset_path)
    if artifact_dir is None:
        artifact_dir = DEFAULT_ARTIFACT_DIR
    artifact_dir = Path(artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path)
    if "split" not in df.columns:
        raise ValueError("Dataset is missing the 'split' column")

    train_df = df[df["split"] == "train"].copy()
    val_df = df[df["split"] == "validation"].copy()
    test_df = df[df["split"] == "test"].copy()

    X_train = _encode_feature_values(train_df)[FEATURE_NAMES].to_numpy(dtype=float)
    y_train = train_df["criticality_target"].to_numpy(dtype=float)
    X_val, y_val = _prepare_split(df, "validation")
    X_test, y_test = _prepare_split(df, "test")

    model = GradientBoostingRegressor(random_state=seed)
    model.fit(X_train, y_train)

    val_predictions = _clip_prediction(model.predict(X_val))
    test_predictions = _clip_prediction(model.predict(X_test))

    validation_metrics = {
        "mae": _safe_metric(mean_absolute_error(y_val, val_predictions)),
        "rmse": _safe_metric(np.sqrt(mean_squared_error(y_val, val_predictions))),
        "r2": _safe_metric(r2_score(y_val, val_predictions)),
    }
    test_metrics = {
        "mae": _safe_metric(mean_absolute_error(y_test, test_predictions)),
        "rmse": _safe_metric(np.sqrt(mean_squared_error(y_test, test_predictions))),
        "r2": _safe_metric(r2_score(y_test, test_predictions)),
    }

    artifact_payload = {
        "model": model,
        "feature_names": FEATURE_NAMES,
        "feature_mapping": {
            "severity": SEVERITY_MAP,
            "speed_class": SPEED_CLASS_MAP,
        },
        "clip_bounds": [0.0, 1.0],
    }
    model_path = artifact_dir / f"{MODEL_NAME.lower()}_{MODEL_VERSION}.joblib"
    joblib.dump(artifact_payload, model_path)

    metadata = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "feature_names": FEATURE_NAMES,
        "training_seed": seed,
        "dataset_size": int(len(df)),
        "train_sample_count": int(len(train_df)),
        "validation_sample_count": int(len(val_df)),
        "test_sample_count": int(len(test_df)),
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "dataset_path": str(dataset_path),
        "clip_bounds": [0.0, 1.0],
    }
    metadata_path = artifact_dir / f"{MODEL_NAME.lower()}_{MODEL_VERSION}_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return {
        "model_path": str(model_path),
        "metadata_path": str(metadata_path),
        "model_version": MODEL_VERSION,
        "training_seed": seed,
        "dataset_size": int(len(df)),
        "train_sample_count": int(len(train_df)),
        "validation_sample_count": int(len(val_df)),
        "test_sample_count": int(len(test_df)),
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "feature_names": FEATURE_NAMES,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the AVIRAT criticality regression model")
    parser.add_argument("--dataset-path", type=str, default=str(DEFAULT_DATASET_PATH))
    parser.add_argument("--artifact-dir", type=str, default=str(DEFAULT_ARTIFACT_DIR))
    parser.add_argument("--seed", type=int, default=TRAINING_SEED)
    args = parser.parse_args()

    report = train_criticality_model(
        dataset_path=args.dataset_path,
        seed=args.seed,
        artifact_dir=args.artifact_dir,
    )
    print(f"Model: {report['model_path']}")
    print(f"Validation MAE={report['validation_metrics']['mae']} RMSE={report['validation_metrics']['rmse']} R2={report['validation_metrics']['r2']}")
    print(f"Test MAE={report['test_metrics']['mae']} RMSE={report['test_metrics']['rmse']} R2={report['test_metrics']['r2']}")
