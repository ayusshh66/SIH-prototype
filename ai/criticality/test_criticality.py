"""
Tests for the Criticality Scoring Engine.

Covers:
  - Critical high-risk defect → P1
  - Medium-risk task → P2/P3
  - Low-risk task → P4
  - Deadline pressure effect
  - Invalid / missing input safety
  - Score always within 0.0–1.0
  - Feature contributions sum ≈ score
  - Output contract compliance (all required fields present)
  - Integration with synthetic data from generator
  - Batch scoring

Run with:
    python -m pytest ai/criticality/test_criticality.py -v
    python ai/criticality/test_criticality.py
"""

from __future__ import annotations

import os
import sys
import unittest
from datetime import datetime, timedelta, timezone

# Ensure project root is on sys.path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.criticality.engine import CriticalityEngine


class TestCriticalHighRisk(unittest.TestCase):
    """Scenario: CRITICAL severity, extreme urgency, high safety risk → P1."""

    def setUp(self):
        self.engine = CriticalityEngine()
        self.ref_time = datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc)
        self.result = self.engine.score({
            "entity_id": "usfd_critical_001",
            "severity": "CRITICAL",
            "urgency": 0.95,
            "safety_risk": 0.97,
            "traffic_density": 0.85,
            "speed_class": "EXPRESS",
            "deadline": "2026-11-03T18:00:00Z",
        }, reference_time=self.ref_time)

    def test_score_above_p1_threshold(self):
        self.assertGreaterEqual(self.result["score"], 0.85)

    def test_priority_is_p1(self):
        self.assertEqual(self.result["priority_class"], "P1")

    def test_risk_is_critical(self):
        self.assertEqual(self.result["risk_level"], "CRITICAL")

    def test_severity_dominates(self):
        fc = self.result["feature_contributions"]
        # Severity should be the largest or near-largest contributor
        self.assertGreaterEqual(fc["severity"], 0.20)

    def test_explanation_mentions_severity(self):
        self.assertIn("critical", self.result["explanation"].lower())

    def test_scoring_mode_rule_based(self):
        self.assertEqual(self.result["scoring_mode"], "RULE_BASED")


class TestMediumRiskTask(unittest.TestCase):
    """Scenario: MODERATE severity, moderate urgency → P2 or P3."""

    def setUp(self):
        self.engine = CriticalityEngine()
        self.result = self.engine.score({
            "entity_id": "task_med_001",
            "severity": "MODERATE",
            "urgency": 0.55,
            "safety_risk": 0.50,
            "traffic_density": 0.50,
            "speed_class": "MEDIUM",
            "deadline": None,
        })

    def test_score_in_medium_range(self):
        self.assertGreaterEqual(self.result["score"], 0.30)
        self.assertLess(self.result["score"], 0.85)

    def test_priority_not_p1(self):
        self.assertIn(self.result["priority_class"], ("P2", "P3", "P4"))

    def test_risk_not_critical(self):
        self.assertIn(self.result["risk_level"], ("LOW", "MEDIUM", "HIGH"))


class TestLowRiskTask(unittest.TestCase):
    """Scenario: MINOR severity, low urgency → P4."""

    def setUp(self):
        self.engine = CriticalityEngine()
        self.result = self.engine.score({
            "entity_id": "task_low_001",
            "severity": "MINOR",
            "urgency": 0.10,
            "safety_risk": 0.10,
            "traffic_density": 0.20,
            "speed_class": "LOW",
            "deadline": None,
        })

    def test_score_below_p4_threshold(self):
        self.assertLess(self.result["score"], 0.50)

    def test_priority_is_p4(self):
        self.assertEqual(self.result["priority_class"], "P4")

    def test_risk_is_low(self):
        self.assertEqual(self.result["risk_level"], "LOW")


