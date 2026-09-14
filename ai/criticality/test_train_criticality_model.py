from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.criticality.train_criticality_model import FEATURE_NAMES, train_criticality_model


class TestCriticalityModelTraining(unittest.TestCase):
    def test_training_succeeds(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = train_criticality_model(
                dataset_path=os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "criticality_v1_seed42.csv"),
                artifact_dir=tmpdir,
            )
            self.assertIn("model_path", report)
            self.assertIn("validation_metrics", report)
            self.assertIn("test_metrics", report)

    def test_model_artifact_exists(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = train_criticality_model(
                dataset_path=os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "criticality_v1_seed42.csv"),
                artifact_dir=tmpdir,
            )
            self.assertTrue(os.path.exists(report["model_path"]))
            self.assertTrue(os.path.exists(report["metadata_path"]))

    def test_predictions_are_numeric_and_bounded(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = train_criticality_model(
                dataset_path=os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "criticality_v1_seed42.csv"),
                artifact_dir=tmpdir,
            )
            with open(report["metadata_path"], encoding="utf-8") as handle:
                metadata = json.load(handle)
            self.assertEqual(metadata["feature_names"], FEATURE_NAMES)
            self.assertGreaterEqual(metadata["validation_metrics"]["mae"], 0.0)
            self.assertGreaterEqual(metadata["test_metrics"]["r2"], -1.0)

    def test_model_metadata_has_required_fields(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = train_criticality_model(
                dataset_path=os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "criticality_v1_seed42.csv"),
                artifact_dir=tmpdir,
            )
            with open(report["metadata_path"], encoding="utf-8") as handle:
                metadata = json.load(handle)
            self.assertEqual(metadata["model_name"], "GradientBoostingRegressor")
            self.assertEqual(metadata["model_version"], "criticality_gbr_v2")
            self.assertEqual(metadata["training_seed"], 42)
            self.assertEqual(metadata["train_sample_count"], 560)
            self.assertEqual(metadata["validation_sample_count"], 120)
            self.assertEqual(metadata["test_sample_count"], 120)


if __name__ == "__main__":
    unittest.main(verbosity=2)
