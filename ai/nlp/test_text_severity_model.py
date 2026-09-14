from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.nlp.text_severity_model import (
    DEFAULT_DATASET_PATH,
    generate_synthetic_text_dataset,
    load_text_severity_model,
    predict_text_severity,
    train_text_severity_model,
)


class TestTextSeverityModel(unittest.TestCase):
    def test_dataset_generation(self):
        df = generate_synthetic_text_dataset(DEFAULT_DATASET_PATH, seed=42, rows=120)
        self.assertIn("inspection_remark", df.columns)
        self.assertIn("text_severity", df.columns)
        self.assertIn("split", df.columns)
        self.assertEqual(len(df), 120)
        self.assertTrue((df["text_severity"].between(0, 10)).all())

    def test_model_training(self):
        metadata = train_text_severity_model(DEFAULT_DATASET_PATH, seed=42)
        self.assertEqual(metadata["model_version"], "inspection_text_severity_v1")
        self.assertIn("test_mae", metadata)
        self.assertGreater(metadata["dataset_size"], 0)

    def test_model_loading(self):
        payload = load_text_severity_model()
        self.assertIn("model", payload)
        self.assertEqual(payload["model_version"], "inspection_text_severity_v1")

    def test_inference(self):
        result = predict_text_severity("Severe track defect near the switch requires immediate maintenance and safety review.")
        self.assertIn("text_severity", result)
        self.assertIn("model_version", result)
        self.assertGreaterEqual(result["text_severity"], 0.0)
        self.assertLessEqual(result["text_severity"], 10.0)

    def test_output_range(self):
        for remark in [
            "Routine inspection shows no defect.",
            "Track and switch surfaces are degraded and should be repaired.",
            "Emergency defect requiring immediate intervention.",
        ]:
            out = predict_text_severity(remark)
            self.assertGreaterEqual(out["text_severity"], 0.0)
            self.assertLessEqual(out["text_severity"], 10.0)

    def test_deterministic_results(self):
        remark = "Minor ballast disturbance noted during daylight inspection."
        first = predict_text_severity(remark)
        second = predict_text_severity(remark)
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main()
