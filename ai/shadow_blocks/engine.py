"""
Shadow-Block Engine — Grouped Maintenance Possession Generator

Implements OPTIMIZATION_CONTRACT.md §4 and AI_DOMAIN_CONTRACT.md §10.

Generates combined maintenance possession opportunities from compatible tasks
to reduce rail traffic disruption and improve resource/crew utilization.

Calculates:
  - Combined possession duration
  - Estimated corridor occupancy
  - Resource usage aggregation and contention detection
  - Potential track possession time savings
  - Deterministic safety conflict rejections (Scenario K)

Usage
-----
    from ai.shadow_blocks.engine import ShadowBlockEngine

    engine = ShadowBlockEngine()
    candidates = engine.generate_shadow_blocks(
        tasks=tasks,
        compatibility_results=compat_results,
        windows=windows,
        resources=resources,
    )
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from itertools import combinations
from typing import Any

from ai.compatibility.engine import CompatibilityEngine


# ──────────────────────────────────────────────────────────────────────
# Constants / domain rules
# ──────────────────────────────────────────────────────────────────────

_UNSAFE_SAFETY_PAIRS: set[frozenset[str]] = {
    frozenset({"INTERLOCKING", "HIGH_SAFETY"}),
    frozenset({"INTERLOCKING", "INTERLOCKING"}),
}

_PRIORITY_WEIGHT = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
}

_CHANGEOVER_BUFFER_MINUTES = 15
_DEFAULT_REFERENCE_WINDOW_MINUTES = 360  # 6-hour standard night/maintenance window


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
# Shadow-Block Engine
# ──────────────────────────────────────────────────────────────────────

class ShadowBlockEngine:
    """
    Deterministic shadow-block generator and evaluator.

    Takes MaintenanceTask records, compatibility evaluation results,
    maintenance windows, and resources to produce ShadowBlockCandidate dicts.
    """

    def __init__(self, *, max_candidates: int = 100):
        self.max_candidates = max_candidates
        self._block_counter = 0

    # ── Public API ────────────────────────────────────────────────

    def generate_shadow_blocks(
        self,
        tasks: list[dict],
        compatibility_results: list[dict] | None = None,
        windows: list[dict] | None = None,
        resources: list[dict] | None = None,
        *,
        safety_constraints: dict | None = None,
    ) -> list[dict]:
        """
        Generate candidate shadow blocks from tasks and compatibility results.

        Returns a list of ShadowBlockCandidate dicts complying with
        AI_DOMAIN_CONTRACT.md §10.
        """
        self._block_counter = 0
        windows = windows or []
        resources = resources or []
        safety_constraints = safety_constraints or {}

        task_map = {t["task_id"]: t for t in tasks}

        # If compatibility results not provided, compute them
        if compatibility_results is None:
            compat_engine = CompatibilityEngine()
            compatibility_results = compat_engine.find_compatible_tasks(
                tasks, windows, resources
            )

        candidates: list[dict] = []
        seen_task_sets: set[frozenset[str]] = set()

        # 1. Collect pairwise feasible groups from COMPATIBLE / PARTIAL results
        compatible_pairs: list[list[str]] = []
        for cr in compatibility_results:
            if cr.get("status") in ("COMPATIBLE", "PARTIAL") and cr.get("safety_compatibility", True):
                tids = cr["task_ids"]
                if len(tids) == 2 and tids[0] in task_map and tids[1] in task_map:
                    compatible_pairs.append(tids)

        # 2. Explore 3-task groups (triads) where tasks are mutually compatible
        # E.g., Engineering + TRD + SNT in the same section
        triads = self._find_compatible_triads(compatible_pairs, task_map)
        for triad_tids in triads:
            if len(candidates) >= self.max_candidates:
                break
            tset = frozenset(triad_tids)
            if tset not in seen_task_sets:
                seen_task_sets.add(tset)
                group = [task_map[tid] for tid in triad_tids]
                cand = self.evaluate_candidate_group(
                    group, windows, resources, safety_constraints=safety_constraints
                )
                candidates.append(cand)

        # 3. Add 2-task compatible candidates
        for pair_tids in compatible_pairs:
            if len(candidates) >= self.max_candidates:
                break
            tset = frozenset(pair_tids)
            if tset not in seen_task_sets:
                seen_task_sets.add(tset)
                pair_tasks = [task_map[pair_tids[0]], task_map[pair_tids[1]]]
                cand = self.evaluate_candidate_group(
                    pair_tasks, windows, resources, safety_constraints=safety_constraints
                )
                candidates.append(cand)

        # 4. Add representative explicitly REJECTED safety pairs to ensure Scenario K candidates exist
        rejected_count = 0
        for cr in compatibility_results:
            if not cr.get("safety_compatibility", True) or any("SAFETY_CONFLICT" in r for r in cr.get("rejected_reasons", [])):
                tids = cr["task_ids"]
                if len(tids) == 2 and tids[0] in task_map and tids[1] in task_map:
                    tset = frozenset(tids)
                    if tset not in seen_task_sets:
                        seen_task_sets.add(tset)
                        pair_tasks = [task_map[tids[0]], task_map[tids[1]]]
                        cand = self.evaluate_candidate_group(
                            pair_tasks, windows, resources, safety_constraints=safety_constraints
                        )
                        candidates.append(cand)
                        rejected_count += 1
                        if rejected_count >= 5:
                            break

        return candidates

    def evaluate_candidate_group(
        self,
        tasks: list[dict],
        windows: list[dict] | None = None,
        resources: list[dict] | None = None,
        *,
        safety_constraints: dict | None = None,
    ) -> dict:
        """
        Directly evaluate an arbitrary group of 2+ tasks as a shadow block candidate.

        Returns a single ShadowBlockCandidate dict.
        """
        if len(tasks) < 2:
            raise ValueError("Shadow block requires at least 2 participating tasks")

        self._block_counter += 1
        sbid = f"sb_{self._block_counter:03d}"
        windows = windows or []
        resources = resources or []
        safety_constraints = safety_constraints or {}

        reasons: list[str] = []
        is_safe = True
        has_resource_conflict = False
        has_time_conflict = False
        has_spatial_conflict = False

        # ── Primary Task Selection ────────────────────────────────────
        # Order by priority hint (CRITICAL > HIGH > MEDIUM > LOW),
        # then by duration descending, then task_id
        sorted_tasks = sorted(
            tasks,
            key=lambda t: (
                _PRIORITY_WEIGHT.get(t.get("priority_hint", "LOW"), 1),
                t.get("estimated_duration_minutes", 0) or 0,
            ),
            reverse=True,
        )
        primary = sorted_tasks[0]
        participating = [t["task_id"] for t in sorted_tasks[1:]]

        # ── Sections & Departments ────────────────────────────────────
        sections = sorted(list({t.get("railway_section_id", "") for t in tasks if t.get("railway_section_id")}))
        departments = sorted(list({t.get("department", "OTHER") for t in tasks if t.get("department")}))

        # ── 1. Deterministic Safety Evaluation (Scenario K) ───────────
        for t1, t2 in combinations(tasks, 2):
            sc1 = t1.get("safety_class", "NORMAL")
            sc2 = t2.get("safety_class", "NORMAL")
            pair = frozenset({sc1, sc2})
            if pair in _UNSAFE_SAFETY_PAIRS:
                is_safe = False
                reasons.append(
                    f"SAFETY_CONFLICT: Cannot combine {sc1} ({t1['task_id']}) and {sc2} ({t2['task_id']}) "
                    f"in same block — {sc1} requires exclusive section control"
                )

        # Check explicit custom safety constraints
        prohibited_pairs = safety_constraints.get("prohibited_safety_classes", [])
        for p in prohibited_pairs:
            if set(p).issubset({t.get("safety_class") for t in tasks}):
                is_safe = False
                reasons.append(f"SAFETY_CONFLICT: Violates explicit safety rule prohibiting {p}")

        # ── 2. Spatial Evaluation ─────────────────────────────────────
        if len(sections) > 2:
            has_spatial_conflict = True
            reasons.append(f"SPATIAL_CONFLICT: Group spans {len(sections)} sections ({', '.join(sections)})")
        elif len(sections) == 2:
            reasons.append(f"spans adjacent sections ({', '.join(sections)})")
        else:
            reasons.append(f"shared corridor in {sections[0] if sections else 'unknown'}")

        # ── 3. Durations & Time Savings ───────────────────────────────
        durations = [t.get("estimated_duration_minutes", 0) or 0 for t in tasks]
        sum_durations = sum(durations)
        # Concurrent possession: longest individual task + changeover buffer
        estimated_duration = max(durations) + _CHANGEOVER_BUFFER_MINUTES
        if estimated_duration > sum_durations:
            estimated_duration = sum_durations

        potential_time_saving = max(0, sum_durations - estimated_duration)

        # ── 4. Temporal Alignment & Window Matching ───────────────────
        starts = [_parse_dt(t.get("requested_start")) for t in tasks]
        ends = [_parse_dt(t.get("requested_end")) for t in tasks]
        valid_starts = [s for s in starts if s is not None]
        valid_ends = [e for e in ends if e is not None]

        if not valid_starts or not valid_ends:
            prop_start_dt = datetime.now(timezone.utc)
            prop_end_dt = prop_start_dt + timedelta(minutes=estimated_duration)
            has_time_conflict = True
            reasons.append("TIME_CONFLICT: Missing or invalid requested times")
        else:
            earliest_start = min(valid_starts)
            latest_end = max(valid_ends)
            common_overlap_start = max(valid_starts)
            common_overlap_end = min(valid_ends)

            if common_overlap_start > common_overlap_end:
                gap = (common_overlap_start - common_overlap_end).total_seconds() / 3600
                if gap > 3.0:
                    has_time_conflict = True
                    reasons.append(f"TIME_CONFLICT: Non-overlapping tasks with {gap:.1f}h gap")

            # Match available maintenance window
            matched_window = None
            for w in windows:
                if w.get("section_id") in sections:
                    w_start = _parse_dt(w.get("start"))
                    w_end = _parse_dt(w.get("end"))
                    if w_start and w_end:
                        if max(w_start, earliest_start) < min(w_end, latest_end):
                            matched_window = w
                            break

            if matched_window:
                w_start_dt = _parse_dt(matched_window["start"]) or earliest_start
                prop_start_dt = max(w_start_dt, earliest_start)
                prop_end_dt = prop_start_dt + timedelta(minutes=estimated_duration)
                reasons.append(f"aligned with maintenance window {matched_window.get('window_id', 'unknown')}")
            else:
                prop_start_dt = earliest_start
                prop_end_dt = prop_start_dt + timedelta(minutes=estimated_duration)

        # ── 5. Corridor Occupancy ─────────────────────────────────────
        window_capacity = _DEFAULT_REFERENCE_WINDOW_MINUTES
        if matched_window:
            w_s = _parse_dt(matched_window.get("start"))
            w_e = _parse_dt(matched_window.get("end"))
            if w_s and w_e:
                w_dur = (w_e - w_s).total_seconds() / 60
                if w_dur > 0:
                    window_capacity = w_dur
        corridor_occupancy = round(min(1.0, max(0.05, estimated_duration / window_capacity)), 2)

        # ── 6. Resource Aggregation & Contention ──────────────────────
        resource_usage: dict[str, int] = {}
        for t in tasks:
            for rr in t.get("required_resources", []):
                rtype = rr.get("resource_type", "OTHER").lower()
                resource_usage[rtype] = resource_usage.get(rtype, 0) + rr.get("count", 1)

        if resources:
            available_counts: dict[str, int] = {}
            for r in resources:
                if r.get("is_operational", True):
                    rtype = r.get("resource_type", "OTHER").lower()
                    available_counts[rtype] = available_counts.get(rtype, 0) + 1

            for rtype, needed in resource_usage.items():
                avail = available_counts.get(rtype, 0)
                if avail < needed:
                    has_resource_conflict = True
                    reasons.append(
                        f"RESOURCE_CONFLICT: Required {needed} of {rtype}, only {avail} available"
                    )

        # ── 7. Conflict Status & Shadow Benefit Score ─────────────────
        if not is_safe or has_spatial_conflict:
            conflict_status = "REJECTED"
            shadow_benefit_score = 0.0
        elif has_resource_conflict or has_time_conflict:
            conflict_status = "CONFLICT"
            shadow_benefit_score = 0.25
        else:
            conflict_status = "FEASIBLE"
            # Positive reasons
            reasons.append("reduced duplicate track occupation")
            reasons.append(f"compatible departments ({', '.join(departments)})")
            if potential_time_saving > 0:
                reasons.append(f"concurrent block saves {potential_time_saving} minutes")

            # Benefit score calculation
            saving_ratio = min(0.5, potential_time_saving / max(sum_durations, 1))
            dept_bonus = 0.20 if len(departments) >= 2 else 0.10
            base_score = 0.30
            shadow_benefit_score = round(min(1.0, base_score + saving_ratio + dept_bonus), 2)

        return {
            "shadow_block_id": sbid,
            "primary_task_id": primary["task_id"],
            "participating_task_ids": participating,
            "sections": sections,
            "departments": departments,
            "proposed_window_start": _iso(prop_start_dt),
            "proposed_window_end": _iso(prop_end_dt),
            "estimated_duration_minutes": estimated_duration,
            "estimated_corridor_occupancy": corridor_occupancy,
            "potential_time_saving_minutes": potential_time_saving,
            "resource_usage": resource_usage,
            "conflict_status": conflict_status,
            "shadow_benefit_score": shadow_benefit_score,
            "reasons": reasons,
        }

    # ── Internal Helpers ──────────────────────────────────────────

    def _find_compatible_triads(
        self,
        compatible_pairs: list[list[str]],
        task_map: dict[str, dict],
    ) -> list[list[str]]:
        """
        Identify 3-task cliques where all pairs are compatible.
        Prioritizes diverse department groups like ENGINEERING + TRD + SNT.
        """
        pair_set = {frozenset(p) for p in compatible_pairs}
        all_nodes = list({tid for p in compatible_pairs for tid in p})
        triads: list[list[str]] = []

        for t1, t2, t3 in combinations(all_nodes, 3):
            if (
                frozenset({t1, t2}) in pair_set
                and frozenset({t2, t3}) in pair_set
                and frozenset({t1, t3}) in pair_set
            ):
                tasks = [task_map[t1], task_map[t2], task_map[t3]]
                depts = {t.get("department") for t in tasks}
                # If all 3 are distinct departments (e.g. ENG + TRD + SNT), prioritize
                triads.append([t1, t2, t3])
                if len(triads) >= 10:
                    break

        return triads


# ── Top-level Functional API per Contract ─────────────────────────────

def generate_shadow_block_candidates(
    tasks: list[dict],
    compatibility_results: list[dict] | None = None,
    windows: list[dict] | None = None,
    resources: list[dict] | None = None,
    safety_constraints: dict | None = None,
) -> list[dict]:
    """
    Generate shadow-block candidates per OPTIMIZATION_CONTRACT.md §4.
    """
    engine = ShadowBlockEngine()
    return engine.generate_shadow_blocks(
        tasks=tasks,
        compatibility_results=compatibility_results,
        windows=windows,
        resources=resources,
        safety_constraints=safety_constraints,
    )
