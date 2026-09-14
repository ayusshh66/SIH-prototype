from __future__ import annotations

import csv
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.data.criticality_dataset import (
    DEFAULT_SEED,
    FEATURE_COLUMNS,
    TARGET_COLUMN,
    generate_criticality_dataset,
)


class TestCriticalityDataset(unittest.TestCase):
    def test_dataset_generation_and_split_sizes(self):
        report = generate_criticality_dataset(seed=DEFAULT_SEED, variants_per_defect=10)
        self.assertGreaterEqual(report["total_samples"], 600)
        self.assertEqual(report["train_size"] + report["validation_size"] + report["test_size"], report["total_samples"])
        self.assertEqual(report["train_size"], 560)
        self.assertEqual(report["validation_size"], 120)
        self.assertEqual(report["test_size"], 120)

    def test_required_features_and_target_range(self):
        report = generate_criticality_dataset(seed=DEFAULT_SEED, variants_per_defect=10)
        for row in report["rows"][:20]:
            self.assertTrue(set(FEATURE_COLUMNS).issubset(row.keys()))
            self.assertIn(row["speed_class"], {"LOW", "MEDIUM", "HIGH", "EXPRESS"})
            self.assertGreaterEqual(row[TARGET_COLUMN], 0.0)
            self.assertLessEqual(row[TARGET_COLUMN], 1.0)

    def test_seed_reproducibility(self):
        first = generate_criticality_dataset(seed=DEFAULT_SEED, variants_per_defect=10)
        second = generate_criticality_dataset(seed=DEFAULT_SEED, variants_per_defect=10)
        self.assertEqual(first["rows"], second["rows"])

    def test_csv_output_round_trip(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = generate_criticality_dataset(seed=DEFAULT_SEED, variants_per_defect=10, output_dir=tmpdir)
            csv_path = report["dataset_path"]
            self.assertTrue(os.path.exists(csv_path))
            with open(csv_path, newline="", encoding="utf-8") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), report["total_samples"])
            self.assertEqual(len(rows), 800)
            self.assertEqual(rows[0]["split"], "train")
            self.assertGreaterEqual(float(rows[0]["criticality_target"]), 0.0)
            self.assertLessEqual(float(rows[0]["criticality_target"]), 1.0)


if __name__ == "__main__":
    unittest.main(verbosity=2)
