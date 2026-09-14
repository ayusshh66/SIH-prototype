from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib

from ai.criticality.engine import CriticalityEngine

MODEL_METADATA_PATH = Path(__file__).resolve().parent / "artifacts" / "gradientboostingregressor_criticality_gbr_v1_metadata.json"
MODEL_ARTIFACT_PATH = Path(__file__).resolve().parent / "artifacts" / "gradientboostingregressor_criticality_gbr_v1.joblib"


def _load_model_artifact() -> dict[str, Any]:
    payload = joblib.load(MODEL_ARTIFACT_PATH)
    if not isinstance(payload, dict):
        raise TypeError("Model artifact is not a dictionary payload")
    return payload


def load_model_metadata() -> dict[str, Any]:
    """Load the stored model metadata without exposing the raw model object."""
    return json.loads(MODEL_METADATA_PATH.read_text(encoding="utf-8"))


def get_model_diagnostics() -> dict[str, Any]:
    """Read-only model summary for demonstration and inspection."""
    metadata = load_model_metadata()
    artifact = _load_model_artifact()
    model = artifact.get("model")
    feature_names = metadata.get("feature_names", [])
    importances = getattr(model, "feature_importances_", None)
    importance_values = []
    if importances is not None:
        importance_values = [float(value) for value in importances]

    return {
        "model_name": metadata.get("model_name", "GradientBoostingRegressor"),
        "model_version": metadata.get("model_version"),
        "model_type": model.__class__.__name__ if model is not None else metadata.get("model_name"),
        "dataset_size": metadata.get("dataset_size"),
        "test_mae": metadata.get("test_metrics", {}).get("mae"),
        "test_rmse": metadata.get("test_metrics", {}).get("rmse"),
        "test_r2": metadata.get("test_metrics", {}).get("r2"),
        "feature_names": feature_names,
        "feature_importance": [
            {"feature": feature, "importance": float(value)}
            for feature, value in zip(feature_names, importance_values)
        ],
    }


def _priority_from_score(score: float) -> str:
    if score >= 0.85:
        return "P1"
    if score >= 0.70:
        return "P2"
    if score >= 0.50:
        return "P3"
    return "P4"


def demo_model_prediction(task_input: dict[str, Any]) -> dict[str, Any]:
    """Return a read-only demonstration of ML inference for a single maintenance task."""
    metadata = load_model_metadata()
    artifact = _load_model_artifact()
    model = artifact.get("model")
    if model is None:
        raise ValueError("Model artifact does not contain a valid model")

    feature_names = metadata.get("feature_names", [])
    raw_features = {key: task_input.get(key) for key in feature_names}
    vector = []
    for feature in feature_names:
        value = raw_features.get(feature)
        if value is None:
            raise ValueError(f"Missing required feature for model inference: {feature}")
        vector.append(float(value))

    prediction = float(model.predict([vector])[0])
    score = max(0.0, min(1.0, prediction))

    return {
        "model_name": metadata.get("model_name"),
        "model_version": metadata.get("model_version"),
        "model_type": model.__class__.__name__,
        "input_features": raw_features,
        "predicted_criticality_score": score,
        "priority_level": _priority_from_score(score),
    }


if __name__ == "__main__":
    demo = demo_model_prediction({
        "severity": 0.75,
        "urgency": 0.8,
        "safety_risk": 0.7,
        "traffic_density": 0.6,
        "speed_class": 0.75,
        "deadline_proximity": 0.4,
    })
    print(json.dumps(demo, indent=2))
