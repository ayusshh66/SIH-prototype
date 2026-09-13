"""
ai/agents — Deterministic Agent Orchestration Layer.

Coordinates criticality scoring, compatibility analysis, shadow block grouping,
CP-SAT schedule optimization, scenario reoptimization, and explainability.
Implements AGENT_TOOL_CONTRACT.md and AI_ARCHITECTURE.md §9.
"""

from ai.agents.orchestrator import AgentOrchestrator, orchestrate_planning
from ai.agents.tools import (
    calculate_criticality,
    explain_schedule,
    find_shadow_opportunities,
    get_maintenance_tasks,
    get_resources,
    get_train_movements,
    insert_emergency_task,
    optimize_schedule,
    run_what_if,
)

__all__ = [
    "AgentOrchestrator",
    "orchestrate_planning",
    "get_maintenance_tasks",
    "get_train_movements",
    "get_resources",
    "calculate_criticality",
    "find_shadow_opportunities",
    "optimize_schedule",
    "run_what_if",
    "insert_emergency_task",
    "explain_schedule",
]
