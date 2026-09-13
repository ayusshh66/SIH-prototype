"""
Tests for Shadow-Block Engine.

Covers:
  - Compatible Engineering + TRD + SNT tasks grouping
  - Spatially distant tasks rejection
  - Time conflict handling
  - Resource conflict detection and reporting
  - Unsafe / interlocking grouping rejection (Scenario K)
  - Valid shadow-block generation (duration, savings, occupancy)
  - Invalid shadow-block rejection
  - Output contract compliance with AI_DOMAIN_CONTRACT.md §10
  - Integration with SyntheticDataGenerator
"""

from __future__ import annotations

import unittest
from datetime import datetime, timezone

from ai.compatibility.engine import CompatibilityEngine
from ai.data.generator import SyntheticDataGenerator
from ai.shadow_blocks.engine import ShadowBlockEngine, generate_shadow_block_candidates


def _make_task(
    task_id: str = "task_001",
    department: str = "ENGINEERING",
    section: str = "sec_01",
    from_km: float = 10.0,
    to_km: float = 15.0,
    start: str = "2026-11-01T23:00:00Z",
    end: str = "2026-11-02T02:00:00Z",
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


class TestCompatibleEngTrdSntGrouping(unittest.TestCase):
    """Test grouping compatible Engineering, TRD, and S&T tasks into a shadow block."""

    def setUp(self):
        self.engine = ShadowBlockEngine()
        self.t_eng = _make_task(
            task_id="task_eng",
            department="ENGINEERING",
            section="sec_01",
            duration=150,
            priority_hint="CRITICAL",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 1}],
        )
        self.t_trd = _make_task(
            task_id="task_trd",
            department="TRD",
            section="sec_01",
            duration=120,
            priority_hint="HIGH",
            required_resources=[{"resource_type": "TOWER_WAGON", "count": 1}],
        )
        self.t_snt = _make_task(
            task_id="task_snt",
            department="SNT",
            section="sec_01",
            duration=90,
            priority_hint="MEDIUM",
            required_resources=[{"resource_type": "SNT_CREW", "count": 1}],
        )
        self.resources = [
            {"resource_id": "tm_1", "resource_type": "TRACK_MACHINE", "is_operational": True},
            {"resource_id": "tw_1", "resource_type": "TOWER_WAGON", "is_operational": True},
            {"resource_id": "sc_1", "resource_type": "SNT_CREW", "is_operational": True},
        ]
        self.windows = [
            {
                "window_id": "win_night_01",
                "section_id": "sec_01",
                "start": "2026-11-01T22:30:00Z",
                "end": "2026-11-02T04:30:00Z",
                "window_type": "NIGHT",
            }
        ]

    def test_three_department_shadow_block(self):
        sb = self.engine.evaluate_candidate_group(
            [self.t_eng, self.t_trd, self.t_snt],
            windows=self.windows,
            resources=self.resources,
        )

        # Basic validity
        self.assertEqual(sb["conflict_status"], "FEASIBLE")
        self.assertGreater(sb["shadow_benefit_score"], 0.6)

        # Primary task chosen by priority (CRITICAL -> task_eng)
        self.assertEqual(sb["primary_task_id"], "task_eng")
        self.assertCountEqual(sb["participating_task_ids"], ["task_trd", "task_snt"])

        # Sections and departments
        self.assertEqual(sb["sections"], ["sec_01"])
        self.assertCountEqual(sb["departments"], ["ENGINEERING", "TRD", "SNT"])

        # Time savings: sum(150 + 120 + 90) = 360; combined = max(150, 120, 90) + 15 = 165
        sum_durations = 150 + 120 + 90
        expected_combined = 150 + 15
        expected_saving = sum_durations - expected_combined
        self.assertEqual(sb["estimated_duration_minutes"], expected_combined)
        self.assertEqual(sb["potential_time_saving_minutes"], expected_saving)
        self.assertGreater(sb["potential_time_saving_minutes"], 0)

        # Resource usage aggregated
        self.assertEqual(sb["resource_usage"]["track_machine"], 1)
        self.assertEqual(sb["resource_usage"]["tower_wagon"], 1)
        self.assertEqual(sb["resource_usage"]["snt_crew"], 1)


