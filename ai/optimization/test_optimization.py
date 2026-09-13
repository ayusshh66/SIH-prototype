"""
Tests for Optimization Engine and Baseline Planner.

Covers:
  - shadow block tasks sharing the same block
  - resource overlap
  - section occupancy
  - max_concurrent_tasks
  - safety conflict rejection
  - train disruption trade-off
  - baseline vs optimized result
  - Scenario A: Single critical USFD task
  - Scenario C: Train conflict
  - Scenario D: Resource conflict
  - Scenario E: Deadline constraint
  - Scenario F: Shadow-block selection
  - Scenario J: Large synthetic scenario
  - Infeasible schedule
  - Output contract compliance
"""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from ai.criticality.engine import CriticalityEngine
from ai.data.generator import SyntheticDataGenerator
from ai.optimization.baseline import BaselinePlanner, baseline_schedule
from ai.optimization.engine import OptimizationEngine, optimize_schedule


# ──────────────────────────────────────────────────────────────────────
# Test helpers
# ──────────────────────────────────────────────────────────────────────

def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_task(
    task_id="task_001",
    section="sec_01",
    department="ENGINEERING",
    duration=120,
    start_offset_h=0,
    end_offset_h=3,
    priority="CRITICAL",
    safety_class="NORMAL",
    resources=None,
    deadline_offset_h=None,
    base_date=None,
):
    base = base_date or datetime(2026, 11, 3, 0, 0, tzinfo=timezone.utc)
    req_start = base + timedelta(hours=start_offset_h)
    req_end = base + timedelta(hours=end_offset_h)
    task = {
        "task_id": task_id,
        "task_type": "USFD",
        "railway_section_id": section,
        "from_km": 10.0,
        "to_km": 15.0,
        "department": department,
        "status": "PLANNED",
        "requested_start": _iso(req_start),
        "requested_end": _iso(req_end),
        "estimated_duration_minutes": duration,
        "required_resources": resources or [{"resource_type": "USFD_VEHICLE", "count": 1}],
        "priority_hint": priority,
        "safety_class": safety_class,
    }
    if deadline_offset_h is not None:
        task["deadline"] = _iso(base + timedelta(hours=deadline_offset_h))
    return task


def _make_window(
    window_id,
    section,
    start_offset_h,
    end_offset_h,
    base_date=None,
    max_concurrent_tasks=None,
    departments=None,
):
    base = base_date or datetime(2026, 11, 3, 0, 0, tzinfo=timezone.utc)
    win = {
        "window_id": window_id,
        "section_id": section,
        "start": _iso(base + timedelta(hours=start_offset_h)),
        "end": _iso(base + timedelta(hours=end_offset_h)),
        "window_type": "NIGHT",
        "availability": "AVAILABLE",
    }
    if max_concurrent_tasks is not None:
        win["max_concurrent_tasks"] = max_concurrent_tasks
    if departments is not None:
        win["department_compatibility"] = departments
    return win


def _make_movement(mv_id, section, start_offset_h, end_offset_h, pclass="PASSENGER", base_date=None):
    base = base_date or datetime(2026, 11, 3, 0, 0, tzinfo=timezone.utc)
    return {
        "movement_id": mv_id,
        "train_id": f"train_{mv_id}",
        "section_id": section,
        "from_km": 10.0,
        "to_km": 20.0,
        "movement_start": _iso(base + timedelta(hours=start_offset_h)),
        "movement_end": _iso(base + timedelta(hours=end_offset_h)),
        "direction": "UP",
        "speed_class": "HIGH",
        "traffic_density": 0.8,
        "priority_class": pclass,
    }


def _make_resource(rid, rtype, operational=True):
    return {
        "resource_id": rid,
        "resource_type": rtype,
        "department": "ENGINEERING",
        "location": "sec_01",
        "available_windows": [],
        "capacity": 1,
        "is_operational": operational,
    }


def _make_crit_score(entity_id, score):
    return {
        "entity_id": entity_id,
        "score": score,
        "priority_class": "P1" if score >= 0.85 else "P2" if score >= 0.70 else "P3",
        "risk_level": "CRITICAL" if score >= 0.85 else "HIGH",
        "feature_contributions": {},
        "explanation": f"Score {score}",
        "model_version": "test",
        "scoring_mode": "RULE_BASED",
    }