class TestDeadlinePressure(unittest.TestCase):
    """Verify deadline proximity moves the score upward."""

    def setUp(self):
        self.engine = CriticalityEngine()
        self.ref_time = datetime(2026, 11, 3, 12, 0, 0, tzinfo=timezone.utc)
        self.base_input = {
            "entity_id": "task_ddl_001",
            "severity": "MODERATE",
            "urgency": 0.50,
            "safety_risk": 0.50,
            "traffic_density": 0.50,
            "speed_class": "MEDIUM",
        }

    def test_no_deadline_no_contribution(self):
        result = self.engine.score(
            {**self.base_input, "deadline": None},
            reference_time=self.ref_time,
        )
        self.assertEqual(result["feature_contributions"]["deadline_proximity"], 0.0)

    def test_overdue_deadline_maximum(self):
        # Deadline in the past → proximity = 1.0
        result = self.engine.score(
            {**self.base_input, "deadline": "2026-11-03T06:00:00Z"},
            reference_time=self.ref_time,
        )
        self.assertEqual(
            result["feature_contributions"]["deadline_proximity"],
            round(0.08 * 1.0, 4),
        )

    def test_imminent_deadline_raises_score(self):
        # 3 hours from now → proximity = 0.9
        result_soon = self.engine.score(
            {**self.base_input, "deadline": "2026-11-03T15:00:00Z"},
            reference_time=self.ref_time,
        )
        # 5 days from now → proximity = 0.1
        result_far = self.engine.score(
            {**self.base_input, "deadline": "2026-11-08T12:00:00Z"},
            reference_time=self.ref_time,
        )
        self.assertGreater(result_soon["score"], result_far["score"])

    def test_deadline_explanation_mentions_pressure(self):
        result = self.engine.score(
            {**self.base_input, "deadline": "2026-11-03T14:00:00Z"},
            reference_time=self.ref_time,
        )
        self.assertIn("deadline", result["explanation"].lower())


class TestInvalidAndMissingInputs(unittest.TestCase):
    """Engine must not crash on bad/missing data — safe defaults apply."""

    def setUp(self):
        self.engine = CriticalityEngine()

    def test_completely_empty_input(self):
        result = self.engine.score({})
        self.assertIsInstance(result["score"], float)
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)
        self.assertIn(result["priority_class"], ("P1", "P2", "P3", "P4"))
        self.assertEqual(result["entity_id"], "unknown")

    def test_none_values(self):
        result = self.engine.score({
            "entity_id": "test_none",
            "severity": None,
            "urgency": None,
            "safety_risk": None,
            "traffic_density": None,
            "speed_class": None,
            "deadline": None,
        })
        self.assertIsInstance(result["score"], float)
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

    def test_garbage_string_severity(self):
        result = self.engine.score({
            "entity_id": "test_garbage",
            "severity": "NOT_A_SEVERITY",
            "urgency": "not_a_number",
            "safety_risk": -999,
            "traffic_density": 42.0,  # > 1 → clamped
            "speed_class": 12345,
        })
        self.assertIsInstance(result["score"], float)
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

    def test_negative_urgency_clamped(self):
        result = self.engine.score({
            "entity_id": "test_neg",
            "urgency": -0.5,
        })
        self.assertGreaterEqual(result["score"], 0.0)

    def test_over_one_traffic_clamped(self):
        result = self.engine.score({
            "entity_id": "test_over",
            "traffic_density": 5.0,
        })
        self.assertLessEqual(result["score"], 1.0)

    def test_bad_deadline_string(self):
        result = self.engine.score({
            "entity_id": "test_bad_ddl",
            "deadline": "not-a-date",
        })
        self.assertEqual(result["feature_contributions"]["deadline_proximity"], 0.0)


