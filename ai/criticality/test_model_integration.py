from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.agents.orchestrator import AgentOrchestrator
from ai.criticality.engine import CriticalityEngine


class TestCriticalityModelIntegration(unittest.TestCase):
    def setUp(self) -> None:
        self.task = {
            "task_id": "usfd_001_v0",
            "entity_id": "usfd_001_v0",
            "severity": "CRITICAL",
            "urgency": 0.8535,
            "safety_risk": 0.825,
            "traffic_density": 0.667,
            "speed_class": "HIGH",
            "deadline": "2026-11-04T18:00:00Z",
        }

    def test_model_based_prediction_is_used_in_criticality_pipeline(self) -> None:
        engine = CriticalityEngine()
        result = engine.score(self.task, scoring_mode="MODEL_BASED")

        self.assertEqual(result["scoring_mode"], "MODEL_BASED")
        self.assertEqual(result["model_version"], "criticality_gbr_v1")
        self.assertIn("priority_class", result)
        self.assertIsInstance(result["score"], float)
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

        request = {
            "request_id": "integration_model_based",
            "mode": "BALANCED",
            "tasks": [self.task],
            "maintenance_windows": [{
                "window_id": "win_01",
                "section_id": "sec_01",
                "start": "2026-11-03T20:00:00Z",
                "end": "2026-11-04T04:00:00Z",
                "availability": "AVAILABLE",
            }],
            "resources": [{
                "resource_id": "res_01",
                "resource_type": "USFD_VEHICLE",
                "department": "ENGINEERING",
                "location": "sec_01",
                "capacity": 1,
                "is_operational": True,
            }],
            "train_movements": [],
        }

        orchestrated = AgentOrchestrator().orchestrate(request)
        self.assertIn("criticality_scores", orchestrated)
        self.assertEqual(orchestrated["criticality_scores"][0]["scoring_mode"], "RULE_BASED")

    def test_model_based_unavailable_falls_back_to_rule_based(self) -> None:
        engine = CriticalityEngine()
        with patch.object(engine, "_load_model", return_value=None):
            result = engine.score(self.task, scoring_mode="MODEL_BASED")

        self.assertEqual(result["scoring_mode"], "RULE_BASED")
        self.assertIn("priority_class", result)
        self.assertIn("score", result)
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)


if __name__ == "__main__":
    unittest.main()