def _build_request(
    tasks, windows, resources, scores, movements=None,
    shadow_blocks=None, mode="BALANCED", request_id="opt_test",
    constraints=None, weights=None, solver_settings=None,
):
    return {
        "request_id": request_id,
        "mode": mode,
        "tasks": tasks,
        "criticality_scores": scores,
        "train_movements": movements or [],
        "resources": resources,
        "maintenance_windows": windows,
        "shadow_block_candidates": shadow_blocks or [],
        "constraints": constraints or {},
        "weights": weights or {},
        "solver_settings": solver_settings or {"max_runtime_seconds": 10},
    }


# ──────────────────────────────────────────────────────────────────────
# Test 1: Shadow Block Tasks Sharing the Same Block
# ──────────────────────────────────────────────────────────────────────

class TestShadowBlockSameBlock(unittest.TestCase):
    """A selected shadow block must mean all participating tasks are scheduled in the SAME block."""

    def test_shadow_block_tasks_share_same_block(self):
        t1 = _make_task("t_eng", section="sec_01", duration=60,
                        resources=[{"resource_type": "TRACK_MACHINE", "count": 1}])
        t2 = _make_task("t_trd", section="sec_01", duration=60, department="TRD",
                        resources=[{"resource_type": "TOWER_WAGON", "count": 1}])
        window = _make_window("win_shared", "sec_01", 23, 27)
        resources = [
            _make_resource("tm_01", "TRACK_MACHINE"),
            _make_resource("tw_01", "TOWER_WAGON"),
        ]
        scores = [_make_crit_score("t_eng", 0.85), _make_crit_score("t_trd", 0.80)]

        shadow_block = {
            "shadow_block_id": "sb_001",
            "primary_task_id": "t_eng",
            "participating_task_ids": ["t_trd"],
            "sections": ["sec_01"],
            "departments": ["ENGINEERING", "TRD"],
            "estimated_duration_minutes": 90,
            "potential_time_saving_minutes": 30,
            "conflict_status": "FEASIBLE",
            "shadow_benefit_score": 0.80,
        }

        request = _build_request([t1, t2], [window], resources, scores, shadow_blocks=[shadow_block])
        result = optimize_schedule(request)

        self.assertIn("t_eng", result["selected_task_ids"])
        self.assertIn("t_trd", result["selected_task_ids"])
        self.assertEqual(len(result["shadow_blocks"]), 1)

        # Verify all tasks in shadow block share the same block ID
        sb_candidate = next(
            (c for c in result["schedule_candidates"] if "t_eng" in c["task_ids"] and "t_trd" in c["task_ids"]),
            None
        )
        self.assertIsNotNone(sb_candidate, "Expected grouped ScheduleCandidate for shadow block")
        self.assertEqual(sb_candidate["blocks"][0]["block_id"], "win_shared")

    def test_shadow_block_not_selected_if_tasks_cannot_share_window(self):
        """If tasks have non-overlapping window options, shadow block must NOT be selected."""
        t1 = _make_task("t_eng", section="sec_01", duration=60,
                        deadline_offset_h=12,  # Must finish by h 12
                        resources=[{"resource_type": "TRACK_MACHINE", "count": 1}])
        t2 = _make_task("t_trd", section="sec_01", duration=60, department="TRD",
                        resources=[{"resource_type": "TOWER_WAGON", "count": 1}])
        # win1 only allows ENGINEERING, win2 only allows TRD
        win1 = _make_window("win_early", "sec_01", 6, 10, departments=["ENGINEERING"])
        win2 = _make_window("win_late", "sec_01", 15, 19, departments=["TRD"])
        resources = [
            _make_resource("tm_01", "TRACK_MACHINE"),
            _make_resource("tw_01", "TOWER_WAGON"),
        ]
        scores = [_make_crit_score("t_eng", 0.85), _make_crit_score("t_trd", 0.80)]

        shadow_block = {
            "shadow_block_id": "sb_002",
            "primary_task_id": "t_eng",
            "participating_task_ids": ["t_trd"],
            "sections": ["sec_01"],
            "departments": ["ENGINEERING", "TRD"],
            "estimated_duration_minutes": 90,
            "potential_time_saving_minutes": 30,
            "conflict_status": "FEASIBLE",
            "shadow_benefit_score": 0.80,
        }

        request = _build_request([t1, t2], [win1, win2], resources, scores, shadow_blocks=[shadow_block])
        result = optimize_schedule(request)

        # Shadow block must NOT be used because tasks cannot share a common window
        self.assertEqual(len(result["shadow_blocks"]), 0)


