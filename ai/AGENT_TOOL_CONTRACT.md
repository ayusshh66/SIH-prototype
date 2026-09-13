# Agent Tool Contract

This document defines the AI agent orchestration interface only. The optimization engine remains deterministic and internal.

## Agent responsibilities

The AI agent is an orchestration and explanation layer. It may call tools to gather data, calculate criticality, find shadow opportunities, optimize schedules, run what-if scenarios, and explain outcomes.

It does not directly decide safety constraints or rail operating rules.

## Tool specification

### 1. get_maintenance_tasks

Purpose: Retrieve the current maintenance task set and associated metadata.

JSON input:

```json
{
  "task_ids": ["string"],
  "department_filter": ["ENGINEERING|TRD|SNT|P_WAY|OTHER"],
  "status_filter": ["PLANNED|IN_PROGRESS|COMPLETED|CANCELLED|BLOCKED"],
  "section_filter": ["string"]
}
```

JSON output:

```json
{
  "tasks": ["MaintenanceTask"],
  "count": 0,
  "errors": ["string"]
}
```

Failure cases:

- task list unavailable
- invalid section filter
- backend returns malformed task payload
- permission denied for protected task set

### 2. get_train_movements

Purpose: Retrieve train movement calendars relevant to a rail section or time window.

JSON input:

```json
{
  "section_ids": ["string"],
  "time_start": "datetime",
  "time_end": "datetime",
  "traffic_priority_filter": ["PASSENGER|FREIGHT|SUPERFAST|EMERGENCY"]
}
```

JSON output:

```json
{
  "train_movements": ["TrainMovement"],
  "count": 0,
  "errors": ["string"]
}
```

Failure cases:

- no movements found
- invalid date range
- section not recognized

### 3. get_resources

Purpose: Fetch resources and their availability windows, capabilities, and operational state.

JSON input:

```json
{
  "resource_ids": ["string"],
  "resource_types": ["TRACK_MACHINE|USFD_VEHICLE|TOWER_WAGON|SNT_CREW|ENGINEERING_CREW|SIGNAL_CREW|TRACTION_SUPPORT|OTHER"],
  "department_filter": ["ENGINEERING|TRD|SNT|P_WAY|OTHER"],
  "window_start": "datetime",
  "window_end": "datetime"
}
```

JSON output:

```json
{
  "resources": ["Resource"],
  "count": 0,
  "errors": ["string"]
}
```

Failure cases:

- resource calendar missing
- operational status indicates unavailable
- invalid resource query

### 4. calculate_criticality

Purpose: Compute a criticality score for a defect or maintenance task.

JSON input:

```json
{
  "entity_id": "string",
  "entity_type": "USFD|TRD|SNT|ENGINEERING|OTHER",
  "severity": "MINOR|MODERATE|SEVERE|CRITICAL",
  "urgency": 0.0,
  "safety_risk": 0.0,
  "traffic_density": 0.0,
  "speed_class": "LOW|MEDIUM|HIGH|EXPRESS",
  "deadline": "datetime",
  "department": "ENGINEERING|TRD|SNT|P_WAY|OTHER",
  "asset_information": {}
}
```

JSON output:

```json
{
  "criticality_score": "CriticalityScore",
  "errors": ["string"]
}
```

Failure cases:

- missing required feature
- unsupported entity type
- invalid severity or department

### 5. find_shadow_opportunities

Purpose: Discover maintenance groupings that can be combined into a shadow block.

JSON input:

```json
{
  "task_ids": ["string"],
  "section_ids": ["string"],
  "time_window": { "start": "datetime", "end": "datetime" },
  "resources": ["Resource"],
  "constraints": {}
}
```

JSON output:

```json
{
  "shadow_block_candidates": ["ShadowBlockCandidate"],
  "count": 0,
  "errors": ["string"]
}
```

Failure cases:

- incompatible task grouping
- no feasible shared window
- resource constraints unresolved
- safety constraint conflict

### 6. optimize_schedule

Purpose: Run the deterministic schedule optimizer with weights and constraints.

JSON input:

```json
{
  "request": "OptimizationRequest"
}
```

JSON output:

```json
{
  "result": "OptimizationResult",
  "errors": ["string"]
}
```

Failure cases:

- infeasible task set
- resource capacity not available
- window mismatch
- solver timeout or no feasible schedule

### 7. run_what_if

Purpose: Test a schedule change scenario and produce a revised plan.

JSON input:

```json
{
  "scenario": "WhatIfScenario",
  "current_schedule_id": "string"
}
```

JSON output:

```json
{
  "original_schedule_id": "string",
  "new_schedule": "ScheduleCandidate",
  "changed_blocks": ["string"],
  "affected_tasks": ["string"],
  "affected_trains": ["string"],
  "metric_differences": {},
  "explanation": "string",
  "errors": ["string"]
}
```

Failure cases:

- missing base schedule
- invalid scenario type
- no feasible reoptimization result

### 8. insert_emergency_task

Purpose: Insert a high-priority emergency defect and generate a new schedule recommendation.

JSON input:

```json
{
  "event": "EmergencyEvent",
  "existing_tasks": ["MaintenanceTask"],
  "train_movements": ["TrainMovement"],
  "resources": ["Resource"],
  "windows": ["MaintenanceWindow"]
}
```

JSON output:

```json
{
  "emergency_task": "MaintenanceTask",
  "urgency": "HIGH|CRITICAL",
  "affected_section": "string",
  "feasible_windows": ["MaintenanceWindow"],
  "reoptimization_request": "OptimizationRequest",
  "resulting_schedule": "ScheduleCandidate",
  "errors": ["string"]
}
```

Failure cases:

- no feasible emergency window
- impossible section occupancy
- emergency task duplicates a planned task

### 9. explain_schedule

Purpose: Return a deterministic explanation for why a schedule or schedule element was selected or rejected.

JSON input:

```json
{
  "entity_type": "SCHEDULE|BLOCK|TASK|WINDOW|GROUPING|REJECTION",
  "entity_id": "string",
  "context": {}
}
```

JSON output:

```json
{
  "explanation": "Explanation",
  "errors": ["string"]
}
```

Failure cases:

- entity id missing
- no deterministic evidence available
- invalid entity type

## Agent orchestration pattern

Recommended sequence:

1. fetch tasks, movements, and resources
2. calculate criticality scores
3. find compatible tasks
4. create shadow block candidates
5. optimize schedule
6. run what-if if scenario present
7. explain results deterministically

This keeps optimization engine logic separate from orchestration while preserving explainability and traceability.
