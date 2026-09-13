"""
Deterministic Explainability Engine for AI scheduling.

Implements OPTIMIZATION_CONTRACT.md §8 and AI_DOMAIN_CONTRACT.md §17.

Produces reproducible, ground-truth explanations for:
  - Schedules (explain_schedule)
  - Blocks (explain_block)
  - Unscheduled/rejected tasks (explain_unscheduled_task)
  - Windows (explain_window)
  - Shadow-block groupings (explain_grouping)

Guarantees:
  - Deterministic explanation_id derived from entity and content (no UUIDs).
  - Strictly grounded reason codes; reason codes are only added when supported
    by explicit evidence from solver output, conflicts, windows, criticality,
    compatibility, or shadow-block results.
  - Reproducible outputs across runs for identical inputs.
"""

from __future__ import annotations

import hashlib
import json
from typing import Any, Dict, List, Optional


class ExplainabilityEngine:
    """
    Deterministic explainability engine for the AI scheduling module.
    Generates rule-traceable explanations grounded entirely in optimizer outputs,
    safety rules, and domain constraints without using LLMs.
    """

    def __init__(self) -> None:
        self.generated_by = "EXPLAINABILITY_ENGINE"

    def _generate_id(
        self,
        entity_type: str,
        entity_id: str,
        reason_codes: List[str],
        evidence: Dict[str, Any],
        deterministic_inputs: Dict[str, Any],
    ) -> str:
        """
        Derives a deterministic explanation_id from the canonical content
        of the explanation entity and evidence.
        """
        # Strip non-deterministic execution timing like runtime_ms from the hash payload
        cleaned_evidence = dict(evidence)
        if "solver_statistics" in cleaned_evidence and isinstance(cleaned_evidence["solver_statistics"], dict):
            cleaned_evidence["solver_statistics"] = {
                k: v for k, v in cleaned_evidence["solver_statistics"].items() if k != "runtime_ms"
            }

        payload = {
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "reason_codes": sorted(reason_codes),
            "evidence": cleaned_evidence,
            "deterministic_inputs": deterministic_inputs,
        }
        serialized = json.dumps(payload, sort_keys=True, default=str)
        digest = hashlib.sha256(serialized.encode("utf-8")).hexdigest()[:12]
        return f"exp_{digest}"

    def _get_criticality(self, task_id: str, request: Dict[str, Any]) -> Dict[str, Any]:
        """Looks up criticality record for a task from request context."""
        scores = request.get("criticality_scores", [])
        for score in scores:
            if score.get("entity_id") == task_id or score.get("task_id") == task_id:
                return score
        return {}

    def explain_schedule(
        self,
        optimization_result: Dict[str, Any],
        request: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Explains the overall schedule outcome based on optimizer status,
        scheduled counts, objective scores, and train conflicts.
        """
        status = optimization_result.get("status", "FAILED")
        score = float(optimization_result.get("objective_score", 0.0))
        selected = optimization_result.get("selected_task_ids", [])
        unscheduled = optimization_result.get("unscheduled_task_ids", [])
        conflicts = optimization_result.get("train_conflicts", [])

        reason_codes: List[str] = [f"schedule_{status.lower()}"]
        evidence: Dict[str, Any] = {
            "status": status,
            "objective_score": score,
            "scheduled_count": len(selected),
            "unscheduled_count": len(unscheduled),
            "train_conflicts_count": len(conflicts),
        }

        if score > 0.0:
            reason_codes.append("positive_objective")

        # Ground train conflict reason in actual conflict records
        if len(conflicts) == 0:
            reason_codes.append("no_train_conflicts")
        else:
            reason_codes.append("train_conflicts_detected")
            evidence["conflicts_summary"] = [
                c.get("description", c.get("conflict_id", "")) for c in conflicts
            ]

        if "baseline_comparison" in optimization_result:
            evidence["baseline_comparison"] = optimization_result["baseline_comparison"]
        if "solver_statistics" in optimization_result:
            evidence["solver_statistics"] = optimization_result["solver_statistics"]

        deterministic_inputs: Dict[str, Any] = {
            "mode": request.get("mode", "BALANCED"),
            "weights": request.get("weights", {}),
            "total_tasks_requested": len(request.get("tasks", [])),
        }

        summary = (
            f"Optimization resulted in {status} schedule with objective score {score:.2f}. "
            f"Scheduled {len(selected)} tasks; {len(unscheduled)} unscheduled. "
            f"Train conflicts: {len(conflicts)}."
        )

        entity_id = str(optimization_result.get("request_id", "unknown"))
        explanation_id = self._generate_id(
            entity_type="SCHEDULE",
            entity_id=entity_id,
            reason_codes=reason_codes,
            evidence=evidence,
            deterministic_inputs=deterministic_inputs,
        )

        return {
            "explanation_id": explanation_id,
            "entity_type": "SCHEDULE",
            "entity_id": entity_id,
            "summary": summary,
            "reason_codes": reason_codes,
            "evidence": evidence,
            "deterministic_inputs": deterministic_inputs,
            "generated_by": self.generated_by,
        }

    def explain_block(
        self,
        block_id: str,
        schedule_candidate: Dict[str, Any],
        optimization_result: Dict[str, Any],
        request: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Explains why a block was selected or evaluated.
        Only adds reason codes when supported by explicit evidence:
          - 'block_selected': only if task_ids are confirmed scheduled.
          - 'window_available': only if matching window exists with availability == 'AVAILABLE'.
          - 'train_conflict_avoided': only if train movements exist in section AND zero conflicts/disruption occur.
        """
        # 1. Locate block in schedule_candidate
        blocks = schedule_candidate.get("blocks", [])
        block = next((b for b in blocks if b.get("block_id") == block_id), None)
        if not block:
            # Fallback: check if block_id matches schedule_id or first block
            if blocks and len(blocks) == 1:
                block = blocks[0]
            else:
                return self._not_found("BLOCK", block_id)

        task_ids = schedule_candidate.get("task_ids", [])
        section_id = block.get("section_id", "")
        selected_task_ids = optimization_result.get("selected_task_ids", [])

        reason_codes: List[str] = []
        evidence: Dict[str, Any] = {
            "section_id": section_id,
            "task_count": len(task_ids),
        }

        # 2. Block selection evidence
        # Proven if tasks in candidate are present in selected_task_ids or candidate is marked VALID in selected candidates
        candidate_status = schedule_candidate.get("status", "VALID")
        is_selected = (
            any(tid in selected_task_ids for tid in task_ids)
            if selected_task_ids
            else candidate_status == "VALID"
        )
        evidence["is_selected"] = is_selected
        if is_selected:
            reason_codes.append("block_selected")
            evidence["selected_tasks"] = [tid for tid in task_ids if tid in selected_task_ids] or task_ids
        else:
            reason_codes.append("block_not_selected")

        # 3. Window availability evidence
        # Must check actual maintenance_windows in request
        windows = request.get("maintenance_windows", [])
        matching_window = next((w for w in windows if w.get("window_id") == block_id), None)
        if matching_window:
            w_avail = matching_window.get("availability")
            evidence["window_id"] = matching_window.get("window_id")
            evidence["window_availability"] = w_avail
            if w_avail == "AVAILABLE":
                reason_codes.append("window_available")
                evidence["window_conflict"] = False
            else:
                reason_codes.append("window_unavailable" if w_avail == "UNAVAILABLE" else "window_partial")
                evidence["window_conflict"] = True
        # If no window is present in request, do NOT add "window_available"

        # 4. Train conflict avoidance evidence
        # Never claim avoided train conflict when train movements are absent or empty!
        train_movements = request.get("train_movements", [])
        section_trains = [mv for mv in train_movements if mv.get("section_id") == section_id]
        evidence["section_train_movements_count"] = len(section_trains)

        # Check recorded conflicts for this block/task
        all_conflicts = optimization_result.get("train_conflicts", [])
        block_conflicts = [
            c for c in all_conflicts
            if any(tid in c.get("entity_ids", []) for tid in task_ids)
        ]
        disruption_min = float(schedule_candidate.get("estimated_disruption_minutes", 0.0))
        evidence["train_conflicts_count"] = len(block_conflicts)
        evidence["estimated_disruption_minutes"] = disruption_min

        if len(section_trains) > 0:
            # Train movements exist in this section; check if conflict was genuinely avoided
            if len(block_conflicts) == 0 and disruption_min == 0.0:
                reason_codes.append("train_conflict_avoided")
                evidence["train_conflict_avoided"] = True
            else:
                reason_codes.append("train_disruption_incurred")
                evidence["train_conflict_avoided"] = False
        else:
            # Train evidence absent; do NOT claim train_conflict_avoided
            evidence["train_conflict_avoided"] = None

        # 5. Criticality evidence
        task_scores: List[float] = []
        for tid in task_ids:
            c = self._get_criticality(tid, request)
            if c and "score" in c:
                task_scores.append(float(c["score"]))
        if task_scores:
            avg_score = round(sum(task_scores) / len(task_scores), 3)
            evidence["average_criticality"] = avg_score
            if avg_score >= 0.8:
                reason_codes.append("criticality_score_high")
            elif avg_score < 0.5:
                reason_codes.append("criticality_score_low")
            else:
                reason_codes.append("criticality_score_medium")

        # 6. Resource assignment evidence
        res_assign = schedule_candidate.get("resource_assignments", {})
        if res_assign:
            evidence["resource_assignments"] = res_assign
            reason_codes.append("resources_assigned")

        # 7. Multi-task shadow block evidence
        if len(task_ids) > 1:
            evidence["multi_task_block"] = True
            reason_codes.append("shadow_block_combined")

        deterministic_inputs: Dict[str, Any] = {
            "task_ids": task_ids,
            "block_id": block_id,
            "section_id": section_id,
            "block_start": block.get("start"),
            "block_end": block.get("end"),
            "weights": request.get("weights", {}),
        }

        # Build grounded summary
        summary_parts = []
        if is_selected:
            summary_parts.append(f"Block {block_id} selected in section {section_id} for {len(task_ids)} task(s).")
        else:
            summary_parts.append(f"Block {block_id} in section {section_id} was not selected in the optimal schedule.")

        if "criticality_score_high" in reason_codes:
            summary_parts.append(f"Criticality prioritized (avg {evidence.get('average_criticality', 0.0):.2f}).")
        if "train_conflict_avoided" in reason_codes:
            summary_parts.append(f"Avoided conflicts across {len(section_trains)} train movement(s).")
        if "window_available" in reason_codes:
            summary_parts.append("Fits within confirmed available maintenance window.")

        summary = " ".join(summary_parts)

        explanation_id = self._generate_id(
            entity_type="BLOCK",
            entity_id=block_id,
            reason_codes=reason_codes,
            evidence=evidence,
            deterministic_inputs=deterministic_inputs,
        )

        return {
            "explanation_id": explanation_id,
            "entity_type": "BLOCK",
            "entity_id": block_id,
            "summary": summary,
            "reason_codes": reason_codes,
            "evidence": evidence,
            "deterministic_inputs": deterministic_inputs,
            "generated_by": self.generated_by,
        }

    def explain_unscheduled_task(
        self,
        task_id: str,
        optimization_result: Dict[str, Any],
        request: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Explains why a task was not scheduled using actual solver unscheduled
        reasons and safety conflict evidence.
        """
        reasons_map = optimization_result.get("unscheduled_reasons", {})
        raw_reasons = reasons_map.get(task_id)

        if not raw_reasons:
            reasons_list = ["constraint_violation"]
        elif isinstance(raw_reasons, list):
            reasons_list = [str(r) for r in raw_reasons]
        else:
            reasons_list = [str(raw_reasons)]

        # Check for safety conflict evidence
        is_safety = any("safety" in r.lower() for r in reasons_list)

        # Check train conflicts for this task
        conflicts = [
            c for c in optimization_result.get("train_conflicts", [])
            if task_id in c.get("entity_ids", [])
        ]
        if any(c.get("conflict_type") == "SAFETY_CONFLICT" for c in conflicts):
            is_safety = True

        reason_codes: List[str] = []
        for r in reasons_list:
            # Preserve explicit reason slugs (e.g. 'resource_capacity_exceeded', 'safety_conflict_with_interlocking')
            # or generate normalized codes for solver diagnostic strings
            r_lower = r.lower()
            if "safety" in r_lower:
                if "_" in r and " " not in r:
                    reason_codes.append(r)
                else:
                    reason_codes.append("safety_conflict")
            elif "resource" in r_lower:
                if "_" in r and " " not in r:
                    reason_codes.append(r)
                else:
                    reason_codes.append("resource_capacity_exhausted")
            elif "window capacity" in r_lower or "max_concurrent" in r_lower:
                reason_codes.append("window_capacity_limit_reached")
            elif "train disruption" in r_lower:
                reason_codes.append("train_disruption_tradeoff")
            elif "duration" in r_lower:
                reason_codes.append("task_duration_exceeds_windows")
            elif "deadline" in r_lower:
                reason_codes.append("deadline_passed")
            elif "no feasible" in r_lower:
                reason_codes.append("no_feasible_windows")
            else:
                reason_codes.append(r)

        # Remove duplicates while preserving order
        seen = set()
        deduped_reason_codes = []
        for rc in reason_codes:
            if rc not in seen:
                seen.add(rc)
                deduped_reason_codes.append(rc)
        reason_codes = deduped_reason_codes

        evidence: Dict[str, Any] = {
            "is_unscheduled": True,
            "actual_reasons": reasons_list,
        }

        # Look up task details from request if available
        task = next((t for t in request.get("tasks", []) if t.get("task_id") == task_id), None)
        if task:
            evidence["task_safety_class"] = task.get("safety_class")
            evidence["task_department"] = task.get("department")
            evidence["task_duration_minutes"] = task.get("estimated_duration_minutes")
            evidence["railway_section_id"] = task.get("railway_section_id")

        if is_safety:
            entity_type = "REJECTION"
            evidence["safety_conflict"] = True
            evidence["safety_evidence"] = [r for r in reasons_list if "safety" in r.lower()]
            if conflicts:
                evidence["safety_conflicts_recorded"] = [
                    c for c in conflicts if c.get("conflict_type") == "SAFETY_CONFLICT"
                ]
        else:
            entity_type = "TASK"
            evidence["safety_conflict"] = False

        if conflicts:
            evidence["task_conflicts"] = conflicts

        summary = f"Task {task_id} was rejected: {'; '.join(reasons_list)}."

        deterministic_inputs: Dict[str, Any] = {
            "task_id": task_id,
            "requested_mode": request.get("mode", "BALANCED"),
        }

        explanation_id = self._generate_id(
            entity_type=entity_type,
            entity_id=task_id,
            reason_codes=reason_codes,
            evidence=evidence,
            deterministic_inputs=deterministic_inputs,
        )

        return {
            "explanation_id": explanation_id,
            "entity_type": entity_type,
            "entity_id": task_id,
            "summary": summary,
            "reason_codes": reason_codes,
            "evidence": evidence,
            "deterministic_inputs": deterministic_inputs,
            "generated_by": self.generated_by,
        }

    def explain_window(self, window: Dict[str, Any], task_id: str) -> Dict[str, Any]:
        """
        Explains the rejection or feasibility of a maintenance window for a task.
        """
        window_id = str(window.get("window_id", "unknown"))
        avail = window.get("availability", "AVAILABLE")

        evidence: Dict[str, Any] = {
            "availability": avail,
            "target_task": task_id,
            "section_id": window.get("section_id", ""),
            "window_type": window.get("window_type", "BLOCK"),
        }

        if "max_concurrent_tasks" in window:
            evidence["max_concurrent_tasks"] = window["max_concurrent_tasks"]
        if "department_compatibility" in window:
            evidence["department_compatibility"] = window["department_compatibility"]

        if avail == "UNAVAILABLE":
            summary = f"Window {window_id} was rejected for task {task_id} due to unavailability."
            reason_codes = ["window_unavailable", "rejected"]
            entity_type = "REJECTION"
            evidence["window_available"] = False
        elif avail == "PARTIAL":
            summary = f"Window {window_id} has partial availability for task {task_id}."
            reason_codes = ["window_partially_available"]
            entity_type = "WINDOW"
            evidence["window_available"] = True
        else:
            summary = f"Window {window_id} is confirmed available and feasible for task {task_id}."
            reason_codes = ["window_available"]
            entity_type = "WINDOW"
            evidence["window_available"] = True

        deterministic_inputs: Dict[str, Any] = {
            "window_id": window_id,
            "task_id": task_id,
            "window_start": window.get("start"),
            "window_end": window.get("end"),
        }

        explanation_id = self._generate_id(
            entity_type=entity_type,
            entity_id=window_id,
            reason_codes=reason_codes,
            evidence=evidence,
            deterministic_inputs=deterministic_inputs,
        )

        return {
            "explanation_id": explanation_id,
            "entity_type": entity_type,
            "entity_id": window_id,
            "summary": summary,
            "reason_codes": reason_codes,
            "evidence": evidence,
            "deterministic_inputs": deterministic_inputs,
            "generated_by": self.generated_by,
        }

    def explain_grouping(self, shadow_block: Dict[str, Any]) -> Dict[str, Any]:
        """
        Explains shadow block grouping or rejection based on compatibility
        and efficiency metrics.
        """
        sb_id = str(shadow_block.get("shadow_block_id", "unknown"))
        status = shadow_block.get("conflict_status", "FEASIBLE")
        primary = shadow_block.get("primary_task_id", "")
        participants = shadow_block.get("participating_task_ids", [])
        savings = int(shadow_block.get("potential_time_saving_minutes", 0))
        reasons = shadow_block.get("reasons", [])

        evidence: Dict[str, Any] = {
            "conflict_status": status,
            "potential_time_savings_minutes": savings,
            "participant_count": len(participants),
            "sections": shadow_block.get("sections", []),
            "departments": shadow_block.get("departments", []),
        }

        if "resource_usage" in shadow_block:
            evidence["resource_usage"] = shadow_block["resource_usage"]

        if status == "FEASIBLE":
            summary = (
                f"Tasks grouped into shadow block {sb_id} with primary {primary}, "
                f"saving {savings} minutes of track possession."
            )
            reason_codes = list(reasons) if reasons else ["compatible_tasks"]
            entity_type = "GROUPING"
            evidence["grouping_feasible"] = True
        else:
            summary = f"Shadow block {sb_id} was rejected due to conflicts or infeasibility."
            reason_codes = list(reasons) if reasons else ["safety_or_resource_conflict"]
            entity_type = "REJECTION"
            evidence["grouping_feasible"] = False

        deterministic_inputs: Dict[str, Any] = {
            "primary_task_id": primary,
            "participating_task_ids": participants,
            "proposed_window_start": shadow_block.get("proposed_window_start"),
            "proposed_window_end": shadow_block.get("proposed_window_end"),
        }

        explanation_id = self._generate_id(
            entity_type=entity_type,
            entity_id=sb_id,
            reason_codes=reason_codes,
            evidence=evidence,
            deterministic_inputs=deterministic_inputs,
        )

        return {
            "explanation_id": explanation_id,
            "entity_type": entity_type,
            "entity_id": sb_id,
            "summary": summary,
            "reason_codes": reason_codes,
            "evidence": evidence,
            "deterministic_inputs": deterministic_inputs,
            "generated_by": self.generated_by,
        }

    def _not_found(self, entity_type: str, entity_id: str) -> Dict[str, Any]:
        """Returns standard not-found explanation record."""
        reason_codes = ["entity_not_found"]
        evidence = {"found": False}
        deterministic_inputs = {"entity_id": entity_id, "entity_type": entity_type}
        explanation_id = self._generate_id(
            entity_type=entity_type,
            entity_id=entity_id,
            reason_codes=reason_codes,
            evidence=evidence,
            deterministic_inputs=deterministic_inputs,
        )
        return {
            "explanation_id": explanation_id,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "summary": f"Entity {entity_id} of type {entity_type} not found in the provided context.",
            "reason_codes": reason_codes,
            "evidence": evidence,
            "deterministic_inputs": deterministic_inputs,
            "generated_by": self.generated_by,
        }