# ──────────────────────────────────────────────────────────────────────
# Test 2: Resource Overlap
# ──────────────────────────────────────────────────────────────────────

class TestResourceOverlap(unittest.TestCase):
    """Model actual task start/end intervals so multiple tasks cannot occupy resource beyond capacity."""

    def test_overlapping_intervals_with_single_resource_limits_to_one(self):
        # Two tasks with overlapping requested start times needing the same resource
        t1 = _make_task("t_001", section="sec_01", duration=60, start_offset_h=23,
                        resources=[{"resource_type": "TRACK_MACHINE", "count": 1}])
        t2 = _make_task("t_002", section="sec_01", duration=60, start_offset_h=23,
                        resources=[{"resource_type": "TRACK_MACHINE", "count": 1}])

        window = _make_window("win_01", "sec_01", 23, 26)
        resource = _make_resource("tm_01", "TRACK_MACHINE")  # capacity = 1
        scores = [_make_crit_score("t_001", 0.9), _make_crit_score("t_002", 0.5)]

        request = _build_request([t1, t2], [window], [resource], scores)
        result = optimize_schedule(request)

        # Only 1 task scheduled due to resource capacity limit
        self.assertEqual(len(result["selected_task_ids"]), 1)
        self.assertIn("t_001", result["selected_task_ids"])
        self.assertIn("t_002", result["unscheduled_task_ids"])
        self.assertIn("Resource capacity", result["unscheduled_reasons"]["t_002"])

    def test_cross_window_resource_overlap_prevented(self):
        """Tasks in overlapping windows across sections cannot exceed resource capacity."""
        # win1 in sec_01 (23:00-05:00), win2 in sec_02 (23:00-05:00)
        t1 = _make_task("t_sec1", section="sec_01", duration=120, start_offset_h=23,
                        resources=[{"resource_type": "USFD_VEHICLE", "count": 1}])
        t2 = _make_task("t_sec2", section="sec_02", duration=120, start_offset_h=23,
                        resources=[{"resource_type": "USFD_VEHICLE", "count": 1}])

        win1 = _make_window("win_sec1", "sec_01", 23, 29)
        win2 = _make_window("win_sec2", "sec_02", 23, 29)
        resource = _make_resource("veh_01", "USFD_VEHICLE")  # Only 1 vehicle in fleet
        scores = [_make_crit_score("t_sec1", 0.95), _make_crit_score("t_sec2", 0.40)]

        request = _build_request([t1, t2], [win1, win2], [resource], scores)
        result = optimize_schedule(request)

        # Only 1 can be scheduled because they overlap in time and vehicle capacity is 1
        self.assertEqual(len(result["selected_task_ids"]), 1)
        self.assertIn("t_sec1", result["selected_task_ids"])
        self.assertIn("t_sec2", result["unscheduled_task_ids"])


# ──────────────────────────────────────────────────────────────────────
# Test 3: Section Occupancy
# ──────────────────────────────────────────────────────────────────────

class TestSectionOccupancy(unittest.TestCase):
    """Section occupancy limit prevents more than max_section_occupancy concurrent tasks."""

    def test_section_occupancy_limit_enforced(self):
        # 4 tasks in same section with overlapping intervals, each needing a different crew
        tasks = [
            _make_task(f"t_sec_{i}", section="sec_01", duration=60, start_offset_h=23,
                       resources=[{"resource_type": f"CREW_{i}", "count": 1}])
            for i in range(4)
        ]
        window = _make_window("win_01", "sec_01", 23, 26)
        resources = [_make_resource(f"c_{i}", f"CREW_{i}") for i in range(4)]
        scores = [_make_crit_score(f"t_sec_{i}", 0.9 - i * 0.1) for i in range(4)]

        # max_section_occupancy = 2
        request = _build_request(tasks, [window], resources, scores, constraints={"max_section_occupancy": 2})
        result = optimize_schedule(request)

        # At most 2 can be scheduled concurrently in section 01
        self.assertLessEqual(len(result["selected_task_ids"]), 2)
        self.assertGreaterEqual(len(result["unscheduled_task_ids"]), 2)


