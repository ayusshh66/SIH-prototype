"""
Compatibility Engine — Deterministic Task Grouping Evaluator

Implements OPTIMIZATION_CONTRACT.md §3 and AI_DOMAIN_CONTRACT.md §8.

Evaluates pairwise compatibility of MaintenanceTask records across five
deterministic dimensions:

1. **Spatial** — same or adjacent railway section, km-range overlap
2. **Temporal** — overlap or proximity of requested time windows
3. **Department** — compatible department groupings
4. **Resource** — overlapping resource types allow shared allocation
5. **Safety** — deterministic rejection when safety classes conflict

The engine produces ``CompatibilityCandidate`` dicts for every evaluated
pair/group.  Incompatible pairs are explicitly rejected with reasons.

Usage
-----
    from ai.compatibility.engine import CompatibilityEngine

    engine = CompatibilityEngine()
    candidates = engine.find_compatible_tasks(tasks, windows, resources)
"""

from __future__ import annotations

from datetime import datetime, timezone
from itertools import combinations
from typing import Any

# ──────────────────────────────────────────────────────────────────────
# Constants / domain rules
# ──────────────────────────────────────────────────────────────────────

# Departments that can coexist in a single block.
# Each set represents a compatible group.
_COMPATIBLE_DEPT_GROUPS: list[set[str]] = [
    {"ENGINEERING", "P_WAY"},
    {"ENGINEERING", "TRD"},
    {"ENGINEERING", "SNT"},
    {"P_WAY", "TRD"},
    {"P_WAY", "SNT"},
    {"TRD", "SNT"},
    {"ENGINEERING", "P_WAY", "TRD"},
    {"ENGINEERING", "P_WAY", "SNT"},
    {"ENGINEERING", "TRD", "SNT"},
    {"P_WAY", "TRD", "SNT"},
    {"ENGINEERING", "P_WAY", "TRD", "SNT"},
]

# Safety class pairs that CANNOT coexist in the same block.
# This is the deterministic safety rule (from contract §K and §4 unsafe rule).
_UNSAFE_SAFETY_PAIRS: set[frozenset[str]] = {
    frozenset({"INTERLOCKING", "HIGH_SAFETY"}),
    frozenset({"INTERLOCKING", "INTERLOCKING"}),
}

# Section adjacency — sections whose km ranges are contiguous
# are considered "nearby" for spatial scoring.
_SECTION_ORDER = [
    "sec_01", "sec_02", "sec_03", "sec_04",
    "sec_05", "sec_06", "sec_07", "sec_08",
]
_SECTION_INDEX = {s: i for i, s in enumerate(_SECTION_ORDER)}

# Thresholds
_SPATIAL_SAME_SECTION_SCORE = 1.0
_SPATIAL_ADJACENT_SECTION_SCORE = 0.6
_SPATIAL_DISTANT_SCORE = 0.1

_COMPATIBLE_THRESHOLD = 0.60   # overall score ≥ this → COMPATIBLE
_PARTIAL_THRESHOLD = 0.40      # overall score ≥ this → PARTIAL

# Weights for the composite score
_W_SPATIAL = 0.30
_W_TEMPORAL = 0.30
_W_RESOURCE = 0.15
_W_DEPT = 0.10
_W_SAFETY = 0.15  # binary — contributes full weight if safe, zero if not


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


def _time_overlap_ratio(
    s1: datetime | None, e1: datetime | None,
    s2: datetime | None, e2: datetime | None,
) -> float:
    """
    Return overlap ratio ∈ [0, 1] between two time ranges.
    1.0 = identical ranges; 0.0 = no overlap.
    """
    if None in (s1, e1, s2, e2):
        return 0.0
    overlap_start = max(s1, s2)
    overlap_end = min(e1, e2)
    if overlap_start >= overlap_end:
        # No overlap — check proximity (within 2h counts as partial)
        gap_hours = (overlap_start - overlap_end).total_seconds() / 3600
        if gap_hours <= 2.0:
            return max(0.0, 0.3 - gap_hours * 0.15)
        return 0.0
    overlap_secs = (overlap_end - overlap_start).total_seconds()
    span_secs = max(
        (max(e1, e2) - min(s1, s2)).total_seconds(),
        1.0,
    )
    return min(overlap_secs / span_secs, 1.0)


def _km_overlap(a_from: float, a_to: float, b_from: float, b_to: float) -> float:
    """Return km-range overlap ratio ∈ [0, 1]."""
    overlap = max(0.0, min(a_to, b_to) - max(a_from, b_from))
    span = max(a_to, b_to) - min(a_from, b_from)
    if span <= 0:
        return 1.0
    return overlap / span


