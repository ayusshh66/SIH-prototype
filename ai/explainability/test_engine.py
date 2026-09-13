"""
Tests for the Deterministic Explainability Engine.

Validates:
  - Identical inputs produce identical explanation_id across all explanation types.
  - Block explanation does NOT claim avoided train conflict when evidence is absent.
  - Block explanation DOES claim avoided train conflict when train movements exist with zero conflict.
  - Selected block explanation uses actual optimizer evidence (selection, window, criticality).
  - Window availability is not claimed when window evidence is missing.
  - Rejected task explanation uses actual unscheduled reason.
  - Safety explanation cites actual safety conflict evidence and sets entity_type=REJECTION.
  - Full contract compliance (8 required fields, correct types, valid enums).
"""

from __future__ import annotations

import unittest

try:
    from ai.explainability.engine import ExplainabilityEngine
except ImportError:
    from engine import ExplainabilityEngine


class TestExplainabilityEngine(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = ExplainabilityEngine()
        self.sample_request = {
            "request_id": "req_001",
            "mode": "BALANCED",
            "tasks": [
                {
                    "task_id": "task_1",
                    "safety_class": "NORMAL",
                    "department": "ENGINEERING",
                    "estimated_duration_minutes": 120,
                    "railway_section_id": "sec_01",
                },
                {
                    "task_id": "task_2",
                    "safety_class": "HIGH_SAFETY",
                    "department": "SNT",
                    "estimated_duration_minutes": 90,
                    "railway_section_id": "sec_01",
                },
            ],
            "weights": {"maintenance_value": 0.5, "train_disruption_penalty": 0.5},
            "criticality_scores": [
                {"entity_id": "task_1", "score": 0.90},
                {"entity_id": "task_2", "score": 0.60},
            ],
            "maintenance_windows": [
                {
                    "window_id": "win_01",
                    "section_id": "sec_01",
                    "start": "2026-11-03T00:00:00Z",
                    "end": "2026-11-03T04:00:00Z",
                    "availability": "AVAILABLE",
                }
            ],
            "train_movements": [],
        }
        self.sample_opt_result = {
            "request_id": "req_001",
            "status": "FEASIBLE",
            "objective_score": 0.75,
            "selected_task_ids": ["task_1"],
            "unscheduled_task_ids": ["task_2"],
            "unscheduled_reasons": {
                "task_2": ["resource_capacity_exceeded"]
            },
            "train_conflicts": [],
        }

    # ──────────────────────────────────────────────────────────────────
    # 1. Deterministic explanation_id repeatability
    # ──────────────────────────────────────────────────────────────────
    def test_identical_inputs_produce_identical_explanation_id(self) -> None:
        """Calling any explain method twice with identical inputs must produce identical IDs."""
        # Schedule
        exp_sched_1 = self.engine.explain_schedule(self.sample_opt_result, self.sample_request)
        exp_sched_2 = self.engine.explain_schedule(self.sample_opt_result, self.sample_request)
        self.assertEqual(exp_sched_1["explanation_id"], exp_sched_2["explanation_id"])

        # Block
        cand = {
            "task_ids": ["task_1"],
            "blocks": [{"block_id": "win_01", "section_id": "sec_01", "start": "2026-11-03T00:00:00Z", "end": "2026-11-03T02:00:00Z"}],
            "status": "VALID",
        }
        exp_blk_1 = self.engine.explain_block("win_01", cand, self.sample_opt_result, self.sample_request)
        exp_blk_2 = self.engine.explain_block("win_01", cand, self.sample_opt_result, self.sample_request)
        self.assertEqual(exp_blk_1["explanation_id"], exp_blk_2["explanation_id"])

        # Unscheduled task
        exp_task_1 = self.engine.explain_unscheduled_task("task_2", self.sample_opt_result, self.sample_request)
        exp_task_2 = self.engine.explain_unscheduled_task("task_2", self.sample_opt_result, self.sample_request)
        self.assertEqual(exp_task_1["explanation_id"], exp_task_2["explanation_id"])

        # Window
        win = self.sample_request["maintenance_windows"][0]
        exp_win_1 = self.engine.explain_window(win, "task_1")
        exp_win_2 = self.engine.explain_window(win, "task_1")
        self.assertEqual(exp_win_1["explanation_id"], exp_win_2["explanation_id"])

        # Grouping
        sb = {
            "shadow_block_id": "sb_100",
            "conflict_status": "FEASIBLE",
            "primary_task_id": "task_1",
            "participating_task_ids": ["task_2"],
            "potential_time_saving_minutes": 45,
            "reasons": ["shared_corridor"],
        }
        exp_grp_1 = self.engine.explain_grouping(sb)
        exp_grp_2 = self.engine.explain_grouping(sb)
        self.assertEqual(exp_grp_1["explanation_id"], exp_grp_2["explanation_id"])

    def test_different_inputs_produce_different_explanation_id(self) -> None:
        """Altering evidence or inputs must yield distinct explanation_ids."""
        exp1 = self.engine.explain_schedule(self.sample_opt_result, self.sample_request)
        altered_opt_result = dict(self.sample_opt_result, objective_score=0.99)
        exp2 = self.engine.explain_schedule(altered_opt_result, self.sample_request)
        self.assertNotEqual(exp1["explanation_id"], exp2["explanation_id"])

    # ──────────────────────────────────────────────────────────────────
    # 2. Train conflict avoidance evidence
    # ──────────────────────────────────────────────────────────────────
    def test_block_explanation_does_not_claim_avoided_train_conflict_when_evidence_absent(self) -> None:
        """When train movements are empty/absent, train_conflict_avoided MUST NOT be claimed."""
        req_without_trains = dict(self.sample_request, train_movements=[])
        cand = {
            "task_ids": ["task_1"],
            "blocks": [{"block_id": "win_01", "section_id": "sec_01", "start": "2026-11-03T00:00:00Z", "end": "2026-11-03T02:00:00Z"}],
            "status": "VALID",
        }
        exp = self.engine.explain_block("win_01", cand, self.sample_opt_result, req_without_trains)

        self.assertNotIn("train_conflict_avoided", exp["reason_codes"])
        self.assertIsNone(exp["evidence"]["train_conflict_avoided"])
        self.assertEqual(exp["evidence"]["section_train_movements_count"], 0)

    def test_block_explanation_claims_avoided_train_conflict_when_evidence_present(self) -> None:
        """When trains exist in section and zero conflict occurs, train_conflict_avoided IS proved."""
        req_with_trains = dict(
            self.sample_request,
            train_movements=[
                {
                    "movement_id": "mv_01",
                    "section_id": "sec_01",
                    "movement_start": "2026-11-03T06:00:00Z",
                    "movement_end": "2026-11-03T07:00:00Z",
                }
            ],
        )
        cand = {
            "task_ids": ["task_1"],
            "blocks": [{"block_id": "win_01", "section_id": "sec_01", "start": "2026-11-03T00:00:00Z", "end": "2026-11-03T02:00:00Z"}],
            "estimated_disruption_minutes": 0.0,
            "status": "VALID",
        }
        exp = self.engine.explain_block("win_01", cand, self.sample_opt_result, req_with_trains)

        self.assertIn("train_conflict_avoided", exp["reason_codes"])
        self.assertTrue(exp["evidence"]["train_conflict_avoided"])
        self.assertEqual(exp["evidence"]["section_train_movements_count"], 1)
        self.assertEqual(exp["evidence"]["train_conflicts_count"], 0)

    # ──────────────────────────────────────────────────────────────────
    # 3. Selected block optimizer evidence
    # ──────────────────────────────────────────────────────────────────
    def test_selected_block_explanation_uses_actual_optimizer_evidence(self) -> None:
        """Block explanation grounds block_selected, window_available, and criticality."""
        cand = {
            "task_ids": ["task_1"],
            "blocks": [{"block_id": "win_01", "section_id": "sec_01", "start": "2026-11-03T00:00:00Z", "end": "2026-11-03T02:00:00Z"}],
            "resource_assignments": {"USFD_VEHICLE": ["task_1"]},
            "status": "VALID",
        }
        exp = self.engine.explain_block("win_01", cand, self.sample_opt_result, self.sample_request)

        self.assertEqual(exp["entity_type"], "BLOCK")
        self.assertEqual(exp["entity_id"], "win_01")
        # Selection evidence
        self.assertIn("block_selected", exp["reason_codes"])
        self.assertTrue(exp["evidence"]["is_selected"])
        self.assertEqual(exp["evidence"]["selected_tasks"], ["task_1"])
        # Window evidence
        self.assertIn("window_available", exp["reason_codes"])
        self.assertEqual(exp["evidence"]["window_availability"], "AVAILABLE")
        self.assertFalse(exp["evidence"]["window_conflict"])
        # Criticality evidence: task_1 score is 0.90 -> criticality_score_high
        self.assertIn("criticality_score_high", exp["reason_codes"])
        self.assertEqual(exp["evidence"]["average_criticality"], 0.90)
        # Resource evidence
        self.assertIn("resources_assigned", exp["reason_codes"])
        self.assertEqual(exp["evidence"]["resource_assignments"], {"USFD_VEHICLE": ["task_1"]})

    def test_unverified_window_is_not_claimed_available(self) -> None:
        """If block has no matching maintenance window in request, window_available must not be claimed."""
        req_no_windows = dict(self.sample_request, maintenance_windows=[])
        cand = {
            "task_ids": ["task_1"],
            "blocks": [{"block_id": "win_999", "section_id": "sec_01", "start": "2026-11-03T00:00:00Z", "end": "2026-11-03T02:00:00Z"}],
            "status": "VALID",
        }
        exp = self.engine.explain_block("win_999", cand, self.sample_opt_result, req_no_windows)
        self.assertNotIn("window_available", exp["reason_codes"])
        self.assertNotIn("window_availability", exp["evidence"])

    # ──────────────────────────────────────────────────────────────────
    # 4. Rejected task actual unscheduled reasons
    # ──────────────────────────────────────────────────────────────────
    def test_rejected_task_explanation_uses_actual_unscheduled_reason(self) -> None:
        """Unscheduled task explanation must extract the actual solver reason."""
        opt_res = {
            "status": "PARTIAL",
            "selected_task_ids": ["task_1"],
            "unscheduled_task_ids": ["task_2"],
            "unscheduled_reasons": {
                "task_2": "Resource capacity exhausted: insufficient USFD_VEHICLE during available windows"
            },
            "train_conflicts": [],
        }
        exp = self.engine.explain_unscheduled_task("task_2", opt_res, self.sample_request)

        self.assertEqual(exp["entity_type"], "TASK")
        self.assertEqual(exp["entity_id"], "task_2")
        self.assertIn("resource_capacity_exhausted", exp["reason_codes"])
        self.assertIn(
            "Resource capacity exhausted: insufficient USFD_VEHICLE during available windows",
            exp["evidence"]["actual_reasons"],
        )
        self.assertTrue(exp["evidence"]["is_unscheduled"])
        self.assertFalse(exp["evidence"]["safety_conflict"])

    # ──────────────────────────────────────────────────────────────────
    # 5. Safety conflict explanation
    # ──────────────────────────────────────────────────────────────────
    def test_safety_explanation_cites_actual_safety_conflict_evidence(self) -> None:
        """Safety rejections must set entity_type=REJECTION and cite the safety evidence."""
        opt_res = {
            "status": "PARTIAL",
            "selected_task_ids": ["task_1"],
            "unscheduled_task_ids": ["task_2"],
            "unscheduled_reasons": {
                "task_2": "Safety conflict: incompatible safety class (HIGH_SAFETY) with scheduled task task_1 in section sec_01"
            },
            "train_conflicts": [],
        }
        exp = self.engine.explain_unscheduled_task("task_2", opt_res, self.sample_request)

        self.assertEqual(exp["entity_type"], "REJECTION")
        self.assertEqual(exp["entity_id"], "task_2")
        self.assertIn("safety_conflict", exp["reason_codes"])
        self.assertTrue(exp["evidence"]["safety_conflict"])
        self.assertEqual(exp["evidence"]["task_safety_class"], "HIGH_SAFETY")
        self.assertEqual(
            exp["evidence"]["safety_evidence"],
            ["Safety conflict: incompatible safety class (HIGH_SAFETY) with scheduled task task_1 in section sec_01"],
        )

    # ──────────────────────────────────────────────────────────────────
    # 6. Window and grouping explanations
    # ──────────────────────────────────────────────────────────────────
    def test_explain_rejected_window(self) -> None:
        """Rejected window sets entity_type=REJECTION with explicit unavailability evidence."""
        window = {
            "window_id": "win_blocked",
            "section_id": "sec_01",
            "availability": "UNAVAILABLE",
        }
        exp = self.engine.explain_window(window, "task_1")

        self.assertEqual(exp["entity_type"], "REJECTION")
        self.assertEqual(exp["entity_id"], "win_blocked")
        self.assertIn("window_unavailable", exp["reason_codes"])
        self.assertIn("rejected", exp["reason_codes"])
        self.assertEqual(exp["evidence"]["availability"], "UNAVAILABLE")
        self.assertFalse(exp["evidence"]["window_available"])

    def test_explain_shadow_block_grouping(self) -> None:
        """Shadow block grouping records savings, compatibility, and participant count."""
        sb = {
            "shadow_block_id": "sb_201",
            "conflict_status": "FEASIBLE",
            "primary_task_id": "task_1",
            "participating_task_ids": ["task_1", "task_2"],
            "potential_time_saving_minutes": 75,
            "reasons": ["shared_corridor", "compatible_departments"],
            "sections": ["sec_01"],
            "departments": ["ENGINEERING", "SNT"],
        }
        exp = self.engine.explain_grouping(sb)

        self.assertEqual(exp["entity_type"], "GROUPING")
        self.assertEqual(exp["entity_id"], "sb_201")
        self.assertIn("shared_corridor", exp["reason_codes"])
        self.assertIn("compatible_departments", exp["reason_codes"])
        self.assertEqual(exp["evidence"]["potential_time_savings_minutes"], 75)
        self.assertEqual(exp["evidence"]["participant_count"], 2)
        self.assertTrue(exp["evidence"]["grouping_feasible"])

    # ──────────────────────────────────────────────────────────────────
    # 7. Full contract compliance
    # ──────────────────────────────────────────────────────────────────
    def test_contract_compliance(self) -> None:
        """Every generated explanation must strictly comply with AI_DOMAIN_CONTRACT.md §17."""
        valid_entity_types = {"BLOCK", "TASK", "WINDOW", "GROUPING", "SCHEDULE", "REJECTION"}
        valid_generators = {
            "CRITICALITY_ENGINE",
            "COMPATIBILITY_ENGINE",
            "SHADOW_BLOCK_ENGINE",
            "OPTIMIZATION_ENGINE",
            "EXPLAINABILITY_ENGINE",
        }

        # Test across all 5 public methods
        explanations = [
            self.engine.explain_schedule(self.sample_opt_result, self.sample_request),
            self.engine.explain_block(
                "win_01",
                {
                    "task_ids": ["task_1"],
                    "blocks": [{"block_id": "win_01", "section_id": "sec_01", "start": "2026-11-03T00:00:00Z", "end": "2026-11-03T02:00:00Z"}],
                    "status": "VALID",
                },
                self.sample_opt_result,
                self.sample_request,
            ),
            self.engine.explain_unscheduled_task("task_2", self.sample_opt_result, self.sample_request),
            self.engine.explain_window(self.sample_request["maintenance_windows"][0], "task_1"),
            self.engine.explain_grouping({
                "shadow_block_id": "sb_test",
                "conflict_status": "FEASIBLE",
                "primary_task_id": "task_1",
                "participating_task_ids": ["task_2"],
                "potential_time_saving_minutes": 30,
            }),
        ]

        for exp in explanations:
            # 8 required fields
            self.assertIn("explanation_id", exp)
            self.assertIn("entity_type", exp)
            self.assertIn("entity_id", exp)
            self.assertIn("summary", exp)
            self.assertIn("reason_codes", exp)
            self.assertIn("evidence", exp)
            self.assertIn("deterministic_inputs", exp)
            self.assertIn("generated_by", exp)

            # Field types
            self.assertIsInstance(exp["explanation_id"], str)
            self.assertTrue(exp["explanation_id"].startswith("exp_"))
            self.assertIsInstance(exp["entity_type"], str)
            self.assertIn(exp["entity_type"], valid_entity_types)
            self.assertIsInstance(exp["entity_id"], str)
            self.assertIsInstance(exp["summary"], str)
            self.assertGreater(len(exp["summary"]), 0)
            self.assertIsInstance(exp["reason_codes"], list)
            self.assertIsInstance(exp["evidence"], dict)
            self.assertIsInstance(exp["deterministic_inputs"], dict)
            self.assertEqual(exp["generated_by"], "EXPLAINABILITY_ENGINE")
            self.assertIn(exp["generated_by"], valid_generators)


if __name__ == "__main__":
    unittest.main()
