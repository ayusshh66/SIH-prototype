from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from ai.data.criticality_dataset import DEFAULT_SEED, generate_criticality_dataset


if __name__ == "__main__":
    output_dir = Path(__file__).resolve().parent / "datasets"
    report = generate_criticality_dataset(seed=DEFAULT_SEED, variants_per_defect=10, output_dir=output_dir)
    print(f"Saved dataset to {report['dataset_path']}")
    print(f"Splits: train={report['train_size']}, validation={report['validation_size']}, test={report['test_size']}")