class TestScoreAlwaysInRange(unittest.TestCase):
    """Score must be in [0.0, 1.0] for ANY combination of inputs."""

    def setUp(self):
        self.engine = CriticalityEngine()

    def test_all_maximum_inputs(self):
        result = self.engine.score({
            "entity_id": "max",
            "severity": "CRITICAL",
            "urgency": 1.0,
            "safety_risk": 1.0,
            "traffic_density": 1.0,
            "speed_class": "EXPRESS",
            "deadline": "2020-01-01T00:00:00Z",  # long overdue
        })
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

    def test_all_minimum_inputs(self):
        result = self.engine.score({
            "entity_id": "min",
            "severity": "MINOR",
            "urgency": 0.0,
            "safety_risk": 0.0,
            "traffic_density": 0.0,
            "speed_class": "LOW",
            "deadline": None,
        })
        self.assertGreaterEqual(result["score"], 0.0)
        self.assertLessEqual(result["score"], 1.0)

    def test_boundary_sweep(self):
        """Check 50 random-ish combinations stay in range."""
        import random
        rng = random.Random(99)
        sevs = ["MINOR", "MODERATE", "SEVERE", "CRITICAL"]
        spds = ["LOW", "MEDIUM", "HIGH", "EXPRESS"]
        for _ in range(50):
            result = self.engine.score({
                "entity_id": "sweep",
                "severity": rng.choice(sevs),
                "urgency": rng.random(),
                "safety_risk": rng.random(),
                "traffic_density": rng.random(),
                "speed_class": rng.choice(spds),
                "deadline": "2026-11-04T00:00:00Z" if rng.random() > 0.5 else None,
            })
            self.assertGreaterEqual(result["score"], 0.0)
            self.assertLessEqual(result["score"], 1.0)


class TestFeatureContributionsConsistency(unittest.TestCase):
    """Feature contributions must sum to ≈ score."""

    def test_contributions_sum_to_score(self):
        engine = CriticalityEngine()
        result = engine.score({
            "entity_id": "sum_check",
            "severity": "SEVERE",
            "urgency": 0.80,
            "safety_risk": 0.75,
            "traffic_density": 0.60,
            "speed_class": "HIGH",
            "deadline": "2026-11-04T00:00:00Z",
        })
        fc = result["feature_contributions"]
        fc_sum = sum(fc.values())
        self.assertAlmostEqual(fc_sum, result["score"], places=3)


class TestOutputContractCompliance(unittest.TestCase):
    """Every output must have all required fields per AI_DOMAIN_CONTRACT.md §9."""

    REQUIRED_FIELDS = {
        "entity_id", "score", "priority_class", "risk_level",
        "feature_contributions", "explanation", "model_version",
        "scoring_mode",
    }
    OPTIONAL_FIELDS = {"confidence"}

    FC_FIELDS = {
        "severity", "urgency", "safety_risk",
        "traffic_density", "speed_class", "deadline_proximity",
    }

    def setUp(self):
        self.engine = CriticalityEngine()
        self.result = self.engine.score({
            "entity_id": "contract_check",
            "severity": "MODERATE",
            "urgency": 0.5,
            "safety_risk": 0.5,
            "traffic_density": 0.5,
            "speed_class": "MEDIUM",
        })

    def test_all_required_fields_present(self):
        for f in self.REQUIRED_FIELDS:
            self.assertIn(f, self.result, f"Missing required field: {f}")

    def test_feature_contribution_keys(self):
        fc = self.result["feature_contributions"]
        for f in self.FC_FIELDS:
            self.assertIn(f, fc, f"Missing FC field: {f}")

    def test_priority_class_valid(self):
        self.assertIn(self.result["priority_class"], ("P1", "P2", "P3", "P4"))

    def test_risk_level_valid(self):
        self.assertIn(self.result["risk_level"], ("LOW", "MEDIUM", "HIGH", "CRITICAL"))

    def test_scoring_mode_valid(self):
        self.assertIn(self.result["scoring_mode"], ("RULE_BASED", "MODEL_BASED"))

    def test_model_version_present(self):
        self.assertIsInstance(self.result["model_version"], str)
        self.assertTrue(len(self.result["model_version"]) > 0)

    def test_confidence_present_and_valid(self):
        self.assertIn("confidence", self.result)
        self.assertGreaterEqual(self.result["confidence"], 0.0)
        self.assertLessEqual(self.result["confidence"], 1.0)


