from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.criticality.diagnostics import demo_model_prediction, get_model_diagnostics, load_model_metadata


class TestCriticalityDiagnostics(unittest.TestCase):
    def test_metadata_loads_correctly(self):
        metadata = load_model_metadata()
        self.assertEqual(metadata["model_name"], "GradientBoostingRegressor")
        self.assertEqual(metadata["model_version"], "criticality_gbr_v1")
        self.assertEqual(metadata["dataset_size"], 800)
        self.assertIn("test_metrics", metadata)

    def test_feature_importance_values_are_valid(self):
        diagnostics = get_model_diagnostics()
        self.assertEqual(len(diagnostics["feature_importance"]), len(diagnostics["feature_names"]))
        for item in diagnostics["feature_importance"]:
            self.assertIn("feature", item)
            self.assertIn("importance", item)
            self.assertGreaterEqual(item["importance"], 0.0)
            self.assertLessEqual(item["importance"], 1.0)

    def test_demo_prediction_works(self):
        prediction = demo_model_prediction({
            "severity": 0.75,
            "urgency": 0.76,
            "safety_risk": 0.84,
            "traffic_density": 0.61,
            "speed_class": 0.75,
            "deadline_proximity": 0.4,
        })
        self.assertIn("model_version", prediction)
        self.assertIn("predicted_criticality_score", prediction)
        self.assertIn("priority_level", prediction)
        self.assertGreaterEqual(prediction["predicted_criticality_score"], 0.0)
        self.assertLessEqual(prediction["predicted_criticality_score"], 1.0)
        self.assertIn(prediction["priority_level"], {"P1", "P2", "P3", "P4"})

    def test_output_contains_model_version_and_metrics(self):
        diagnostics = get_model_diagnostics()
        self.assertEqual(diagnostics["model_version"], "criticality_gbr_v1")
        self.assertIn("test_mae", diagnostics)
        self.assertIn("test_rmse", diagnostics)
        self.assertIn("test_r2", diagnostics)
        self.assertIsNotNone(diagnostics["test_mae"])
        self.assertIsNotNone(diagnostics["test_rmse"])
        self.assertIsNotNone(diagnostics["test_r2"])


if __name__ == "__main__":
    unittest.main()
