from __future__ import annotations

import unittest
from datetime import datetime, timezone

from ai.criticality.forecast import forecast_task_criticality


class TestCriticalityForecast(unittest.TestCase):
    def test_deterministic_output(self):
        task = {
            "severity": "CRITICAL",
            "urgency": 0.9,
            "safety_risk": 0.88,
            "traffic_density": 0.82,
            "speed_class": "EXPRESS",
            "deadline": "2026-11-03T18:00:00Z",
            "text_severity": 8.5,
        }
        reference_time = datetime(2026, 11, 1, 8, 0, tzinfo=timezone.utc)
        first = forecast_task_criticality(task, horizon_days=7, reference_time=reference_time)
        second = forecast_task_criticality(task, horizon_days=7, reference_time=reference_time)
        self.assertEqual(first, second)

    def test_scores_are_bounded(self):
        task = {
            "severity": "CRITICAL",
            "urgency": 0.95,
            "safety_risk": 0.99,
            "traffic_density": 1.0,
            "speed_class": "EXPRESS",
            "deadline": "2026-11-03T06:00:00Z",
            "text_severity": 10.0,
        }
        result = forecast_task_criticality(task, horizon_days=3)
        self.assertGreaterEqual(result["current_score"], 0.0)
        self.assertLessEqual(result["current_score"], 1.0)
        self.assertGreaterEqual(result["forecast_score"], 0.0)
        self.assertLessEqual(result["forecast_score"], 1.0)

    def test_future_score_can_increase_for_at_risk_task(self):
        task = {
            "severity": "SEVERE",
            "urgency": 0.80,
            "safety_risk": 0.75,
            "traffic_density": 0.70,
            "speed_class": "HIGH",
            "deadline": "2026-11-03T12:00:00Z",
            "text_severity": 7.5,
        }
        result = forecast_task_criticality(task, horizon_days=7)
        self.assertGreater(result["forecast_score"], result["current_score"])

    def test_no_invalid_priority_class(self):
        task = {
            "severity": "MODERATE",
            "urgency": 0.50,
            "safety_risk": 0.50,
            "traffic_density": 0.55,
            "speed_class": "MEDIUM",
            "deadline": "2026-11-05T12:00:00Z",
            "text_severity": 5.0,
        }
        result = forecast_task_criticality(task, horizon_days=6)
        self.assertIn(result["current_priority"], ("P1", "P2", "P3", "P4"))
        self.assertIn(result["forecast_priority"], ("P1", "P2", "P3", "P4"))

    def test_threshold_crossing_detection(self):
        task = {
            "severity": "MODERATE",
            "urgency": 0.6,
            "safety_risk": 0.65,
            "traffic_density": 0.6,
            "speed_class": "HIGH",
            "deadline": "2026-11-03T14:00:00Z",
            "text_severity": 6.0,
        }
        result = forecast_task_criticality(task, horizon_days=2)
        self.assertIsInstance(result["threshold_crossing"], bool)

    def test_different_horizons_produce_valid_results(self):
        task = {
            "severity": "CRITICAL",
            "urgency": 0.85,
            "safety_risk": 0.80,
            "traffic_density": 0.75,
            "speed_class": "HIGH",
            "deadline": "2026-11-03T18:00:00Z",
            "text_severity": 8.0,
        }
        short = forecast_task_criticality(task, horizon_days=2)
        long = forecast_task_criticality(task, horizon_days=14)
        self.assertGreaterEqual(short["forecast_score"], 0.0)
        self.assertLessEqual(short["forecast_score"], 1.0)
        self.assertGreaterEqual(long["forecast_score"], 0.0)
        self.assertLessEqual(long["forecast_score"], 1.0)
        self.assertIn(short["forecast_priority"], ("P1", "P2", "P3", "P4"))
        self.assertIn(long["forecast_priority"], ("P1", "P2", "P3", "P4"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