class TestSpatiallyDistantTasksRejection(unittest.TestCase):
    """Test rejection when tasks are in distant sections."""

    def setUp(self):
        self.engine = ShadowBlockEngine()

    def test_multi_section_distant_group_rejected(self):
        t1 = _make_task(task_id="t1", section="sec_01")
        t2 = _make_task(task_id="t2", section="sec_05")
        t3 = _make_task(task_id="t3", section="sec_08")

        sb = self.engine.evaluate_candidate_group([t1, t2, t3])
        self.assertEqual(sb["conflict_status"], "REJECTED")
        self.assertEqual(sb["shadow_benefit_score"], 0.0)
        self.assertTrue(any("SPATIAL_CONFLICT" in r for r in sb["reasons"]))


class TestTimeConflictHandling(unittest.TestCase):
    """Test handling when tasks have widely separated requested times."""

    def setUp(self):
        self.engine = ShadowBlockEngine()

    def test_separated_windows_flagged_conflict(self):
        t1 = _make_task(
            task_id="t1",
            start="2026-11-01T02:00:00Z",
            end="2026-11-01T05:00:00Z",
        )
        t2 = _make_task(
            task_id="t2",
            start="2026-11-01T18:00:00Z",
            end="2026-11-01T21:00:00Z",
        )

        sb = self.engine.evaluate_candidate_group([t1, t2])
        self.assertEqual(sb["conflict_status"], "CONFLICT")
        self.assertTrue(any("TIME_CONFLICT" in r for r in sb["reasons"]))


class TestResourceConflictDetection(unittest.TestCase):
    """Test detection when required resources exceed available capacity."""

    def setUp(self):
        self.engine = ShadowBlockEngine()

    def test_resource_contention_detected(self):
        t1 = _make_task(
            task_id="t1",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 1}],
        )
        t2 = _make_task(
            task_id="t2",
            required_resources=[{"resource_type": "TRACK_MACHINE", "count": 1}],
        )
        # Only 1 operational track machine available, but 2 needed
        resources = [
            {"resource_id": "tm_1", "resource_type": "TRACK_MACHINE", "is_operational": True},
        ]

        sb = self.engine.evaluate_candidate_group([t1, t2], resources=resources)
        self.assertEqual(sb["conflict_status"], "CONFLICT")
        self.assertTrue(any("RESOURCE_CONFLICT" in r for r in sb["reasons"]))


class TestUnsafeInterlockingGroupingRejection(unittest.TestCase):
    """Test Scenario K: INTERLOCKING + HIGH_SAFETY must be rejected with SAFETY_CONFLICT."""

    def setUp(self):
        self.engine = ShadowBlockEngine()

    def test_interlocking_high_safety_rejected(self):
        t_snt = _make_task(
            task_id="task_snt",
            department="SNT",
            safety_class="INTERLOCKING",
            section="sec_01",
        )
        t_usfd = _make_task(
            task_id="task_usfd",
            department="ENGINEERING",
            safety_class="HIGH_SAFETY",
            section="sec_01",
        )

        sb = self.engine.evaluate_candidate_group([t_snt, t_usfd])

        # Assertions per Scenario K in TEST_CASE_SPEC.md:
        # - conflict_status == REJECTED
        # - conflict explanation includes SAFETY_CONFLICT
        # - shadow_benefit_score == 0.0
        self.assertEqual(sb["conflict_status"], "REJECTED")
        self.assertEqual(sb["shadow_benefit_score"], 0.0)
        safety_reasons = [r for r in sb["reasons"] if "SAFETY_CONFLICT" in r]
        self.assertGreater(len(safety_reasons), 0)
        self.assertIn("INTERLOCKING", safety_reasons[0])
        self.assertIn("HIGH_SAFETY", safety_reasons[0])

    def test_two_interlocking_tasks_rejected(self):
        t1 = _make_task(task_id="t1", safety_class="INTERLOCKING")
        t2 = _make_task(task_id="t2", safety_class="INTERLOCKING")

        sb = self.engine.evaluate_candidate_group([t1, t2])
        self.assertEqual(sb["conflict_status"], "REJECTED")
        self.assertEqual(sb["shadow_benefit_score"], 0.0)
        self.assertTrue(any("SAFETY_CONFLICT" in r for r in sb["reasons"]))


