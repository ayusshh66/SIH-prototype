# Optimization Contract

This document defines the AI-side internal contracts for the criticality, compatibility, shadow block, optimization, what-if, emergency, and explainability engines.

## Core responsibility split

- ML determines or estimates risk, priority, and criticality inputs.
- Rule engine determines deterministic compatibility, safety feasibility, and rejection reasons.
- Optimization determines schedule selection and block assignment.
- LLM only orchestrates and explains based on deterministic engine outputs.

## Criticality scale

- Internal score scale: `0.0` to `1.0`
- UI display scale: `0` to `100`
- UI display score is `round(internal_score * 100)`
- For example: `0.94` internal score corresponds to `94` in UI display.

## 1. BaselinePlanner

### Function

`baseline_schedule(tasks, train_movements, resources, windows) -> BaselineScheduleResult`

### Purpose

Provide a simple greedy, non-optimized planning baseline that does not use shadow-block optimization. It is intended to be directly comparable with the optimized result for objective and disruption comparison.

### Input contract

```json
{
  "tasks": ["MaintenanceTask"],
  "train_movements": ["TrainMovement"],
  "resources": ["Resource"],
  "windows": ["MaintenanceWindow"],
  "constraints": {}
}
```

### Output contract

```json
{
  "selected_task_ids": ["string"],
  "unscheduled_task_ids": ["string"],
  "schedule_candidates": ["ScheduleCandidate"],
  "train_conflicts": ["Conflict"],
  "resource_utilization": {},
  "objective_score": 0.0,
  "generated_at": "datetime",
  "strategy": "GREEDY_BASELINE",
  "shadow_block_count": 0
}
```

### Rules

- baseline must not generate shadow blocks as part of its planning logic
- baseline may still apply deterministic conflict filtering and time-window checks
- output fields should remain comparable to optimized output for baseline-versus-optimized reporting

## 2. Criticality engine

### Function

`criticality_engine(defect_or_task, context) -> CriticalityScore`

### Purpose

Compute a task or defect criticality score based on structural risk, urgency, safety, operational loading, and timing pressure.

### Input contract

The engine takes a task/defect object and surrounding operational context.

Required fields:

- `severity` (`enum`): `MINOR`, `MODERATE`, `SEVERE`, `CRITICAL`
- `urgency` (`number`, 0-1)
- `safety_risk` (`number`, 0-1)
- `traffic_density` (`number`, 0-1 or vehicles-per-window)
- `speed_class` (`enum`): `LOW`, `MEDIUM`, `HIGH`, `EXPRESS`
- `deadline` (`datetime`, optional)
- `department` (`enum`): `ENGINEERING`, `TRD`, `SNT`, `P_WAY`, `SIGNALING`, `OTHER`
- `asset_information` (`object`, optional)
- `section_id` (`string`)
- `task_or_defect_type` (`enum`): `USFD`, `TRD`, `SNT`, `ENGINEERING`, `OTHER`

Optional fields:

- `risk_history`
- `last_inspection_at`
- `train_density`
- `location_factor`
- `weather_context`

### Output contract

```json
{
  "entity_id": "string",
  "score": 0.0,
  "priority_class": "P1|P2|P3|P4",
  "feature_contributions": {
    "severity": 0.0,
    "urgency": 0.0,
    "safety_risk": 0.0,
    "traffic_density": 0.0,
    "speed_class": 0.0,
    "deadline_proximity": 0.0
  },
  "explanation": "string",
  "model_version": "string",
  "confidence": 0.0,
  "scoring_mode": "RULE_BASED|MODEL_BASED"
}
```

### Rule-based MVP

The MVP uses deterministic and explainable rules such as:

```text
score = w1*severity + w2*urgency + w3*safety_risk + w4*traffic_density + w5*speed_class + w6*deadline_proximity + w7*department_factor
```

Priority mapping example:

- `score >= 0.85` => `P1`
- `0.70 <= score < 0.85` => `P2`
- `0.50 <= score < 0.70` => `P3`
- `< 0.50` => `P4`

### Future model-based mode

