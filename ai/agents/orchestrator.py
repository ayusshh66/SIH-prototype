"""
Deterministic Agent Orchestration Service.

Implements AGENT_TOOL_CONTRACT.md orchestration pattern and AI_ARCHITECTURE.md §9.

Coordinates AI engines in strict sequence without duplicating domain logic or
overriding engine decisions:
  1. Input validation and gathering
  2. Criticality scoring (CriticalityEngine)
  3. Compatibility evaluation (CompatibilityEngine)
  4. Shadow-block candidate generation (ShadowBlockEngine)
  5. Schedule optimization (OptimizationEngine)
  6. What-if or Emergency reoptimization when requested (WhatIfEngine / EmergencyEngine)
  7. Deterministic explanations generation (ExplainabilityEngine)

Returns a canonical orchestration result containing all artifacts, execution traces,
and explanations.
"""

from __future__ import annotations

import copy
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ai.criticality.engine import CriticalityEngine
from ai.compatibility.engine import CompatibilityEngine
from ai.shadow_blocks.engine import ShadowBlockEngine
from ai.optimization.engine import OptimizationEngine
from ai.scenarios.what_if import WhatIfEngine
from ai.scenarios.emergency import EmergencyEngine
from ai.explainability.engine import ExplainabilityEngine


def _iso(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _generate_orchestration_id(request: Dict[str, Any]) -> str:
    """Generates a deterministic orchestration ID from request content."""
    req_id = request.get("request_id")
    if req_id:
        h = hashlib.sha256(str(req_id).encode("utf-8")).hexdigest()[:8]
        return f"orch_{req_id}_{h}"
    
    summary = {
        "tasks": [t.get("task_id") for t in request.get("tasks", []) if isinstance(t, dict)],
        "windows": [w.get("window_id") for w in request.get("maintenance_windows", request.get("windows", [])) if isinstance(w, dict)],
        "mode": request.get("mode", "BALANCED"),
    }
    h = hashlib.sha256(json.dumps(summary, sort_keys=True).encode("utf-8")).hexdigest()[:12]
    return f"orch_{h}"


class AgentOrchestrator:
    """
    Deterministic agent orchestrator.
    Manages end-to-end planning flows, invoking domain engines in strict order.
    Never invents scheduling or safety decisions; engine outputs remain authoritative.
    """

    def __init__(
        self,
        criticality_engine: Optional[CriticalityEngine] = None,
        compatibility_engine: Optional[CompatibilityEngine] = None,
        shadow_block_engine: Optional[ShadowBlockEngine] = None,
        optimization_engine: Optional[OptimizationEngine] = None,
        what_if_engine: Optional[WhatIfEngine] = None,
        emergency_engine: Optional[EmergencyEngine] = None,
        explainability_engine: Optional[ExplainabilityEngine] = None,
    ) -> None:
        self.criticality_engine = criticality_engine or CriticalityEngine()
        self.compatibility_engine = compatibility_engine or CompatibilityEngine()
        self.shadow_block_engine = shadow_block_engine or ShadowBlockEngine()
        self.optimization_engine = optimization_engine or OptimizationEngine()
        self.what_if_engine = what_if_engine or WhatIfEngine(
            optimizer=self.optimization_engine,
            criticality_engine=self.criticality_engine,
        )
        self.emergency_engine = emergency_engine or EmergencyEngine(
            optimizer=self.optimization_engine,
            criticality_engine=self.criticality_engine,
        )
        self.explainability_engine = explainability_engine or ExplainabilityEngine()

    def orchestrate(self, request: Any) -> Dict[str, Any]:
        """
        Executes the canonical planning sequence for a planning request.
        """
        sequence: List[str] = []
        errors: List[str] = []

        # ── Step 1: Input Validation & Gathering ──────────────────────
        sequence.append("VALIDATE")
        if not isinstance(request, dict):
            return {
                "orchestration_id": "orch_invalid_request",
                "request_id": "unknown",
                "status": "FAILED",
                "execution_sequence": sequence,
                "criticality_scores": [],
                "compatibility_candidates": [],
                "shadow_block_candidates": [],
                "optimization_result": None,
                "scenario_result": None,
                "emergency_result": None,
                "explanations": [],
                "errors": ["Request must be a dictionary."],
                "generated_at": _iso(datetime.now(timezone.utc)),
            }

        orch_id = _generate_orchestration_id(request)
        req_id = request.get("request_id", "unknown")

        tasks = request.get("tasks")
        if tasks is None or not isinstance(tasks, list):
            errors.append("Missing or invalid required input: 'tasks' must be a list.")

        windows = request.get("maintenance_windows", request.get("windows"))
        if windows is None or not isinstance(windows, list):
            errors.append("Missing or invalid required input: 'maintenance_windows' must be a list.")

        resources = request.get("resources")
        if resources is None or not isinstance(resources, list):
            errors.append("Missing or invalid required input: 'resources' must be a list.")

        train_movements = request.get("train_movements")
        if train_movements is None or not isinstance(train_movements, list):
            errors.append("Missing or invalid required input: 'train_movements' must be a list.")

        if errors:
            return {
                "orchestration_id": orch_id,
                "request_id": req_id,
                "status": "FAILED",
                "execution_sequence": sequence,
                "criticality_scores": [],
                "compatibility_candidates": [],
                "shadow_block_candidates": [],
                "optimization_result": None,
                "scenario_result": None,
                "emergency_result": None,
                "explanations": [],
                "errors": errors,
                "generated_at": _iso(datetime.now(timezone.utc)),
            }

        constraints = request.get("constraints", {})
        weights = request.get("weights", {})
        mode = request.get("mode", "BALANCED")
        solver_settings = request.get("solver_settings", {})

        criticality_scores: List[Dict[str, Any]] = []
        compatibility_candidates: List[Dict[str, Any]] = []
        shadow_block_candidates: List[Dict[str, Any]] = []
        optimization_result: Optional[Dict[str, Any]] = None
        scenario_result: Optional[Dict[str, Any]] = None
        emergency_result: Optional[Dict[str, Any]] = None
        explanations: List[Dict[str, Any]] = []

        try:
            # ── Step 2: Criticality Scoring ───────────────────────────
            sequence.append("CRITICALITY")
            existing_scores = request.get("criticality_scores", [])
            scored_ids = set()
            for cs in existing_scores:
                if isinstance(cs, dict) and "entity_id" in cs:
                    criticality_scores.append(cs)
                    scored_ids.add(cs["entity_id"])

            for task in tasks:
                tid = task.get("task_id", "")
                if tid in scored_ids:
                    continue
                # Map task characteristics deterministically into feature format
                p_hint = str(task.get("priority_hint", "MODERATE")).upper()
                sev = task.get("severity", p_hint if p_hint in ("MINOR", "MODERATE", "SEVERE", "CRITICAL") else "MODERATE")
                urg = float(task.get("urgency", 0.95 if p_hint == "CRITICAL" else 0.75 if p_hint == "HIGH" else 0.50))
                s_class = str(task.get("safety_class", "NORMAL")).upper()
                s_risk = float(task.get("safety_risk", 0.95 if s_class in ("HIGH_SAFETY", "INTERLOCKING") else 0.60 if s_class == "RESTRICTED" else 0.35))
                trf = float(task.get("traffic_density", 0.50))
                spd = task.get("speed_class", "HIGH")
                ddl = task.get("deadline")

                remark = (
                    task.get("inspection_remark")
                    or task.get("maintenance_remark")
                    or task.get("remark")
                    or task.get("inspection_notes")
                    or task.get("notes")
                )
                score_input = {
                    "entity_id": tid,
                    "severity": sev,
                    "urgency": urg,
                    "safety_risk": s_risk,
                    "traffic_density": trf,
                    "speed_class": spd,
                    "deadline": ddl,
                }
                if remark is not None:
                    score_input["inspection_remark"] = remark
                cs_record = self.criticality_engine.score(score_input, scoring_mode="MODEL_BASED")
                criticality_scores.append(cs_record)
                scored_ids.add(tid)

            # ── Step 3: Compatibility Evaluation ──────────────────────
            sequence.append("COMPATIBILITY")
            compatibility_candidates = self.compatibility_engine.find_compatible_tasks(
                tasks=tasks,
                windows=windows,
                resources=resources,
                constraints=constraints,
            )

            # ── Step 4: Shadow-Block Generation ───────────────────────
            sequence.append("SHADOW_BLOCKS")
            shadow_block_candidates = self.shadow_block_engine.generate_shadow_blocks(
                tasks=tasks,
                compatibility_results=compatibility_candidates,
                windows=windows,
                resources=resources,
                safety_constraints=constraints,
            )

            # ── Step 5: Schedule Optimization ─────────────────────────
            sequence.append("OPTIMIZE")
            opt_request = {
                "request_id": f"opt_{orch_id}",
                "mode": mode,
                "tasks": tasks,
                "criticality_scores": criticality_scores,
                "train_movements": train_movements,
                "resources": resources,
                "maintenance_windows": windows,
                "shadow_block_candidates": shadow_block_candidates,
                "constraints": constraints,
                "weights": weights,
                "solver_settings": solver_settings,
            }
            optimization_result = self.optimization_engine.optimize(opt_request)

            # ── Step 6: What-If Scenario (if requested) ───────────────
            if request.get("scenario"):
                sequence.append("SCENARIO")
                scen = dict(request["scenario"])
                if "base_schedule_id" not in scen:
                    if request.get("current_schedule_id"):
                        scen["base_schedule_id"] = request["current_schedule_id"]
                    elif optimization_result.get("schedule_candidates"):
                        scen["base_schedule_id"] = optimization_result["schedule_candidates"][0].get("schedule_id", "sched_base")

                scenario_result = self.what_if_engine.reoptimize(
                    scenario=scen,
                    current_schedule=optimization_result,
                    context=opt_request,
                )
                if scenario_result.get("errors"):
                    errors.extend(scenario_result["errors"])

            # ── Step 7: Emergency Event (if requested) ────────────────
            if request.get("emergency_event"):
                sequence.append("EMERGENCY")
                emergency_state = dict(opt_request)
                emergency_state["existing_tasks"] = tasks
                emergency_state["windows"] = windows
                emergency_result = self.emergency_engine.insert_emergency_event(
                    event=request["emergency_event"],
                    current_state=emergency_state,
                )
                if emergency_result.get("errors"):
                    errors.extend(emergency_result["errors"])

            # ── Step 8: Deterministic Explanations ────────────────────
            sequence.append("EXPLAIN")
            # 1. Schedule explanation
            sched_exp = self.explainability_engine.explain_schedule(
                optimization_result=optimization_result,
                request=opt_request,
            )
            explanations.append(sched_exp)

            # 2. Selected Block explanations
            for cand in optimization_result.get("schedule_candidates", []):
                for blk in cand.get("blocks", []):
                    blk_id = blk.get("block_id")
                    if blk_id:
                        blk_exp = self.explainability_engine.explain_block(
                            block_id=blk_id,
                            schedule_candidate=cand,
                            optimization_result=optimization_result,
                            request=opt_request,
                        )
                        explanations.append(blk_exp)

            # 3. Unscheduled Task explanations
            for unsched_tid in optimization_result.get("unscheduled_task_ids", []):
                unsched_exp = self.explainability_engine.explain_unscheduled_task(
                    task_id=unsched_tid,
                    optimization_result=optimization_result,
                    request=opt_request,
                )
                explanations.append(unsched_exp)

            # 4. Shadow block grouping explanations
            for sb in shadow_block_candidates:
                grp_exp = self.explainability_engine.explain_grouping(sb)
                explanations.append(grp_exp)

        except Exception as exc:
            errors.append(f"Engine failure during execution ({sequence[-1]}): {exc}")
            return {
                "orchestration_id": orch_id,
                "request_id": req_id,
                "status": "FAILED",
                "execution_sequence": sequence,
                "criticality_scores": criticality_scores,
                "compatibility_candidates": compatibility_candidates,
                "shadow_block_candidates": shadow_block_candidates,
                "optimization_result": optimization_result,
                "scenario_result": scenario_result,
                "emergency_result": emergency_result,
                "explanations": explanations,
                "errors": errors,
                "generated_at": _iso(datetime.now(timezone.utc)),
            }

        # Determine overall status
        opt_status = optimization_result.get("status", "FAILED")
        if errors:
            status = "PARTIAL" if opt_status in ("OPTIMAL", "FEASIBLE", "PARTIAL") else "FAILED"
        elif opt_status in ("OPTIMAL", "FEASIBLE"):
            status = "SUCCESS"
        elif opt_status == "PARTIAL":
            status = "PARTIAL"
        else:
            status = "FAILED"

        return {
            "orchestration_id": orch_id,
            "request_id": req_id,
            "status": status,
            "execution_sequence": sequence,
            "criticality_scores": criticality_scores,
            "compatibility_candidates": compatibility_candidates,
            "shadow_block_candidates": shadow_block_candidates,
            "optimization_result": optimization_result,
            "scenario_result": scenario_result,
            "emergency_result": emergency_result,
            "explanations": explanations,
            "errors": errors,
            "generated_at": _iso(datetime.now(timezone.utc)),
        }


def orchestrate_planning(request: Dict[str, Any]) -> Dict[str, Any]:
    """
    Convenience function to run the deterministic AgentOrchestrator.
    """
    orchestrator = AgentOrchestrator()
    return orchestrator.orchestrate(request)
