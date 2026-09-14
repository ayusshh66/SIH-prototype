from __future__ import annotations

import json
import random
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

MODEL_NAME = "Ridge"
MODEL_VERSION = "inspection_text_severity_v1"
FEATURE_METHOD = "TF-IDF Vectorizer + Ridge Regression"
TRAINING_SEED = 42

DEFAULT_DATASET_PATH = Path(__file__).resolve().parent / "data" / "inspection_remarks_seed42.csv"
DEFAULT_ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts"


def _synthetic_text_templates() -> dict[int, list[str]]:
    return {
        0: [
            "Routine track inspection shows no visible defects and no urgent maintenance need.",
            "Normal condition after routine patrol; no surface irregularity or defect noted.",
            "Track and signalling assets appear serviceable with no immediate safety concern.",
        ],
        1: [
            "Minor rail wear noted, but no active defect or operational risk to immediate service.",
            "Slight ballast irregularity on the section; monitor and document during next cycle.",
            "Low-level concern: minor surface roughness observed during inspection walkdown.",
        ],
        2: [
            "Small crack-like indication on rail surface requires close follow-up during next maintenance window.",
            "Minor fastening loosening reported; no immediate train restriction but should be monitored.",
            "Track side observation shows slight wear near the sleeper area; low urgency but recorded.",
        ],
        3: [
            "Early-stage wear detected on switch assembly; maintenance follow-up should be scheduled soon.",
            "Mild defect noted on OHE support; minor repair needed before next heavy traffic cycle.",
            "Routine inspection identified minor conductor support issue with manageable operational impact.",
        ],
        4: [
            "Visible wear on panel and fastener area warrants corrective action within the next maintenance block.",
            "Serviceable but degraded track condition: early maintenance recommended to prevent escalation.",
            "Train movement stable but inspection notes a recurring defect in the local asset cluster.",
        ],
        5: [
            "Track defect has increased in severity and should be addressed before the next traffic peak.",
            "Maintenance note flags moderate degradation in signalling support and inspection coverage area.",
            "Defect is no longer routine; moderate repair work is now required to sustain safe operations.",
        ],
        6: [
            "Multiple wear indicators observed on contact wire and support structure; urgent attention recommended.",
            "Moderate track condition concern: repair window is needed soon to avoid service disruption.",
            "Inspection reveals recurring defect pattern requiring active maintenance within the next cycle.",
        ],
        7: [
            "Severe asset deterioration observed on rail and fastening system; risk elevation is clear.",
            "Urgent maintenance required due to significant OHE degradation and safety-sensitive condition.",
            "Inspection notes a high-risk defect requiring immediate repair and operational control.",
        ],
        8: [
            "Critical defect detected with strong risk of service disruption, urgent intervention required.",
            "Safety-sensitive rail and switch condition is deteriorated; repair must be prioritised immediately.",
            "Major maintenance action required due to severe degradation and rapid worsening trend.",
        ],
        9: [
            "Very high-risk condition observed; severe cracking and support instability call for emergency response.",
            "Inspection strongly indicates dangerous defect progression; immediate maintenance intervention required.",
            "Severe operating risk with potential train conflict; asset already at emergency repair threshold.",
        ],
        10: [
            "Emergency defect: critical rail and signalling failure zone with immediate safety and service risk.",
            "Asset condition is at maximum risk; urgent emergency repair and track protection are required.",
            "Critical inspection finding: active failure likely if not addressed immediately by specialist crews.",
        ],
    }


