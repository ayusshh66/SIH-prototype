# ai/scenarios — What-if and Emergency reoptimization engines
# Implements OPTIMIZATION_CONTRACT.md §6-§7 and AGENT_TOOL_CONTRACT.md §7-§8

from ai.scenarios.what_if import WhatIfEngine, what_if_reoptimize
from ai.scenarios.emergency import EmergencyEngine, insert_emergency_event

__all__ = [
    "WhatIfEngine",
    "what_if_reoptimize",
    "EmergencyEngine",
    "insert_emergency_event",
]
