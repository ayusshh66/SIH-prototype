"""
Test suite for the AI-RMP synthetic data generator.

Covers:
  - Determinism (seeded reproducibility)
  - Contract compliance (all records validate)
  - Scenario coverage (test cases A–K from TEST_CASE_SPEC.md)
  - Record counts and data integrity
  - Synthetic provenance marking

Run with:
    python -m pytest ai/data/test_generator.py -v
    python ai/data/test_generator.py         # standalone
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from datetime import datetime, timezone

# Ensure the project root is on sys.path for import
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from ai.data.generator import SyntheticDataGenerator
from ai.data.validator import ContractValidator


class TestSyntheticDataGenerator(unittest.TestCase):
    """Core generator tests."""

    @classmethod
    def setUpClass(cls):
        cls.gen = SyntheticDataGenerator(seed=42)
        cls.dataset = cls.gen.generate()

    # ── Determinism ───────────────────────────────────────────────

    def test_seed_reproducibility(self):
        """Same seed produces identical output."""
        gen2 = SyntheticDataGenerator(seed=42)
        ds2 = gen2.generate()
        for key in self.dataset:
            self.assertEqual(
                json.dumps(self.dataset[key], sort_keys=True),
                json.dumps(ds2[key], sort_keys=True),
                f"Non-deterministic output for {key}",
            )

    def test_different_seed_differs(self):
        """Different seed produces different output."""
        gen3 = SyntheticDataGenerator(seed=123)
        ds3 = gen3.generate()
        # At least task IDs should differ due to different random choices
        ids_42 = {t["task_id"] for t in self.dataset["maintenance_tasks"]}
        # The IDs themselves are sequential, but section assignments differ
        secs_42 = [t["railway_section_id"] for t in self.dataset["maintenance_tasks"]]
        secs_123 = [t["railway_section_id"] for t in ds3["maintenance_tasks"]]
        self.assertNotEqual(secs_42, secs_123)

    # ── Record counts ─────────────────────────────────────────────

    def test_maintenance_tasks_count(self):
        """Should produce 200+ maintenance tasks across departments."""
        self.assertGreaterEqual(len(self.dataset["maintenance_tasks"]), 200)

    def test_usfd_defects_count(self):
        self.assertGreaterEqual(len(self.dataset["usfd_defects"]), 60)

    def test_trd_tasks_count(self):
        self.assertGreaterEqual(len(self.dataset["trd_tasks"]), 50)

    def test_snt_tasks_count(self):
        self.assertGreaterEqual(len(self.dataset["snt_tasks"]), 30)

    def test_train_movements_count(self):
        """6-9 trains per section per day × 8 sections × 3 days = 144–216."""
        count = len(self.dataset["train_movements"])
        self.assertGreaterEqual(count, 120)
        self.assertLessEqual(count, 216)

    def test_resources_count(self):
        """At least 20 resources across departments with realistic bottlenecks."""
        self.assertGreaterEqual(len(self.dataset["resources"]), 20)

    def test_maintenance_windows_count(self):
        """At least 30 maintenance windows across the planning horizon."""
        self.assertGreaterEqual(len(self.dataset["maintenance_windows"]), 30)

    def test_conflicts_generated(self):
        """Should have train, resource, deadline, and safety conflicts."""
        self.assertGreaterEqual(len(self.dataset["conflicts"]), 4)

    def test_shadow_blocks_generated(self):
        """Should have feasible and rejected shadow block candidates."""
        self.assertGreaterEqual(len(self.dataset["shadow_block_candidates"]), 2)

    def test_emergency_events_generated(self):
        self.assertEqual(len(self.dataset["emergency_events"]), 2)

    # ── Contract compliance ───────────────────────────────────────

    def test_all_records_pass_validation(self):
        """Every record must pass contract validation."""
        validator = ContractValidator()
        results = validator.validate_all(self.dataset)
        for name, res in results.items():
            self.assertTrue(
                res.ok,
                f"{name} validation failed: {res.errors[:5]}",
            )


class TestScenarioCoverage(unittest.TestCase):
    """Verify that generated data covers test scenarios from TEST_CASE_SPEC.md."""

    @classmethod
    def setUpClass(cls):
        cls.gen = SyntheticDataGenerator(seed=42)
        cls.ds = cls.gen.generate()

    # A: Single critical USFD defect
    def test_scenario_a_critical_usfd(self):
        critical = [d for d in self.ds["usfd_defects"] if d["severity"] == "CRITICAL"]
        self.assertGreaterEqual(len(critical), 1, "Need at least 1 CRITICAL USFD defect")
        for d in critical:
            self.assertGreaterEqual(d["safety_risk"], 0.8)

    # B: Compatible tasks in same section
    def test_scenario_b_compatible_tasks_same_section(self):
        from collections import Counter
        sections = Counter(t["railway_section_id"] for t in self.ds["maintenance_tasks"] if t["status"] == "PLANNED")
        multi_task_sections = {s for s, c in sections.items() if c >= 2}
        self.assertGreaterEqual(len(multi_task_sections), 1, "Need sections with ≥2 tasks for compatibility")

    # C: Train conflicts
    def test_scenario_c_train_conflicts(self):
        train_conflicts = [c for c in self.ds["conflicts"] if c["conflict_type"] == "TRAIN_CONFLICT"]
        self.assertGreaterEqual(len(train_conflicts), 1)
        for tc in train_conflicts:
            self.assertIn("TRAIN_CONFLICT", tc["conflict_type"])

    # D: Resource conflicts
    def test_scenario_d_resource_conflicts(self):
        resource_conflicts = [c for c in self.ds["conflicts"] if c["conflict_type"] == "RESOURCE_CONFLICT"]
        self.assertGreaterEqual(len(resource_conflicts), 1)

    # E: Deadline constraints
    def test_scenario_e_deadline_constraints(self):
        tasks_with_deadline = [t for t in self.ds["maintenance_tasks"] if t.get("deadline")]
        self.assertGreaterEqual(len(tasks_with_deadline), 4, "Need tasks with deadlines")
        # Check for impossible deadlines
        deadline_conflicts = [c for c in self.ds["conflicts"] if c["conflict_type"] == "DEADLINE_CONFLICT"]
        self.assertGreaterEqual(len(deadline_conflicts), 1, "Need at least one impossible deadline")

    # F: Shadow block opportunities
    def test_scenario_f_shadow_blocks(self):
        feasible = [sb for sb in self.ds["shadow_block_candidates"] if sb["conflict_status"] == "FEASIBLE"]
        self.assertGreaterEqual(len(feasible), 1)
        for sb in feasible:
            self.assertGreater(sb["potential_time_saving_minutes"], 0)

    # G: Emergency defects
    def test_scenario_g_emergency_events(self):
        events = self.ds["emergency_events"]
        self.assertGreaterEqual(len(events), 1)
        critical_events = [e for e in events if e["severity"] in ("HIGH", "CRITICAL")]
        self.assertGreaterEqual(len(critical_events), 1)

    # K: Unsafe shadow block (safety conflict)
    def test_scenario_k_unsafe_grouping(self):
        rejected = [sb for sb in self.ds["shadow_block_candidates"] if sb["conflict_status"] == "REJECTED"]
        self.assertGreaterEqual(len(rejected), 1, "Need at least 1 rejected unsafe shadow block")
        for sb in rejected:
            self.assertEqual(sb["shadow_benefit_score"], 0.0)
            # Should have safety-related reason
            reasons_text = " ".join(sb.get("reasons", []))
            self.assertIn("SAFETY_CONFLICT", reasons_text)

        # Corresponding safety conflict
        safety_conflicts = [c for c in self.ds["conflicts"] if c["conflict_type"] == "SAFETY_CONFLICT"]
        self.assertGreaterEqual(len(safety_conflicts), 1)


class TestProvenanceAndSynthetic(unittest.TestCase):
    """All records with provenance must be marked synthetic."""

    @classmethod
    def setUpClass(cls):
        cls.gen = SyntheticDataGenerator(seed=42)
        cls.ds = cls.gen.generate()

    def test_all_provenance_is_synthetic(self):
        for task in self.ds["maintenance_tasks"]:
            prov = task.get("provenance")
            if prov:
                self.assertTrue(prov["is_synthetic"], f"{task['task_id']} not marked synthetic")
                self.assertEqual(prov["source"], "synthetic_scenario_generator_v1")

    def test_data_quality_valid(self):
        for task in self.ds["maintenance_tasks"]:
            prov = task.get("provenance")
            if prov:
                self.assertIn(prov["data_quality"], {"HIGH", "MEDIUM", "LOW"})


class TestTaskTypeCoverage(unittest.TestCase):
    """Verify all task types are represented."""

    @classmethod
    def setUpClass(cls):
        cls.gen = SyntheticDataGenerator(seed=42)
        cls.ds = cls.gen.generate()

    def test_usfd_tasks_exist(self):
        usfd = [t for t in self.ds["maintenance_tasks"] if t["task_type"] == "USFD"]
        self.assertGreaterEqual(len(usfd), 60)

    def test_trd_tasks_exist(self):
        trd = [t for t in self.ds["maintenance_tasks"] if t["task_type"] == "TRD"]
        self.assertGreaterEqual(len(trd), 50)

    def test_snt_tasks_exist(self):
        snt = [t for t in self.ds["maintenance_tasks"] if t["task_type"] == "SNT"]
        self.assertGreaterEqual(len(snt), 30)

    def test_engineering_tasks_exist(self):
        eng = [t for t in self.ds["maintenance_tasks"] if t["task_type"] == "ENGINEERING"]
        self.assertGreaterEqual(len(eng), 30)


class TestDepartmentResourceAlignment(unittest.TestCase):
    """Verify department-resource consistency."""

    @classmethod
    def setUpClass(cls):
        cls.gen = SyntheticDataGenerator(seed=42)
        cls.ds = cls.gen.generate()

    def test_usfd_tasks_use_engineering_dept(self):
        for t in self.ds["maintenance_tasks"]:
            if t["task_type"] == "USFD":
                self.assertEqual(t["department"], "ENGINEERING")

    def test_trd_tasks_use_trd_dept(self):
        for t in self.ds["maintenance_tasks"]:
            if t["task_type"] == "TRD":
                self.assertEqual(t["department"], "TRD")

    def test_snt_tasks_use_snt_dept(self):
        for t in self.ds["maintenance_tasks"]:
            if t["task_type"] == "SNT":
                self.assertEqual(t["department"], "SNT")

    def test_trd_subtasks_dept_is_trd(self):
        for t in self.ds["trd_tasks"]:
            self.assertEqual(t["department"], "TRD")

    def test_snt_subtasks_dept_is_snt(self):
        for t in self.ds["snt_tasks"]:
            self.assertEqual(t["department"], "SNT")


class TestWindowAndTimingIntegrity(unittest.TestCase):
    """Verify window types, sections, and timing."""

    @classmethod
    def setUpClass(cls):
        cls.gen = SyntheticDataGenerator(seed=42)
        cls.ds = cls.gen.generate()

    def test_all_windows_have_valid_sections(self):
        valid_sections = {f"sec_{i:02d}" for i in range(1, 9)}
        for w in self.ds["maintenance_windows"]:
            self.assertIn(w["section_id"], valid_sections)

    def test_window_start_before_end(self):
        for w in self.ds["maintenance_windows"]:
            start = datetime.fromisoformat(w["start"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(w["end"].replace("Z", "+00:00"))
            self.assertLess(start, end, f"Window {w['window_id']} start >= end")

    def test_all_three_window_types_present(self):
        types = {w["window_type"] for w in self.ds["maintenance_windows"]}
        self.assertIn("NIGHT", types)
        self.assertIn("MIDDAY", types)
        self.assertIn("BLOCK", types)


class TestSaveAndLoad(unittest.TestCase):
    """Test JSON persistence."""

    def test_save_and_reload(self):
        gen = SyntheticDataGenerator(seed=42)
        gen.generate()
        with tempfile.TemporaryDirectory() as tmpdir:
            files = gen.save_json(tmpdir)
            self.assertGreaterEqual(len(files), 11)  # 10 entity files + summary
            # Reload and check
            with open(os.path.join(tmpdir, "maintenance_tasks.json")) as f:
                tasks = json.load(f)
            self.assertGreaterEqual(len(tasks), 30)
            # Summary
            with open(os.path.join(tmpdir, "summary.json")) as f:
                summary = json.load(f)
            self.assertEqual(summary["seed"], 42)


# ──────────────────────────────────────────────────────────────────────
# Standalone runner
# ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    unittest.main(verbosity=2)