def generate_synthetic_text_dataset(
    dataset_path: str | Path = DEFAULT_DATASET_PATH,
    *,
    seed: int = TRAINING_SEED,
    rows: int = 260,
) -> pd.DataFrame:
    """Generate a deterministic synthetic inspection-remark dataset."""
    rng = random.Random(seed)
    path = Path(dataset_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    all_templates = _synthetic_text_templates()
    records: list[dict[str, Any]] = []
    for index in range(rows):
        severity = rng.randint(0, 10)
        template_pool = all_templates.get(severity, all_templates[0])
        message = rng.choice(template_pool)
        if rng.random() < 0.25:
            message = f"{message} Additional observation: {rng.choice(['inspected during evening patrol', 'reported by field crew', 'reconfirmed at the signal tower', 'seen during routine track walk'])}."
        records.append({
            "inspection_remark": message,
            "text_severity": float(severity),
            "split": "train" if index < int(rows * 0.8) else "test",
        })

    df = pd.DataFrame(records)
    df.to_csv(path, index=False)
    return df


def train_text_severity_model(
    dataset_path: str | Path = DEFAULT_DATASET_PATH,
    *,
    seed: int = TRAINING_SEED,
    artifact_dir: str | Path | None = None,
) -> dict[str, Any]:
    path = Path(dataset_path)
    if not path.exists():
        df = generate_synthetic_text_dataset(path, seed=seed)
    else:
        df = pd.read_csv(path)

    if "inspection_remark" not in df.columns or "text_severity" not in df.columns:
        raise ValueError("Dataset must contain 'inspection_remark' and 'text_severity' columns.")

    if artifact_dir is None:
        artifact_dir = DEFAULT_ARTIFACT_DIR
    artifact_dir = Path(artifact_dir)
    artifact_dir.mkdir(parents=True, exist_ok=True)

    train_df = df[df["split"] == "train"].copy()
    test_df = df[df["split"] == "test"].copy()
    X_train = train_df["inspection_remark"].astype(str).tolist()
    y_train = train_df["text_severity"].astype(float).to_numpy()
    X_test = test_df["inspection_remark"].astype(str).tolist()
    y_test = test_df["text_severity"].astype(float).to_numpy()

    model = Pipeline([
        ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1, strip_accents="unicode")),
        ("regressor", Ridge(alpha=1.0, random_state=seed)),
    ])
    model.fit(X_train, y_train)

    test_predictions = np.clip(model.predict(X_test), 0.0, 10.0)
    test_mae = float(mean_absolute_error(y_test, test_predictions))

    artifact = {
        "model": model,
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "feature_method": FEATURE_METHOD,
        "training_seed": seed,
        "dataset_size": int(len(df)),
        "test_mae": test_mae,
        "clip_bounds": [0.0, 10.0],
    }
    artifact_path = artifact_dir / f"{MODEL_VERSION}.joblib"
    joblib.dump(artifact, artifact_path)

    metadata = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "dataset_size": int(len(df)),
        "feature_method": FEATURE_METHOD,
        "test_mae": round(test_mae, 6),
        "training_seed": seed,
        "artifact_path": str(artifact_path),
        "clip_bounds": [0.0, 10.0],
    }
    metadata_path = artifact_dir / f"{MODEL_VERSION}_metadata.json"
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    return metadata


def load_text_severity_model(model_path: str | Path | None = None) -> dict[str, Any]:
    artifact_path = Path(model_path) if model_path is not None else DEFAULT_ARTIFACT_DIR / f"{MODEL_VERSION}.joblib"
    payload = joblib.load(artifact_path)
    if not isinstance(payload, dict) or "model" not in payload:
        raise ValueError("Loaded model artifact is missing the trained model payload.")
    return payload


def predict_text_severity(remark: str, *, model_path: str | Path | None = None) -> dict[str, Any]:
    if not isinstance(remark, str) or not remark.strip():
        raise ValueError("Inspection remark must be a non-empty string.")

    artifact = load_text_severity_model(model_path)
    model = artifact["model"]
    score = float(model.predict([remark])[0])
    bounded = float(np.clip(score, 0.0, 10.0))
    return {
        "inspection_remark": remark,
        "text_severity": round(bounded, 3),
        "model_version": artifact.get("model_version", MODEL_VERSION),
    }


if __name__ == "__main__":
    dataset = generate_synthetic_text_dataset()
    metadata = train_text_severity_model(dataset_path=dataset)
    print(json.dumps(metadata, indent=2))
    demo = predict_text_severity("Severe track defect near the switch requires immediate maintenance and safety review.")
    print(json.dumps(demo, indent=2))
