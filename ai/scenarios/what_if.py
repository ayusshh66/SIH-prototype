"""
What-If Reoptimization Engine.

Implements OPTIMIZATION_CONTRACT.md §6 and AGENT_TOOL_CONTRACT.md §7.

Allows operators and orchestrators to test hypothetical operational disruptions
and generate a reoptimized schedule:
  - TRAIN_DELAY: Train movement(s) delayed by specified minutes.
  - BLOCK_UNAVAILABLE: Maintenance window(s) cancelled or unavailable.
  - RESOURCE_UNAVAILABLE: Crew, machine, or vehicle taken out of service.
  - EMERGENCY_TASK_INSERTED: High-priority emergency defect introduced.
  - TASK_DURATION_CHANGED: Maintenance task duration extended or shortened.
  - TASK_ADDED: New planned maintenance task introduced.

Reuses the deterministic OptimizationEngine without duplicating solver logic.
"""

from __future__ import annotations

import copy
from datetime import datetime, timedelta, timezone
from typing import Any

from ai.criticality.engine import CriticalityEngine
from ai.optimization.engine import OptimizationEngine


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _parse_dt(s: str | None) -> datetime | None:
    if s is None:
        return None
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00"))
    except (ValueError, TypeError, AttributeError):
        return None


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


# ──────────────────────────────────────────────────────────────────────
# What-If Engine
# ──────────────────────────────────────────────────────────────────────

