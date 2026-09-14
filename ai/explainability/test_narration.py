from __future__ import annotations

import unittest

try:
    from ai.explainability.engine import ExplainabilityEngine
except ImportError:
    from engine import ExplainabilityEngine


class FakeProvider:
    def __init__(self, response: str):
        self.response = response

    def generate(self, payload, *, timeout):
        return self.response


class FailingProvider:
    def generate(self, payload, *, timeout):
        raise RuntimeError("LLM unavailable")


class TestNarrationLayer(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = ExplainabilityEngine()
        self.explanation = {
            "explanation_id": "exp_123",
            "entity_type": "BLOCK",
            "entity_id": "blk_17",
            "summary": "Block blk_17 was selected for maintenance.",
            "reason_codes": ["block_selected", "window_available"],
            "evidence": {
                "section_id": "sec_01",
                "is_selected": True,
                "window_availability": "AVAILABLE",
            },
            "deterministic_inputs": {"block_id": "blk_17", "section_id": "sec_01"},
            "generated_by": "EXPLAINABILITY_ENGINE",
        }

    def test_valid_explanation_produces_narration(self) -> None:
        provider = FakeProvider("AI narration: This block is selected and available.")
        result = self.engine.add_narration(self.explanation, provider=provider, timeout=4.0)

        self.assertIn("ai_narration", result)
        self.assertTrue(result["ai_narration"].startswith("AI narration:"))
        self.assertEqual(result["summary"], self.explanation["summary"])
        self.assertEqual(result["reason_codes"], self.explanation["reason_codes"])

    def test_llm_failure_returns_none(self) -> None:
        result = self.engine.add_narration(self.explanation, provider=FailingProvider(), timeout=4.0)

        self.assertIsNone(result["ai_narration"])
        self.assertEqual(result["narration_source"], "deterministic_only")
        self.assertEqual(result["summary"], self.explanation["summary"])

    def test_malformed_response_returns_none(self) -> None:
        provider = FakeProvider(
            "This is a fabricated schedule decision with invented reasons and extra numbers 99."
        )
        result = self.engine.add_narration(self.explanation, provider=provider, timeout=4.0)

        self.assertIsNone(result["ai_narration"])
        self.assertEqual(result["narration_source"], "deterministic_only")

    def test_deterministic_explanation_remains_available(self) -> None:
        original = dict(self.explanation)
        self.engine.add_narration(self.explanation, provider=FakeProvider("AI narration: This block is selected and available."))

        self.assertEqual(self.explanation, original)
        self.assertEqual(self.explanation["summary"], original["summary"])

    def test_narration_cannot_modify_underlying_decision(self) -> None:
        provider = FakeProvider("AI narration: This block is selected and available.")
        result = self.engine.add_narration(self.explanation, provider=provider, timeout=4.0)

        self.assertEqual(result["reason_codes"], self.explanation["reason_codes"])
        self.assertEqual(result["evidence"], self.explanation["evidence"])
        self.assertEqual(result["generated_by"], self.explanation["generated_by"])
        self.assertEqual(result["summary"], self.explanation["summary"])


if __name__ == "__main__":
    unittest.main()
