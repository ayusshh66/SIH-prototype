"""Deterministic synthetic criticality training dataset for AVIRAT."""

from __future__ import annotations

import csv
import math
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from ai.data.generator import SyntheticDataGenerator

DATASET_VERSION = "criticality_v1"
DEFAULT_SEED = 42
FEATURE_COLUMNS = [
    "severity",
    "urgency",
    "safety_risk",
    "traffic_density",
    "speed_class",
    "deadline_proximity",
]
TARGET_COLUMN = "criticality_target"
SPLIT_COLUMN = "split"

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


def _iso_to_datetime(value: str | None) -> datetime | None:
    if value is None:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _deadline_proximity(deadline: str | None, reference_time: datetime | None = None) -> float:
    if deadline is None:
        return 0.0
    dt = _iso_to_datetime(deadline)
    if dt is None:
        return 0.0
    if reference_time is None:
        reference_time = datetime.now(timezone.utc)
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    hours_remaining = (dt - reference_time).total_seconds() / 3600.0
    if hours_remaining <= 0:
        return 1.0
    if hours_remaining <= 6:
        return 0.9
    if hours_remaining <= 24:
        return 0.7
    if hours_remaining <= 72:
        return 0.4
    return 0.1


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.5


def _speed_value_from_section(train_movements: list[dict[str, Any]], section_id: str) -> float:
    values = []
    for movement in train_movements:
        if movement.get("section_id") == section_id:
            values.append(SPEED_CLASS_MAP.get(str(movement.get("speed_class", "MEDIUM")).upper(), 0.45))
    if not values:
        return 0.45
    return max(values)


def _speed_class_from_value(value: float) -> str:
    if value >= 0.9:
        return "EXPRESS"
    if value >= 0.7:
        return "HIGH"
    if value >= 0.45:
        return "MEDIUM"
    return "LOW"


def _nonlinear_target(row: dict[str, Any]) -> float:
    sev = SEVERITY_MAP.get(str(row["severity"]).upper(), 0.45)
    urgency = _clamp(float(row["urgency"]))
    safety_risk = _clamp(float(row["safety_risk"]))
    traffic_density = _clamp(float(row["traffic_density"]))
    speed_value = SPEED_CLASS_MAP.get(str(row["speed_class"]).upper(), 0.45)
    deadline_proximity = _clamp(float(row["deadline_proximity"]))

    interaction = (
        0.20 * urgency * safety_risk
        + 0.16 * sev * speed_value
        + 0.18 * traffic_density * deadline_proximity
        + 0.10 * urgency * urgency
        + 0.08 * traffic_density * traffic_density
    )
    raw = (
        0.22 * sev
        + 0.23 * urgency
        + 0.24 * safety_risk
        + 0.14 * traffic_density
        + 0.08 * speed_value
        + 0.10 * deadline_proximity
        + interaction
    )
    target = 1.0 / (1.0 + math.exp(-(raw - 1.05)))
    return round(_clamp(target), 6)


def _generate_seed_rows(seed: int = DEFAULT_SEED, variants_per_defect: int = 10) -> list[dict[str, Any]]:
    rng = random.Random(seed)
    generator = SyntheticDataGenerator(seed=seed)
    dataset = generator.generate()
    task_by_id = {task["task_id"]: task for task in dataset.get("maintenance_tasks", [])}

    rows: list[dict[str, Any]] = []
    for defect in dataset.get("usfd_defects", []):
        section_id = defect.get("railway_section_id", "sec_01")
        task = task_by_id.get(defect.get("task_id"), {})
        traffic_base = _mean([
            float(movement.get("traffic_density", 0.5))
            for movement in dataset.get("train_movements", [])
            if movement.get("section_id") == section_id
        ])
        speed_base = _speed_value_from_section(dataset.get("train_movements", []), section_id)
        base_deadline = task.get("deadline")

        for index in range(variants_per_defect):
            urgency = _clamp(float(defect.get("urgency", 0.5)) + rng.uniform(-0.12, 0.12) + (0.04 if index % 2 else -0.02))
            safety_risk = _clamp(float(defect.get("safety_risk", 0.5)) + rng.uniform(-0.10, 0.10) + (0.02 if index % 3 == 0 else -0.01))
            traffic_density = _clamp(traffic_base + rng.uniform(-0.20, 0.20) + (0.08 if index % 4 == 0 else -0.04))
            speed = _clamp(speed_base + rng.uniform(-0.20, 0.15), 0.0, 1.0)
            speed_class = _speed_class_from_value(speed)
            deadline = base_deadline
            if deadline is not None and index % 5 == 0:
                parsed = _iso_to_datetime(deadline)
                if parsed is not None:
                    adjusted = parsed + timedelta(hours=rng.uniform(-18, 24))
                    deadline = adjusted.strftime("%Y-%m-%dT%H:%M:%SZ")
            deadline_proximity = _deadline_proximity(deadline, reference_time=datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc))

            row = {
                "entity_id": f"{defect['defect_id']}_v{index}",
                "severity": str(defect.get("severity", "MODERATE")).upper(),
                "urgency": round(urgency, 4),
                "safety_risk": round(safety_risk, 4),
                "traffic_density": round(traffic_density, 4),
                "speed_class": speed_class,
                "deadline_proximity": round(deadline_proximity, 4),
            }
            row[TARGET_COLUMN] = _nonlinear_target(row)
            rows.append(row)

    if len(rows) < 600:
        raise ValueError(f"Generated dataset too small: {len(rows)} rows")
    return rows


