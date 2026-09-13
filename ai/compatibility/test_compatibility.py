"""
Tests for Compatibility Engine.

Covers:
  - Compatible Engineering + TRD + SNT tasks
  - Spatially distant tasks
  - Time conflict (non-overlapping / large gap)
  - Resource conflict / contention
  - Unsafe / interlocking grouping (Scenario K: INTERLOCKING + HIGH_SAFETY)
  - Contract compliance of CompatibilityCandidate schema
  - Synthetic dataset integration
"""

from __future__ import annotations

import unittest
from datetime import datetime, timezone

from ai.compatibility.engine import CompatibilityEngine
from ai.data.generator import SyntheticDataGenerator


def _make_task(
    task_id: str = "task_001",
    department: str = "ENGINEERING",
    section: str = "sec_01",
    from_km: float = 10.0,
    to_km: float = 15.0,
    start: str = "2026-11-01T08:00:00Z",
    end: str = "2026-11-01T11:00:00Z",
    duration: int = 180,
    safety_class: str = "NORMAL",
    required_resources: list[dict] | None = None,
    priority_hint: str = "HIGH",
    status: str = "PLANNED",
) -> dict:
    return {
        "task_id": task_id,
        "department": department,
        "railway_section_id": section,
        "from_km": from_km,
        "to_km": to_km,
        "requested_start": start,
        "requested_end": end,
        "estimated_duration_minutes": duration,
        "safety_class": safety_class,
        "required_resources": required_resources or [{"resource_type": "ENGINEERING_CREW", "count": 1}],
        "priority_hint": priority_hint,
        "status": status,
    }


class TestCompatibleDepartments(unittest.TestCase):
    """Test compatibility between Engineering, TRD, and S&T tasks."""

    def setUp(self):
        self.engine = CompatibilityEngine()
        self.t_eng = _make_task(
            task_id="task_eng",
            department="ENGINEERING",
            section="sec_01",
            from_km=10.0,
            to_km=15.0,
            safety_class="NORMAL",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 1}],
        )
        self.t_trd = _make_task(
            task_id="task_trd",
            department="TRD",
            section="sec_01",
            from_km=11.0,
            to_km=14.0,
            safety_class="NORMAL",
            required_resources=[{"resource_type": "TOWER_WAGON", "count": 1}],
        )
        self.t_snt = _make_task(
            task_id="task_snt",
            department="SNT",
            section="sec_01",
            from_km=12.0,
            to_km=13.0,
            safety_class="NORMAL",
            required_resources=[{"resource_type": "SNT_CREW", "count": 1}],
        )

    def test_pairwise_eng_trd_compatible(self):
        result = self.engine.evaluate_pair(self.t_eng, self.t_trd)
        self.assertTrue(result["department_compatibility"])
        self.assertTrue(result["safety_compatibility"])
        self.assertIn(result["status"], ("COMPATIBLE", "PARTIAL"))
        self.assertGreater(result["compatibility_score"], 0.70)

    def test_pairwise_eng_snt_compatible(self):
        result = self.engine.evaluate_pair(self.t_eng, self.t_snt)
        self.assertTrue(result["department_compatibility"])
        self.assertTrue(result["safety_compatibility"])
        self.assertIn(result["status"], ("COMPATIBLE", "PARTIAL"))
        self.assertGreater(result["compatibility_score"], 0.70)

    def test_pairwise_trd_snt_compatible(self):
        result = self.engine.evaluate_pair(self.t_trd, self.t_snt)
        self.assertTrue(result["department_compatibility"])
        self.assertTrue(result["safety_compatibility"])
        self.assertIn(result["status"], ("COMPATIBLE", "PARTIAL"))
        self.assertGreater(result["compatibility_score"], 0.70)

    def test_group_eng_trd_snt_compatible(self):
        result = self.engine.evaluate_group([self.t_eng, self.t_trd, self.t_snt])
        self.assertTrue(result["department_compatibility"])
        self.assertTrue(result["safety_compatibility"])
        self.assertEqual(result["status"], "COMPATIBLE")
        self.assertGreater(result["compatibility_score"], 0.75)
        self.assertEqual(len(result["task_ids"]), 3)
        self.assertTrue(any("same section" in r for r in result["reasons"]))


class TestSpatiallyDistantTasks(unittest.TestCase):
    """Test rejection and low scoring for spatially distant tasks."""

    def setUp(self):
        self.engine = CompatibilityEngine()

    def test_distant_sections_rejected(self):
        t1 = _make_task(task_id="t1", section="sec_01")
        t2 = _make_task(task_id="t2", section="sec_08")  # distant (index 0 vs 7)

        result = self.engine.evaluate_pair(t1, t2)
        self.assertEqual(result["status"], "REJECTED")
        self.assertLess(result["spatial_score"], 0.5)
        self.assertTrue(any("distant" in r for r in result["rejected_reasons"]))

    def test_distant_group_rejected(self):
        t1 = _make_task(task_id="t1", section="sec_01")
        t2 = _make_task(task_id="t2", section="sec_02")
        t3 = _make_task(task_id="t3", section="sec_07")

        result = self.engine.evaluate_group([t1, t2, t3])
        self.assertEqual(result["status"], "REJECTED")
        self.assertTrue(any("distant" in r for r in result["rejected_reasons"]))