# ──────────────────────────────────────────────────────────────────────
# Engine
# ──────────────────────────────────────────────────────────────────────

class CompatibilityEngine:
    """
    Deterministic compatibility evaluator.

    Produces ``CompatibilityCandidate`` dicts for every pair of
    PLANNED tasks, per AI_DOMAIN_CONTRACT.md §8.
    """

    def __init__(self, *, max_pairs: int = 500):
        """
        Parameters
        ----------
        max_pairs : int
            Upper bound on candidate pairs to evaluate (performance guard).
        """
        self.max_pairs = max_pairs
        self._candidate_counter = 0

    # ── Public API ────────────────────────────────────────────────

    def find_compatible_tasks(
        self,
        tasks: list[dict],
        windows: list[dict] | None = None,
        resources: list[dict] | None = None,
        *,
        constraints: dict | None = None,
    ) -> list[dict]:
        """
        Evaluate pairwise compatibility for all PLANNED tasks.

        Returns a list of ``CompatibilityCandidate`` dicts, including
        REJECTED candidates with explicit rejection reasons.
        """
        self._candidate_counter = 0
        windows = windows or []
        resources = resources or []

        planned = [t for t in tasks if t.get("status") == "PLANNED"]
        candidates: list[dict] = []

        same_sec: list[tuple[dict, dict]] = []
        adjacent_sec: list[tuple[dict, dict]] = []
        distant_sec: list[tuple[dict, dict]] = []

        for t1, t2 in combinations(planned, 2):
            s1 = t1.get("railway_section_id")
            s2 = t2.get("railway_section_id")
            if s1 == s2:
                same_sec.append((t1, t2))
            else:
                idx1 = _SECTION_INDEX.get(s1)
                idx2 = _SECTION_INDEX.get(s2)
                if idx1 is not None and idx2 is not None and abs(idx1 - idx2) == 1:
                    adjacent_sec.append((t1, t2))
                else:
                    distant_sec.append((t1, t2))

        # Combine same and adjacent section pairs, plus a sample of distant pairs for rejection validation
        ordered_pairs = same_sec + adjacent_sec + distant_sec[:100]
        if len(ordered_pairs) > self.max_pairs:
            ordered_pairs = ordered_pairs[: self.max_pairs]

        for t1, t2 in ordered_pairs:
            candidate = self._evaluate_pair(t1, t2, windows, resources)
            candidates.append(candidate)

        return candidates

    def evaluate_pair(
        self,
        task_a: dict,
        task_b: dict,
        windows: list[dict] | None = None,
        resources: list[dict] | None = None,
    ) -> dict:
        """Evaluate a single pair of tasks. Public convenience method."""
        return self._evaluate_pair(task_a, task_b, windows or [], resources or [])

    def evaluate_group(
        self,
        tasks: list[dict],
        windows: list[dict] | None = None,
        resources: list[dict] | None = None,
    ) -> dict:
        """
        Evaluate compatibility for a group of 2+ tasks.

        Performs multi-way spatial, temporal, department, resource, and safety checks.
        """
        if len(tasks) < 2:
            raise ValueError("At least two tasks are required to evaluate group compatibility")
        if len(tasks) == 2:
            return self.evaluate_pair(tasks[0], tasks[1], windows, resources)

        self._candidate_counter += 1
        cid = f"comp_{self._candidate_counter:04d}"
        windows = windows or []
        resources = resources or []

        task_ids = [t["task_id"] for t in tasks]
        reasons: list[str] = []
        rejected_reasons: list[str] = []

        # 1. Safety check across all pairs in the group
        safety_compat = True
        for t1, t2 in combinations(tasks, 2):
            if not self._safety_check(t1, t2, [], []):
                safety_compat = False
                sc1 = t1.get("safety_class", "NORMAL")
                sc2 = t2.get("safety_class", "NORMAL")
                rejected_reasons.append(
                    f"SAFETY_CONFLICT: Cannot combine {t1['task_id']} ({sc1}) and "
                    f"{t2['task_id']} ({sc2}) in same block — {sc1} requires exclusive section control"
                )
        if safety_compat:
            reasons.append("safety classes are mutually compatible across group")

        # 2. Department compatibility
        depts = {t.get("department", "OTHER") for t in tasks}
        dept_compat = any(depts <= group for group in _COMPATIBLE_DEPT_GROUPS)
        if dept_compat:
            dept_score = 1.0 if len(depts) == 1 else 0.85
            reasons.append(f"compatible department group ({' + '.join(sorted(depts))})")
        else:
            dept_score = 0.0
            rejected_reasons.append(f"incompatible department group ({' + '.join(sorted(depts))})")

        # 3. Spatial score
        sections = list({t.get("railway_section_id", "") for t in tasks})
        if len(sections) == 1:
            spatial_score = 1.0
            reasons.append(f"all tasks in same section ({sections[0]})")
        else:
            all_adjacent = True
            for s1, s2 in combinations(sections, 2):
                idx1 = _SECTION_INDEX.get(s1)
                idx2 = _SECTION_INDEX.get(s2)
                if idx1 is None or idx2 is None or abs(idx1 - idx2) > 1:
                    all_adjacent = False
                    break
            if all_adjacent:
                spatial_score = _SPATIAL_ADJACENT_SECTION_SCORE
                reasons.append(f"tasks across adjacent sections ({', '.join(sorted(sections))})")
            else:
                spatial_score = _SPATIAL_DISTANT_SCORE
                rejected_reasons.append(f"distant sections: {', '.join(sorted(sections))}")

        # 4. Temporal score
        starts = [_parse_dt(t.get("requested_start")) for t in tasks]
        ends = [_parse_dt(t.get("requested_end")) for t in tasks]
        if None in starts or None in ends:
            temporal_score = 0.0
            rejected_reasons.append("missing or invalid time windows")
        else:
            common_start = max(starts)
            common_end = min(ends)
            if common_start < common_end:
                span_secs = max((max(ends) - min(starts)).total_seconds(), 1.0)
                overlap_secs = (common_end - common_start).total_seconds()
                temporal_score = min(1.0, overlap_secs / span_secs)
                reasons.append(f"overlapping time window ({temporal_score:.0%} group overlap)")
            else:
                gap_hours = (common_start - common_end).total_seconds() / 3600
                if gap_hours <= 2.0:
                    temporal_score = max(0.0, 0.3 - gap_hours * 0.15)
                    reasons.append(f"nearby time windows ({gap_hours:.1f}h gap)")
                else:
                    temporal_score = 0.0
                    rejected_reasons.append("non-overlapping time windows")

        # 5. Resource score
        all_reqs: dict[str, int] = {}
        for t in tasks:
            for rr in t.get("required_resources", []):
                rtype = rr["resource_type"]
                all_reqs[rtype] = all_reqs.get(rtype, 0) + rr.get("count", 1)

        if not all_reqs:
            resource_score = 0.6
        elif not resources:
            resource_score = 0.8
            reasons.append(f"resources required: {', '.join(sorted(all_reqs.keys()))}")
        else:
            avail: dict[str, int] = {}
            for r in resources:
                if r.get("is_operational", True):
                    avail[r["resource_type"]] = avail.get(r["resource_type"], 0) + 1

            contention = False
            for rtype, needed in all_reqs.items():
                if avail.get(rtype, 0) < needed:
                    contention = True
                    rejected_reasons.append(
                        f"resource contention: need {needed} of {rtype}, have {avail.get(rtype, 0)}"
                    )
            if contention:
                resource_score = 0.25
            else:
                resource_score = 0.90
                reasons.append("sufficient resources available for group")

        # Composite score
        safety_mult = 1.0 if safety_compat else 0.0
        composite = (
            _W_SPATIAL * spatial_score
            + _W_TEMPORAL * temporal_score
            + _W_RESOURCE * resource_score
            + _W_DEPT * dept_score
            + _W_SAFETY * safety_mult
        )
        composite = round(min(1.0, max(0.0, composite)), 4)

        if not safety_compat:
            status = "REJECTED"
        elif spatial_score <= _SPATIAL_DISTANT_SCORE:
            status = "REJECTED"
            composite = round(min(composite, 0.30), 4)
            if not any("distant" in r for r in rejected_reasons):
                rejected_reasons.append(f"distant sections: {', '.join(sorted(sections))}")
        elif not dept_compat:
            status = "REJECTED"
            composite = round(min(composite, 0.35), 4)
        elif composite >= _COMPATIBLE_THRESHOLD:
            status = "COMPATIBLE"
        elif composite >= _PARTIAL_THRESHOLD:
            status = "PARTIAL"
        else:
            status = "REJECTED"
            if not rejected_reasons:
                rejected_reasons.append("Overall compatibility score below threshold")

        durations = [t.get("estimated_duration_minutes", 0) or 0 for t in tasks]
        estimated_duration = max(durations) + 15

        section_id = sections[0] if sections else "unknown"

        return {
            "candidate_id": cid,
            "task_ids": task_ids,
            "section_id": section_id,
            "compatibility_score": composite,
            "spatial_score": round(spatial_score, 4),
            "temporal_score": round(temporal_score, 4),
            "resource_score": round(resource_score, 4),
            "department_compatibility": dept_compat,
            "safety_compatibility": safety_compat,
            "reasons": reasons,
            "rejected_reasons": rejected_reasons,
            "estimated_total_duration_minutes": estimated_duration,
            "status": status,
        }

    # ── Core evaluation ───────────────────────────────────────────

    def _evaluate_pair(
        self,
        t1: dict,
        t2: dict,
        windows: list[dict],
        resources: list[dict],
    ) -> dict:
        self._candidate_counter += 1
        cid = f"comp_{self._candidate_counter:04d}"

        task_ids = [t1["task_id"], t2["task_id"]]
        reasons: list[str] = []
        rejected_reasons: list[str] = []

        # ── 1. Spatial score ──────────────────────────────────────
        spatial_score = self._spatial_score(t1, t2, reasons, rejected_reasons)

        # ── 2. Temporal score ─────────────────────────────────────
        temporal_score = self._temporal_score(t1, t2, reasons, rejected_reasons)

        # ── 3. Department compatibility ───────────────────────────
        dept_compat, dept_score = self._department_check(t1, t2, reasons, rejected_reasons)

        # ── 4. Resource compatibility ─────────────────────────────
        resource_score = self._resource_score(t1, t2, resources, reasons, rejected_reasons)

        # ── 5. Safety compatibility ───────────────────────────────
        safety_compat = self._safety_check(t1, t2, reasons, rejected_reasons)

        # ── Composite score ───────────────────────────────────────
        safety_mult = 1.0 if safety_compat else 0.0
        composite = (
            _W_SPATIAL * spatial_score
            + _W_TEMPORAL * temporal_score
            + _W_RESOURCE * resource_score
            + _W_DEPT * dept_score
            + _W_SAFETY * safety_mult
        )
        composite = round(min(1.0, max(0.0, composite)), 4)

        # ── Status classification ─────────────────────────────────
        if not safety_compat:
            status = "REJECTED"
            composite = round(composite, 4)  # keep for information
        elif spatial_score <= _SPATIAL_DISTANT_SCORE:
            status = "REJECTED"
            composite = round(min(composite, 0.30), 4)
            if not any("distant" in r for r in rejected_reasons):
                rejected_reasons.append("Tasks in distant sections cannot share a maintenance possession")
        elif not dept_compat:
            status = "REJECTED"
            composite = round(min(composite, 0.35), 4)
        elif composite >= _COMPATIBLE_THRESHOLD:
            status = "COMPATIBLE"
        elif composite >= _PARTIAL_THRESHOLD:
            status = "PARTIAL"
        else:
            status = "REJECTED"
            if not rejected_reasons:
                rejected_reasons.append("Overall compatibility score below threshold")

        # ── Duration estimate ─────────────────────────────────────
        d1 = t1.get("estimated_duration_minutes", 0) or 0
        d2 = t2.get("estimated_duration_minutes", 0) or 0
        # Combined duration: max (parallel work) + 15 min changeover
        estimated_duration = max(d1, d2) + 15

        section_id = t1.get("railway_section_id", t2.get("railway_section_id", "unknown"))

        return {
            "candidate_id": cid,
            "task_ids": task_ids,
            "section_id": section_id,
            "compatibility_score": composite,
            "spatial_score": round(spatial_score, 4),
            "temporal_score": round(temporal_score, 4),
            "resource_score": round(resource_score, 4),
            "department_compatibility": dept_compat,
            "safety_compatibility": safety_compat,
            "reasons": reasons,
            "rejected_reasons": rejected_reasons,
            "estimated_total_duration_minutes": estimated_duration,
            "status": status,
        }

    # ── Dimension scorers ─────────────────────────────────────────

    def _spatial_score(
        self, t1: dict, t2: dict,
        reasons: list[str], rejected: list[str],
    ) -> float:
        sec1 = t1.get("railway_section_id", "")
        sec2 = t2.get("railway_section_id", "")

        if sec1 == sec2:
            # Same section — check km overlap
            km_ov = _km_overlap(
                t1.get("from_km", 0), t1.get("to_km", 0),
                t2.get("from_km", 0), t2.get("to_km", 0),
            )
            score = 0.7 + 0.3 * km_ov  # 0.7–1.0
            reasons.append(f"same section {sec1} (km overlap {km_ov:.0%})")
            return score

        # Check adjacency
        idx1 = _SECTION_INDEX.get(sec1)
        idx2 = _SECTION_INDEX.get(sec2)
        if idx1 is not None and idx2 is not None:
            dist = abs(idx1 - idx2)
            if dist == 1:
                reasons.append(f"adjacent sections {sec1}↔{sec2}")
                return _SPATIAL_ADJACENT_SECTION_SCORE
            else:
                rejected.append(f"distant sections {sec1}↔{sec2} ({dist} apart)")
                return _SPATIAL_DISTANT_SCORE
        else:
            rejected.append(f"unknown section proximity {sec1}↔{sec2}")
            return _SPATIAL_DISTANT_SCORE

    def _temporal_score(
        self, t1: dict, t2: dict,
        reasons: list[str], rejected: list[str],
    ) -> float:
        s1 = _parse_dt(t1.get("requested_start"))
        e1 = _parse_dt(t1.get("requested_end"))
        s2 = _parse_dt(t2.get("requested_start"))
        e2 = _parse_dt(t2.get("requested_end"))

        overlap = _time_overlap_ratio(s1, e1, s2, e2)
        if overlap >= 0.3:
            reasons.append(f"overlapping time windows ({overlap:.0%} overlap)")
        elif overlap > 0:
            reasons.append(f"nearby time windows ({overlap:.0%} proximity)")
        else:
            rejected.append("non-overlapping time windows")
        return overlap

    def _department_check(
        self, t1: dict, t2: dict,
        reasons: list[str], rejected: list[str],
    ) -> tuple[bool, float]:
        d1 = t1.get("department", "OTHER")
        d2 = t2.get("department", "OTHER")

        if d1 == d2:
            reasons.append(f"same department ({d1})")
            return True, 1.0

        pair = {d1, d2}
        for group in _COMPATIBLE_DEPT_GROUPS:
            if pair <= group:
                reasons.append(f"compatible departments ({d1} + {d2})")
                return True, 0.8

        rejected.append(f"incompatible departments ({d1} + {d2})")
        return False, 0.0

    def _resource_score(
        self, t1: dict, t2: dict,
        resources: list[dict],
        reasons: list[str], rejected: list[str],
    ) -> float:
        r1_types = {rr["resource_type"] for rr in t1.get("required_resources", [])}
        r2_types = {rr["resource_type"] for rr in t2.get("required_resources", [])}

        if not r1_types and not r2_types:
            return 0.5  # no info

        shared = r1_types & r2_types
        all_types = r1_types | r2_types

        # Check if resources are available
        available_types = {r["resource_type"] for r in resources if r.get("is_operational", True)}

        missing = all_types - available_types if available_types else set()
        if missing and available_types:
            rejected.append(f"unavailable resources: {', '.join(sorted(missing))}")
            return 0.2

        if shared:
            reasons.append(f"shared resource types: {', '.join(sorted(shared))}")
            # Shared resources may mean contention — score depends on availability
            if resources:
                total_needed = sum(
                    rr.get("count", 1)
                    for t in [t1, t2]
                    for rr in t.get("required_resources", [])
                )
                available_count = sum(
                    1 for r in resources
                    if r["resource_type"] in all_types and r.get("is_operational", True)
                )
                if available_count >= total_needed:
                    return 0.9
                else:
                    rejected.append(
                        f"resource contention: need {total_needed}, have {available_count} for {', '.join(sorted(all_types))}"
                    )
                    return 0.3
            return 0.6

        # Distinct resources — no contention
        reasons.append(f"distinct resource types (no contention)")
        return 0.8

    def _safety_check(
        self, t1: dict, t2: dict,
        reasons: list[str], rejected: list[str],
    ) -> bool:
        """
        Deterministic safety compatibility check.

        Safety rules (from contract):
        - INTERLOCKING + HIGH_SAFETY → REJECTED (incompatible safety dependencies)
        - INTERLOCKING + INTERLOCKING → REJECTED (exclusive section control needed)
        - All other combinations → compatible
        """
        sc1 = t1.get("safety_class", "NORMAL")
        sc2 = t2.get("safety_class", "NORMAL")

        pair = frozenset({sc1, sc2})
        if pair in _UNSAFE_SAFETY_PAIRS:
            rejected.append(
                f"SAFETY_CONFLICT: Cannot combine {sc1} and {sc2} tasks in same block — "
                f"{sc1} requires exclusive section control"
            )
            return False

        if sc1 in ("INTERLOCKING", "HIGH_SAFETY") or sc2 in ("INTERLOCKING", "HIGH_SAFETY"):
            reasons.append(f"safety classes ({sc1} + {sc2}) are compatible with constraints")
        else:
            reasons.append(f"safety classes ({sc1} + {sc2}) are compatible")

        return True
