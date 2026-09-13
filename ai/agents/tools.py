"""
Deterministic Agent Tools for AI-RMP Orchestration.

Implements AGENT_TOOL_CONTRACT.md §1-§9.
Wraps deterministic underlying engines without altering their logic or domain ownership:
  1. get_maintenance_tasks
  2. get_train_movements
  3. get_resources
  4. calculate_criticality
  5. find_shadow_opportunities
  6. optimize_schedule
  7. run_what_if
  8. insert_emergency_task
  9. explain_schedule
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ai.criticality.engine import CriticalityEngine
from ai.compatibility.engine import CompatibilityEngine
from ai.shadow_blocks.engine import ShadowBlockEngine
from ai.optimization.engine import OptimizationEngine
from ai.scenarios.what_if import WhatIfEngine
from ai.scenarios.emergency import EmergencyEngine
from ai.explainability.engine import ExplainabilityEngine


# ──────────────────────────────────────────────────────────────────────
# Tool Implementations
# ──────────────────────────────────────────────────────────────────────

def get_maintenance_tasks(
    task_ids: Optional[List[str]] = None,
    department_filter: Optional[List[str]] = None,
    status_filter: Optional[List[str]] = None,
    section_filter: Optional[List[str]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Retrieve current maintenance tasks filtered by query parameters.
    Conforms to AGENT_TOOL_CONTRACT.md §1.
    """
    errors: List[str] = []
    all_tasks = (context or {}).get("tasks", [])

    filtered = []
    for task in all_tasks:
        if task_ids and task.get("task_id") not in task_ids:
            continue
        if department_filter and task.get("department") not in department_filter:
            continue
        if status_filter and task.get("status") not in status_filter:
            continue
        if section_filter and task.get("railway_section_id") not in section_filter:
            continue
        filtered.append(task)

    return {
        "tasks": filtered,
        "count": len(filtered),
        "errors": errors,
    }