class WhatIfEngine:
    """
    Deterministic What-If scenario reoptimization engine.
    """

    def __init__(self, optimizer: OptimizationEngine | None = None, criticality_engine: CriticalityEngine | None = None):
        self.optimizer = optimizer or OptimizationEngine()
        self.crit_engine = criticality_engine or CriticalityEngine()

    def reoptimize(
        self,
        scenario: dict,
        current_schedule: dict | list[dict],
        context: dict | None = None,
    ) -> dict:
        """
        Reoptimize schedule based on a WhatIfScenario.

        Parameters
        ----------
        scenario : dict
            Conforms to WhatIfScenario (AI_DOMAIN_CONTRACT.md §15).
        current_schedule : dict | list
            Either an OptimizationResult, a single ScheduleCandidate, or a list
            of ScheduleCandidates representing the baseline plan.
        context : dict, optional
            Contains base datasets: tasks, train_movements, resources,
            maintenance_windows, criticality_scores, shadow_block_candidates, etc.
        """
        context = copy.deepcopy(context or {})
        scenario_id = scenario.get("scenario_id", "whatif_unknown")
        scenario_type = scenario.get("scenario_type", "")
        base_sched_id = scenario.get("base_schedule_id", "sched_base")
        affected_task_ids = list(scenario.get("affected_task_ids", []))
        affected_train_ids = list(scenario.get("affected_train_ids", []))
        new_constraints = scenario.get("new_constraints", {})

        errors: list[str] = []

        # Validate scenario type
        valid_types = {
            "TRAIN_DELAY",
            "BLOCK_UNAVAILABLE",
            "RESOURCE_UNAVAILABLE",
            "EMERGENCY_TASK_INSERTED",
            "TASK_DURATION_CHANGED",
            "TASK_ADDED",
        }
        if scenario_type not in valid_types:
            return {
                "original_schedule_id": base_sched_id,
                "new_schedule": None,
                "changed_blocks": [],
                "affected_tasks": [],
                "affected_trains": [],
                "metric_differences": {},
                "explanation": f"Invalid scenario type '{scenario_type}'. Must be one of {sorted(valid_types)}",
                "errors": [f"INVALID_SCENARIO_TYPE: {scenario_type}"],
            }

        # Normalize current_schedule representation
        orig_candidates: list[dict] = []
        orig_obj = 0.0
        orig_disruption = 0.0
        orig_res_util = 0.0

        if isinstance(current_schedule, dict):
            if "schedule_candidates" in current_schedule:
                orig_candidates = current_schedule.get("schedule_candidates", [])
                orig_obj = float(current_schedule.get("objective_score", 0.0) or 0.0)
                orig_disruption = float(current_schedule.get("total_disruption_minutes", 0.0) or 0.0)
                util_vals = current_schedule.get("resource_utilization", {}).values()
                orig_res_util = max(util_vals) if util_vals else 0.0
            else:
                orig_candidates = [current_schedule]
                orig_disruption = float(current_schedule.get("estimated_disruption_minutes", 0.0) or 0.0)
        elif isinstance(current_schedule, list):
            orig_candidates = current_schedule

        # Map original task placements: task_id -> block_id
        orig_task_blocks: dict[str, str] = {}
        for cand in orig_candidates:
            block_id = cand.get("blocks", [{}])[0].get("block_id", "")
            for tid in cand.get("task_ids", []):
                orig_task_blocks[tid] = block_id

        # Extract base collections from context
        tasks = context.get("tasks", [])
        train_movements = context.get("train_movements", [])
        resources = context.get("resources", [])
        windows = context.get("maintenance_windows", [])
        crit_scores = context.get("criticality_scores", [])
        shadow_blocks = context.get("shadow_block_candidates", [])
        weights = context.get("weights", {})
        constraints = context.get("constraints", {})
        mode = context.get("mode", "BALANCED")

        # ── Apply Scenario-Specific Modifications ─────────────────────
        explanation_parts: list[str] = []

        if scenario_type == "TRAIN_DELAY":
            # Extract delay minutes
            delay_min = float(
                new_constraints.get("train_delay_minutes")
                or new_constraints.get("delay_minutes")
                or 15.0
            )
            target_trains = set(affected_train_ids)
            if not target_trains and "train_id" in new_constraints:
                target_trains.add(new_constraints["train_id"])

            delayed_count = 0
            for mv in train_movements:
                mv_tid = mv.get("train_id")
                mv_mid = mv.get("movement_id")
                if not target_trains or mv_tid in target_trains or mv_mid in target_trains:
                    s = _parse_dt(mv.get("movement_start"))
                    e = _parse_dt(mv.get("movement_end"))
                    if s and e:
                        mv["movement_start"] = _iso(s + timedelta(minutes=delay_min))
                        mv["movement_end"] = _iso(e + timedelta(minutes=delay_min))
                        delayed_count += 1
                        if mv_tid and mv_tid not in affected_train_ids:
                            affected_train_ids.append(mv_tid)

            explanation_parts.append(
                f"Train delay of {delay_min:.0f}min applied to {delayed_count} train movement(s)."
            )

        elif scenario_type == "BLOCK_UNAVAILABLE":
            target_blocks = set(
                new_constraints.get("unavailable_window_ids", [])
                or ([new_constraints["block_id"]] if "block_id" in new_constraints else [])
                or ([new_constraints["window_id"]] if "window_id" in new_constraints else [])
            )
            # Also check if affected_task_ids points to a block in orig_task_blocks
            for atid in affected_task_ids:
                if atid in orig_task_blocks:
                    target_blocks.add(orig_task_blocks[atid])

            for w in windows:
                if w.get("window_id") in target_blocks:
                    w["availability"] = "UNAVAILABLE"

            explanation_parts.append(
                f"Maintenance block(s) {sorted(target_blocks)} marked UNAVAILABLE."
            )

        elif scenario_type == "RESOURCE_UNAVAILABLE":
            target_res_ids = set(
                new_constraints.get("unavailable_resource_ids", [])
                or ([new_constraints["resource_id"]] if "resource_id" in new_constraints else [])
            )
            target_res_type = new_constraints.get("resource_type")

            disabled_count = 0
            for r in resources:
                if r.get("resource_id") in target_res_ids or (target_res_type and r.get("resource_type") == target_res_type):
                    r["is_operational"] = False
                    disabled_count += 1

            res_desc = ", ".join(sorted(target_res_ids)) if target_res_ids else str(target_res_type or "")
            explanation_parts.append(
                f"Resource capacity reduced: {disabled_count} resource(s) ({res_desc}) marked non-operational."
            )

        elif scenario_type == "EMERGENCY_TASK_INSERTED":
            emg_task = new_constraints.get("emergency_task")
            if not emg_task:
                # Generate from constraints
                emg_task = {
                    "task_id": new_constraints.get("task_id", f"task_emg_{scenario_id}"),
                    "task_type": new_constraints.get("task_type", "USFD"),
                    "railway_section_id": new_constraints.get("section_id", "sec_01"),
                    "from_km": float(new_constraints.get("from_km", 10.0)),
                    "to_km": float(new_constraints.get("to_km", 15.0)),
                    "department": new_constraints.get("department", "ENGINEERING"),
                    "status": "PLANNED",
                    "requested_start": new_constraints.get("requested_start", _iso(datetime.now(timezone.utc))),
                    "requested_end": new_constraints.get("requested_end", _iso(datetime.now(timezone.utc) + timedelta(hours=3))),
                    "estimated_duration_minutes": int(new_constraints.get("duration_minutes", 120)),
                    "required_resources": new_constraints.get("required_resources", [{"resource_type": "USFD_VEHICLE", "count": 1}]),
                    "priority_hint": "CRITICAL",
                    "safety_class": "HIGH_SAFETY",
                }
            tasks.append(emg_task)
            affected_task_ids.append(emg_task["task_id"])

            # Criticality score for emergency task
            emg_cs = self.crit_engine.score({
                "entity_id": emg_task["task_id"],
                "severity": "CRITICAL",
                "urgency": 0.98,
                "safety_risk": 0.98,
                "traffic_density": 0.8,
                "speed_class": "HIGH",
            })
            crit_scores.append(emg_cs)
            mode = "EMERGENCY"
            explanation_parts.append(
                f"Emergency task '{emg_task['task_id']}' inserted with CRITICAL priority. Reoptimized in EMERGENCY mode."
            )

        elif scenario_type == "TASK_DURATION_CHANGED":
            new_dur = int(
                new_constraints.get("new_duration_minutes")
                or new_constraints.get("duration_minutes")
                or 120
            )
            for tid in affected_task_ids:
                for t in tasks:
                    if t.get("task_id") == tid:
                        t["estimated_duration_minutes"] = new_dur

            explanation_parts.append(
                f"Task duration modified to {new_dur}min for task(s) {affected_task_ids}."
            )

        elif scenario_type == "TASK_ADDED":
            new_task = new_constraints.get("new_task") or new_constraints.get("task")
            if new_task:
                tasks.append(new_task)
                affected_task_ids.append(new_task["task_id"])
                cs = self.crit_engine.score({
                    "entity_id": new_task["task_id"],
                    "severity": new_task.get("priority_hint", "HIGH"),
                    "urgency": 0.7,
                    "safety_risk": 0.7,
                    "traffic_density": 0.5,
                    "speed_class": "MEDIUM",
                })
                crit_scores.append(cs)
                explanation_parts.append(
                    f"New maintenance task '{new_task['task_id']}' added to planning pool."
                )

        # ── Re-run Optimizer ──────────────────────────────────────────
        opt_request = {
            "request_id": f"reopt_{scenario_id}",
            "mode": mode,
            "tasks": tasks,
            "criticality_scores": crit_scores,
            "train_movements": train_movements,
            "resources": resources,
            "maintenance_windows": windows,
            "shadow_block_candidates": shadow_blocks,
            "constraints": constraints,
            "weights": weights,
            "solver_settings": context.get("solver_settings", {"max_runtime_seconds": 15}),
        }

        reopt_result = self.optimizer.optimize(opt_request)

        # ── Compute Differences and Metric Deltas ─────────────────────
        new_task_blocks: dict[str, str] = {}
        for cand in reopt_result.get("schedule_candidates", []):
            block_id = cand.get("blocks", [{}])[0].get("block_id", "")
            for tid in cand.get("task_ids", []):
                new_task_blocks[tid] = block_id

        # Determine all affected tasks and changed blocks
        all_task_keys = set(orig_task_blocks.keys()).union(new_task_blocks.keys())
        diff_tasks: set[str] = set(affected_task_ids)
        changed_blocks: set[str] = set()

        for tid in all_task_keys:
            old_b = orig_task_blocks.get(tid)
            new_b = new_task_blocks.get(tid)
            if old_b != new_b:
                diff_tasks.add(tid)
                if old_b:
                    changed_blocks.add(old_b)
                if new_b:
                    changed_blocks.add(new_b)

        new_obj = float(reopt_result.get("objective_score", 0.0) or 0.0)
        new_disr = float(reopt_result.get("total_disruption_minutes", 0.0) or 0.0)
        new_util_vals = reopt_result.get("resource_utilization", {}).values()
        new_res_util = max(new_util_vals) if new_util_vals else 0.0

        metric_diffs = {
            "objective_score": round(new_obj - orig_obj, 4),
            "train_disruption_minutes": round(new_disr - orig_disruption, 1),
            "resource_utilization_delta": round(new_res_util - orig_res_util, 2),
        }

        # Build composite new_schedule candidate
        cands = reopt_result.get("schedule_candidates", [])
        primary_new_schedule = cands[0] if cands else {
            "schedule_id": f"sched_{scenario_id}",
            "task_ids": reopt_result.get("selected_task_ids", []),
            "blocks": [],
            "start_time": _iso(datetime.now(timezone.utc)),
            "end_time": _iso(datetime.now(timezone.utc)),
            "estimated_disruption_minutes": new_disr,
            "resource_assignments": {},
            "status": "PARTIAL" if reopt_result.get("selected_task_ids") else "REJECTED",
        }

        explanation_parts.append(
            f"Schedule reoptimized ({reopt_result['status']}): {len(reopt_result['selected_task_ids'])} task(s) scheduled. "
            f"Objective delta: {metric_diffs['objective_score']:+.3f}, Disruption delta: {metric_diffs['train_disruption_minutes']:+.1f}min."
        )

        return {
            "original_schedule_id": base_sched_id,
            "new_schedule": primary_new_schedule,
            "all_schedule_candidates": cands,
            "changed_blocks": sorted(list(changed_blocks)),
            "affected_tasks": sorted(list(diff_tasks)),
            "affected_trains": sorted(list(set(affected_train_ids))),
            "metric_differences": metric_diffs,
            "explanation": " ".join(explanation_parts),
            "errors": errors,
            "optimization_result": reopt_result,
        }


# ── Module-level convenience ─────────────────────────────────────────

def what_if_reoptimize(
    scenario: dict,
    current_schedule: dict | list[dict],
    context: dict | None = None,
) -> dict:
    """
    Module-level convenience function for what-if reoptimization.
    """
    engine = WhatIfEngine()
    return engine.reoptimize(scenario, current_schedule, context)
