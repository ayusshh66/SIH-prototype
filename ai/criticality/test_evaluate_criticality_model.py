from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.criticality.evaluate_criticality_model import evaluate_criticality_model


class TestCriticalityEvaluation(unittest.TestCase):
    def test_evaluation_runs(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = evaluate_criticality_model(
                dataset_path=os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "criticality_v1_seed42.csv"),
                model_artifact_path=os.path.join(os.path.dirname(__file__), "artifacts", "gradientboostingregressor_criticality_gbr_v1.joblib"),
                report_path=os.path.join(tmpdir, "eval_report.json"),
            )
            self.assertIn("metrics", report)
            self.assertIn("feature_importance", report)
            self.assertIn("representative_examples", report)

    def test_metrics_valid(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = evaluate_criticality_model(
                dataset_path=os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "criticality_v1_seed42.csv"),
                model_artifact_path=os.path.join(os.path.dirname(__file__), "artifacts", "gradientboostingregressor_criticality_gbr_v1.joblib"),
                report_path=os.path.join(tmpdir, "eval_report.json"),
            )
            self.assertGreaterEqual(report["metrics"]["mae"], 0.0)
            self.assertGreaterEqual(report["metrics"]["rmse"], 0.0)
            self.assertLessEqual(report["metrics"]["r2"], 1.0)
            self.assertGreaterEqual(report["ml_vs_rule_based"]["average_absolute_difference"], 0.0)

    def test_importance_values_are_valid(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            report = evaluate_criticality_model(
                dataset_path=os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "criticality_v1_seed42.csv"),
                model_artifact_path=os.path.join(os.path.dirname(__file__), "artifacts", "gradientboostingregressor_criticality_gbr_v1.joblib"),
                report_path=os.path.join(tmpdir, "eval_report.json"),
            )
            self.assertEqual(len(report["feature_importance"]), 6)
            self.assertEqual(len(report["top_3_important_features"]), 3)
            self.assertGreaterEqual(sum(item["importance"] for item in report["feature_importance"]), 0.0)
            self.assertLessEqual(sum(item["importance"] for item in report["feature_importance"]), 1.0 + 1e-9)


if __name__ == "__main__":
    unittest.main(verbosity=2)
