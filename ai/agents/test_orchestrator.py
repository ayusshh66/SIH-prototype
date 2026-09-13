"""
Tests for the Deterministic Agent Orchestration Service.

Validates:
  - Normal planning flow end-to-end.
  - Actual engine call order using mocks (CRITICALITY -> COMPATIBILITY -> SHADOW_BLOCKS -> OPTIMIZE -> EXPLAIN).
  - Scenario flow and call order (OPTIMIZE -> SCENARIO -> EXPLAIN).
  - Scenario input/output consistency with WhatIfEngine and AGENT_TOOL_CONTRACT.md §7.
  - Emergency flow and call order (OPTIMIZE -> EMERGENCY -> EXPLAIN).
  - Engine failure propagation without unhandled crashes.
  - Missing or invalid input handling.
  - Deterministic repeatability across executions.
  - Safety decisions remain owned by rule and optimization engines.
  - Individual agent tools contract compliance (AGENT_TOOL_CONTRACT.md §1-§9).
"""

from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

try:
    from ai.agents.orchestrator import AgentOrchestrator, orchestrate_planning
    from ai.agents import tools
except ImportError:
    from orchestrator import AgentOrchestrator, orchestrate_planning
    import tools


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _make_task(
    task_id="task_001",
    section="sec_01",
    department="ENGINEERING",
    duration=60,
    start_offset_h=8,
    end_offset_h=11,
    priority="HIGH",
    safety_class="NORMAL",
    base_date=None,
):
    base = base_date or datetime(2026, 11, 3, 0, 0, tzinfo=timezone.utc)
    return {
        "task_id": task_id,
        "task_type": "USFD",
        "railway_section_id": section,
        "from_km": 10.0,
        "to_km": 15.0,
        "department": department,
        "status": "PLANNED",
        "requested_start": _iso(base + timedelta(hours=start_offset_h)),
        "requested_end": _iso(base + timedelta(hours=end_offset_h)),
        "estimated_duration_minutes": duration,
        "required_resources": [{"resource_type": "USFD_VEHICLE", "count": 1}],
        "priority_hint": priority,
        "safety_class": safety_class,
    }


def _make_window(window_id="win_01", section="sec_01", start_offset_h=8, end_offset_h=12, base_date=None):
    base = base_date or datetime(2026, 11, 3, 0, 0, tzinfo=timezone.utc)
    return {
        "window_id": window_id,
        "section_id": section,
        "start": _iso(base + timedelta(hours=start_offset_h)),
        "end": _iso(base + timedelta(hours=end_offset_h)),
        "window_type": "NIGHT",
        "availability": "AVAILABLE",
    }


def _make_movement(mv_id="mv_01", section="sec_01", start_offset_h=13, end_offset_h=14, base_date=None):
    base = base_date or datetime(2026, 11, 3, 0, 0, tzinfo=timezone.utc)
    return {
        "movement_id": mv_id,
        "train_id": f"train_{mv_id}",
        "section_id": section,
        "from_km": 5.0,
        "to_km": 20.0,
        "movement_start": _iso(base + timedelta(hours=start_offset_h)),
        "movement_end": _iso(base + timedelta(hours=end_offset_h)),
        "direction": "UP",
        "speed_class": "HIGH",
        "traffic_density": 0.8,
        "priority_class": "PASSENGER",
    }


def _make_resource(rid="res_01", rtype="USFD_VEHICLE"):
    return {
        "resource_id": rid,
        "resource_type": rtype,
        "department": "ENGINEERING",
        "location": "sec_01",
        "available_windows": [],
        "capacity": 2,
        "is_operational": True,
    }


