"""
Unit tests for ai.bridge CLI runner.
"""

from __future__ import annotations

import json
import subprocess
import sys
import unittest


class TestAiBridge(unittest.TestCase):
    def _run_bridge(self, command: str, payload: dict | list | None = None) -> tuple[int, dict, str]:
        input_str = json.dumps(payload or {})
        proc = subprocess.Popen(
            [sys.executable, "-m", "ai.bridge", command],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        stdout, stderr = proc.communicate(input=input_str)
        try:
            data = json.loads(stdout) if stdout.strip() else {}
        except Exception:
            data = {}
        return proc.returncode, data, stderr

    def test_health_command(self):
        rc, data, stderr = self._run_bridge("health")
        self.assertEqual(rc, 0, f"Health command failed: {stderr}")
        self.assertEqual(data.get("status"), "HEALTHY")
        self.assertIn("CriticalityEngine", data.get("engines", []))
        self.assertIn("OptimizationEngine", data.get("engines", []))

    def test_criticality_command(self):
        task = {
            "entity_id": "tsk_01",
            "severity": "CRITICAL",
            "urgency": 0.95,
            "safety_risk": 0.95,
            "traffic_density": 0.90,
            "speed_class": "EXPRESS",
        }
        rc, data, stderr = self._run_bridge("criticality", task)
        self.assertEqual(rc, 0, f"Criticality command failed: {stderr}")
        self.assertEqual(data.get("entity_id"), "tsk_01")
        self.assertGreaterEqual(data.get("score", 0), 0.85)
        self.assertEqual(data.get("priority_class"), "P1")
        self.assertIn("explanation", data)

    def test_plan_command_validation_failure(self):
        # Missing required lists should return FAILED status per orchestrator contract
        rc, data, stderr = self._run_bridge("plan", {"request_id": "invalid_req"})
        self.assertEqual(rc, 0)
        self.assertEqual(data.get("status"), "FAILED")
        self.assertTrue(len(data.get("errors", [])) > 0)

    def test_plan_command_valid(self):
        req = {
            "request_id": "test_plan_01",
            "tasks": [
                {
                    "task_id": "tsk_101",
                    "task_type": "USFD",
                    "section_id": "sec_01",
                    "from_km": 10.0,
                    "to_km": 12.0,
                    "department": "ENGINEERING",
                    "status": "PLANNED",
                    "requested_start": "2026-11-03T08:00:00Z",
                    "requested_end": "2026-11-03T11:00:00Z",
                    "estimated_duration_minutes": 60,
                    "required_resources": [{"resource_type": "USFD_VEHICLE", "count": 1}],
                    "priority_hint": "HIGH",
                    "safety_class": "NORMAL",
                }
            ],
            "maintenance_windows": [
                {
                    "window_id": "win_01",
                    "section_id": "sec_01",
                    "start": "2026-11-03T08:00:00Z",
                    "end": "2026-11-03T12:00:00Z",
                    "window_type": "NIGHT",
                    "availability": "AVAILABLE",
                }
            ],
            "resources": [
                {
                    "resource_id": "res_01",
                    "resource_type": "USFD_VEHICLE",
                    "department": "ENGINEERING",
                    "location": "sec_01",
                    "capacity": 1,
                }
            ],
            "train_movements": [
                {
                    "movement_id": "mv_01",
                    "train_id": "12002",
                    "section_id": "sec_01",
                    "movement_start": "2026-11-03T14:00:00Z",
                    "movement_end": "2026-11-03T15:00:00Z",
                    "direction": "UP",
                    "speed_class": "HIGH",
                }
            ],
        }
        rc, data, stderr = self._run_bridge("plan", req)
        self.assertEqual(rc, 0, f"Plan command failed: {stderr}")
        self.assertIn(data.get("status"), ["SUCCESS", "FEASIBLE", "OPTIMAL", "PARTIAL"])
        self.assertIn("orchestration_id", data)
        self.assertIn("criticality_scores", data)
        self.assertIn("explanations", data)


if __name__ == "__main__":
    unittest.main()