# ──────────────────────────────────────────────────────────────────────
# Test 4: Window max_concurrent_tasks
# ──────────────────────────────────────────────────────────────────────

class TestMaxConcurrentTasks(unittest.TestCase):
    """Window max_concurrent_tasks is strictly respected."""

    def test_max_concurrent_tasks_respected(self):
        # 3 tasks in section 01 with different resources
        tasks = [
            _make_task(f"t_w_{i}", section="sec_01", duration=60, start_offset_h=23,
                       resources=[{"resource_type": f"RES_{i}", "count": 1}])
            for i in range(3)
        ]
        # Window specifies max_concurrent_tasks = 1
        window = _make_window("win_strict", "sec_01", 23, 26, max_concurrent_tasks=1)
        resources = [_make_resource(f"r_{i}", f"RES_{i}") for i in range(3)]
        scores = [_make_crit_score(f"t_w_{i}", 0.9 - i * 0.1) for i in range(3)]

        request = _build_request(tasks, [window], resources, scores)
        result = optimize_schedule(request)

        # Exactly 1 should be scheduled
        self.assertEqual(len(result["selected_task_ids"]), 1)
        self.assertEqual(len(result["unscheduled_task_ids"]), 2)


# ──────────────────────────────────────────────────────────────────────
# Test 5: Safety Conflict Rejection
# ──────────────────────────────────────────────────────────────────────

class TestSafetyConflictRejection(unittest.TestCase):
    """Deterministic safety conflicts are prohibited and never selected."""

    def test_safety_conflict_mutually_exclusive(self):
        t_snt = _make_task("t_snt", section="sec_01", duration=60, start_offset_h=23,
                          safety_class="INTERLOCKING", department="SNT",
                          resources=[{"resource_type": "SNT_CREW", "count": 1}])
        t_high = _make_task("t_high", section="sec_01", duration=60, start_offset_h=23,
                           safety_class="HIGH_SAFETY", department="ENGINEERING",
                           resources=[{"resource_type": "USFD_VEHICLE", "count": 1}])

        window = _make_window("win_01", "sec_01", 23, 26)
        resources = [
            _make_resource("sc_01", "SNT_CREW"),
            _make_resource("veh_01", "USFD_VEHICLE"),
        ]
        scores = [_make_crit_score("t_snt", 0.95), _make_crit_score("t_high", 0.90)]

        request = _build_request([t_snt, t_high], [window], resources, scores)
        result = optimize_schedule(request)

        # Mutually exclusive: only 1 can be scheduled
        self.assertEqual(len(result["selected_task_ids"]), 1)
        self.assertEqual(len(result["unscheduled_task_ids"]), 1)
        unscheduled_id = result["unscheduled_task_ids"][0]
        self.assertIn("Safety conflict", result["unscheduled_reasons"][unscheduled_id])

    def test_rejected_shadow_block_candidate_ignored(self):
        """Shadow block with conflict_status == REJECTED must not be adopted."""
        t1 = _make_task("t1", section="sec_01", duration=60)
        t2 = _make_task("t2", section="sec_01", duration=60, department="TRD")
        window = _make_window("win_01", "sec_01", 23, 26)
        resources = [_make_resource("r1", "USFD_VEHICLE", operational=True)]
        scores = [_make_crit_score("t1", 0.8), _make_crit_score("t2", 0.8)]

        rejected_sb = {
            "shadow_block_id": "sb_unsafe",
            "primary_task_id": "t1",
            "participating_task_ids": ["t2"],
            "conflict_status": "REJECTED",
            "shadow_benefit_score": 0.0,
        }

        request = _build_request([t1, t2], [window], resources, scores, shadow_blocks=[rejected_sb])
        result = optimize_schedule(request)

        self.assertEqual(len(result["shadow_blocks"]), 0)


# ──────────────────────────────────────────────────────────────────────
# Test 6: Train Disruption Trade-Off
# ──────────────────────────────────────────────────────────────────────