Supported future version:

- Input features identical in logical meaning
- Output retains same structure for AI contract compatibility
- Feature contributions may come from tree-based feature importances or rule-resolved proxies
- Deterministic explanation must still be traceable to the actual feature values and model version

## 3. Compatibility engine

### Function

`find_compatible_tasks(tasks, windows, resources, constraints) -> array<CompatibilityCandidate>`

### Purpose

Evaluate which tasks can be grouped or paired for joint maintenance planning.

### Evaluation dimensions

- same or nearby railway section
- spatial distance between tasks
- overlapping or nearby time windows
- department compatibility
- safety compatibility
- resource compatibility
- operational feasibility

### Output contract

```json
{
  "candidate_id": "string",
  "task_ids": ["string"],
  "section_id": "string",
  "compatibility_score": 0.0,
  "spatial_score": 0.0,
  "temporal_score": 0.0,
  "resource_score": 0.0,
  "department_compatibility": true,
  "safety_compatibility": true,
  "reasons": ["string"],
  "rejected_reasons": ["string"],
  "estimated_total_duration_minutes": 0,
  "status": "COMPATIBLE|PARTIAL|REJECTED"
}
```

### Rejection logic

Examples of reasons for rejection:

- distant sections with no operational overlap
- incompatible department restrictions
- safety incompatibility
- unavailable resource combination
- hard deadline conflict
- not enough feasible maintenance window

## 4. Shadow block engine

### Function

`generate_shadow_block_candidates(tasks, compatibility_results, windows, resources, safety_constraints) -> array<ShadowBlockCandidate>`

### Purpose

Generate grouped maintenance opportunities that can share a single possession or block while reducing train disruption and improving crew efficiency.

### Input contract

Required:

- `maintenance_tasks: array<MaintenanceTask>`
- `compatibility_results: array<CompatibilityCandidate>`
- `available_windows: array<MaintenanceWindow>`
- `resources: array<Resource>`
- `safety_constraints: object`

Optional:

- `train_movements`
- `department_policy`
- `historic_efficiency_data`

### Output contract

```json
{
  "shadow_block_id": "string",
  "primary_task_id": "string",
  "participating_task_ids": ["string"],
  "sections": ["string"],
  "departments": ["ENGINEERING|TRD|SNT|P_WAY|OTHER"],
  "proposed_window_start": "datetime",
  "proposed_window_end": "datetime",
  "estimated_duration_minutes": 0,
  "estimated_corridor_occupancy": 0.0,
  "potential_time_saving_minutes": 0,
  "resource_usage": {},
  "conflict_status": "FEASIBLE|CONFLICT|REJECTED",
  "shadow_benefit_score": 0.0,
  "reasons": ["string"]
}
```

### Evaluation signal

A shadow block is valuable when it improves overall schedule efficiency without violating safety or feasibility conditions.

### Unsafe candidate rule

If multiple tasks appear to be compatible but violate a deterministic safety or interlocking condition, the candidate must be rejected with `conflict_status = REJECTED` and a `SAFETY_CONFLICT` recorded. The explanation must cite the specific incompatible safety condition and the affected tasks or sections.

## 5. Optimization engine

### Function

`optimize_schedule(request: OptimizationRequest) -> OptimizationResult`

### Purpose

Construct a feasible and high-value maintenance schedule under constraints.

### Input contract

```json
{
  "request_id": "string",
  "mode": "BALANCED|SAFETY_FIRST|DISRUPTION_MINIMIZATION|EMERGENCY",
  "tasks": ["MaintenanceTask"],
  "criticality_scores": ["CriticalityScore"],
  "train_movements": ["TrainMovement"],
  "resources": ["Resource"],
  "maintenance_windows": ["MaintenanceWindow"],
  "shadow_block_candidates": ["ShadowBlockCandidate"],
  "constraints": {},
  "weights": {
    "maintenance_value": 0.0,
    "shadow_block_benefit": 0.0,
    "train_disruption_penalty": 0.0
  },
  "solver_settings": {}
}
```

### Output contract

