from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.data.live_event_simulator import LiveSyntheticEventSimulator


class TestLiveEventSimulator(unittest.TestCase):
    def test_event_generation(self):
        sim = LiveSyntheticEventSimulator(seed=42, interval_seconds=20)
        event = sim.generate_event()
        self.assertIn(event["event_type"], {"maintenance_task", "train_movement_forecast", "block_window_update"})
        self.assertIn("event_id", event)
        self.assertTrue(event["endpoint"].startswith("http"))
        self.assertIn("payload", event)

    def test_deterministic_seed_behavior(self):
        sim1 = LiveSyntheticEventSimulator(seed=42, interval_seconds=20)
        sim2 = LiveSyntheticEventSimulator(seed=42, interval_seconds=20)
        seq1 = [sim1.generate_event() for _ in range(6)]
        seq2 = [sim2.generate_event() for _ in range(6)]
        self.assertEqual([e["event_type"] for e in seq1], [e["event_type"] for e in seq2])
        self.assertEqual([e["event_id"] for e in seq1], [e["event_id"] for e in seq2])

    def test_endpoint_payload_shape(self):
        sim = LiveSyntheticEventSimulator(seed=42, interval_seconds=20)
        for _ in range(20):
            event = sim.generate_event()
            payload = event["payload"]
            if event["event_type"] == "maintenance_task":
                self.assertIn("task_id", payload)
            elif event["event_type"] == "train_movement_forecast":
                self.assertIn("movement_id", payload)
            else:
                self.assertIn("window_id", payload)

    def test_request_failure_does_not_terminate_simulator(self):
        sim = LiveSyntheticEventSimulator(seed=42, interval_seconds=20)
        with patch("ai.data.live_event_simulator.request.urlopen", side_effect=Exception("boom")):
            event = sim.run_once()
        self.assertFalse(event["success"])
        self.assertIn("event_type", event)
        self.assertIn("endpoint", event)


if __name__ == "__main__":
    unittest.main(verbosity=2)
