"""
Emergency Planning Engine.

Implements OPTIMIZATION_CONTRACT.md §7 and AGENT_TOOL_CONTRACT.md §8.

Handles immediate unexpected defects and safety events:
  - Validates emergency event input
  - Detects and rejects duplicates
  - Creates and validates the emergency MaintenanceTask
  - Discovers feasible candidate windows
  - Computes elevated criticality score (P1 / CRITICAL)
  - Triggers reoptimization in EMERGENCY mode using OptimizationEngine
  - Produces a compliant EmergencyResult with deterministic explanations and error handling
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


def _window_duration_minutes(w: dict) -> float:
    s = _parse_dt(w.get("start"))
    e = _parse_dt(w.get("end"))
    if s and e and e > s:
        return (e - s).total_seconds() / 60.0
    return 0.0


# ──────────────────────────────────────────────────────────────────────
# Emergency Engine
# ──────────────────────────────────────────────────────────────────────

class EmergencyEngine:
    """
    Deterministic emergency defect insertion and reoptimization engine.
    """

    def __init__(
        self,
        optimizer: OptimizationEngine | None = None,
        criticality_engine: CriticalityEngine | None = None,
    ):
        self.optimizer = optimizer or OptimizationEngine()
        self.crit_engine = criticality_engine or CriticalityEngine()

    def insert_emergency_event(
        self,
        event: dict,
        current_state: dict,
    ) -> dict:
        """
        Handle an incoming EmergencyEvent and produce a revised schedule.

        Parameters
        ----------
        event : dict
            Conforms to EmergencyEvent (AI_DOMAIN_CONTRACT.md §16).
            Fields: event_id, event_type, section_id, affected_asset_id,
            severity, detected_at, impact_summary, related_task_id.
        current_state : dict
            Contains current operational state:
              existing_tasks: list of MaintenanceTask
              train_movements: list of TrainMovement
              resources: list of Resource
              windows: list of MaintenanceWindow
              criticality_scores: optional list of CriticalityScore
              shadow_block_candidates: optional list of ShadowBlockCandidate
              constraints: optional dict

        Returns
        -------
        dict
            Compliant with OPTIMIZATION_CONTRACT.md §7:
            emergency_task, urgency, affected_section, feasible_windows,
            reoptimization_request, resulting_schedule, errors.
        """
        state = copy.deepcopy(current_state)
        errors: list[str] = []

        event_id = event.get("event_id", "emg_unknown")
        event_type = event.get("event_type", "OTHER")
        sec_id = event.get("section_id", "")
        asset_id = event.get("affected_asset_id")
        severity = event.get("severity", "CRITICAL").upper()
        detected_at_str = event.get("detected_at")
        detected_at = _parse_dt(detected_at_str) or datetime.now(timezone.utc)
        impact_summary = event.get("impact_summary", "Immediate emergency maintenance required")
        related_task_id = event.get("related_task_id")

        existing_tasks: list[dict] = state.get("existing_tasks", [])
        train_movements: list[dict] = state.get("train_movements", [])
        resources: list[dict] = state.get("resources", [])
        windows: list[dict] = state.get("windows", []) or state.get("maintenance_windows", [])
        crit_scores: list[dict] = state.get("criticality_scores", [])
        shadow_blocks: list[dict] = state.get("shadow_block_candidates", [])
        constraints: dict = state.get("constraints", {})

        # ── 1. Duplicate Detection ───────────────────────────────────
        duplicate_reason = None
        target_tid = related_task_id or f"task_emg_{event_id}"

        for task in existing_tasks:
            t_status = task.get("status", "PLANNED")
            if t_status not in ("PLANNED", "IN_PROGRESS"):
                continue

            # Case A: Same task ID
            if task.get("task_id") == target_tid or task.get("task_id") == related_task_id:
                duplicate_reason = f"Duplicate task: emergency task '{task.get('task_id')}' already exists in status '{t_status}'"
                break

            # Case B: Same asset in the same section already planned
            if asset_id and task.get("asset_id") == asset_id and task.get("railway_section_id") == sec_id:
                duplicate_reason = f"Duplicate asset defect: active task '{task.get('task_id')}' already covers asset '{asset_id}' on section '{sec_id}'"
                break

        if duplicate_reason:
            errors.append(f"DUPLICATE_EMERGENCY_TASK: {duplicate_reason}")
            return {
                "emergency_task": None,
                "urgency": "CRITICAL",
                "affected_section": sec_id,
                "feasible_windows": [],
                "reoptimization_request": None,
                "resulting_schedule": None,
                "errors": errors,
                "explanation": f"Rejected duplicate emergency event: {duplicate_reason}",
            }

        # ── 2. Create Emergency Maintenance Task ──────────────────────
        # Map event type to task type, natural department, and resource requirement
        task_type_map = {
            "NEW_USFD_DEFECT": ("USFD", "ENGINEERING", [{"resource_type": "USFD_VEHICLE", "count": 1}], "HIGH_SAFETY"),
            "TRACK_FAILURE": ("ENGINEERING", "P_WAY", [{"resource_type": "TRACK_MACHINE", "count": 1}], "HIGH_SAFETY"),
            "SIGNAL_FAILURE": ("SNT", "SNT", [{"resource_type": "SNT_CREW", "count": 1}], "INTERLOCKING"),
            "OTHER": ("ENGINEERING", "ENGINEERING", [{"resource_type": "ENGINEERING_CREW", "count": 1}], "HIGH_SAFETY"),
        }
        ttype, dept, default_res, safety_cls = task_type_map.get(
            event_type, ("ENGINEERING", "ENGINEERING", [{"resource_type": "ENGINEERING_CREW", "count": 1}], "HIGH_SAFETY")
        )

        task_duration = int(event.get("estimated_duration_minutes") or 120)
        req_start = detected_at
        req_end = req_start + timedelta(minutes=task_duration)
        deadline = detected_at + timedelta(hours=24)

        emergency_task: dict[str, Any] = {
            "task_id": target_tid,
            "task_type": ttype,
            "railway_section_id": sec_id,
            "from_km": float(event.get("from_km", 10.0)),
            "to_km": float(event.get("to_km", 12.0)),
            "department": dept,
            "status": "PLANNED",
            "requested_start": _iso(req_start),
            "requested_end": _iso(req_end),
            "estimated_duration_minutes": task_duration,
            "required_resources": event.get("required_resources", default_res),
            "priority_hint": "CRITICAL",
            "safety_class": safety_cls,
            "deadline": _iso(deadline),
            "description": f"EMERGENCY {event_type}: {impact_summary}",
        }
        if asset_id:
            emergency_task["asset_id"] = asset_id

        # ── 3. Identify Feasible Windows ──────────────────────────────
        feasible_windows: list[dict] = []
        for w in windows:
            if w.get("section_id") != sec_id:
                continue
            if w.get("availability", "AVAILABLE") == "UNAVAILABLE":
                continue

            w_start = _parse_dt(w.get("start"))
            w_end = _parse_dt(w.get("end"))
            if not w_start or not w_end:
                continue

            # Must not have ended before emergency was detected
            if w_end <= detected_at:
                continue

            # Window duration must accommodate emergency task
            if _window_duration_minutes(w) < task_duration:
                continue

            # Must start before deadline
            if w_start >= deadline:
                continue

            feasible_windows.append(w)

        if not feasible_windows:
            errors.append(
                f"NO_FEASIBLE_WINDOW: No available maintenance window in section '{sec_id}' "
                f"capable of fitting duration {task_duration}min before deadline {_iso(deadline)}"
            )
            return {
                "emergency_task": emergency_task,
                "urgency": "CRITICAL",
                "affected_section": sec_id,
                "feasible_windows": [],
                "reoptimization_request": None,
                "resulting_schedule": None,
                "errors": errors,
                "explanation": (
                    f"Emergency event rejected: impossible insertion. No feasible maintenance "
                    f"windows available in section '{sec_id}' for duration {task_duration}min."
                ),
            }

        # ── 4. Criticality Scoring ────────────────────────────────────
        emg_score = self.crit_engine.score({
            "entity_id": target_tid,
            "severity": severity,
            "urgency": 0.98,
            "safety_risk": 0.98,
            "traffic_density": 0.85,
            "speed_class": "HIGH",
            "deadline": _iso(deadline),
        })

        # ── 5. Trigger Reoptimization in EMERGENCY Mode ───────────────
        all_tasks = existing_tasks + [emergency_task]
        all_crit_scores = crit_scores + [emg_score]

        reopt_request = {
            "request_id": f"emg_reopt_{event_id}",
            "mode": "EMERGENCY",
            "tasks": all_tasks,
            "criticality_scores": all_crit_scores,
            "train_movements": train_movements,
            "resources": resources,
            "maintenance_windows": windows,
            "shadow_block_candidates": shadow_blocks,
            "constraints": constraints,
            "weights": {
                "maintenance_value": 0.70,
                "shadow_block_benefit": 0.10,
                "train_disruption_penalty": 0.20,
            },
            "solver_settings": {"max_runtime_seconds": 20},
        }

        opt_result = self.optimizer.optimize(reopt_request)

        # ── 6. Check Emergency Task Placement ─────────────────────────
        emg_scheduled = target_tid in opt_result.get("selected_task_ids", [])
        resulting_schedule: dict | None = None

        if emg_scheduled:
            # Locate the schedule candidate containing the emergency task
            for cand in opt_result.get("schedule_candidates", []):
                if target_tid in cand.get("task_ids", []):
                    resulting_schedule = cand
                    break
            if not resulting_schedule and opt_result.get("schedule_candidates"):
                resulting_schedule = opt_result["schedule_candidates"][0]
        else:
            unscheduled_reason = opt_result.get("unscheduled_reasons", {}).get(
                target_tid, "Resource contention or safety constraints precluded insertion"
            )
            errors.append(f"EMERGENCY_NOT_SCHEDULED: {unscheduled_reason}")

        explanation = (
            f"Emergency event '{event_id}' ({event_type}) in section '{sec_id}' processed. "
            f"Created emergency task '{target_tid}' with criticality {emg_score['score']:.2f} ({emg_score['priority_class']}). "
            f"{'Scheduled successfully in block ' + resulting_schedule['blocks'][0]['block_id'] if resulting_schedule else 'Could not schedule due to constraints.'}"
        )

        return {
            "emergency_task": emergency_task,
            "urgency": "CRITICAL",
            "affected_section": sec_id,
            "feasible_windows": feasible_windows,
            "reoptimization_request": reopt_request,
            "resulting_schedule": resulting_schedule,
            "optimization_result": opt_result,
            "errors": errors,
            "explanation": explanation,
        }


# ── Module-level convenience ─────────────────────────────────────────

def insert_emergency_event(
    event: dict,
    current_state: dict,
) -> dict:
    """
    Module-level convenience function to handle an emergency event.
    """
    engine = EmergencyEngine()
    return engine.insert_emergency_event(event, current_state)
