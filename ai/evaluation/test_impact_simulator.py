from __future__ import annotations

import unittest

from ai.evaluation.impact_simulator import compare_impact


class TestImpactSimulator(unittest.TestCase):
    def test_identical_results(self):
        payload = {
            "status": "OPTIMAL",
            "selected_task_ids": ["t1", "t2"],
            "blocks": [{"block_id": "b1"}, {"block_id": "b2"}],
            "train_conflicts": [],
            "objective_score": 10.0,
        }
        result = compare_impact(payload, payload)
        self.assertEqual(result["baseline_status"], "OPTIMAL")
        self.assertEqual(result["optimized_status"], "OPTIMAL")
        self.assertEqual(result["objective_improvement"], 0.0)
        self.assertEqual(result["task_completion_change"], 0)
        self.assertEqual(result["train_conflict_change"], 0)

    def test_optimized_result_better_objective(self):
        baseline = {"status": "FEASIBLE", "selected_task_ids": ["t1"], "blocks": [{"block_id": "b1"}], "train_conflicts": ["c1"], "objective_score": 5.0}
        optimized = {"status": "OPTIMAL", "selected_task_ids": ["t1", "t2"], "blocks": [{"block_id": "b1"}, {"block_id": "b2"}], "train_conflicts": [], "objective_score": 12.0}
        result = compare_impact(baseline, optimized)
        self.assertEqual(result["objective_improvement"], 7.0)
        self.assertEqual(result["task_completion_change"], 1)
        self.assertEqual(result["train_conflict_change"], -1)

    def test_fewer_train_conflicts(self):
        baseline = {"status": "FEASIBLE", "selected_task_ids": ["t1"], "blocks": [{"block_id": "b1"}], "train_conflicts": [{"id": 1}, {"id": 2}], "objective_score": 7.0}
        optimized = {"status": "OPTIMAL", "selected_task_ids": ["t1"], "blocks": [{"block_id": "b1"}], "train_conflicts": [{"id": 1}], "objective_score": 9.0}
        result = compare_impact(baseline, optimized)
        self.assertEqual(result["train_conflict_change"], -1)
        self.assertGreater(result["optimized_objective_score"], result["baseline_objective_score"])

    def test_different_task_and_block_counts(self):
        baseline = {"status": "PARTIAL", "selected_task_ids": ["t1"], "schedule_candidates": [{"task_ids": ["t1"], "blocks": [{"block_id": "b1"}, {"block_id": "b2"}]}], "train_conflicts": [], "objective_score": 2.0}
        optimized = {"status": "OPTIMAL", "selected_task_ids": ["t1", "t2", "t3"], "schedule_candidates": [{"task_ids": ["t1", "t2", "t3"], "blocks": [{"block_id": "b1"}, {"block_id": "b2"}, {"block_id": "b3"}]}], "train_conflicts": [], "objective_score": 6.0}
        result = compare_impact(baseline, optimized)
        self.assertEqual(result["baseline_task_count"], 1)
        self.assertEqual(result["optimized_task_count"], 3)
        self.assertEqual(result["baseline_block_count"], 2)
        self.assertEqual(result["optimized_block_count"], 3)

    def test_missing_optional_fields(self):
        baseline = {"status": "FEASIBLE"}
        optimized = {"status": "OPTIMAL"}
        result = compare_impact(baseline, optimized)
        self.assertEqual(result["baseline_task_count"], 0)
        self.assertEqual(result["optimized_task_count"], 0)
        self.assertEqual(result["baseline_block_count"], 0)
        self.assertEqual(result["optimized_block_count"], 0)
        self.assertEqual(result["baseline_train_conflicts"], 0)
        self.assertEqual(result["optimized_train_conflicts"], 0)
        self.assertEqual(result["baseline_objective_score"], 0.0)
        self.assertEqual(result["optimized_objective_score"], 0.0)

    def test_deterministic_repeated_comparison(self):
        baseline = {"status": "FEASIBLE", "selected_task_ids": ["a", "b"], "blocks": [{"block_id": "x"}, {"block_id": "y"}], "train_conflicts": [{"id": 1}], "objective_score": 8.5}
        optimized = {"status": "OPTIMAL", "selected_task_ids": ["a", "b", "c"], "blocks": [{"block_id": "x"}, {"block_id": "y"}, {"block_id": "z"}], "train_conflicts": [], "objective_score": 11.2}
        first = compare_impact(baseline, optimized)
        second = compare_impact(baseline, optimized)
        self.assertEqual(first, second)


if __name__ == "__main__":
    unittest.main(verbosity=2)