```json
{
  "request_id": "string",
  "status": "OPTIMAL|FEASIBLE|PARTIAL|INFEASIBLE|FAILED",
  "selected_task_ids": ["string"],
  "unscheduled_task_ids": ["string"],
  "schedule_candidates": ["ScheduleCandidate"],
  "shadow_blocks": ["ShadowBlockCandidate"],
  "train_conflicts": ["Conflict"],
  "resource_utilization": {},
  "objective_score": 0.0,
  "baseline_comparison": {},
  "solver_statistics": {},
  "generated_at": "datetime"
}
```

### Objective

```text
maximize = maintenance_value + shadow_block_benefit - train_disruption
```

### Hard constraints

- task duration must fit available possession
- deadline feasibility
- safety and interlocking requirements
- resource availability
- train conflict avoidance or minimization
- maintenance window feasibility
- section occupancy feasibility

### Soft constraints

- secondary priority balancing
- resource balancing across departments
- minimizing corridor occupancy
- preferred night or off-peak windows

### Not implemented yet

The optimizer is still internal design only; no solver backend is implemented in this specification.

## 6. What-if engine

### Function

`what_if_reoptimize(scenario: WhatIfScenario, current_schedule: ScheduleCandidate) -> { original_schedule_id, new_schedule, changed_blocks, affected_tasks, affected_trains, metric_differences, explanation }`

### Supported scenario types

- `TRAIN_DELAY`
- `BLOCK_UNAVAILABLE`
- `RESOURCE_UNAVAILABLE`
- `EMERGENCY_TASK_INSERTED`
- `TASK_DURATION_CHANGED`
- `TASK_ADDED`

### Output contract

```json
{
  "original_schedule_id": "string",
  "new_schedule": "ScheduleCandidate",
  "changed_blocks": ["block_id"],
  "affected_tasks": ["string"],
  "affected_trains": ["string"],
  "metric_differences": {
    "objective_score": 0.0,
    "train_disruption_minutes": 0,
    "resource_utilization_delta": 0.0
  },
  "explanation": "string"
}
```

## 7. Emergency engine

### Function

`insert_emergency_event(event: EmergencyEvent, current_state) -> { emergency_task, urgency, affected_section, feasible_windows, reoptimization_request, resulting_schedule }`

### Example trigger

A new critical USFD defect is detected.

### Output contract

```json
{
  "emergency_task": "MaintenanceTask",
  "urgency": "HIGH|CRITICAL",
  "affected_section": "string",
  "feasible_windows": ["MaintenanceWindow"],
  "reoptimization_request": "OptimizationRequest",
  "resulting_schedule": "ScheduleCandidate"
}
```

## 8. Explainability engine

### Functions

- `explain_schedule(schedule, context) -> Explanation`
- `explain_block(block_id, context) -> Explanation`
- `explain_unscheduled_task(task_id, context) -> Explanation`

### Rules

- explanations must be derived from solver output, constraint checks, feature contributions, and deterministic rule outputs
- the LLM must not generate ungrounded operating assumptions
- all explanation content must point to specific evidence values

### Examples

- Why was this block selected?
- Why was this maintenance task not scheduled?
- Why was this time window rejected?
- Why were these three tasks grouped?

### Deterministic evidence sources

- criticality score
- compatibility score
- conflict records
- time-window feasibility
- resource assignment state
- objective function values

## 9. Evaluation metrics

The AI module must produce these metrics:

- `scheduled_task_count`: integer
- `critical_task_coverage`: percentage or ratio
- `number_of_blocks`: integer
- `shadow_block_count`: integer
- `corridor_occupancy`: number
- `baseline_occupancy`: number
- `train_disruption_minutes`: number
- `baseline_train_disruption`: number
- `reduction_percentage`: number
- `resource_utilization`: number
- `shadow_block_utilization`: number
- `optimization_objective_score`: number
- `solver_runtime_ms`: number

## 10. Safety requirement

The system must never invent safety constraints, railway operational rules, or schedule decisions. The LLM or orchestrator may explain outputs, but the underlying facts must come from deterministic engine outputs.
