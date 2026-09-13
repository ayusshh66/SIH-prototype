"""
Tests for What-If and Emergency Planning Engines.

Covers:
  - train delay
  - unavailable block
  - unavailable resource
  - changed task duration
  - added task
  - emergency critical USFD task
  - impossible emergency insertion
  - duplicate emergency task
  - safety constraint preserved after reoptimization
"""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone

from ai.criticality.engine import CriticalityEngine
from ai.optimization.engine import OptimizationEngine, optimize_schedule
from ai.scenarios.emergency import EmergencyEngine, insert_emergency_event
from ai.scenarios.what_if import WhatIfEngine, what_if_reoptimize


# ──────────────────────────────────────────────────────────────────────
# Test helpers
# ──────────────────────────────────────────────────────────────────────

def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_task(
    task_id="task_001",
    section="sec_01",
    department="ENGINEERING",
    duration=60,
    start_offset_h=23,
    end_offset_h=26,
    priority="CRITICAL",
    safety_class="NORMAL",
    resources=None,
    deadline_offset_h=None,
    base_date=None,
    asset_id=None,
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
    if asset_id:
        task["asset_id"] = asset_id
    return task


def _make_window(window_id, section, start_offset_h, end_offset_h, base_date=None):
    base = base_date or datetime(2026, 11, 3, 0, 0, tzinfo=timezone.utc)
    return {
        "window_id": window_id,
        "section_id": section,
        "start": _iso(base + timedelta(hours=start_offset_h)),
        "end": _iso(base + timedelta(hours=end_offset_h)),
        "window_type": "NIGHT",
        "availability": "AVAILABLE",
    }


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


# ──────────────────────────────────────────────────────────────────────
# Test Suite: What-If Engine
# ──────────────────────────────────────────────────────────────────────

class TestWhatIfEngine(unittest.TestCase):

    def setUp(self):
        self.what_if_engine = WhatIfEngine()
        self.crit_engine = CriticalityEngine()

    def test_train_delay_scenario(self):
        """Train delay shifts movement times and causes disruption delta to be reported."""
        task = _make_task("t_01", section="sec_01", duration=60, start_offset_h=8, end_offset_h=11)
        win = _make_window("win_01", "sec_01", 8, 11)
        res = _make_resource("res_01", "USFD_VEHICLE")
        # Train initially passes at 10.5 (no conflict with 60min task running 8-9)
        train = _make_movement("tr_101", "sec_01", 10.5, 11.5)
        score = _make_crit_score("t_01", 0.85)

        base_request = {
            "request_id": "req_base",
            "mode": "BALANCED",
            "tasks": [task],
            "criticality_scores": [score],
            "train_movements": [train],
            "resources": [res],
            "maintenance_windows": [win],
        }
        base_result = optimize_schedule(base_request)

        scenario = {
            "scenario_id": "whatif_td_01",
            "scenario_type": "TRAIN_DELAY",
            "base_schedule_id": "req_base",
            "affected_task_ids": ["t_01"],
            "affected_train_ids": ["train_tr_101"],
            "new_constraints": {"train_delay_minutes": 30},
            "description": "Train tr_101 delayed by 30 minutes",
            "created_at": _iso(datetime.now(timezone.utc)),
        }

        context = {
            "tasks": [task],
            "criticality_scores": [score],
            "train_movements": [train],
            "resources": [res],
            "maintenance_windows": [win],
        }

        result = what_if_reoptimize(scenario, base_result, context)

        self.assertEqual(result["original_schedule_id"], "req_base")
        self.assertIn("train_tr_101", result["affected_trains"])
        self.assertIn("metric_differences", result)
        self.assertIn("explanation", result)
        self.assertIn("30", result["explanation"])

    def test_block_unavailable_scenario(self):
        """Block unavailable causes task to be relocated to alternative window or unscheduled."""
        task = _make_task("t_01", section="sec_01", duration=60)
        win1 = _make_window("win_primary", "sec_01", 6, 9)
        win2 = _make_window("win_backup", "sec_01", 23, 26)
        res = _make_resource("res_01", "USFD_VEHICLE")
        score = _make_crit_score("t_01", 0.85)

        base_request = {
            "request_id": "req_base",
            "mode": "BALANCED",
            "tasks": [task],
            "criticality_scores": [score],
            "train_movements": [],
            "resources": [res],
            "maintenance_windows": [win1, win2],
        }
        base_result = optimize_schedule(base_request)
        self.assertIn("t_01", base_result["selected_task_ids"])
        orig_block = base_result["schedule_candidates"][0]["blocks"][0]["block_id"]

        scenario = {
            "scenario_id": "whatif_bu_01",
            "scenario_type": "BLOCK_UNAVAILABLE",
            "base_schedule_id": "req_base",
            "affected_task_ids": ["t_01"],
            "new_constraints": {"unavailable_window_ids": [orig_block]},
            "description": f"Window {orig_block} cancelled for emergency track work",
            "created_at": _iso(datetime.now(timezone.utc)),
        }

        context = {
            "tasks": [task],
            "criticality_scores": [score],
            "train_movements": [],
            "resources": [res],
            "maintenance_windows": [win1, win2],
        }

        result = what_if_reoptimize(scenario, base_result, context)

        self.assertIn(orig_block, result["changed_blocks"])
        new_block = result["new_schedule"]["blocks"][0]["block_id"]
        self.assertNotEqual(new_block, orig_block)
        self.assertIn("UNAVAILABLE", result["explanation"])

    def test_resource_unavailable_scenario(self):
        """Resource unavailable triggers reassignment or task shedding."""
        t1 = _make_task("t_01", section="sec_01", duration=60, priority="CRITICAL")
        t2 = _make_task("t_02", section="sec_01", duration=60, priority="MEDIUM")
        win = _make_window("win_01", "sec_01", 23, 26)
        r1 = _make_resource("veh_01", "USFD_VEHICLE")
        r2 = _make_resource("veh_02", "USFD_VEHICLE")
        s1 = _make_crit_score("t_01", 0.95)
        s2 = _make_crit_score("t_02", 0.60)

        base_request = {
            "request_id": "req_base",
            "mode": "BALANCED",
            "tasks": [t1, t2],
            "criticality_scores": [s1, s2],
            "train_movements": [],
            "resources": [r1, r2],
            "maintenance_windows": [win],
        }
        base_result = optimize_schedule(base_request)
        self.assertEqual(len(base_result["selected_task_ids"]), 2)

        # Remove veh_01
        scenario = {
            "scenario_id": "whatif_ru_01",
            "scenario_type": "RESOURCE_UNAVAILABLE",
            "base_schedule_id": "req_base",
            "affected_task_ids": ["t_02"],
            "new_constraints": {"unavailable_resource_ids": ["veh_01"]},
            "description": "veh_01 broken down",
            "created_at": _iso(datetime.now(timezone.utc)),
        }

        context = {
            "tasks": [t1, t2],
            "criticality_scores": [s1, s2],
            "train_movements": [],
            "resources": [r1, r2],
            "maintenance_windows": [win],
        }

        result = what_if_reoptimize(scenario, base_result, context)

        # With 1 vehicle remaining, only 1 task can be scheduled
        new_selected = result["optimization_result"]["selected_task_ids"]
        self.assertEqual(len(new_selected), 1)
        self.assertIn("t_01", new_selected)  # Higher priority stays
        self.assertIn("veh_01", result["explanation"] or "Resource")

    def test_changed_task_duration_scenario(self):
        """Extended duration causes task to move if window is too small."""
        task = _make_task("t_01", section="sec_01", duration=60)
        # win_short is 90min, win_long is 240min
        win_short = _make_window("win_short", "sec_01", 6, 7.5)  # 90min
        win_long = _make_window("win_long", "sec_01", 23, 27)    # 240min
        res = _make_resource("res_01", "USFD_VEHICLE")
        score = _make_crit_score("t_01", 0.85)

        base_request = {
            "request_id": "req_base",
            "mode": "BALANCED",
            "tasks": [task],
            "criticality_scores": [score],
            "train_movements": [],
            "resources": [res],
            "maintenance_windows": [win_short, win_long],
        }
        base_result = optimize_schedule(base_request)

        # Extend task duration to 150min (exceeds win_short)
        scenario = {
            "scenario_id": "whatif_dur_01",
            "scenario_type": "TASK_DURATION_CHANGED",
            "base_schedule_id": "req_base",
            "affected_task_ids": ["t_01"],
            "new_constraints": {"new_duration_minutes": 150},
            "description": "Defect scope expanded requiring 150 minutes",
            "created_at": _iso(datetime.now(timezone.utc)),
        }

        context = {
            "tasks": [task],
            "criticality_scores": [score],
            "train_movements": [],
            "resources": [res],
            "maintenance_windows": [win_short, win_long],
        }

        result = what_if_reoptimize(scenario, base_result, context)

        self.assertIn("t_01", result["affected_tasks"])
        assigned_block = result["new_schedule"]["blocks"][0]["block_id"]
        self.assertEqual(assigned_block, "win_long")

    def test_task_added_scenario(self):
        """Adding a new task incorporates it into the schedule."""
        t1 = _make_task("t_01", section="sec_01", duration=60)
        win = _make_window("win_01", "sec_01", 23, 27)
        r1 = _make_resource("res_01", "USFD_VEHICLE")
        r2 = _make_resource("res_02", "TRACK_MACHINE")
        s1 = _make_crit_score("t_01", 0.85)

        base_request = {
            "request_id": "req_base",
            "mode": "BALANCED",
            "tasks": [t1],
            "criticality_scores": [s1],
            "train_movements": [],
            "resources": [r1, r2],
            "maintenance_windows": [win],
        }
        base_result = optimize_schedule(base_request)

        new_task = _make_task("t_new", section="sec_01", duration=60,
                              resources=[{"resource_type": "TRACK_MACHINE", "count": 1}])

        scenario = {
            "scenario_id": "whatif_add_01",
            "scenario_type": "TASK_ADDED",
            "base_schedule_id": "req_base",
            "affected_task_ids": ["t_new"],
            "new_constraints": {"new_task": new_task},
            "description": "Discovered urgent joint flaw",
            "created_at": _iso(datetime.now(timezone.utc)),
        }

        context = {
            "tasks": [t1],
            "criticality_scores": [s1],
            "train_movements": [],
            "resources": [r1, r2],
            "maintenance_windows": [win],
        }

        result = what_if_reoptimize(scenario, base_result, context)

        self.assertIn("t_new", result["affected_tasks"])
        new_selected = result["optimization_result"]["selected_task_ids"]
        self.assertIn("t_new", new_selected)


# ──────────────────────────────────────────────────────────────────────
# Test Suite: Emergency Planning Engine
# ──────────────────────────────────────────────────────────────────────

class TestEmergencyEngine(unittest.TestCase):

    def setUp(self):
        self.emergency_engine = EmergencyEngine()

    def test_emergency_critical_usfd_task(self):
        """Emergency critical USFD defect creates P1 task and schedules in earliest feasible window."""
        t_base = _make_task("t_01", section="sec_01", duration=60, priority="LOW")
        win = _make_window("win_01", "sec_01", 23, 27)
        res = _make_resource("veh_01", "USFD_VEHICLE")
        score = _make_crit_score("t_01", 0.3)

        current_state = {
            "existing_tasks": [t_base],
            "train_movements": [],
            "resources": [res],
            "windows": [win],
            "criticality_scores": [score],
        }

        event = {
            "event_id": "emg_usfd_001",
            "event_type": "NEW_USFD_DEFECT",
            "section_id": "sec_01",
            "affected_asset_id": "rail_defect_42",
            "severity": "CRITICAL",
            "detected_at": _iso(datetime(2026, 11, 3, 14, 0, tzinfo=timezone.utc)),
            "impact_summary": "Severe rail transverse fissure detected",
        }

        result = insert_emergency_event(event, current_state)

        self.assertIsNotNone(result["emergency_task"])
        self.assertEqual(result["urgency"], "CRITICAL")
        self.assertEqual(result["affected_section"], "sec_01")
        self.assertGreaterEqual(len(result["feasible_windows"]), 1)
        self.assertIsNotNone(result["resulting_schedule"])
        self.assertIn(result["emergency_task"]["task_id"], result["resulting_schedule"]["task_ids"])
        self.assertEqual(len(result["errors"]), 0)

    def test_impossible_emergency_insertion(self):
        """When no feasible maintenance window exists in section, emergency is rejected with reason."""
        win_other_sec = _make_window("win_other", "sec_09", 23, 27)
        res = _make_resource("veh_01", "USFD_VEHICLE")

        current_state = {
            "existing_tasks": [],
            "train_movements": [],
            "resources": [res],
            "windows": [win_other_sec],  # sec_09 only
        }

        event = {
            "event_id": "emg_impossible_01",
            "event_type": "NEW_USFD_DEFECT",
            "section_id": "sec_01",  # No windows in sec_01
            "severity": "CRITICAL",
            "detected_at": _iso(datetime(2026, 11, 3, 14, 0, tzinfo=timezone.utc)),
            "impact_summary": "Rail split in section without open windows",
        }

        result = insert_emergency_event(event, current_state)

        self.assertIsNone(result["resulting_schedule"])
        self.assertGreater(len(result["errors"]), 0)
        self.assertIn("NO_FEASIBLE_WINDOW", result["errors"][0])
        self.assertIn("sec_01", result["explanation"])

    def test_duplicate_emergency_task(self):
        """Duplicate emergency event with already planned task or asset is rejected."""
        t_active = _make_task(
            "task_emg_emg_dup_01", section="sec_01", duration=60,
            asset_id="asset_switch_99"
        )
        win = _make_window("win_01", "sec_01", 23, 27)
        res = _make_resource("veh_01", "USFD_VEHICLE")

        current_state = {
            "existing_tasks": [t_active],
            "train_movements": [],
            "resources": [res],
            "windows": [win],
        }

        event = {
            "event_id": "emg_dup_01",  # Generates task_id task_emg_emg_dup_01
            "event_type": "NEW_USFD_DEFECT",
            "section_id": "sec_01",
            "affected_asset_id": "asset_switch_99",
            "severity": "CRITICAL",
            "detected_at": _iso(datetime(2026, 11, 3, 14, 0, tzinfo=timezone.utc)),
            "impact_summary": "Duplicate report of rail flaw",
        }

        result = insert_emergency_event(event, current_state)

        self.assertIsNone(result["resulting_schedule"])
        self.assertGreater(len(result["errors"]), 0)
        self.assertIn("DUPLICATE_EMERGENCY_TASK", result["errors"][0])

    def test_safety_constraint_preserved_after_emergency_reoptimization(self):
        """Emergency insertion must NEVER violate safety/interlocking constraints with planned tasks."""
        # Existing planned task is INTERLOCKING in sec_01
        t_snt = _make_task(
            "t_snt_01", section="sec_01", duration=60,
            safety_class="INTERLOCKING", department="SNT",
            resources=[{"resource_type": "SNT_CREW", "count": 1}]
        )
        win = _make_window("win_01", "sec_01", 23, 26)
        r_snt = _make_resource("sc_01", "SNT_CREW")
        r_usfd = _make_resource("veh_01", "USFD_VEHICLE")
        s_snt = _make_crit_score("t_snt_01", 0.70)

        current_state = {
            "existing_tasks": [t_snt],
            "train_movements": [],
            "resources": [r_snt, r_usfd],
            "windows": [win],
            "criticality_scores": [s_snt],
        }

        # Emergency task is HIGH_SAFETY in sec_01 — cannot co-exist in same window with INTERLOCKING!
        event = {
            "event_id": "emg_safety_01",
            "event_type": "NEW_USFD_DEFECT",
            "section_id": "sec_01",
            "severity": "CRITICAL",
            "detected_at": _iso(datetime(2026, 11, 3, 14, 0, tzinfo=timezone.utc)),
            "impact_summary": "Emergency rail defect requiring HIGH_SAFETY possession",
        }

        result = insert_emergency_event(event, current_state)

        # Verify: Emergency task should be scheduled (since mode is EMERGENCY),
        # but t_snt must NOT be scheduled in the same window (mutual exclusion)!
        opt_res = result.get("optimization_result", {})
        selected = opt_res.get("selected_task_ids", [])
        emg_tid = result["emergency_task"]["task_id"]

        self.assertIn(emg_tid, selected)
        # t_snt must have been deferred due to safety conflict with emergency task
        self.assertNotIn("t_snt_01", selected)


if __name__ == "__main__":
    unittest.main()