class TestTimeConflict(unittest.TestCase):
    """Test temporal conflict and non-overlapping windows."""

    def setUp(self):
        self.engine = CompatibilityEngine()

    def test_non_overlapping_windows(self):
        # 12 hours apart
        t1 = _make_task(
            task_id="t1",
            start="2026-11-01T02:00:00Z",
            end="2026-11-01T05:00:00Z",
        )
        t2 = _make_task(
            task_id="t2",
            start="2026-11-01T17:00:00Z",
            end="2026-11-01T20:00:00Z",
        )
        result = self.engine.evaluate_pair(t1, t2)
        self.assertEqual(result["temporal_score"], 0.0)
        self.assertTrue(any("non-overlapping" in r for r in result["rejected_reasons"]))


class TestResourceConflict(unittest.TestCase):
    """Test resource contention detection."""

    def setUp(self):
        self.engine = CompatibilityEngine()

    def test_resource_contention_detected(self):
        t1 = _make_task(
            task_id="t1",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 2}],
        )
        t2 = _make_task(
            task_id="t2",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 2}],
        )
        # Only 1 TRACK_MACHINE available
        resources = [
            {"resource_id": "tm_1", "resource_type": "TRACK_MACHINE", "is_operational": True},
        ]
        result = self.engine.evaluate_pair(t1, t2, resources=resources)
        self.assertLess(result["resource_score"], 0.5)
        self.assertTrue(any("resource contention" in r for r in result["rejected_reasons"]))

    def test_sufficient_resources_scores_high(self):
        t1 = _make_task(
            task_id="t1",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 1}],
        )
        t2 = _make_task(
            task_id="t2",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 1}],
        )
        resources = [
            {"resource_id": "tm_1", "resource_type": "TRACK_MACHINE", "is_operational": True},
            {"resource_id": "tm_2", "resource_type": "TRACK_MACHINE", "is_operational": True},
        ]
        result = self.engine.evaluate_pair(t1, t2, resources=resources)
        self.assertGreaterEqual(result["resource_score"], 0.8)


class TestUnsafeInterlockingGrouping(unittest.TestCase):
    """Test Scenario K: INTERLOCKING + HIGH_SAFETY must be rejected with SAFETY_CONFLICT."""

    def setUp(self):
        self.engine = CompatibilityEngine()

    def test_interlocking_plus_high_safety_rejected(self):
        t_snt = _make_task(
            task_id="t_snt",
            department="SNT",
            safety_class="INTERLOCKING",
            section="sec_01",
        )
        t_usfd = _make_task(
            task_id="t_usfd",
            department="ENGINEERING",
            safety_class="HIGH_SAFETY",
            section="sec_01",
        )

        result = self.engine.evaluate_pair(t_snt, t_usfd)
        self.assertFalse(result["safety_compatibility"])
        self.assertEqual(result["status"], "REJECTED")
        self.assertTrue(any("SAFETY_CONFLICT" in r for r in result["rejected_reasons"]))

    def test_multiple_interlocking_tasks_rejected(self):
        t1 = _make_task(task_id="t1", safety_class="INTERLOCKING")
        t2 = _make_task(task_id="t2", safety_class="INTERLOCKING")

        result = self.engine.evaluate_pair(t1, t2)
        self.assertFalse(result["safety_compatibility"])
        self.assertEqual(result["status"], "REJECTED")
        self.assertTrue(any("SAFETY_CONFLICT" in r for r in result["rejected_reasons"]))

    def test_interlocking_in_group_rejected(self):
        t1 = _make_task(task_id="t1", safety_class="NORMAL")
        t2 = _make_task(task_id="t2", safety_class="INTERLOCKING")
        t3 = _make_task(task_id="t3", safety_class="HIGH_SAFETY")

        result = self.engine.evaluate_group([t1, t2, t3])
        self.assertFalse(result["safety_compatibility"])
        self.assertEqual(result["status"], "REJECTED")
        self.assertTrue(any("SAFETY_CONFLICT" in r for r in result["rejected_reasons"]))


class TestOutputContractCompliance(unittest.TestCase):
    """Verify all CompatibilityCandidate fields comply with AI_DOMAIN_CONTRACT.md §8."""

    def test_contract_fields_present(self):
        engine = CompatibilityEngine()
        t1 = _make_task(task_id="t1")
        t2 = _make_task(task_id="t2")
        result = engine.evaluate_pair(t1, t2)

        required_fields = [
            "candidate_id",
            "task_ids",
            "section_id",
            "compatibility_score",
            "spatial_score",
            "temporal_score",
            "resource_score",
            "department_compatibility",
            "safety_compatibility",
            "reasons",
            "rejected_reasons",
            "estimated_total_duration_minutes",
            "status",
        ]
        for field in required_fields:
            self.assertIn(field, result, f"Field '{field}' missing from candidate")

        self.assertIn(result["status"], ("COMPATIBLE", "PARTIAL", "REJECTED"))
        self.assertTrue(0.0 <= result["compatibility_score"] <= 1.0)


class TestSyntheticDataIntegration(unittest.TestCase):
    """Test running CompatibilityEngine on generated synthetic data."""

    def test_find_compatible_tasks_on_synthetic_data(self):
        gen = SyntheticDataGenerator(seed=42)
        dataset = gen.generate()
        tasks = dataset["maintenance_tasks"]
        windows = dataset["maintenance_windows"]
        resources = dataset["resources"]

        engine = CompatibilityEngine(max_pairs=50)
        candidates = engine.find_compatible_tasks(tasks, windows, resources)

        self.assertGreater(len(candidates), 0)
        compatible = [c for c in candidates if c["status"] == "COMPATIBLE"]
        self.assertGreater(len(compatible), 0)


if __name__ == "__main__":
    unittest.main()