def _split_rows(rows: list[dict[str, Any]], train_ratio: float = 0.70, val_ratio: float = 0.15, test_ratio: float = 0.15) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    if abs(train_ratio + val_ratio + test_ratio - 1.0) > 1e-9:
        raise ValueError("Train/validation/test ratios must sum to 1.0")

    ordered = list(rows)
    ordered.sort(key=lambda row: (row["entity_id"], row["severity"]))
    total = len(ordered)
    train_n = int(total * train_ratio)
    val_n = int(total * val_ratio)
    test_n = total - train_n - val_n

    train_rows = ordered[:train_n]
    val_rows = ordered[train_n:train_n + val_n]
    test_rows = ordered[train_n + val_n:]

    for row in train_rows:
        row[SPLIT_COLUMN] = "train"
    for row in val_rows:
        row[SPLIT_COLUMN] = "validation"
    for row in test_rows:
        row[SPLIT_COLUMN] = "test"
    return train_rows, val_rows, test_rows


def _write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    fieldnames = ["entity_id", *FEATURE_COLUMNS, TARGET_COLUMN, SPLIT_COLUMN]
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})


def generate_criticality_dataset(
    seed: int = DEFAULT_SEED,
    variants_per_defect: int = 10,
    output_dir: str | Path | None = None,
    reference_time: datetime | None = None,
) -> dict[str, Any]:
    """Generate and write a deterministic synthetic criticality dataset."""
    rows = _generate_seed_rows(seed=seed, variants_per_defect=variants_per_defect)
    train_rows, val_rows, test_rows = _split_rows(rows)

    if output_dir is not None:
        out_dir = Path(output_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        dataset_path = out_dir / f"{DATASET_VERSION}_seed{seed}.csv"
        _write_csv(dataset_path, train_rows + val_rows + test_rows)
    else:
        dataset_path = None

    return {
        "seed": seed,
        "dataset_version": DATASET_VERSION,
        "variants_per_defect": variants_per_defect,
        "total_samples": len(rows),
        "train_size": len(train_rows),
        "validation_size": len(val_rows),
        "test_size": len(test_rows),
        "feature_columns": FEATURE_COLUMNS,
        "target_column": TARGET_COLUMN,
        "dataset_path": str(dataset_path) if dataset_path is not None else None,
        "rows": train_rows + val_rows + test_rows,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Generate AVIRAT criticality synthetic training dataset")
    parser.add_argument("--seed", type=int, default=DEFAULT_SEED)
    parser.add_argument("--variants-per-defect", type=int, default=10)
    parser.add_argument("--output-dir", type=str, default=str(Path(__file__).resolve().parent / "datasets"))
    args = parser.parse_args()

    report = generate_criticality_dataset(
        seed=args.seed,
        variants_per_defect=args.variants_per_defect,
        output_dir=args.output_dir,
    )
    print(f"Generated {report['total_samples']} rows to {report['dataset_path']}")
    print(f"Train={report['train_size']} Validation={report['validation_size']} Test={report['test_size']}")