class TestValidShadowBlockGeneration(unittest.TestCase):
    """Test candidate generation and calculation accuracy."""

    def setUp(self):
        self.engine = ShadowBlockEngine()

    def test_candidate_generation_metrics(self):
        t1 = _make_task(task_id="t1", duration=120, priority_hint="HIGH")
        t2 = _make_task(task_id="t2", duration=80, priority_hint="LOW")

        sb = self.engine.evaluate_candidate_group([t1, t2])

        self.assertEqual(sb["primary_task_id"], "t1")
        self.assertEqual(sb["participating_task_ids"], ["t2"])
        # max(120, 80) + 15 = 135
        self.assertEqual(sb["estimated_duration_minutes"], 135)
        # (120 + 80) - 135 = 65
        self.assertEqual(sb["potential_time_saving_minutes"], 65)
        self.assertTrue(0.0 <= sb["estimated_corridor_occupancy"] <= 1.0)
        self.assertTrue(0.0 <= sb["shadow_benefit_score"] <= 1.0)


class TestOutputContractCompliance(unittest.TestCase):
    """Verify all ShadowBlockCandidate fields comply with AI_DOMAIN_CONTRACT.md §10."""

    def test_contract_fields_present(self):
        engine = ShadowBlockEngine()
        t1 = _make_task(task_id="t1")
        t2 = _make_task(task_id="t2")

        sb = engine.evaluate_candidate_group([t1, t2])

        required_fields = [
            "shadow_block_id",
            "primary_task_id",
            "participating_task_ids",
            "sections",
            "departments",
            "proposed_window_start",
            "proposed_window_end",
            "estimated_duration_minutes",
            "estimated_corridor_occupancy",
            "potential_time_saving_minutes",
            "resource_usage",
            "conflict_status",
            "shadow_benefit_score",
            "reasons",
        ]
        for field in required_fields:
            self.assertIn(field, sb, f"Field '{field}' missing from ShadowBlockCandidate")

        self.assertIn(sb["conflict_status"], ("FEASIBLE", "CONFLICT", "REJECTED"))
        self.assertIsInstance(sb["sections"], list)
        self.assertIsInstance(sb["departments"], list)
        self.assertIsInstance(sb["participating_task_ids"], list)
        self.assertIsInstance(sb["resource_usage"], dict)
        self.assertIsInstance(sb["reasons"], list)


class TestSyntheticDataIntegration(unittest.TestCase):
    """Test generating shadow block candidates from full synthetic dataset."""

    def test_synthetic_data_shadow_blocks(self):
        gen = SyntheticDataGenerator(seed=42)
        dataset = gen.generate()

        candidates = generate_shadow_block_candidates(
            tasks=dataset["maintenance_tasks"],
            windows=dataset["maintenance_windows"],
            resources=dataset["resources"],
        )

        self.assertGreater(len(candidates), 0)

        # Verify we have feasible candidates
        feasible = [c for c in candidates if c["conflict_status"] == "FEASIBLE"]
        self.assertGreater(len(feasible), 0)

        # Verify we have rejected candidates (Scenario K unsafe candidates)
        rejected = [c for c in candidates if c["conflict_status"] == "REJECTED"]
        self.assertGreater(len(rejected), 0)

        # Verify rejected candidates have explicit SAFETY_CONFLICT explanation
        safety_rejected = [
            c for c in rejected
            if any("SAFETY_CONFLICT" in r for r in c.get("reasons", []))
        ]
        self.assertGreater(len(safety_rejected), 0)


if __name__ == "__main__":
    unittest.main()
