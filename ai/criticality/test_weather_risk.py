from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.criticality.engine import CriticalityEngine


class TestWeatherRisk(unittest.TestCase):
    def setUp(self):
        self.engine = CriticalityEngine()

    def test_high_wind_affects_trd_ohe(self):
        result = self.engine.score({
            "entity_id": "weather_wind_001",
            "severity": "SEVERE",
            "urgency": 0.7,
            "safety_risk": 0.6,
            "traffic_density": 0.5,
            "speed_class": "HIGH",
            "task_or_defect_type": "TRD",
            "weather_context": "HIGH_WIND",
        })
        self.assertEqual(result["weather_risk_level"], "ELEVATED")
        self.assertIn("TRD", result["affected_task_types"])
        self.assertIn("OHE", result["affected_task_types"])

    def test_lightning_affects_trd_ohe(self):
        result = self.engine.score({
            "entity_id": "weather_lightning_001",
            "severity": "CRITICAL",
            "urgency": 0.8,
            "safety_risk": 0.9,
            "traffic_density": 0.6,
            "speed_class": "EXPRESS",
            "task_or_defect_type": "OHE",
            "weather_context": {"condition": "LIGHTNING"},
        })
        self.assertEqual(result["weather_risk_level"], "ELEVATED")
        self.assertEqual(result["affected_task_types"], ["TRD", "OHE"])

    def test_heavy_rain_affects_p_way_earthwork(self):
        result = self.engine.score({
            "entity_id": "weather_rain_001",
            "severity": "MODERATE",
            "urgency": 0.5,
            "safety_risk": 0.7,
            "traffic_density": 0.4,
            "speed_class": "MEDIUM",
            "task_or_defect_type": "P_WAY",
            "weather_context": "HEAVY_RAIN",
        })
        self.assertEqual(result["weather_risk_level"], "ELEVATED")
        self.assertIn("P_WAY", result["affected_task_types"])
        self.assertIn("EARTHWORK", result["affected_task_types"])

    def test_dense_fog_generates_visibility_warning(self):
        result = self.engine.score({
            "entity_id": "weather_fog_001",
            "severity": "SEVERE",
            "urgency": 0.4,
            "safety_risk": 0.3,
            "traffic_density": 0.8,
            "speed_class": "HIGH",
            "task_or_defect_type": "TRAIN_MOVEMENT",
            "weather_context": "DENSE_FOG",
        })
        self.assertEqual(result["weather_risk_level"], "WARNING")
        self.assertEqual(result["affected_task_types"], ["TRAIN_MOVEMENT"])

    def test_normal_weather_causes_no_extra_risk(self):
        result = self.engine.score({
            "entity_id": "weather_normal_001",
            "severity": "MINOR",
            "urgency": 0.2,
            "safety_risk": 0.2,
            "traffic_density": 0.2,
            "speed_class": "LOW",
            "weather_context": "NORMAL",
        })
        self.assertEqual(result["weather_risk_level"], "NORMAL")
        self.assertEqual(result["affected_task_types"], [])

    def test_missing_weather_data_falls_back_safely(self):
        result = self.engine.score({
            "entity_id": "weather_missing_001",
            "severity": "MODERATE",
            "urgency": 0.5,
            "safety_risk": 0.5,
            "traffic_density": 0.5,
            "speed_class": "MEDIUM",
            "weather_context": None,
        })
        self.assertEqual(result["weather_risk_level"], "NORMAL")
        self.assertEqual(result["affected_task_types"], [])


if __name__ == "__main__":
    unittest.main()