class TestCustomWeights(unittest.TestCase):
    """Engine should accept custom weight overrides."""

    def test_safety_first_weights(self):
        engine = CriticalityEngine(weights={
            "severity": 0.10,
            "urgency": 0.10,
            "safety_risk": 0.50,
            "traffic_density": 0.10,
            "speed_class": 0.10,
            "deadline_proximity": 0.10,
        })
        result = engine.score({
            "entity_id": "custom_w",
            "severity": "MINOR",
            "urgency": 0.2,
            "safety_risk": 0.95,
            "traffic_density": 0.2,
            "speed_class": "LOW",
        })
        fc = result["feature_contributions"]
        # safety_risk should now dominate
        self.assertGreater(fc["safety_risk"], fc["severity"])
        self.assertGreater(fc["safety_risk"], fc["urgency"])


class TestBatchScoring(unittest.TestCase):
    """Batch scoring must process all items."""

    def test_batch_returns_correct_count(self):
        engine = CriticalityEngine()
        items = [
            {"entity_id": f"batch_{i}", "severity": "MODERATE", "urgency": 0.5}
            for i in range(10)
        ]
        results = engine.score_batch(items)
        self.assertEqual(len(results), 10)
        for r in results:
            self.assertIn("score", r)


class TestIntegrationWithSyntheticData(unittest.TestCase):
    """Score all USFD defects from the synthetic generator."""

    @classmethod
    def setUpClass(cls):
        from ai.data.generator import SyntheticDataGenerator
        cls.gen = SyntheticDataGenerator(seed=42)
        cls.ds = cls.gen.generate()
        cls.engine = CriticalityEngine()

    def test_score_all_usfd_defects(self):
        for defect in self.ds["usfd_defects"]:
            result = self.engine.score({
                "entity_id": defect["defect_id"],
                "severity": defect["severity"],
                "urgency": defect["urgency"],
                "safety_risk": defect["safety_risk"],
                "traffic_density": 0.7,  # from context
                "speed_class": "HIGH",
                "deadline": None,
            })
            self.assertGreaterEqual(result["score"], 0.0)
            self.assertLessEqual(result["score"], 1.0)
            self.assertIn(result["priority_class"], ("P1", "P2", "P3", "P4"))

    def test_critical_defects_score_high(self):
        critical = [d for d in self.ds["usfd_defects"] if d["severity"] == "CRITICAL"]
        for defect in critical:
            result = self.engine.score({
                "entity_id": defect["defect_id"],
                "severity": defect["severity"],
                "urgency": defect["urgency"],
                "safety_risk": defect["safety_risk"],
                "traffic_density": 0.85,
                "speed_class": "HIGH",
                "deadline": "2026-11-04T00:00:00Z",
            })
            # Critical defects should be P1 or at least P2
            self.assertIn(result["priority_class"], ("P1", "P2"),
                          f"Critical defect {defect['defect_id']} scored too low: {result['score']}")


class TestNoDepartmentFactor(unittest.TestCase):
    """Verify that department is NOT a scoring factor."""

    def test_department_not_in_contributions(self):
        engine = CriticalityEngine()
        result = engine.score({
            "entity_id": "no_dept",
            "severity": "MODERATE",
            "urgency": 0.5,
            "safety_risk": 0.5,
            "traffic_density": 0.5,
            "speed_class": "MEDIUM",
        })
        fc = result["feature_contributions"]
        self.assertNotIn("department", fc)
        self.assertNotIn("department_factor", fc)

    def test_department_input_ignored(self):
        """Even if department is passed, it must not change the score."""
        engine = CriticalityEngine()
        base = {
            "entity_id": "dept_test",
            "severity": "SEVERE",
            "urgency": 0.7,
            "safety_risk": 0.8,
            "traffic_density": 0.6,
            "speed_class": "HIGH",
        }
        r1 = engine.score({**base, "department": "ENGINEERING"})
        r2 = engine.score({**base, "department": "TRD"})
        r3 = engine.score({**base, "department": "SNT"})
        self.assertEqual(r1["score"], r2["score"])
        self.assertEqual(r2["score"], r3["score"])


# ──────────────────────────────────────────────────────────────────────
# Standalone runner
# ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2)
