from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from ai.criticality.engine import CriticalityEngine
from ai.data.live_event_simulator import LiveSyntheticEventSimulator
from ai.explainability.narration import DEFAULT_LLM_TIMEOUT_SECONDS, generate_llm_narration


class TimeoutProvider:
    def generate(self, payload, *, timeout):
        if timeout is not None:
            raise TimeoutError("Timed out")
        raise TimeoutError("Timed out")


class ErrorProvider:
    def generate(self, payload, *, timeout):
        raise RuntimeError("API error")


class MalformedJsonProvider:
    def generate(self, payload, *, timeout):
        return '{"text": 123}'


class BadModel:
    def predict(self, values):
        return [float("nan")]


class ReliabilityFallbackTests(unittest.TestCase):
    def test_model_missing_artifact_falls_back_to_rule_based(self):
        engine = CriticalityEngine()
        engine.model_path = Path("/tmp/does_not_exist.joblib")
        result = engine.score(
            {
                "entity_id": "missing_model_001",
                "severity": "CRITICAL",
                "urgency": 0.9,
                "safety_risk": 0.9,
                "traffic_density": 0.8,
                "speed_class": "EXPRESS",
                "deadline": None,
            },
            scoring_mode="MODEL_BASED",
        )
        self.assertEqual(result["scoring_mode"], "RULE_BASED")
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

    def test_model_loading_failure_falls_back_to_rule_based(self):
        engine = CriticalityEngine()
        with patch.object(engine, "_load_model", return_value=None):
            result = engine.score(
                {
                    "entity_id": "load_fail_001",
                    "severity": "SEVERE",
                    "urgency": 0.7,
                    "safety_risk": 0.7,
                    "traffic_density": 0.6,
                    "speed_class": "HIGH",
                },
                scoring_mode="MODEL_BASED",
            )
        self.assertEqual(result["scoring_mode"], "RULE_BASED")

    def test_invalid_model_output_falls_back_to_rule_based(self):
        engine = CriticalityEngine()
        with patch.object(engine, "_load_model", return_value=BadModel()):
            result = engine.score(
                {
                    "entity_id": "bad_output_001",
                    "severity": "CRITICAL",
                    "urgency": 0.9,
                    "safety_risk": 0.8,
                    "traffic_density": 0.7,
                    "speed_class": "EXPRESS",
                },
                scoring_mode="MODEL_BASED",
            )
        self.assertEqual(result["scoring_mode"], "RULE_BASED")
        self.assertIsInstance(result["score"], float)

    def test_missing_input_fields_do_not_crash(self):
        engine = CriticalityEngine()
        result = engine.score({"entity_id": "missing_fields_001"}, scoring_mode="MODEL_BASED")
        self.assertEqual(result["entity_id"], "missing_fields_001")
        self.assertEqual(result["scoring_mode"], "RULE_BASED")
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

    def test_weather_source_exception_defaults_to_normal_risk(self):
        class ExplodingWeatherSource:
            def resolve_weather_context(self, payload):
                raise RuntimeError("weather API unavailable")

        engine = CriticalityEngine(weather_source=ExplodingWeatherSource())
        result = engine.score({
            "entity_id": "weather_fail_001",
            "severity": "SEVERE",
            "urgency": 0.7,
            "safety_risk": 0.6,
            "traffic_density": 0.5,
            "speed_class": "HIGH",
            "weather_context": "HIGH_WIND",
        })
        self.assertEqual(result["weather_risk_level"], "NORMAL")
        self.assertEqual(result["affected_task_types"], [])

    def test_llm_timeout_returns_none(self):
        explanation = {
            "entity_type": "BLOCK",
            "entity_id": "blk_001",
            "summary": "Block blk_001 selected.",
            "reason_codes": ["block_selected"],
            "evidence": {"is_selected": True},
            "deterministic_inputs": {"block_id": "blk_001"},
        }
        self.assertIsNone(generate_llm_narration(explanation, provider=TimeoutProvider(), timeout=DEFAULT_LLM_TIMEOUT_SECONDS))

    def test_llm_api_error_returns_none(self):
        explanation = {
            "entity_type": "BLOCK",
            "entity_id": "blk_002",
            "summary": "Block blk_002 selected.",
            "reason_codes": ["block_selected"],
            "evidence": {"is_selected": True},
            "deterministic_inputs": {"block_id": "blk_002"},
        }
        self.assertIsNone(generate_llm_narration(explanation, provider=ErrorProvider(), timeout=DEFAULT_LLM_TIMEOUT_SECONDS))

    def test_malformed_json_returns_none(self):
        explanation = {
            "entity_type": "BLOCK",
            "entity_id": "blk_003",
            "summary": "Block blk_003 selected.",
            "reason_codes": ["block_selected"],
            "evidence": {"is_selected": True},
            "deterministic_inputs": {"block_id": "blk_003"},
        }
        self.assertIsNone(generate_llm_narration(explanation, provider=MalformedJsonProvider(), timeout=DEFAULT_LLM_TIMEOUT_SECONDS))

    def test_simulator_post_failure_does_not_raise(self):
        sim = LiveSyntheticEventSimulator(seed=42, interval_seconds=20)
        event = {"event_type": "maintenance_task", "event_id": "task_1", "endpoint": "http://example.test/api", "payload": {"task_id": "task_1"}}
        with patch("ai.data.live_event_simulator.request.urlopen", side_effect=Exception("boom")):
            self.assertFalse(sim.send_event(event))


if __name__ == "__main__":
    unittest.main()