def get_train_movements(
    section_ids: Optional[List[str]] = None,
    time_start: Optional[str] = None,
    time_end: Optional[str] = None,
    traffic_priority_filter: Optional[List[str]] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Retrieve train movement calendars relevant to section and time.
    Conforms to AGENT_TOOL_CONTRACT.md §2.
    """
    errors: List[str] = []
    all_movements = (context or {}).get("train_movements", [])

    filtered = []
    for mv in all_movements:
        if section_ids and mv.get("section_id") not in section_ids:
            continue
        if traffic_priority_filter and mv.get("priority_class") not in traffic_priority_filter:
            continue
        # Check time bounds if provided
        if time_start and mv.get("movement_end") and mv.get("movement_end") < time_start:
            continue
        if time_end and mv.get("movement_start") and mv.get("movement_start") > time_end:
            continue
        filtered.append(mv)

    return {
        "train_movements": filtered,
        "count": len(filtered),
        "errors": errors,
    }


def get_resources(
    resource_ids: Optional[List[str]] = None,
    resource_types: Optional[List[str]] = None,
    department_filter: Optional[List[str]] = None,
    window_start: Optional[str] = None,
    window_end: Optional[str] = None,
    context: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Fetch resources and their calendars.
    Conforms to AGENT_TOOL_CONTRACT.md §3.
    """
    errors: List[str] = []
    all_resources = (context or {}).get("resources", [])

    filtered = []
    for res in all_resources:
        if resource_ids and res.get("resource_id") not in resource_ids:
            continue
        if resource_types and res.get("resource_type") not in resource_types:
            continue
        if department_filter and res.get("department") not in department_filter:
            continue
        filtered.append(res)

    return {
        "resources": filtered,
        "count": len(filtered),
        "errors": errors,
    }


def calculate_criticality(
    input_data: Dict[str, Any],
    criticality_engine: Optional[CriticalityEngine] = None,
) -> Dict[str, Any]:
    """
    Compute criticality score for a defect or task using the deterministic CriticalityEngine.
    Conforms to AGENT_TOOL_CONTRACT.md §4.
    """
    engine = criticality_engine or CriticalityEngine()
    errors: List[str] = []
    try:
        score_res = engine.score(input_data)
        return {
            "criticality_score": score_res,
            "errors": errors,
        }
    except Exception as exc:
        return {
            "criticality_score": None,
            "errors": [f"Criticality calculation failed: {exc}"],
        }


def find_shadow_opportunities(
    task_ids: Optional[List[str]] = None,
    section_ids: Optional[List[str]] = None,
    time_window: Optional[Dict[str, str]] = None,
    resources: Optional[List[Dict[str, Any]]] = None,
    constraints: Optional[Dict[str, Any]] = None,
    context: Optional[Dict[str, Any]] = None,
    compatibility_engine: Optional[CompatibilityEngine] = None,
    shadow_block_engine: Optional[ShadowBlockEngine] = None,
) -> Dict[str, Any]:
    """
    Discover maintenance groupings that can be combined into a shadow block.
    Conforms to AGENT_TOOL_CONTRACT.md §5.
    """
    compat_eng = compatibility_engine or CompatibilityEngine()
    sb_eng = shadow_block_engine or ShadowBlockEngine()
    errors: List[str] = []

    ctx = context or {}
    all_tasks = ctx.get("tasks", [])
    if task_ids:
        tasks = [t for t in all_tasks if t.get("task_id") in task_ids]
    elif section_ids:
        tasks = [t for t in all_tasks if t.get("railway_section_id") in section_ids]
    else:
        tasks = all_tasks

    windows = ctx.get("maintenance_windows", ctx.get("windows", []))
    res = resources or ctx.get("resources", [])

    try:
        compat_results = compat_eng.find_compatible_tasks(
            tasks=tasks,
            windows=windows,
            resources=res,
            constraints=constraints,
        )
        shadow_candidates = sb_eng.generate_shadow_blocks(
            tasks=tasks,
            compatibility_results=compat_results,
            windows=windows,
            resources=res,
            safety_constraints=constraints,
        )
        return {
            "shadow_block_candidates": shadow_candidates,
            "count": len(shadow_candidates),
            "errors": errors,
        }
    except Exception as exc:
        return {
            "shadow_block_candidates": [],
            "count": 0,
            "errors": [f"Shadow opportunity discovery failed: {exc}"],
        }


def optimize_schedule(
    request: Dict[str, Any],
    optimization_engine: Optional[OptimizationEngine] = None,
) -> Dict[str, Any]:
    """
    Run the deterministic schedule optimizer.
    Conforms to AGENT_TOOL_CONTRACT.md §6.
    """
    engine = optimization_engine or OptimizationEngine()
    errors: List[str] = []
    try:
        res = engine.optimize(request)
        return {
            "result": res,
            "errors": errors,
        }
    except Exception as exc:
        return {
            "result": None,
            "errors": [f"Optimization failed: {exc}"],
        }


def run_what_if(
    scenario: Dict[str, Any],
    current_schedule_id: Optional[str] = None,
    current_schedule: Any = None,
    context: Optional[Dict[str, Any]] = None,
    what_if_engine: Optional[WhatIfEngine] = None,
) -> Dict[str, Any]:
    """
    Test a schedule change scenario and produce a revised plan.
    Conforms to AGENT_TOOL_CONTRACT.md §7.
    """
    engine = what_if_engine or WhatIfEngine()
    scen = dict(scenario)
    if current_schedule_id and "base_schedule_id" not in scen:
        scen["base_schedule_id"] = current_schedule_id

    ctx = context or {}
    sched = current_schedule
    if sched is None:
        if "optimization_result" in ctx:
            sched = ctx["optimization_result"]
        elif "schedule_candidates" in ctx:
            sched = ctx["schedule_candidates"]

    try:
        res = engine.reoptimize(
            scenario=scen,
            current_schedule=sched or [],
            context=ctx,
        )
        errors = res.get("errors", [])
        return {
            "original_schedule_id": res.get("original_schedule_id", scen.get("base_schedule_id", "")),
            "new_schedule": res.get("new_schedule"),
            "changed_blocks": res.get("changed_blocks", []),
            "affected_tasks": res.get("affected_tasks", []),
            "affected_trains": res.get("affected_trains", []),
            "metric_differences": res.get("metric_differences", {}),
            "explanation": res.get("explanation", ""),
            "errors": errors,
        }
    except Exception as exc:
        return {
            "original_schedule_id": scen.get("base_schedule_id", ""),
            "new_schedule": None,
            "changed_blocks": [],
            "affected_tasks": [],
            "affected_trains": [],
            "metric_differences": {},
            "explanation": f"What-if engine failed: {exc}",
            "errors": [str(exc)],
        }


def insert_emergency_task(
    event: Dict[str, Any],
    existing_tasks: Optional[List[Dict[str, Any]]] = None,
    train_movements: Optional[List[Dict[str, Any]]] = None,
    resources: Optional[List[Dict[str, Any]]] = None,
    windows: Optional[List[Dict[str, Any]]] = None,
    emergency_engine: Optional[EmergencyEngine] = None,
) -> Dict[str, Any]:
    """
    Insert an emergency maintenance event and generate a revised plan.
    Conforms to AGENT_TOOL_CONTRACT.md §8.
    """
    engine = emergency_engine or EmergencyEngine()
    current_state = {
        "existing_tasks": existing_tasks or [],
        "train_movements": train_movements or [],
        "resources": resources or [],
        "windows": windows or [],
    }
    try:
        res = engine.insert_emergency_event(event=event, current_state=current_state)
        return res
    except Exception as exc:
        return {
            "emergency_task": None,
            "urgency": "HIGH",
            "affected_section": event.get("section_id", ""),
            "feasible_windows": [],
            "reoptimization_request": None,
            "resulting_schedule": None,
            "errors": [f"Emergency task insertion failed: {exc}"],
        }


def explain_schedule(
    entity_type: str,
    entity_id: str,
    context: Optional[Dict[str, Any]] = None,
    explainability_engine: Optional[ExplainabilityEngine] = None,
) -> Dict[str, Any]:
    """
    Return a deterministic explanation for a schedule or schedule element.
    Conforms to AGENT_TOOL_CONTRACT.md §9.
    """
    engine = explainability_engine or ExplainabilityEngine()
    ctx = context or {}
    opt_result = ctx.get("optimization_result", {})
    req = ctx.get("request", {})
    candidate = ctx.get("schedule_candidate", {})
    window = ctx.get("window", {})
    shadow_block = ctx.get("shadow_block", {})

    errors: List[str] = []
    try:
        if entity_type == "SCHEDULE":
            exp = engine.explain_schedule(opt_result, req)
        elif entity_type == "BLOCK":
            exp = engine.explain_block(entity_id, candidate, opt_result, req)
        elif entity_type in ("TASK", "REJECTION"):
            exp = engine.explain_unscheduled_task(entity_id, opt_result, req)
        elif entity_type == "WINDOW":
            task_id = ctx.get("task_id", "")
            exp = engine.explain_window(window, task_id)
        elif entity_type == "GROUPING":
            exp = engine.explain_grouping(shadow_block)
        else:
            errors.append(f"Invalid entity_type: {entity_type}")
            exp = None

        return {
            "explanation": exp,
            "errors": errors,
        }
    except Exception as exc:
        return {
            "explanation": None,
            "errors": [f"Explainability generation failed: {exc}"],
        }
