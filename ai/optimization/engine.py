"""
Optimization Engine — CP-SAT Constraint-Programming Scheduler.

Implements OPTIMIZATION_CONTRACT.md §5 and AI_DOMAIN_CONTRACT.md §11-§12.

Constructs a feasible, high-value maintenance schedule using Google OR-Tools
CP-SAT solver with the objective:

    maximize = maintenance_value + shadow_block_benefit − train_disruption

Supports four scheduling modes with different weight presets:
  - BALANCED (default)
  - SAFETY_FIRST
  - DISRUPTION_MINIMIZATION
  - EMERGENCY

Usage
-----
    from ai.optimization.engine import optimize_schedule

    result = optimize_schedule({
        "request_id": "opt_001",
        "mode": "BALANCED",
        "tasks": tasks,
        "criticality_scores": scores,
        "train_movements": movements,
        "resources": resources,
        "maintenance_windows": windows,
        "shadow_block_candidates": shadow_blocks,
        "constraints": {},
        "weights": {},
    })
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta, timezone
from itertools import combinations
from typing import Any

from ortools.sat.python import cp_model

from ai.optimization.baseline import BaselinePlanner


# ──────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────

_MODE_WEIGHTS: dict[str, dict[str, float]] = {
    "BALANCED": {
        "maintenance_value": 0.45,
        "shadow_block_benefit": 0.24,
        "train_disruption_penalty": 0.31,
    },
    "SAFETY_FIRST": {
        "maintenance_value": 0.60,
        "shadow_block_benefit": 0.15,
        "train_disruption_penalty": 0.25,
    },
    "DISRUPTION_MINIMIZATION": {
        "maintenance_value": 0.30,
        "shadow_block_benefit": 0.20,
        "train_disruption_penalty": 0.50,
    },
    "EMERGENCY": {
        "maintenance_value": 0.70,
        "shadow_block_benefit": 0.10,
        "train_disruption_penalty": 0.20,
    },
}

_UNSAFE_SAFETY_PAIRS: set[frozenset[str]] = {
    frozenset({"INTERLOCKING", "HIGH_SAFETY"}),
    frozenset({"INTERLOCKING", "INTERLOCKING"}),
}

_SCALE = 1000  # integer scaling factor for CP-SAT (no floats)

_DEFAULT_MAX_RUNTIME_S = 30
_DEFAULT_SECTION_OCCUPANCY = 3  # max concurrent tasks per section


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


def _window_dur_min(w: dict) -> float:
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


# ──────────────────────────────────────────────────────────────────────
# Engine
# ──────────────────────────────────────────────────────────────────────

class OptimizationEngine:
    """
    CP-SAT based maintenance schedule optimizer.

    Produces an ``OptimizationResult`` dict per AI_DOMAIN_CONTRACT.md §12.
    """

    def optimize(self, request: dict) -> dict:
        """
        Run the CP-SAT optimizer on an OptimizationRequest.
        """
        start_time_ns = time.monotonic_ns()

        request_id = request.get("request_id", "opt_unknown")
        mode = request.get("mode", "BALANCED")
        tasks = request.get("tasks", [])
        crit_scores = request.get("criticality_scores", [])
        movements = request.get("train_movements", [])
        resources = request.get("resources", [])
        windows = request.get("maintenance_windows", [])
        sb_candidates = request.get("shadow_block_candidates", [])
        constraints = request.get("constraints", {})
        user_weights = request.get("weights", {})
        solver_settings = request.get("solver_settings", {})

        # ── Weight resolution ────────────────────────────────────────
        weights = dict(_MODE_WEIGHTS.get(mode, _MODE_WEIGHTS["BALANCED"]))
        weights.update(user_weights)

        max_runtime = solver_settings.get(
            "max_runtime_seconds", _DEFAULT_MAX_RUNTIME_S
        )
        allow_partial = solver_settings.get("allow_partial_solution", True)
        max_section_occ = constraints.get(
            "max_section_occupancy", _DEFAULT_SECTION_OCCUPANCY
        )

        # ── Data preparation ─────────────────────────────────────────
        planned = [t for t in tasks if t.get("status") == "PLANNED"]
        avail_windows = [
            w for w in windows
            if w.get("availability", "AVAILABLE") != "UNAVAILABLE"
        ]

        crit_map: dict[str, float] = {}
        for cs in crit_scores:
            crit_map[cs["entity_id"]] = cs.get("score", 0.5)

        res_capacity: dict[str, int] = {}
        for r in resources:
            if r.get("is_operational", True):
                rt = r.get("resource_type", "OTHER")
                res_capacity[rt] = res_capacity.get(rt, 0) + 1

        # Feasible shadow blocks only — reject any marked REJECTED or CONFLICT
        feasible_sbs = [
            sb for sb in sb_candidates
            if sb.get("conflict_status") == "FEASIBLE"
        ]

        # ── Precompute per-assignment intervals and candidate eligibility
        # task_windows: task_id -> list of eligible window indices
        # task_intervals: (ti, wi) -> (sched_start_dt, sched_end_dt)
        # disruption_map: (ti, wi) -> disruption_minutes
        task_windows: dict[str, list[int]] = {}
        task_intervals: dict[tuple[int, int], tuple[datetime, datetime]] = {}
        disruption_map: dict[tuple[int, int], float] = {}
        task_ineligibility_reasons: dict[str, str] = {}

        for ti, task in enumerate(planned):
            tid = task["task_id"]
            sec = task.get("railway_section_id", "")
            dur = task.get("estimated_duration_minutes", 0) or 0
            deadline = _parse_dt(task.get("deadline"))
            dept = task.get("department", "OTHER")
            req_start = _parse_dt(task.get("requested_start"))
            eligible: list[int] = []

            section_windows = [w for w in avail_windows if w.get("section_id", "") == sec]
            if not section_windows:
                task_ineligibility_reasons[tid] = f"No maintenance window available for section {sec}"
            else:
                for wi, w in enumerate(avail_windows):
                    if w.get("section_id", "") != sec:
                        continue
                    w_dur = _window_dur_min(w)
                    if w_dur < dur:
                        continue
                    dept_compat = w.get("department_compatibility")
                    if dept_compat and dept not in dept_compat:
                        continue

                    w_start = _parse_dt(w.get("start"))
                    w_end = _parse_dt(w.get("end"))
                    if not w_start or not w_end:
                        continue

                    # Model actual task interval: start at requested_start if within window, else w_start
                    if req_start and w_start <= req_start <= w_end - timedelta(minutes=dur):
                        sched_start = req_start
                    else:
                        sched_start = w_start
                    sched_end = sched_start + timedelta(minutes=dur)

                    # Deadline constraint check
                    if deadline and sched_end > deadline:
                        continue

                    eligible.append(wi)
                    task_intervals[(ti, wi)] = (sched_start, sched_end)

                    # Train disruption calculation
                    total_disr = 0.0
                    for mv in movements:
                        if mv.get("section_id") != sec:
                            continue
                        mv_start = _parse_dt(mv.get("movement_start"))
                        mv_end = _parse_dt(mv.get("movement_end"))
                        overlap = _time_overlap_minutes(sched_start, sched_end, mv_start, mv_end)
                        if overlap > 0:
                            pclass = mv.get("priority_class", "FREIGHT")
                            mult = {
                                "EMERGENCY": 3.0,
                                "SUPERFAST": 2.5,
                                "PASSENGER": 2.0,
                                "FREIGHT": 1.0,
                            }.get(pclass, 1.0)
                            total_disr += overlap * mult
                    disruption_map[(ti, wi)] = total_disr

            task_windows[tid] = eligible
            if not eligible and tid not in task_ineligibility_reasons:
                if deadline:
                    task_ineligibility_reasons[tid] = (
                        f"Deadline expired or duration {dur}min exceeds available windows in section {sec}"
                    )
                else:
                    task_ineligibility_reasons[tid] = (
                        f"Duration {dur}min exceeds available window capacity in section {sec}"
                    )

        if not planned:
            elapsed = (time.monotonic_ns() - start_time_ns) / 1e6
            return self._empty_result(request_id, elapsed)

        # ── CP-SAT Model ─────────────────────────────────────────────
        model = cp_model.CpModel()

        # Decision variables: assign[task_idx, window_idx] ∈ {0,1}
        assign: dict[tuple[int, int], Any] = {}
        for ti, task in enumerate(planned):
            tid = task["task_id"]
            for wi in task_windows.get(tid, []):
                assign[(ti, wi)] = model.new_bool_var(f"a_{ti}_{wi}")

        # ── 1. Task Uniqueness Constraint ────────────────────────────
        for ti, task in enumerate(planned):
            tid = task["task_id"]
            eligible_vars = [
                assign[(ti, wi)]
                for wi in task_windows.get(tid, [])
                if (ti, wi) in assign
            ]
            if eligible_vars:
                model.add(sum(eligible_vars) <= 1)

        # ── 2. Shadow Block Linkage Constraint ───────────────────────
        # FIX 1: A selected shadow block means all participating tasks are
        # scheduled in the SAME maintenance window/block.
        tid_to_ti = {task["task_id"]: ti for ti, task in enumerate(planned)}
        use_sb: dict[int, Any] = {}
        sb_in_win: dict[tuple[int, int], Any] = {}
        sb_task_sets: dict[int, list[int]] = {}

        for si, sb in enumerate(feasible_sbs):
            use_sb[si] = model.new_bool_var(f"use_sb_{si}")
            all_tids = [sb["primary_task_id"]] + sb.get("participating_task_ids", [])
            task_indices = [tid_to_ti.get(tid) for tid in all_tids]

            # If any task in shadow block is not planned, this SB cannot be used
            if any(ti is None for ti in task_indices):
                model.add(use_sb[si] == 0)
                continue

            valid_ti_list = [ti for ti in task_indices if ti is not None]
            sb_task_sets[si] = valid_ti_list

            # Verify no internal safety conflict in shadow block
            sb_has_safety_conflict = False
            for ti1, ti2 in combinations(valid_ti_list, 2):
                sc1 = planned[ti1].get("safety_class", "NORMAL")
                sc2 = planned[ti2].get("safety_class", "NORMAL")
                if frozenset({sc1, sc2}) in _UNSAFE_SAFETY_PAIRS:
                    sb_has_safety_conflict = True
                    break
            if sb_has_safety_conflict:
                model.add(use_sb[si] == 0)
                continue

            # Find common eligible windows for ALL tasks in this shadow block
            common_eligible_windows = []
            for wi, w in enumerate(avail_windows):
                all_eligible = all((ti, wi) in assign for ti in valid_ti_list)
                if not all_eligible:
                    continue
                # Also verify window duration fits shadow block's duration
                sb_dur = sb.get("estimated_duration_minutes", 0)
                if _window_dur_min(w) < sb_dur:
                    continue
                common_eligible_windows.append(wi)

            if not common_eligible_windows:
                model.add(use_sb[si] == 0)
                continue

            # For each common window wi, introduce sb_in_win[(si, wi)]
            # sb_in_win[(si, wi)] == 1 implies every task ti in SB is assigned to wi
            window_vars = []
            for wi in common_eligible_windows:
                win_var = model.new_bool_var(f"sb_{si}_win_{wi}")
                sb_in_win[(si, wi)] = win_var
                window_vars.append(win_var)
                for ti in valid_ti_list:
                    model.add(win_var <= assign[(ti, wi)])

            # use_sb[si] == sum(window_vars) (at most 1 common window since tasks are unique)
            model.add(use_sb[si] == sum(window_vars))

        # ── 3. Interval-Based Resource Capacity, Section & Window Concurrency Constraints
        # FIX 2: Model actual task start/end intervals so multiple tasks
        # cannot incorrectly occupy the same section/resource beyond available capacity.
        # FIX 3: Respect each window's max_concurrent_tasks when provided.
        # FIX 5: Separate unavoidable train disruption from prohibited safety conflicts.

        # Collect all critical event points (start times)
        event_points: list[datetime] = sorted({
            start for (start, _) in task_intervals.values()
        })

        for t_event in event_points:
            # Active candidate assignments at t_event
            active_candidates: list[tuple[int, int]] = [
                (ti, wi) for (ti, wi), (start, end) in task_intervals.items()
                if start <= t_event < end
            ]
            if not active_candidates:
                continue

            # A. Resource capacity at t_event across ALL active tasks
            res_demands_at_t: dict[str, list[tuple[Any, int]]] = {}
            for ti, wi in active_candidates:
                task = planned[ti]
                for rr in task.get("required_resources", []):
                    rt = rr.get("resource_type", "OTHER")
                    cnt = rr.get("count", 1)
                    res_demands_at_t.setdefault(rt, []).append((assign[(ti, wi)], cnt))

            for rt, demand_list in res_demands_at_t.items():
                cap = res_capacity.get(rt, 0)
                model.add(sum(var * cnt for var, cnt in demand_list) <= cap)

            # B. Section concurrent occupancy at t_event
            sec_demands_at_t: dict[str, list[Any]] = {}
            for ti, wi in active_candidates:
                sec = planned[ti].get("railway_section_id", "")
                sec_demands_at_t.setdefault(sec, []).append(assign[(ti, wi)])

            for sec, vars_in_sec in sec_demands_at_t.items():
                if len(vars_in_sec) > max_section_occ:
                    model.add(sum(vars_in_sec) <= max_section_occ)

            # C. Window max_concurrent_tasks at t_event
            win_demands_at_t: dict[int, list[Any]] = {}
            for ti, wi in active_candidates:
                win_demands_at_t.setdefault(wi, []).append(assign[(ti, wi)])

            for wi, vars_in_win in win_demands_at_t.items():
                max_conc = avail_windows[wi].get("max_concurrent_tasks")
                if max_conc is not None and len(vars_in_win) > max_conc:
                    model.add(sum(vars_in_win) <= max_conc)

        # ── 4. Deterministic Safety Exclusion (Hard Constraint) ──────
        # FIX 5: Never select a schedule violating deterministic safety constraints.
        # Any two candidate assignments in the same section that overlap in time
        # and have incompatible safety classes are strictly mutually exclusive.
        active_assignments = list(task_intervals.keys())
        for idx1 in range(len(active_assignments)):
            ti1, wi1 = active_assignments[idx1]
            s1, e1 = task_intervals[(ti1, wi1)]
            sec1 = planned[ti1].get("railway_section_id", "")
            sc1 = planned[ti1].get("safety_class", "NORMAL")

            for idx2 in range(idx1 + 1, len(active_assignments)):
                ti2, wi2 = active_assignments[idx2]
                sec2 = planned[ti2].get("railway_section_id", "")
                if sec1 != sec2:
                    continue
                sc2 = planned[ti2].get("safety_class", "NORMAL")
                if frozenset({sc1, sc2}) not in _UNSAFE_SAFETY_PAIRS:
                    continue

                s2, e2 = task_intervals[(ti2, wi2)]
                # If intervals overlap or assignments share the same window/block in the same section
                if wi1 == wi2 or _intervals_overlap(s1, e1, s2, e2):
                    model.add(assign[(ti1, wi1)] + assign[(ti2, wi2)] <= 1)

        # ── 5. Objective Function ─────────────────────────────────────
        # FIX 4: Make shadow-block benefit use a deterministic normalized
        # saving score instead of arbitrary raw-minute scaling.
        w_mv = weights["maintenance_value"]
        w_sb = weights["shadow_block_benefit"]
        w_td = weights["train_disruption_penalty"]

        obj_terms = []

        # Term 1: maintenance_value = Σ criticality * assign
        for ti, task in enumerate(planned):
            tid = task["task_id"]
            crit = crit_map.get(tid, 0.5)
            crit_scaled = int(crit * _SCALE * w_mv)
            for wi in task_windows.get(tid, []):
                if (ti, wi) in assign:
                    obj_terms.append(crit_scaled * assign[(ti, wi)])

        # Term 2: shadow_block_benefit = Σ normalized_benefit * use_sb
        # Deterministic normalized benefit calculation:
        #   saving_score = potential_time_saving / (estimated_duration + potential_time_saving)
        #   norm_benefit = 0.5 * shadow_benefit_score + 0.5 * saving_score (bounded in [0.0, 1.0])
        for si, sb in enumerate(feasible_sbs):
            benefit_score = float(sb.get("shadow_benefit_score", 0.0) or 0.0)
            est_dur = float(sb.get("estimated_duration_minutes", 0) or 0.0)
            time_saved = float(sb.get("potential_time_saving_minutes", 0) or 0.0)
            total_unshared = est_dur + time_saved
            saving_score = (time_saved / total_unshared) if total_unshared > 0 else 0.0

            if benefit_score > 0.0:
                norm_benefit = min(1.0, max(0.0, 0.5 * benefit_score + 0.5 * saving_score))
            else:
                norm_benefit = min(1.0, max(0.0, saving_score))

            ben_scaled = int(norm_benefit * _SCALE * w_sb)
            obj_terms.append(ben_scaled * use_sb[si])

        # Term 3: train_disruption_penalty = −Σ norm_disruption * assign
        # Normalized per task disruption against window duration to keep terms in [0, SCALE]
        for (ti, wi), disr_min in disruption_map.items():
            if (ti, wi) not in assign or disr_min <= 0:
                continue
            w_dur = _window_dur_min(avail_windows[wi]) or 120.0
            norm_disr = min(1.0, disr_min / max(w_dur, 60.0))
            disr_scaled = int(norm_disr * _SCALE * w_td)
            if disr_scaled > 0:
                obj_terms.append(-disr_scaled * assign[(ti, wi)])

        if obj_terms:
            model.maximize(sum(obj_terms))

        # ── SOLVE ─────────────────────────────────────────────────────
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = max_runtime
        solver.parameters.num_workers = 1  # deterministic

        solve_status = solver.solve(model)
        elapsed_ms = (time.monotonic_ns() - start_time_ns) / 1e6

        # ── EXTRACT SOLUTION ──────────────────────────────────────────
        status_map = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "FAILED",
            cp_model.UNKNOWN: "FAILED",
        }
        result_status = status_map.get(solve_status, "FAILED")

        if result_status == "INFEASIBLE" and allow_partial:
            result_status = "PARTIAL"

        selected_ids: list[str] = []
        unscheduled_ids: list[str] = []
        unscheduled_reasons: dict[str, str] = {}
        schedule_entries: list[dict] = []
        train_conflicts: list[dict] = []
        selected_sbs: list[dict] = []
        resource_util: dict[str, float] = {}
        objective_raw = 0.0
        total_disruption = 0.0
        conflict_counter = 0

        # Map to track which tasks are scheduled and where: ti -> (wi, start_dt, end_dt)
        scheduled_assignment: dict[int, tuple[int, datetime, datetime]] = {}

        if solve_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            objective_raw = solver.objective_value / _SCALE

            # Determine which tasks got scheduled
            for ti, task in enumerate(planned):
                for wi in task_windows.get(task["task_id"], []):
                    if (ti, wi) in assign and solver.value(assign[(ti, wi)]) == 1:
                        s_dt, e_dt = task_intervals[(ti, wi)]
                        scheduled_assignment[ti] = (wi, s_dt, e_dt)
                        selected_ids.append(task["task_id"])
                        break

            # Identify selected shadow blocks
            sb_grouped_tasks: set[str] = set()
            for si, sb in enumerate(feasible_sbs):
                if si in use_sb and solver.value(use_sb[si]) == 1:
                    selected_sbs.append(sb)
                    sb_tids = [sb["primary_task_id"]] + sb.get("participating_task_ids", [])
                    sb_grouped_tasks.update(sb_tids)

                    # Group tasks sharing this shadow block into a unified ScheduleCandidate
                    p_ti = tid_to_ti.get(sb["primary_task_id"])
                    if p_ti in scheduled_assignment:
                        wi, _, _ = scheduled_assignment[p_ti]
                        w = avail_windows[wi]
                        wid = w["window_id"]
                        sec = sb.get("sections", [w.get("section_id", "")])[0]

                        # Combined start and end
                        sb_starts = [scheduled_assignment[tid_to_ti[t]][1] for t in sb_tids if tid_to_ti.get(t) in scheduled_assignment]
                        sb_ends = [scheduled_assignment[tid_to_ti[t]][2] for t in sb_tids if tid_to_ti.get(t) in scheduled_assignment]
                        group_start = min(sb_starts) if sb_starts else _parse_dt(w.get("start"))
                        group_end = max(sb_ends) if sb_ends else _parse_dt(w.get("end"))

                        # Combined resource assignments
                        group_res_assign: dict[str, list[str]] = {}
                        for t in sb_tids:
                            t_obj = next((item for item in planned if item["task_id"] == t), None)
                            if t_obj:
                                for rr in t_obj.get("required_resources", []):
                                    group_res_assign.setdefault(rr.get("resource_type", "OTHER"), []).append(t)

                        # Disruption for shadow block
                        sb_disr = 0.0
                        for mv in movements:
                            if mv.get("section_id") != sec:
                                continue
                            mv_start = _parse_dt(mv.get("movement_start"))
                            mv_end = _parse_dt(mv.get("movement_end"))
                            overlap = _time_overlap_minutes(group_start, group_end, mv_start, mv_end)
                            if overlap > 0:
                                conflict_counter += 1
                                sb_disr += overlap
                                train_conflicts.append({
                                    "conflict_id": f"conf_opt_{conflict_counter:03d}",
                                    "conflict_type": "TRAIN_CONFLICT",
                                    "entity_ids": sb_tids + [mv.get("movement_id", "")],
                                    "section_id": sec,
                                    "start": _iso(mv_start) if mv_start else "",
                                    "end": _iso(mv_end) if mv_end else "",
                                    "severity": "HIGH" if mv.get("priority_class") in ("PASSENGER", "SUPERFAST") else "MEDIUM",
                                    "description": f"Optimized SB {sb['shadow_block_id']} overlaps {mv.get('movement_id', '')} by {overlap:.0f}min",
                                })

                        total_disruption += sb_disr
                        schedule_entries.append({
                            "schedule_id": f"sched_opt_{len(schedule_entries)+1:03d}",
                            "task_ids": sb_tids,
                            "blocks": [{
                                "block_id": wid,
                                "section_id": sec,
                                "start": _iso(group_start),
                                "end": _iso(group_end),
                            }],
                            "start_time": _iso(group_start),
                            "end_time": _iso(group_end),
                            "estimated_disruption_minutes": sb_disr,
                            "resource_assignments": group_res_assign,
                            "status": "VALID",
                        })

            # Create individual ScheduleCandidates for non-shadow-block scheduled tasks
            for ti, (wi, s_dt, e_dt) in scheduled_assignment.items():
                task = planned[ti]
                tid = task["task_id"]
                if tid in sb_grouped_tasks:
                    continue  # Already represented in a shadow-block candidate

                w = avail_windows[wi]
                wid = w["window_id"]
                sec = task.get("railway_section_id", "")

                task_disr = 0.0
                for mv in movements:
                    if mv.get("section_id") != sec:
                        continue
                    mv_start = _parse_dt(mv.get("movement_start"))
                    mv_end = _parse_dt(mv.get("movement_end"))
                    overlap = _time_overlap_minutes(s_dt, e_dt, mv_start, mv_end)
                    if overlap > 0:
                        conflict_counter += 1
                        task_disr += overlap
                        train_conflicts.append({
                            "conflict_id": f"conf_opt_{conflict_counter:03d}",
                            "conflict_type": "TRAIN_CONFLICT",
                            "entity_ids": [tid, mv.get("movement_id", "")],
                            "section_id": sec,
                            "start": _iso(mv_start) if mv_start else "",
                            "end": _iso(mv_end) if mv_end else "",
                            "severity": "HIGH" if mv.get("priority_class") in ("PASSENGER", "SUPERFAST") else "MEDIUM",
                            "description": f"Optimized: {tid} overlaps {mv.get('movement_id', '')} by {overlap:.0f}min",
                        })

                total_disruption += task_disr
                schedule_entries.append({
                    "schedule_id": f"sched_opt_{len(schedule_entries)+1:03d}",
                    "task_ids": [tid],
                    "blocks": [{
                        "block_id": wid,
                        "section_id": sec,
                        "start": _iso(s_dt),
                        "end": _iso(e_dt),
                    }],
                    "start_time": _iso(s_dt),
                    "end_time": _iso(e_dt),
                    "estimated_disruption_minutes": task_disr,
                    "resource_assignments": {
                        rr.get("resource_type", "OTHER"): [tid]
                        for rr in task.get("required_resources", [])
                    },
                    "status": "VALID",
                })

            # FIX 6: Diagnose detailed, specific reasons for unscheduled tasks
            for ti, task in enumerate(planned):
                if ti in scheduled_assignment:
                    continue
                tid = task["task_id"]
                unscheduled_ids.append(tid)

                if tid in task_ineligibility_reasons:
                    unscheduled_reasons[tid] = task_ineligibility_reasons[tid]
                else:
                    eligible_wis = task_windows.get(tid, [])
                    sec = task.get("railway_section_id", "")
                    sc = task.get("safety_class", "NORMAL")

                    # Check for safety conflict with an already scheduled task
                    safety_conflict_task = None
                    for sched_ti, (sched_wi, sched_s, sched_e) in scheduled_assignment.items():
                        sched_task = planned[sched_ti]
                        if sched_task.get("railway_section_id") == sec:
                            if frozenset({sc, sched_task.get("safety_class")}) in _UNSAFE_SAFETY_PAIRS:
                                for wi in eligible_wis:
                                    s_cand, e_cand = task_intervals.get((ti, wi), (None, None))
                                    if s_cand and _intervals_overlap(s_cand, e_cand, sched_s, sched_e):
                                        safety_conflict_task = sched_task["task_id"]
                                        break
                        if safety_conflict_task:
                            break

                    if safety_conflict_task:
                        unscheduled_reasons[tid] = (
                            f"Safety conflict: incompatible safety class ({sc}) with scheduled task {safety_conflict_task} in section {sec}"
                        )
                        continue

                    # Check if all eligible windows were blocked by resource capacity
                    resource_bottleneck = None
                    for rr in task.get("required_resources", []):
                        rt = rr.get("resource_type", "OTHER")
                        cnt = rr.get("count", 1)
                        cap = res_capacity.get(rt, 0)
                        # Check if capacity was saturated during task interval
                        saturated = True
                        for wi in eligible_wis:
                            s_cand, e_cand = task_intervals.get((ti, wi), (None, None))
                            if not s_cand:
                                continue
                            used_at_interval = sum(
                                r_req.get("count", 1)
                                for st_idx, (_, st_s, st_e) in scheduled_assignment.items()
                                if _intervals_overlap(s_cand, e_cand, st_s, st_e)
                                for r_req in planned[st_idx].get("required_resources", [])
                                if r_req.get("resource_type") == rt
                            )
                            if used_at_interval + cnt <= cap:
                                saturated = False
                                break
                        if saturated:
                            resource_bottleneck = rt
                            break

                    if resource_bottleneck:
                        unscheduled_reasons[tid] = (
                            f"Resource capacity exhausted: insufficient {resource_bottleneck} during available windows"
                        )
                        continue

                    # Check if windows were saturated by max_concurrent_tasks
                    max_conc_blocked = True
                    for wi in eligible_wis:
                        mc = avail_windows[wi].get("max_concurrent_tasks")
                        if mc is None:
                            max_conc_blocked = False
                            break
                        count_in_win = sum(1 for _, (w_idx, _, _) in scheduled_assignment.items() if w_idx == wi)
                        if count_in_win < mc:
                            max_conc_blocked = False
                            break

                    if max_conc_blocked and eligible_wis:
                        unscheduled_reasons[tid] = (
                            f"Window capacity limit reached: all eligible windows at max_concurrent_tasks in section {sec}"
                        )
                        continue

                    # Check if train disruption penalty outweighed value
                    high_disruption = any(
                        disruption_map.get((ti, wi), 0) > 120
                        for wi in eligible_wis
                    )
                    if high_disruption:
                        unscheduled_reasons[tid] = (
                            f"Train disruption trade-off: severe train conflict penalty outweighed priority value"
                        )
                        continue

                    unscheduled_reasons[tid] = (
                        f"Priority trade-off: lower criticality ({crit_map.get(tid, 0.5):.2f}) deferred in favor of higher-value tasks"
                    )

            # Resource peak utilization
            for rt, cap in res_capacity.items():
                peak_used = 0
                for _, (_, s1, e1) in scheduled_assignment.items():
                    used_at_t = sum(
                        r_req.get("count", 1)
                        for other_ti, (_, s2, e2) in scheduled_assignment.items()
                        if _intervals_overlap(s1, e1, s2, e2)
                        for r_req in planned[other_ti].get("required_resources", [])
                        if r_req.get("resource_type") == rt
                    )
                    if used_at_t > peak_used:
                        peak_used = used_at_t
                resource_util[rt] = round(peak_used / max(cap, 1), 2)

        else:
            # Solver failed or proved infeasible
            for task in planned:
                tid = task["task_id"]
                unscheduled_ids.append(tid)
                if tid in task_ineligibility_reasons:
                    unscheduled_reasons[tid] = task_ineligibility_reasons[tid]
                else:
                    unscheduled_reasons[tid] = "Solver returned infeasible/failed: constraints too restrictive"

        # ── Baseline comparison ───────────────────────────────────────
        baseline_planner = BaselinePlanner()
        baseline_result = baseline_planner.schedule(
            tasks, movements, resources, windows,
            criticality_scores=crit_scores,
            constraints=constraints,
        )

        bl_obj = baseline_result.get("objective_score", 0.0)
        bl_disruption = baseline_result.get("total_disruption_minutes", 0.0)
        delta_obj = round(objective_raw - bl_obj, 4)
        bl_scheduled = len(baseline_result.get("selected_task_ids", []))
        opt_scheduled = len(selected_ids)

        if bl_disruption > 0 and total_disruption < bl_disruption:
            disruption_reduction_pct = round(
                (bl_disruption - total_disruption) / bl_disruption * 100, 1
            )
        elif bl_disruption == 0 and total_disruption == 0:
            disruption_reduction_pct = 0.0
        else:
            disruption_reduction_pct = 0.0

        baseline_comparison = {
            "baseline_objective": round(bl_obj, 4),
            "optimized_objective": round(objective_raw, 4),
            "delta_objective": delta_obj,
            "baseline_scheduled_count": bl_scheduled,
            "optimized_scheduled_count": opt_scheduled,
            "baseline_disruption_minutes": round(bl_disruption, 1),
            "optimized_disruption_minutes": round(total_disruption, 1),
            "train_disruption_reduction_pct": disruption_reduction_pct,
        }

        # ── Solver statistics ─────────────────────────────────────────
        solver_stats = {
            "runtime_ms": round(elapsed_ms, 1),
            "status_name": result_status,
            "num_tasks": len(planned),
            "num_windows": len(avail_windows),
            "num_variables": len(assign) + len(use_sb),
            "num_shadow_blocks_available": len(feasible_sbs),
            "num_shadow_blocks_used": len(selected_sbs),
            "mode": mode,
        }
        if solve_status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            solver_stats["objective_value"] = round(solver.objective_value, 4)
            solver_stats["best_bound"] = round(solver.best_objective_bound, 4)

        if result_status in ("OPTIMAL", "FEASIBLE"):
            if len(selected_ids) == len(planned):
                pass
            elif len(selected_ids) > 0:
                result_status = "PARTIAL" if result_status != "OPTIMAL" else result_status
        elif result_status == "PARTIAL" and len(selected_ids) == 0:
            result_status = "INFEASIBLE"

        return {
            "request_id": request_id,
            "status": result_status,
            "selected_task_ids": selected_ids,
            "unscheduled_task_ids": unscheduled_ids,
            "unscheduled_reasons": unscheduled_reasons,
            "schedule_candidates": schedule_entries,
            "shadow_blocks": selected_sbs,
            "train_conflicts": train_conflicts,
            "resource_utilization": resource_util,
            "objective_score": round(objective_raw, 4),
            "total_disruption_minutes": round(total_disruption, 1),
            "baseline_comparison": baseline_comparison,
            "solver_statistics": solver_stats,
            "generated_at": _iso(datetime.now(timezone.utc)),
        }

    def _empty_result(self, request_id: str, elapsed_ms: float) -> dict:
        return {
            "request_id": request_id,
            "status": "INFEASIBLE",
            "selected_task_ids": [],
            "unscheduled_task_ids": [],
            "unscheduled_reasons": {},
            "schedule_candidates": [],
            "shadow_blocks": [],
            "train_conflicts": [],
            "resource_utilization": {},
            "objective_score": 0.0,
            "total_disruption_minutes": 0.0,
            "baseline_comparison": {},
            "solver_statistics": {"runtime_ms": round(elapsed_ms, 1)},
            "generated_at": _iso(datetime.now(timezone.utc)),
        }


# ── Module-level convenience ─────────────────────────────────────────

def optimize_schedule(request: dict) -> dict:
    """
    Run the CP-SAT optimizer per OPTIMIZATION_CONTRACT.md §5.
    """
    engine = OptimizationEngine()
    return engine.optimize(request)
