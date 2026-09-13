"""
Greedy Baseline Planner — Non-optimized scheduling reference.

Implements OPTIMIZATION_CONTRACT.md §1 (BaselinePlanner).

Provides a simple greedy, priority-ordered scheduler that assigns tasks
to windows without shadow-block grouping.  Intended as a direct
comparison baseline for the CP-SAT optimizer.

Usage
-----
    from ai.optimization.baseline import baseline_schedule

    result = baseline_schedule(tasks, train_movements, resources, windows,
                               criticality_scores=scores)
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any


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


def _time_overlap_minutes(
    s1: datetime | None, e1: datetime | None,
    s2: datetime | None, e2: datetime | None,
) -> float:
    if None in (s1, e1, s2, e2):
        return 0.0
    ov_start = max(s1, s2)
    ov_end = min(e1, e2)
    if ov_start >= ov_end:
        return 0.0
    return (ov_end - ov_start).total_seconds() / 60.0


def _intervals_overlap(
    s1: datetime, e1: datetime,
    s2: datetime, e2: datetime,
) -> bool:
    return max(s1, s2) < min(e1, e2)


_PRIORITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}

_UNSAFE_SAFETY_PAIRS: set[frozenset[str]] = {
    frozenset({"INTERLOCKING", "HIGH_SAFETY"}),
    frozenset({"INTERLOCKING", "INTERLOCKING"}),
}


# ──────────────────────────────────────────────────────────────────────
# Baseline Planner
# ──────────────────────────────────────────────────────────────────────

class BaselinePlanner:
    """
    Greedy, priority-ordered task scheduler.

    Assigns tasks one-at-a-time to the earliest feasible window,
    respecting:
      - section matching
      - duration fit
      - deadline (if present)
      - department compatibility with window (if specified)
      - max_concurrent_tasks per window (if specified)
      - max_section_occupancy per section
      - resource capacity over actual task intervals
      - deterministic safety / interlocking mutual exclusion

    Does NOT use shadow blocks.  Does NOT optimise an objective.
    """

    def schedule(
        self,
        tasks: list[dict],
        train_movements: list[dict] | None = None,
        resources: list[dict] | None = None,
        windows: list[dict] | None = None,
        *,
        criticality_scores: list[dict] | None = None,
        constraints: dict | None = None,
    ) -> dict:
        train_movements = train_movements or []
        resources = resources or []
        windows = windows or []
        criticality_scores = criticality_scores or []
        constraints = constraints or {}

        max_sec_occ = constraints.get("max_section_occupancy", 3)

        planned = [t for t in tasks if t.get("status") == "PLANNED"]

        # Build criticality lookup
        crit_map: dict[str, float] = {}
        for cs in criticality_scores:
            crit_map[cs["entity_id"]] = cs.get("score", 0.5)

        # Sort: highest criticality first, then by priority_hint
        def _sort_key(t: dict) -> tuple:
            crit = crit_map.get(t["task_id"], 0.5)
            prio = _PRIORITY_ORDER.get(t.get("priority_hint", "LOW"), 3)
            return (-crit, prio, t["task_id"])

        sorted_tasks = sorted(planned, key=_sort_key)

        # Sort windows by start time
        avail_windows = [
            w for w in windows
            if w.get("availability", "AVAILABLE") != "UNAVAILABLE"
        ]
        avail_windows.sort(key=lambda w: w.get("start", ""))

        # Resource capacity tracking: resource_type → count of operational
        res_capacity: dict[str, int] = {}
        for r in resources:
            if r.get("is_operational", True):
                rt = r.get("resource_type", "OTHER")
                res_capacity[rt] = res_capacity.get(rt, 0) + 1

        # Track scheduled task intervals for overlap checking:
        # list of dict: {task_id, section, window_id, start, end, safety_class, resources}
        scheduled_tasks: list[dict] = []

        selected_ids: list[str] = []
        unscheduled_ids: list[str] = []
        unscheduled_reasons: dict[str, str] = {}
        train_conflicts: list[dict] = []
        schedule_entries: list[dict] = []
        conflict_counter = 0

        for task in sorted_tasks:
            tid = task["task_id"]
            sec = task.get("railway_section_id", "")
            dur = task.get("estimated_duration_minutes", 0) or 0
            deadline = _parse_dt(task.get("deadline"))
            dept = task.get("department", "OTHER")
            sc = task.get("safety_class", "NORMAL")
            req_resources = task.get("required_resources", [])
            req_start_dt = _parse_dt(task.get("requested_start"))

            assigned = False
            rejection_cause = None

            for w in avail_windows:
                wid = w["window_id"]
                w_sec = w.get("section_id", "")

                # 1. Section match
                if w_sec != sec:
                    continue

                # 2. Duration fit
                w_dur = _window_duration_minutes(w)
                if dur > w_dur:
                    if not rejection_cause:
                        rejection_cause = f"Duration {dur}min exceeds window capacity {w_dur:.0f}min in section {sec}"
                    continue

                # 3. Department compatibility
                dept_compat = w.get("department_compatibility")
                if dept_compat and dept not in dept_compat:
                    if not rejection_cause:
                        rejection_cause = f"Department {dept} not permitted in window {wid}"
                    continue

                w_start = _parse_dt(w.get("start"))
                w_end = _parse_dt(w.get("end"))
                if not w_start or not w_end:
                    continue

                # 4. Actual task interval
                if req_start_dt and w_start <= req_start_dt <= w_end - timedelta(minutes=dur):
                    sched_start = req_start_dt
                else:
                    sched_start = w_start
                sched_end = sched_start + timedelta(minutes=dur)

                # 5. Deadline check
                if deadline and sched_end > deadline:
                    if not rejection_cause:
                        rejection_cause = f"Deadline {task.get('deadline')} would be violated (finishes at {_iso(sched_end)})"
                    continue

                # 6. Safety conflict with already-scheduled tasks
                safety_violation = False
                for st in scheduled_tasks:
                    if st["section"] == sec and _intervals_overlap(sched_start, sched_end, st["start"], st["end"]):
                        if frozenset({sc, st["safety_class"]}) in _UNSAFE_SAFETY_PAIRS:
                            safety_violation = True
                            rejection_cause = f"Safety conflict with scheduled task {st['task_id']} ({st['safety_class']}) in section {sec}"
                            break
                if safety_violation:
                    continue

                # 7. Window max_concurrent_tasks check
                max_conc = w.get("max_concurrent_tasks")
                if max_conc is not None:
                    overlapping_in_win = sum(
                        1 for st in scheduled_tasks
                        if st["window_id"] == wid and _intervals_overlap(sched_start, sched_end, st["start"], st["end"])
                    )
                    if overlapping_in_win + 1 > max_conc:
                        if not rejection_cause:
                            rejection_cause = f"Window {wid} reached max_concurrent_tasks ({max_conc})"
                        continue

                # 8. Section occupancy check
                overlapping_in_sec = sum(
                    1 for st in scheduled_tasks
                    if st["section"] == sec and _intervals_overlap(sched_start, sched_end, st["start"], st["end"])
                )
                if overlapping_in_sec + 1 > max_sec_occ:
                    if not rejection_cause:
                        rejection_cause = f"Section {sec} reached max concurrent occupancy ({max_sec_occ})"
                    continue

                # 9. Resource capacity check across overlapping intervals
                resource_ok = True
                for rr in req_resources:
                    rt = rr.get("resource_type", "OTHER")
                    needed = rr.get("count", 1)
                    cap = res_capacity.get(rt, 0)
                    used_at_interval = sum(
                        st_r.get(rt, 0)
                        for st in scheduled_tasks
                        if _intervals_overlap(sched_start, sched_end, st["start"], st["end"])
                        for st_r in [st["resource_demand"]]
                    )
                    if used_at_interval + needed > cap:
                        resource_ok = False
                        if not rejection_cause:
                            rejection_cause = f"Resource capacity exceeded: need {needed} {rt}, {used_at_interval}/{cap} in use"
                        break

                if not resource_ok:
                    continue

                # Task passes all constraints — schedule it
                res_demand = {rr.get("resource_type", "OTHER"): rr.get("count", 1) for rr in req_resources}
                scheduled_tasks.append({
                    "task_id": tid,
                    "section": sec,
                    "window_id": wid,
                    "start": sched_start,
                    "end": sched_end,
                    "safety_class": sc,
                    "resource_demand": res_demand,
                })

                # Check train conflicts
                disruption = 0.0
                for mv in train_movements:
                    if mv.get("section_id") != sec:
                        continue
                    mv_start = _parse_dt(mv.get("movement_start"))
                    mv_end = _parse_dt(mv.get("movement_end"))
                    overlap = _time_overlap_minutes(sched_start, sched_end, mv_start, mv_end)
                    if overlap > 0:
                        conflict_counter += 1
                        disruption += overlap
                        train_conflicts.append({
                            "conflict_id": f"conf_bl_{conflict_counter:03d}",
                            "conflict_type": "TRAIN_CONFLICT",
                            "entity_ids": [tid, mv.get("movement_id", "")],
                            "section_id": sec,
                            "start": _iso(mv_start) if mv_start else "",
                            "end": _iso(mv_end) if mv_end else "",
                            "severity": "HIGH" if mv.get("priority_class") in ("PASSENGER", "SUPERFAST") else "MEDIUM",
                            "description": f"Baseline: {tid} overlaps {mv.get('movement_id', '')} by {overlap:.0f}min",
                        })

                sched_entry = {
                    "schedule_id": f"sched_bl_{len(schedule_entries)+1:03d}",
                    "task_ids": [tid],
                    "blocks": [{
                        "block_id": wid,
                        "section_id": sec,
                        "start": _iso(sched_start),
                        "end": _iso(sched_end),
                    }],
                    "start_time": _iso(sched_start),
                    "end_time": _iso(sched_end),
                    "estimated_disruption_minutes": disruption,
                    "resource_assignments": {
                        rr.get("resource_type", "OTHER"): [tid]
                        for rr in req_resources
                    },
                    "status": "VALID",
                }
                schedule_entries.append(sched_entry)
                selected_ids.append(tid)
                assigned = True
                break

            if not assigned:
                unscheduled_ids.append(tid)
                matching_wins = [w for w in avail_windows if w.get("section_id") == sec]
                if not matching_wins:
                    reason = f"No available maintenance window for section {sec}"
                elif rejection_cause:
                    reason = rejection_cause
                else:
                    reason = f"Resource capacity exhausted or timing conflict in section {sec}"
                unscheduled_reasons[tid] = reason

        # Compute objective (sum of criticality scores for scheduled tasks)
        total_crit = sum(crit_map.get(tid, 0.5) for tid in selected_ids)
        total_disruption = sum(
            e.get("estimated_disruption_minutes", 0) for e in schedule_entries
        )
        objective = total_crit - (total_disruption / 100.0)

        # Resource peak utilisation
        resource_util: dict[str, float] = {}
        for rt, cap in res_capacity.items():
            peak_used = 0
            for st in scheduled_tasks:
                used_at_t = sum(
                    other["resource_demand"].get(rt, 0)
                    for other in scheduled_tasks
                    if _intervals_overlap(st["start"], st["end"], other["start"], other["end"])
                )
                if used_at_t > peak_used:
                    peak_used = used_at_t
            resource_util[rt] = round(peak_used / max(cap, 1), 2)

        return {
            "selected_task_ids": selected_ids,
            "unscheduled_task_ids": unscheduled_ids,
            "unscheduled_reasons": unscheduled_reasons,
            "schedule_candidates": schedule_entries,
            "train_conflicts": train_conflicts,
            "resource_utilization": resource_util,
            "objective_score": round(objective, 4),
            "total_disruption_minutes": round(total_disruption, 1),
            "generated_at": _iso(datetime.now(timezone.utc)),
            "strategy": "GREEDY_BASELINE",
            "shadow_block_count": 0,
        }


# ── Module-level convenience ─────────────────────────────────────────

def baseline_schedule(
    tasks: list[dict],
    train_movements: list[dict] | None = None,
    resources: list[dict] | None = None,
    windows: list[dict] | None = None,
    *,
    criticality_scores: list[dict] | None = None,
    constraints: dict | None = None,
) -> dict:
    """
    Module-level greedy baseline schedule per OPTIMIZATION_CONTRACT.md §1.
    """
    planner = BaselinePlanner()
    return planner.schedule(
        tasks, train_movements, resources, windows,
        criticality_scores=criticality_scores,
        constraints=constraints,
    )