class TestTrainDisruptionTradeoff(unittest.TestCase):
    """Optimizer prefers conflict-free windows, especially in DISRUPTION_MINIMIZATION mode."""

    def test_disruption_minimization_avoids_train_conflict(self):
        task = _make_task("t_usfd", section="sec_01", duration=60)
        # Window 1 overlaps with a high-priority train
        win_crowded = _make_window("win_crowded", "sec_01", 8, 11)
        # Window 2 is completely train-free
        win_clear = _make_window("win_clear", "sec_01", 23, 26)
        train = _make_movement("mv_express", "sec_01", 8.5, 9.5, pclass="SUPERFAST")
        resource = _make_resource("veh_01", "USFD_VEHICLE")
        score = _make_crit_score("t_usfd", 0.85)

        request = _build_request(
            [task], [win_crowded, win_clear], [resource], [score],
            movements=[train], mode="DISRUPTION_MINIMIZATION"
        )
        result = optimize_schedule(request)

        self.assertIn("t_usfd", result["selected_task_ids"])
        # Should be scheduled in the clear window, avoiding the train disruption
        assigned_block = result["schedule_candidates"][0]["blocks"][0]["block_id"]
        self.assertEqual(assigned_block, "win_clear")
        self.assertEqual(result["total_disruption_minutes"], 0.0)


# ──────────────────────────────────────────────────────────────────────
# Test 7: Baseline vs Optimized Result
# ──────────────────────────────────────────────────────────────────────

class TestBaselineVsOptimizedResult(unittest.TestCase):
    """Baseline vs optimized comparison metrics are returned correctly."""

    def test_baseline_vs_optimized_metrics_populated(self):
        task = _make_task("t_01", section="sec_01", duration=60)
        window = _make_window("win_01", "sec_01", 23, 26)
        resource = _make_resource("veh_01", "USFD_VEHICLE")
        score = _make_crit_score("t_01", 0.8)

        request = _build_request([task], [window], [resource], [score])
        result = optimize_schedule(request)

        bc = result.get("baseline_comparison", {})
        self.assertIn("baseline_objective", bc)
        self.assertIn("optimized_objective", bc)
        self.assertIn("delta_objective", bc)
        self.assertIn("baseline_scheduled_count", bc)
        self.assertIn("optimized_scheduled_count", bc)
        self.assertIn("train_disruption_reduction_pct", bc)

    def test_baseline_planner_respects_max_concurrent_tasks(self):
        tasks = [
            _make_task(f"t_bl_{i}", section="sec_01", duration=60, start_offset_h=23,
                       resources=[{"resource_type": f"RES_{i}", "count": 1}])
            for i in range(3)
        ]
        window = _make_window("win_bl", "sec_01", 23, 26, max_concurrent_tasks=1)
        resources = [_make_resource(f"r_{i}", f"RES_{i}") for i in range(3)]
        scores = [_make_crit_score(f"t_bl_{i}", 0.8) for i in range(3)]

        bl = baseline_schedule(tasks, resources=resources, windows=[window], criticality_scores=scores)
        self.assertEqual(len(bl["selected_task_ids"]), 1)
        self.assertEqual(len(bl["unscheduled_task_ids"]), 2)


# ──────────────────────────────────────────────────────────────────────
# Core Contract Scenarios (A, C, D, E, F, J, Infeasible, Contract)
# ──────────────────────────────────────────────────────────────────────

