from __future__ import annotations

from typing import Any


def _safe_float(value: Any, default: float = 0.0) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _selected_task_ids(result: dict[str, Any]) -> list[str]:
    if not isinstance(result, dict):
        return []
    selected = result.get("selected_task_ids")
    if isinstance(selected, list):
        return [str(item) for item in selected]
    schedule_candidates = result.get("schedule_candidates")
    if isinstance(schedule_candidates, list):
        tasks: list[str] = []
        for candidate in schedule_candidates:
            if isinstance(candidate, dict):
                candidate_tasks = candidate.get("task_ids")
                if isinstance(candidate_tasks, list):
                    tasks.extend([str(item) for item in candidate_tasks])
        return tasks
    return []


def _block_count(result: dict[str, Any]) -> int:
    if not isinstance(result, dict):
        return 0
    blocks = result.get("blocks")
    if isinstance(blocks, list):
        return len(blocks)
    schedule_candidates = result.get("schedule_candidates")
    if isinstance(schedule_candidates, list):
        count = 0
        for candidate in schedule_candidates:
            if isinstance(candidate, dict):
                candidate_blocks = candidate.get("blocks")
                if isinstance(candidate_blocks, list):
                    count += len(candidate_blocks)
        return count
    return 0


def _train_conflicts(result: dict[str, Any]) -> int:
    if not isinstance(result, dict):
        return 0
    conflicts = result.get("train_conflicts")
    if isinstance(conflicts, list):
        return len(conflicts)
    return 0


def _objective_score(result: dict[str, Any]) -> float:
    if not isinstance(result, dict):
        return 0.0
    value = result.get("objective_score")
    if value is None:
        value = result.get("score")
    return _safe_float(value, 0.0)


def compare_impact(baseline_result: dict[str, Any], optimized_result: dict[str, Any]) -> dict[str, Any]:
    """Directly compare a baseline and optimized schedule result payload."""
    baseline_status = str(baseline_result.get("status", "UNKNOWN")) if isinstance(baseline_result, dict) else "UNKNOWN"
    optimized_status = str(optimized_result.get("status", "UNKNOWN")) if isinstance(optimized_result, dict) else "UNKNOWN"

    baseline_task_count = len(_selected_task_ids(baseline_result))
    optimized_task_count = len(_selected_task_ids(optimized_result))
    baseline_block_count = _block_count(baseline_result)
    optimized_block_count = _block_count(optimized_result)
    baseline_train_conflicts = _train_conflicts(baseline_result)
    optimized_train_conflicts = _train_conflicts(optimized_result)

    baseline_objective_score = _objective_score(baseline_result)
    optimized_objective_score = _objective_score(optimized_result)
    objective_improvement = optimized_objective_score - baseline_objective_score
    task_completion_change = optimized_task_count - baseline_task_count
    train_conflict_change = optimized_train_conflicts - baseline_train_conflicts

    return {
        "baseline_status": baseline_status,
        "optimized_status": optimized_status,
        "baseline_task_count": baseline_task_count,
        "optimized_task_count": optimized_task_count,
        "baseline_block_count": baseline_block_count,
        "optimized_block_count": optimized_block_count,
        "baseline_train_conflicts": baseline_train_conflicts,
        "optimized_train_conflicts": optimized_train_conflicts,
        "baseline_objective_score": baseline_objective_score,
        "optimized_objective_score": optimized_objective_score,
        "objective_improvement": objective_improvement,
        "task_completion_change": task_completion_change,
        "train_conflict_change": train_conflict_change,
    }
