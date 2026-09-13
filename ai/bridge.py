"""
AI Bridge CLI Runner.

Provides a clean, deterministic command-line interface for invoking the
Python AI engines from upstream services (e.g. Node.js backend) via JSON over stdin/stdout.

Commands:
    health          Check that all engines import and initialize cleanly
    plan            Run deterministic AgentOrchestrator on full planning request
    criticality     Score task criticality using CriticalityEngine
    shadow_blocks   Generate shadow-block candidates using ShadowBlockEngine
    what_if         Execute What-If reoptimization using WhatIfEngine
    emergency       Execute emergency event insertion using EmergencyEngine
"""

from __future__ import annotations

import json
import sys
import traceback
from typing import Any, Dict, List

from ai.agents.orchestrator import AgentOrchestrator, orchestrate_planning
from ai.criticality.engine import CriticalityEngine
from ai.compatibility.engine import CompatibilityEngine
from ai.shadow_blocks.engine import ShadowBlockEngine
from ai.optimization.engine import OptimizationEngine
from ai.scenarios.what_if import WhatIfEngine
from ai.scenarios.emergency import EmergencyEngine
from ai.explainability.engine import ExplainabilityEngine


def _read_input() -> Any:
    """Read and parse JSON from stdin."""
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    return json.loads(raw)


def cmd_health(_data: Any) -> Dict[str, Any]:
    """Verify all AI engines are functional."""
    crit = CriticalityEngine()
    comp = CompatibilityEngine()
    shadow = ShadowBlockEngine()
    opt = OptimizationEngine()
    whatif = WhatIfEngine(optimizer=opt, criticality_engine=crit)
    emerg = EmergencyEngine(optimizer=opt, criticality_engine=crit)
    explain = ExplainabilityEngine()

    return {
        "status": "HEALTHY",
        "engines": [
            crit.__class__.__name__,
            comp.__class__.__name__,
            shadow.__class__.__name__,
            opt.__class__.__name__,
            whatif.__class__.__name__,
            emerg.__class__.__name__,
            explain.__class__.__name__,
        ],
    }


def cmd_plan(data: Any) -> Dict[str, Any]:
    """Run full agent orchestration for a planning request."""
    if not isinstance(data, dict):
        raise ValueError("Plan request must be a JSON dictionary.")
    return orchestrate_planning(data)


def cmd_criticality(data: Any) -> Any:
    """Score criticality for a single task or a batch of tasks."""
    engine = CriticalityEngine()
    if isinstance(data, list):
        return [engine.score(item) for item in data]
    if isinstance(data, dict):
        if "tasks" in data and isinstance(data["tasks"], list):
            return [engine.score(t) for t in data["tasks"]]
        return engine.score(data)
    raise ValueError("Criticality request must be a task dictionary or list of task dictionaries.")


def cmd_shadow_blocks(data: Any) -> Dict[str, Any]:
    """Generate shadow-block candidates from tasks, windows, and resources."""
    if not isinstance(data, dict):
        raise ValueError("Shadow blocks request must be a JSON dictionary.")

    tasks = data.get("tasks", [])
    windows = data.get("maintenance_windows", data.get("windows", []))
    resources = data.get("resources", [])
    constraints = data.get("constraints", {})

    comp_engine = CompatibilityEngine()
    shadow_engine = ShadowBlockEngine()

    compat_candidates = comp_engine.find_compatible_tasks(
        tasks=tasks,
        windows=windows,
        resources=resources,
        constraints=constraints,
    )

    shadow_candidates = shadow_engine.generate_shadow_blocks(
        tasks=tasks,
        compatibility_results=compat_candidates,
        windows=windows,
        resources=resources,
        safety_constraints=constraints,
    )

    return {
        "compatibility_candidates": compat_candidates,
        "shadow_block_candidates": shadow_candidates,
    }


def cmd_what_if(data: Any) -> Dict[str, Any]:
    """Execute what-if reoptimization."""
    if not isinstance(data, dict):
        raise ValueError("What-if request must be a JSON dictionary.")

    scenario = data.get("scenario", data)
    current_schedule = data.get("current_schedule", {})
    context = data.get("context", {})

    engine = WhatIfEngine()
    return engine.reoptimize(
        scenario=scenario,
        current_schedule=current_schedule,
        context=context,
    )


def cmd_emergency(data: Any) -> Dict[str, Any]:
    """Execute emergency defect insertion and reoptimization."""
    if not isinstance(data, dict):
        raise ValueError("Emergency request must be a JSON dictionary.")

    event = data.get("emergency_event", data.get("event", data))
    current_state = data.get("current_state", {})

    engine = EmergencyEngine()
    return engine.insert_emergency_event(
        event=event,
        current_state=current_state,
    )


COMMANDS = {
    "health": cmd_health,
    "plan": cmd_plan,
    "criticality": cmd_criticality,
    "shadow_blocks": cmd_shadow_blocks,
    "what_if": cmd_what_if,
    "emergency": cmd_emergency,
}


def main() -> None:
    if len(sys.argv) < 2:
        print(
            json.dumps({
                "error": f"Missing command. Available commands: {list(COMMANDS.keys())}",
                "status": "FAILED",
            }),
            file=sys.stderr,
        )
        sys.exit(1)

    command = sys.argv[1].lower()
    handler = COMMANDS.get(command)
    if not handler:
        print(
            json.dumps({
                "error": f"Unknown command '{command}'. Available commands: {list(COMMANDS.keys())}",
                "status": "FAILED",
            }),
            file=sys.stderr,
        )
        sys.exit(1)

    try:
        data = _read_input()
        result = handler(data)
        print(json.dumps(result, indent=2))
    except Exception as exc:
        err_payload = {
            "status": "FAILED",
            "error": str(exc),
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(err_payload, indent=2), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