class TestCoreScenarios(unittest.TestCase):

    def test_scenario_a_single_critical_task(self):
        task = _make_task("usfd_001", section="sec_01", duration=120, priority="CRITICAL")
        window = _make_window("win_01", "sec_01", 23, 26)
        resource = _make_resource("veh_01", "USFD_VEHICLE")
        score = _make_crit_score("usfd_001", 0.94)

        request = _build_request([task], [window], [resource], [score])
        result = optimize_schedule(request)

        self.assertIn(result["status"], ("OPTIMAL", "FEASIBLE"))
        self.assertIn("usfd_001", result["selected_task_ids"])
        self.assertEqual(len(result["unscheduled_task_ids"]), 0)

    def test_scenario_c_train_conflict(self):
        task = _make_task("t_001", section="sec_01", duration=120, start_offset_h=23, end_offset_h=26)
        window = _make_window("win_01", "sec_01", 23, 26)
        resource = _make_resource("veh_01", "USFD_VEHICLE")
        score = _make_crit_score("t_001", 0.8)
        movement = _make_movement("mv_01", "sec_01", 23.5, 24.0, pclass="PASSENGER")

        request = _build_request([task], [window], [resource], [score], movements=[movement])
        result = optimize_schedule(request)

        self.assertIn("t_001", result["selected_task_ids"])
        self.assertGreater(len(result["train_conflicts"]), 0)

    def test_scenario_d_resource_bottleneck(self):
        tasks = [
            _make_task(f"t_{i}", section="sec_01", duration=60, priority="HIGH", start_offset_h=23,
                       resources=[{"resource_type": "TRACK_MACHINE", "count": 1}])
            for i in range(3)
        ]
        window = _make_window("win_01", "sec_01", 23, 26)
        resource = _make_resource("tm_01", "TRACK_MACHINE")
        scores = [_make_crit_score(f"t_{i}", 0.7) for i in range(3)]

        request = _build_request(tasks, [window], [resource], scores)
        result = optimize_schedule(request)

        self.assertEqual(len(result["selected_task_ids"]), 1)
        self.assertEqual(len(result["unscheduled_task_ids"]), 2)

    def test_scenario_e_deadline_constraint(self):
        task = _make_task("t_dl", section="sec_01", duration=60, deadline_offset_h=24)
        win_ok = _make_window("win_ok", "sec_01", 20, 22)
        win_bad = _make_window("win_bad", "sec_01", 25, 28)
        resource = _make_resource("veh_01", "USFD_VEHICLE")
        score = _make_crit_score("t_dl", 0.9)

        request = _build_request([task], [win_ok, win_bad], [resource], [score])
        result = optimize_schedule(request)

        self.assertIn("t_dl", result["selected_task_ids"])
        block = result["schedule_candidates"][0]["blocks"][0]
        self.assertEqual(block["block_id"], "win_ok")

    def test_infeasible_empty(self):
        result = optimize_schedule({
            "request_id": "empty",
            "mode": "BALANCED",
            "tasks": [],
            "criticality_scores": [],
            "train_movements": [],
            "resources": [],
            "maintenance_windows": [],
            "constraints": {},
            "weights": {},
        })
        self.assertEqual(result["status"], "INFEASIBLE")

    def test_all_contract_fields_present(self):
        task = _make_task("t_001", section="sec_01", duration=60)
        window = _make_window("win_01", "sec_01", 23, 26)
        resource = _make_resource("veh_01", "USFD_VEHICLE")
        score = _make_crit_score("t_001", 0.8)

        request = _build_request([task], [window], [resource], [score])
        result = optimize_schedule(request)

        for field in [
            "request_id", "status", "selected_task_ids",
            "unscheduled_task_ids", "schedule_candidates",
            "shadow_blocks", "train_conflicts",
            "resource_utilization", "objective_score",
            "baseline_comparison", "solver_statistics",
            "generated_at",
        ]:
            self.assertIn(field, result, f"Missing field {field}")

    def test_scenario_j_large_synthetic(self):
        gen = SyntheticDataGenerator(seed=42)
        dataset = gen.generate()

        crit_engine = CriticalityEngine()
        tasks = dataset["maintenance_tasks"]
        scores = [
            crit_engine.score({
                "entity_id": t["task_id"],
                "severity": t.get("priority_hint", "MEDIUM"),
                "urgency": 0.5,
                "safety_risk": 0.5,
                "traffic_density": 0.5,
                "speed_class": "MEDIUM",
            })
            for t in tasks
        ]

        request = _build_request(
            tasks=tasks,
            windows=dataset["maintenance_windows"],
            resources=dataset["resources"],
            scores=scores,
            movements=dataset["train_movements"],
            shadow_blocks=dataset.get("shadow_block_candidates", []),
            mode="BALANCED",
            request_id="synthetic_test",
            solver_settings={"max_runtime_seconds": 15},
        )

        result = optimize_schedule(request)
        self.assertIn(result["status"], ("OPTIMAL", "FEASIBLE", "PARTIAL"))
        self.assertGreater(len(result["selected_task_ids"]), 50)
        self.assertLess(result["solver_statistics"]["runtime_ms"], 20000)


if __name__ == "__main__":
    unittest.main()