class TestAgentOrchestrator(unittest.TestCase):
    def setUp(self) -> None:
        self.orchestrator = AgentOrchestrator()
        self.base_request = {
            "request_id": "orch_test_01",
            "mode": "BALANCED",
            "tasks": [
                _make_task("t_01", section="sec_01", department="ENGINEERING", duration=60),
                _make_task("t_02", section="sec_01", department="TRD", duration=60),
            ],
            "maintenance_windows": [
                _make_window("win_01", section="sec_01", start_offset_h=8, end_offset_h=12),
            ],
            "resources": [
                _make_resource("res_01", "USFD_VEHICLE"),
            ],
            "train_movements": [
                _make_movement("mv_01", section="sec_01", start_offset_h=13, end_offset_h=14),
            ],
        }

    # ──────────────────────────────────────────────────────────────────
    # 1. Normal planning flow
    # ──────────────────────────────────────────────────────────────────
    def test_normal_planning_flow(self) -> None:
        result = self.orchestrator.orchestrate(self.base_request)

        self.assertIn(result["status"], ("SUCCESS", "PARTIAL"))
        self.assertEqual(result["request_id"], "orch_test_01")
        self.assertTrue(result["orchestration_id"].startswith("orch_"))
        self.assertEqual(len(result["errors"]), 0)

        # Output artifacts
        self.assertEqual(len(result["criticality_scores"]), 2)
        self.assertIsInstance(result["compatibility_candidates"], list)
        self.assertIsInstance(result["shadow_block_candidates"], list)
        self.assertIsNotNone(result["optimization_result"])
        self.assertIn(result["optimization_result"]["status"], ("OPTIMAL", "FEASIBLE"))
        self.assertGreater(len(result["explanations"]), 0)

    # ──────────────────────────────────────────────────────────────────
    # 2. Actual engine call order verification using mocks
    # ──────────────────────────────────────────────────────────────────
    def test_actual_engine_call_order_using_mocks(self) -> None:
        """
        Verify the actual invocation order of underlying engines using mock spies.
        Enforces strict call order:
          CRITICALITY -> COMPATIBILITY -> SHADOW_BLOCKS -> OPTIMIZE -> EXPLAIN
        """
        mock_crit = MagicMock()
        mock_crit.score.return_value = {
            "entity_id": "t_01",
            "score": 0.8,
            "priority_class": "P2",
            "risk_level": "HIGH",
            "feature_contributions": {},
            "explanation": "test",
            "model_version": "v1",
            "scoring_mode": "RULE_BASED",
        }

        mock_compat = MagicMock()
        mock_compat.find_compatible_tasks.return_value = [
            {"candidate_id": "comp_1", "task_ids": ["t_01", "t_02"], "status": "COMPATIBLE", "safety_compatibility": True}
        ]

        mock_shadow = MagicMock()
        mock_shadow.generate_shadow_blocks.return_value = [
            {
                "shadow_block_id": "sb_1",
                "primary_task_id": "t_01",
                "participating_task_ids": ["t_01", "t_02"],
                "conflict_status": "FEASIBLE",
                "potential_time_saving_minutes": 45,
            }
        ]

        mock_opt = MagicMock()
        mock_opt.optimize.return_value = {
            "request_id": "opt_req_01",
            "status": "OPTIMAL",
            "objective_score": 0.85,
            "selected_task_ids": ["t_01", "t_02"],
            "unscheduled_task_ids": [],
            "schedule_candidates": [
                {
                    "schedule_id": "sched_01",
                    "task_ids": ["t_01", "t_02"],
                    "blocks": [{"block_id": "win_01", "section_id": "sec_01"}],
                }
            ],
            "train_conflicts": [],
        }

        mock_explain = MagicMock()
        mock_explain.explain_schedule.return_value = {
            "explanation_id": "exp_s",
            "entity_type": "SCHEDULE",
            "entity_id": "opt_req_01",
            "summary": "Schedule optimal",
            "reason_codes": ["schedule_optimal"],
            "evidence": {},
            "deterministic_inputs": {},
            "generated_by": "EXPLAINABILITY_ENGINE",
        }
        mock_explain.explain_block.return_value = {
            "explanation_id": "exp_b",
            "entity_type": "BLOCK",
            "entity_id": "win_01",
            "summary": "Block selected",
            "reason_codes": ["block_selected"],
            "evidence": {},
            "deterministic_inputs": {},
            "generated_by": "EXPLAINABILITY_ENGINE",
        }
        mock_explain.explain_unscheduled_task.return_value = {
            "explanation_id": "exp_u",
            "entity_type": "TASK",
            "entity_id": "t_02",
            "summary": "Unscheduled",
            "reason_codes": [],
            "evidence": {},
            "deterministic_inputs": {},
            "generated_by": "EXPLAINABILITY_ENGINE",
        }
        mock_explain.explain_grouping.return_value = {
            "explanation_id": "exp_g",
            "entity_type": "GROUPING",
            "entity_id": "sb_1",
            "summary": "Grouped",
            "reason_codes": [],
            "evidence": {},
            "deterministic_inputs": {},
            "generated_by": "EXPLAINABILITY_ENGINE",
        }

        # Parent manager to track call order across all mocks
        manager = MagicMock()
        manager.attach_mock(mock_crit.score, "criticality_score")
        manager.attach_mock(mock_compat.find_compatible_tasks, "compatibility_find")
        manager.attach_mock(mock_shadow.generate_shadow_blocks, "shadow_blocks_generate")
        manager.attach_mock(mock_opt.optimize, "optimization_optimize")
        manager.attach_mock(mock_explain.explain_schedule, "explain_schedule")

        orchestrator = AgentOrchestrator(
            criticality_engine=mock_crit,
            compatibility_engine=mock_compat,
            shadow_block_engine=mock_shadow,
            optimization_engine=mock_opt,
            explainability_engine=mock_explain,
        )

        res = orchestrator.orchestrate(self.base_request)
        self.assertEqual(res["status"], "SUCCESS")

        # 1. Verify exact chronological call sequence
        call_names = [c[0] for c in manager.mock_calls]
        crit_idx = next(i for i, name in enumerate(call_names) if name == "criticality_score")
        compat_idx = next(i for i, name in enumerate(call_names) if name == "compatibility_find")
        shadow_idx = next(i for i, name in enumerate(call_names) if name == "shadow_blocks_generate")
        opt_idx = next(i for i, name in enumerate(call_names) if name == "optimization_optimize")
        explain_idx = next(i for i, name in enumerate(call_names) if name == "explain_schedule")

        self.assertLess(crit_idx, compat_idx, "Criticality scoring must precede Compatibility evaluation")
        self.assertLess(compat_idx, shadow_idx, "Compatibility evaluation must precede Shadow Block generation")
        self.assertLess(shadow_idx, opt_idx, "Shadow Block generation must precede Optimization")
        self.assertLess(opt_idx, explain_idx, "Optimization must precede Explainability generation")

        # 2. Verify data passing contracts between engines
        # Compatibility received tasks
        _, compat_kwargs = mock_compat.find_compatible_tasks.call_args
        self.assertEqual(len(compat_kwargs["tasks"]), 2)

        # Shadow blocks received compatibility results from compatibility engine
        _, shadow_kwargs = mock_shadow.generate_shadow_blocks.call_args
        self.assertEqual(shadow_kwargs["compatibility_results"], mock_compat.find_compatible_tasks.return_value)

        # Optimization received shadow block candidates and scores
        opt_args, opt_kwargs = mock_opt.optimize.call_args
        opt_req = opt_args[0] if opt_args else opt_kwargs.get("request")
        self.assertEqual(opt_req["shadow_block_candidates"], mock_shadow.generate_shadow_blocks.return_value)
        self.assertEqual(len(opt_req["criticality_scores"]), 2)

        # Explainability received the optimizer result
        exp_args, exp_kwargs = mock_explain.explain_schedule.call_args
        self.assertEqual(exp_kwargs.get("optimization_result", exp_args[0] if exp_args else None), mock_opt.optimize.return_value)

    # ──────────────────────────────────────────────────────────────────
    # 3. Scenario flow & call order using mocks
    # ──────────────────────────────────────────────────────────────────
    def test_scenario_call_order_using_mocks(self) -> None:
        """
        Verify that What-If reoptimization is invoked after optimization and before explainability.
        """
        mock_opt = MagicMock()
        mock_opt.optimize.return_value = {
            "status": "FEASIBLE",
            "schedule_candidates": [{"schedule_id": "sched_01", "task_ids": ["t_01"]}],
            "selected_task_ids": ["t_01"],
            "unscheduled_task_ids": [],
            "train_conflicts": [],
        }

        mock_what_if = MagicMock()
        mock_what_if.reoptimize.return_value = {
            "original_schedule_id": "sched_01",
            "new_schedule": {"schedule_id": "sched_new", "task_ids": ["t_01"]},
            "changed_blocks": [],
            "affected_tasks": ["t_01"],
            "affected_trains": [],
            "metric_differences": {"objective_score": 0.0},
            "explanation": "Reoptimized plan",
            "errors": [],
        }

        mock_explain = MagicMock()
        mock_explain.explain_schedule.return_value = {
            "explanation_id": "exp_s",
            "entity_type": "SCHEDULE",
            "entity_id": "sched_01",
            "summary": "summary",
            "reason_codes": [],
            "evidence": {},
            "deterministic_inputs": {},
            "generated_by": "EXPLAINABILITY_ENGINE",
        }

        manager = MagicMock()
        manager.attach_mock(mock_opt.optimize, "optimize")
        manager.attach_mock(mock_what_if.reoptimize, "what_if_reoptimize")
        manager.attach_mock(mock_explain.explain_schedule, "explain_schedule")

        orchestrator = AgentOrchestrator(
            optimization_engine=mock_opt,
            what_if_engine=mock_what_if,
            explainability_engine=mock_explain,
        )

        req = dict(
            self.base_request,
            scenario={
                "scenario_id": "scen_test",
                "scenario_type": "TRAIN_DELAY",
                "base_schedule_id": "sched_01",
                "affected_task_ids": ["t_01"],
            },
        )
        res = orchestrator.orchestrate(req)
        self.assertIsNotNone(res["scenario_result"])

        call_names = [c[0] for c in manager.mock_calls]
        opt_idx = call_names.index("optimize")
        what_if_idx = call_names.index("what_if_reoptimize")
        explain_idx = call_names.index("explain_schedule")

        self.assertLess(opt_idx, what_if_idx, "Optimization must run before What-If")
        self.assertLess(what_if_idx, explain_idx, "What-If must run before Explainability")

    # ──────────────────────────────────────────────────────────────────
    # 4. Scenario input/output consistency with WhatIfEngine and contract
    # ──────────────────────────────────────────────────────────────────
    def test_scenario_input_output_consistency(self) -> None:
        """
        Verify that scenario input/output is strictly consistent with WhatIfEngine
        and AGENT_TOOL_CONTRACT.md §7.
        """
        req_with_scenario = dict(
            self.base_request,
            scenario={
                "scenario_id": "scen_delay_01",
                "scenario_type": "TRAIN_DELAY",
                "base_schedule_id": "sched_base",
                "affected_task_ids": ["t_01"],
                "affected_train_ids": ["train_mv_01"],
                "new_constraints": {"train_delay_minutes": 30},
                "description": "Train delay 30m",
            },
        )
        result = self.orchestrator.orchestrate(req_with_scenario)
        scen_res = result["scenario_result"]

        # Conformance to AGENT_TOOL_CONTRACT.md §7 output schema:
        # original_schedule_id, new_schedule, changed_blocks, affected_tasks, affected_trains, metric_differences, explanation, errors
        self.assertIn("original_schedule_id", scen_res)
        self.assertIn("new_schedule", scen_res)
        self.assertIn("changed_blocks", scen_res)
        self.assertIn("affected_tasks", scen_res)
        self.assertIn("affected_trains", scen_res)
        self.assertIn("metric_differences", scen_res)
        self.assertIn("explanation", scen_res)
        self.assertIn("errors", scen_res)

        self.assertIsInstance(scen_res["original_schedule_id"], str)
        self.assertIsInstance(scen_res["changed_blocks"], list)
        self.assertIsInstance(scen_res["affected_tasks"], list)
        self.assertIsInstance(scen_res["affected_trains"], list)
        self.assertIsInstance(scen_res["metric_differences"], dict)
        self.assertIsInstance(scen_res["explanation"], str)
        self.assertIsInstance(scen_res["errors"], list)

    # ──────────────────────────────────────────────────────────────────
    # 5. Emergency flow & call order
    # ──────────────────────────────────────────────────────────────────
    def test_emergency_flow(self) -> None:
        req_with_emergency = dict(
            self.base_request,
            emergency_event={
                "event_id": "emg_test_01",
                "event_type": "NEW_USFD_DEFECT",
                "section_id": "sec_01",
                "severity": "CRITICAL",
                "detected_at": "2026-11-03T08:00:00Z",
                "impact_summary": "Urgent rail fracture scan",
            },
        )
        result = self.orchestrator.orchestrate(req_with_emergency)

        self.assertIn("EMERGENCY", result["execution_sequence"])
        self.assertIsNotNone(result["emergency_result"])
        self.assertIn("emergency_task", result["emergency_result"])

    # ──────────────────────────────────────────────────────────────────
    # 6. Engine failure propagation
    # ──────────────────────────────────────────────────────────────────
    def test_engine_failure_propagation(self) -> None:
        # Mock an optimizer engine failure
        mock_optimizer = MagicMock()
        mock_optimizer.optimize.side_effect = RuntimeError("CP-SAT solver memory limit exceeded")

        failing_orchestrator = AgentOrchestrator(optimization_engine=mock_optimizer)
        result = failing_orchestrator.orchestrate(self.base_request)

        self.assertEqual(result["status"], "FAILED")
        self.assertIn("Engine failure during execution (OPTIMIZE): CP-SAT solver memory limit exceeded", result["errors"][0])
        self.assertIsNone(result["optimization_result"])
        # Upstream artifacts should still be preserved
        self.assertEqual(len(result["criticality_scores"]), 2)
        self.assertGreaterEqual(len(result["compatibility_candidates"]), 0)

    # ──────────────────────────────────────────────────────────────────
    # 7. Missing or invalid input handling
    # ──────────────────────────────────────────────────────────────────
    def test_missing_input_handling(self) -> None:
        # 1. Non-dict request
        res1 = self.orchestrator.orchestrate("not_a_dict")
        self.assertEqual(res1["status"], "FAILED")
        self.assertEqual(res1["execution_sequence"], ["VALIDATE"])
        self.assertIn("Request must be a dictionary.", res1["errors"])

        # 2. Missing tasks
        res2 = self.orchestrator.orchestrate({
            "maintenance_windows": [],
            "resources": [],
            "train_movements": [],
        })
        self.assertEqual(res2["status"], "FAILED")
        self.assertTrue(any("tasks" in e for e in res2["errors"]))

        # 3. Missing windows
        res3 = self.orchestrator.orchestrate({
            "tasks": [],
            "resources": [],
            "train_movements": [],
        })
        self.assertEqual(res3["status"], "FAILED")
        self.assertTrue(any("maintenance_windows" in e for e in res3["errors"]))

        # 4. Missing resources
        res4 = self.orchestrator.orchestrate({
            "tasks": [],
            "maintenance_windows": [],
            "train_movements": [],
        })
        self.assertEqual(res4["status"], "FAILED")
        self.assertTrue(any("resources" in e for e in res4["errors"]))

        # 5. Missing movements
        res5 = self.orchestrator.orchestrate({
            "tasks": [],
            "maintenance_windows": [],
            "resources": [],
        })
        self.assertEqual(res5["status"], "FAILED")
        self.assertTrue(any("train_movements" in e for e in res5["errors"]))

    # ──────────────────────────────────────────────────────────────────
    # 8. Deterministic output
    # ──────────────────────────────────────────────────────────────────
    def test_deterministic_output(self) -> None:
        res1 = self.orchestrator.orchestrate(self.base_request)
        res2 = self.orchestrator.orchestrate(self.base_request)

        self.assertEqual(res1["orchestration_id"], res2["orchestration_id"])
        self.assertEqual(res1["status"], res2["status"])
        self.assertEqual(res1["execution_sequence"], res2["execution_sequence"])
        self.assertEqual(
            [c["score"] for c in res1["criticality_scores"]],
            [c["score"] for c in res2["criticality_scores"]],
        )
        self.assertEqual(
            res1["optimization_result"]["selected_task_ids"],
            res2["optimization_result"]["selected_task_ids"],
        )
        self.assertEqual(
            [e["explanation_id"] for e in res1["explanations"]],
            [e["explanation_id"] for e in res2["explanations"]],
        )

    # ──────────────────────────────────────────────────────────────────
    # 9. Safety decisions remain owned by rule/optimization engines
    # ──────────────────────────────────────────────────────────────────
    def test_safety_decisions_remain_owned_by_rule_and_optimization_engines(self) -> None:
        # Incompatible safety classes: INTERLOCKING and HIGH_SAFETY in same section
        unsafe_task_1 = _make_task("t_safe_1", section="sec_01", safety_class="INTERLOCKING", duration=60)
        unsafe_task_2 = _make_task("t_safe_2", section="sec_01", safety_class="HIGH_SAFETY", duration=60)

        req = dict(
            self.base_request,
            tasks=[unsafe_task_1, unsafe_task_2],
        )
        result = self.orchestrator.orchestrate(req)

        # 1. Compatibility engine detected safety conflict
        compat_cand = next(
            (c for c in result["compatibility_candidates"] if set(c["task_ids"]) == {"t_safe_1", "t_safe_2"}),
            None,
        )
        if compat_cand:
            self.assertFalse(compat_cand["safety_compatibility"])
            self.assertEqual(compat_cand["status"], "REJECTED")

        # 2. Optimization engine prevented simultaneous scheduling in the same block
        opt_res = result["optimization_result"]
        for cand in opt_res.get("schedule_candidates", []):
            task_ids = set(cand.get("task_ids", []))
            self.assertFalse(
                {"t_safe_1", "t_safe_2"}.issubset(task_ids),
                "Unsafe pair was scheduled together! Safety constraint violated.",
            )

        # 3. Orchestrator did not alter tasks or hardcode safety bypasses
        self.assertEqual(unsafe_task_1["safety_class"], "INTERLOCKING")
        self.assertEqual(unsafe_task_2["safety_class"], "HIGH_SAFETY")

    # ──────────────────────────────────────────────────────────────────
    # 10. Individual Agent Tools Contract Compliance
    # ──────────────────────────────────────────────────────────────────
    def test_agent_tools_contract_compliance(self) -> None:
        ctx = self.base_request

        # Tool 1: get_maintenance_tasks
        t_res = tools.get_maintenance_tasks(department_filter=["ENGINEERING"], context=ctx)
        self.assertEqual(t_res["count"], 1)
        self.assertEqual(t_res["tasks"][0]["task_id"], "t_01")
        self.assertEqual(t_res["errors"], [])

        # Tool 2: get_train_movements
        m_res = tools.get_train_movements(section_ids=["sec_01"], context=ctx)
        self.assertEqual(m_res["count"], 1)
        self.assertEqual(m_res["errors"], [])

        # Tool 3: get_resources
        r_res = tools.get_resources(resource_types=["USFD_VEHICLE"], context=ctx)
        self.assertEqual(r_res["count"], 1)
        self.assertEqual(r_res["errors"], [])

        # Tool 4: calculate_criticality
        c_res = tools.calculate_criticality({
            "entity_id": "t_01",
            "severity": "CRITICAL",
            "urgency": 1.0,
            "safety_risk": 1.0,
            "traffic_density": 0.8,
            "speed_class": "HIGH",
        })
        self.assertIsNotNone(c_res["criticality_score"])
        self.assertEqual(c_res["criticality_score"]["priority_class"], "P1")
        self.assertEqual(c_res["errors"], [])

        # Tool 5: find_shadow_opportunities
        s_res = tools.find_shadow_opportunities(context=ctx)
        self.assertIsInstance(s_res["shadow_block_candidates"], list)
        self.assertEqual(s_res["errors"], [])

        # Tool 6: optimize_schedule
        opt_req = {
            "request_id": "test_opt",
            "mode": "BALANCED",
            "tasks": ctx["tasks"],
            "criticality_scores": [c_res["criticality_score"]],
            "train_movements": ctx["train_movements"],
            "resources": ctx["resources"],
            "maintenance_windows": ctx["maintenance_windows"],
        }
        o_res = tools.optimize_schedule(opt_req)
        self.assertIsNotNone(o_res["result"])
        self.assertEqual(o_res["errors"], [])

        # Tool 7: run_what_if with current_schedule_id per AGENT_TOOL_CONTRACT.md §7
        w_res = tools.run_what_if(
            scenario={
                "scenario_id": "w_test",
                "scenario_type": "TRAIN_DELAY",
                "affected_task_ids": ["t_01"],
                "affected_train_ids": ["mv_01"],
                "new_constraints": {"train_delay_minutes": 15},
            },
            current_schedule_id="sched_01",
            context=opt_req,
        )
        self.assertEqual(w_res["original_schedule_id"], "sched_01")
        self.assertIn("metric_differences", w_res)
        self.assertIn("new_schedule", w_res)
        self.assertIn("changed_blocks", w_res)
        self.assertIn("affected_tasks", w_res)

        # Tool 8: insert_emergency_task
        e_res = tools.insert_emergency_task(
            event={
                "event_id": "emg_tool_test",
                "event_type": "TRACK_FAILURE",
                "section_id": "sec_01",
                "severity": "CRITICAL",
                "detected_at": "2026-11-03T08:00:00Z",
                "impact_summary": "Broken rail",
            },
            existing_tasks=ctx["tasks"],
            train_movements=ctx["train_movements"],
            resources=ctx["resources"],
            windows=ctx["maintenance_windows"],
        )
        self.assertIn("emergency_task", e_res)

        # Tool 9: explain_schedule
        exp_res = tools.explain_schedule(
            entity_type="SCHEDULE",
            entity_id="test_opt",
            context={"optimization_result": o_res["result"], "request": opt_req},
        )
        self.assertIsNotNone(exp_res["explanation"])
        self.assertEqual(exp_res["explanation"]["entity_type"], "SCHEDULE")


if __name__ == "__main__":
    unittest.main()
