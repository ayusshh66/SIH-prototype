from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "datasets" / "criticality_v1_seed42.csv"
MODEL_ARTIFACT_PATH = Path(__file__).resolve().parent / "artifacts" / "gradientboostingregressor_criticality_gbr_v1.joblib"
MODEL_METADATA_PATH = Path(__file__).resolve().parent / "artifacts" / "gradientboostingregressor_criticality_gbr_v1_metadata.json"
REPORT_PATH = Path(__file__).resolve().parent / "reports" / "criticality_model_evaluation_report.json"

FEATURE_NAMES = [
    "severity",
    "urgency",
    "safety_risk",
    "traffic_density",
    "speed_class",
    "deadline_proximity",
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

RULE_WEIGHTS = {
    "severity": 0.28,
    "urgency": 0.22,
    "safety_risk": 0.22,
    "traffic_density": 0.12,
    "speed_class": 0.08,
    "deadline_proximity": 0.08,
}


def _encode_numeric_features(frame: pd.DataFrame) -> pd.DataFrame:
    encoded = frame.copy()
    encoded["severity"] = encoded["severity"].map(SEVERITY_MAP).fillna(0.45)
    encoded["speed_class"] = encoded["speed_class"].map(SPEED_CLASS_MAP).fillna(0.45)
    return encoded


def _rule_based_score_vector(row: dict[str, Any]) -> float:
    score = (
        RULE_WEIGHTS["severity"] * SEVERITY_MAP.get(str(row["severity"]).upper(), 0.45)
        + RULE_WEIGHTS["urgency"] * float(row["urgency"])
        + RULE_WEIGHTS["safety_risk"] * float(row["safety_risk"])
        + RULE_WEIGHTS["traffic_density"] * float(row["traffic_density"])
        + RULE_WEIGHTS["speed_class"] * SPEED_CLASS_MAP.get(str(row["speed_class"]).upper(), 0.45)
        + RULE_WEIGHTS["deadline_proximity"] * float(row["deadline_proximity"])
    )
    return float(np.clip(score, 0.0, 1.0))


def _load_model_artifact(path: Path) -> Any:
    payload = joblib.load(path)
    if isinstance(payload, dict):
        return payload.get("model")
    return payload


def _select_examples(frame: pd.DataFrame, sample_count: int = 10) -> list[dict[str, Any]]:
    sample = frame.sample(n=min(sample_count, len(frame)), random_state=42, replace=False)
    return sample.to_dict(orient="records")


def evaluate_criticality_model(
    dataset_path: str | Path = DATASET_PATH,
    model_artifact_path: str | Path = MODEL_ARTIFACT_PATH,
    report_path: str | Path = REPORT_PATH,
) -> dict[str, Any]:
    dataset_path = Path(dataset_path)
    model_artifact_path = Path(model_artifact_path)
    report_path = Path(report_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)

    df = pd.read_csv(dataset_path)
    test_df = df[df["split"] == "test"].copy()

    if len(test_df) == 0:
        raise ValueError("No test rows found in the dataset")

    model = _load_model_artifact(model_artifact_path)
    if model is None:
        raise ValueError(f"Model artifact missing or invalid: {model_artifact_path}")

    encoded = _encode_numeric_features(test_df)
    X_test = encoded[FEATURE_NAMES].copy()
    X_test["severity"] = X_test["severity"].astype(float)
    X_test["speed_class"] = X_test["speed_class"].astype(float)
    y_true = encoded["criticality_target"].to_numpy(dtype=float)
    ml_predictions = np.clip(model.predict(X_test[FEATURE_NAMES].to_numpy(dtype=float)), 0.0, 1.0)

    rule_scores = []
    for row in encoded.to_dict(orient="records"):
        rule_scores.append(_rule_based_score_vector(row))
    rule_scores = np.asarray(rule_scores, dtype=float)

    mae = mean_absolute_error(y_true, ml_predictions)
    rmse = np.sqrt(mean_squared_error(y_true, ml_predictions))
    r2 = r2_score(y_true, ml_predictions)
    avg_ml_vs_rule_diff = float(np.mean(np.abs(ml_predictions - rule_scores)))

    feature_importances = model.feature_importances_
    feature_importance_pairs = [
        {"feature": feature_name, "importance": float(importance)}
        for feature_name, importance in zip(FEATURE_NAMES, feature_importances)
    ]
    feature_importance_pairs.sort(key=lambda item: item["importance"], reverse=True)
    top_3 = feature_importance_pairs[:3]

    example_rows = []
    for row in _select_examples(encoded, 10):
        ml_pred = float(np.clip(model.predict([[
            SEVERITY_MAP.get(str(row["severity"]).upper(), 0.45),
            float(row["urgency"]),
            float(row["safety_risk"]),
            float(row["traffic_density"]),
            SPEED_CLASS_MAP.get(str(row["speed_class"]).upper(), 0.45),
            float(row["deadline_proximity"]),
        ]])[0], 0.0, 1.0))
        rule_score = _rule_based_score_vector(row)
        example_rows.append({
            "entity_id": row.get("entity_id"),
            "features": {
                "severity": row.get("severity"),
                "urgency": float(row.get("urgency")),
                "safety_risk": float(row.get("safety_risk")),
                "traffic_density": float(row.get("traffic_density")),
                "speed_class": row.get("speed_class"),
                "deadline_proximity": float(row.get("deadline_proximity")),
            },
            "rule_based_score": round(float(rule_score), 6),
            "ml_prediction": round(float(ml_pred), 6),
            "absolute_difference": round(float(abs(ml_pred - rule_score)), 6),
        })

    output = {
        "dataset_path": str(dataset_path),
        "model_artifact_path": str(model_artifact_path),
        "model_name": "GradientBoostingRegressor",
        "model_version": "criticality_gbr_v1",
        "seed": 42,
        "train_sample_count": int((pd.read_csv(dataset_path))[pd.read_csv(dataset_path)["split"] == "train"].shape[0]),
        "validation_sample_count": int((pd.read_csv(dataset_path))[pd.read_csv(dataset_path)["split"] == "validation"].shape[0]),
        "test_sample_count": int(len(test_df)),
        "metrics": {
            "mae": float(mae),
            "rmse": float(rmse),
            "r2": float(r2),
        },
        "ml_vs_rule_based": {
            "average_absolute_difference": float(avg_ml_vs_rule_diff),
        },
        "feature_importance": feature_importance_pairs,
        "top_3_important_features": top_3,
        "representative_examples": example_rows,
    }
    report_path.write_text(json.dumps(output, indent=2), encoding="utf-8")
    return output


if __name__ == "__main__":
    result = evaluate_criticality_model()
    print(json.dumps({
        "test_mae": result["metrics"]["mae"],
        "test_rmse": result["metrics"]["rmse"],
        "test_r2": result["metrics"]["r2"],
        "average_ml_vs_rule_based_difference": result["ml_vs_rule_based"]["average_absolute_difference"],
        "top_3_important_features": result["top_3_important_features"],
        "report_path": str(REPORT_PATH),
    }, indent=2))
