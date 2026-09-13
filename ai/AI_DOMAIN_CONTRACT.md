# AI Domain Contract

This document defines the internal AI-side representations used by the optimization, criticality, compatibility, and explanation engines.

All schemas below are conceptual internal contracts, not database tables or ORM models.

## Conventions

- `string` means ISO-like text or identifier
- `number` means numeric scalar
- `boolean` means logical flag
- `array<T>` means list of T
- `enum` means constrained fixed values
- `required` means must be provided by upstream system or synthetic data
- `optional` means may be absent in MVP or when data is unknown
- `nullable` means present but may be null
- Internal criticality score scale is `0.0` to `1.0`.
- UI display criticality is `0` to `100` and is computed as `internal_score * 100`.

## Domain vs prototype vs synthetic-data distinction

### Official domain concepts

These are the conceptual domain meanings used in the AI module:

- USFD relates to Engineering / P-Way defects and rail inspection.
- TRD represents traction distribution / OHE-related defects and maintenance.
- S&T covers signaling, track circuits, axle counters, point machines, interlocking, and telecom.
- Maintenance windows, train movements, and assets are treated as operational planning concepts.

### Prototype assumptions

These are operational assumptions for the synthetic prototype only and are not official railway rules:

- a simplified maintenance planning domain is used for schedule optimization experiments
- synthetic windows are modeled as block/possession/night windows for prototype evaluation
- resource calendars are simplified to approximate availability, not actual field records

### Synthetic-data fields

The prototype may include fields that describe provenance and synthetic realism but are not authoritative railway rules:

- source
- timestamp
- is_synthetic
- data_quality
- confidence

These are metadata fields used for AI input validation and explanation, not domain standards.

## DataProvenance

Purpose: record origin and quality metadata for AI inputs.

Fields:

- `source: string` (required) — upstream source or synthetic generator name
- `timestamp: datetime` (required) — when the record was generated or ingested
- `is_synthetic: boolean` (required) — true for synthetic prototype data
- `data_quality: enum` (required) — `HIGH`, `MEDIUM`, `LOW`
- `confidence: number` (optional, 0-1) — optional confidence for model-estimated or source-derived values

Example:

```json
{
  "source": "synthetic_scenario_generator_v1",
  "timestamp": "2026-11-03T00:00:00Z",
  "is_synthetic": true,
  "data_quality": "HIGH",
  "confidence": 0.92
}
```

## 1. MaintenanceTask

Purpose: a planned maintenance work item to be considered for scheduling.

Fields:

- `task_id: string` (required) — unique task identifier
- `task_type: enum` (required) — `USFD`, `TRD`, `SNT`, `ENGINEERING`, `OTHER`
- `railway_section_id: string` (required) — section or corridor identifier
- `from_km: number` (required)
- `to_km: number` (required)
- `department: enum` (required) — `ENGINEERING`, `P_WAY`, `TRD`, `SNT`, `SIGNALING`, `TRACTION`, `OTHER`
- `status: enum` (required) — `PLANNED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `BLOCKED`
- `requested_start: datetime` (required)
- `requested_end: datetime` (required)
- `estimated_duration_minutes: number` (required)
- `required_resources: array<ResourceRequirement>` (required)
- `priority_hint: enum` (optional) — `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `safety_class: enum` (required) — `NORMAL`, `RESTRICTED`, `INTERLOCKING`, `HIGH_SAFETY`
- `deadline: datetime` (optional)
- `description: string` (optional)
- `asset_id: string` (optional)
- `location_accuracy_m: number` (optional)
- `tags: array<string>` (optional)
- `provenance: DataProvenance` (optional)

Example:

```json
{
  "task_id": "task_001",
  "task_type": "USFD",
  "railway_section_id": "sec_12",
  "from_km": 134.2,
  "to_km": 136.1,
  "department": "ENGINEERING",
  "status": "PLANNED",
  "requested_start": "2026-11-03T08:00:00Z",
  "requested_end": "2026-11-03T10:30:00Z",
  "estimated_duration_minutes": 150,
  "required_resources": [{ "resource_type": "USFD_VEHICLE", "count": 1 }],
  "priority_hint": "CRITICAL",
  "safety_class": "HIGH_SAFETY",
  "deadline": "2026-11-04T18:00:00Z",
  "description": "Rail defect scan near switch expansion joint",
  "asset_id": "asset_rail_042",
  "location_accuracy_m": 25,
  "tags": ["usfd", "rail", "joint"],
  "provenance": {
    "source": "synthetic_scenario_generator_v1",
    "timestamp": "2026-11-03T00:00:00Z",
    "is_synthetic": true,
    "data_quality": "HIGH",
    "confidence": 0.95
  }
}
```

## 2. USFDDefect

Purpose: ultrasonic flaw detection defect magnitude and context, for Engineering / P-Way maintenance.

Fields:

- `defect_id: string` (required)
- `task_id: string` (required)
- `railway_section_id: string` (required)
- `km: number` (required)
- `severity: enum` (required) — `MINOR`, `MODERATE`, `SEVERE`, `CRITICAL`
- `defect_type: enum` (required) — `HEAD_SPLIT`, `WEB_CRACK`, `FISHPLATE`, `WELD_DEFECT`, `OTHER`
- `length_mm: number` (optional)
- `depth_mm: number` (optional)
- `safety_risk: number` (required, 0-1 scale)
- `urgency: number` (required, 0-1 scale)
- `confidence: number` (optional, 0-1 scale)
- `detected_at: datetime` (required)
- `last_inspection_at: datetime` (optional)
- `related_asset_id: string` (optional)
- `recommended_action: string` (optional)

Example:

```json
{
  "defect_id": "usfd_101",
  "task_id": "task_001",
  "railway_section_id": "sec_12",
  "km": 135.4,
  "severity": "CRITICAL",
  "defect_type": "HEAD_SPLIT",
  "length_mm": 120,
  "depth_mm": 18,
  "safety_risk": 0.97,
  "urgency": 0.93,
  "confidence": 0.91,
  "detected_at": "2026-11-02T14:10:00Z",
  "related_asset_id": "asset_rail_042",
  "recommended_action": "Immediate track possession and rail replacement"
}
```

## 3. TRDTask

Purpose: traction distribution / OHE-related maintenance task, such as OHE inspection, wear/anomaly, contact wire issue, thermovision anomaly, or component maintenance/replacement.

Fields:

- `trd_task_id: string` (required)
- `maintenance_task_id: string` (required)
- `railway_section_id: string` (required)
- `inspection_zone: string` (required)
- `issue_type: enum` (required) — `OHE_INSPECTION`, `CONTACT_WIRE_ISSUE`, `OHE_WEAR`, `THERMOVISION_ANOMALY`, `OHE_COMPONENT_REPLACEMENT`, `OTHER`
- `traction_block_required: boolean` (required)
- `tower_wagon_required: boolean` (required)
- `window_start: datetime` (required)
- `window_end: datetime` (required)
- `department: enum` (required) — `TRD`
- `priority: number` (required, 0-1 scale)
- `required_vehicle: string` (optional)

Example:

```json
{
  "trd_task_id": "trd_502",
  "maintenance_task_id": "task_010",
  "railway_section_id": "sec_18",
  "inspection_zone": "ohe_span_07",
  "issue_type": "CONTACT_WIRE_ISSUE",
  "traction_block_required": true,
  "tower_wagon_required": true,
  "window_start": "2026-11-05T06:00:00Z",
  "window_end": "2026-11-05T09:00:00Z",
  "department": "TRD",
  "priority": 0.76,
  "required_vehicle": "TOWER_WAGON"
}
```

## 4. SNTTask

Purpose: signaling and telecommunication maintenance planning task.

Fields:

- `snt_task_id: string` (required)
- `maintenance_task_id: string` (required)
- `railway_section_id: string` (required)
- `asset_group: enum` (required) — `SIGNAL`, `TRACK_CIRCUIT`, `AXLE_COUNTER`, `POINT_MACHINE`, `INTERLOCKING`, `TELECOM`, `OTHER`
- `window_start: datetime` (required)
- `window_end: datetime` (required)
- `department: enum` (required) — `SNT`
- `safety_dependency: enum` (required) — `NONE`, `INTERLOCKING_REQUIRED`, `SIGNAL_BLOCK_REQUIRED`, `HIGH_SAFETY`
- `priority: number` (required, 0-1 scale)

Example:

```json
{
  "snt_task_id": "snt_215",
  "maintenance_task_id": "task_021",
  "railway_section_id": "sec_07",
  "asset_group": "INTERLOCKING",
  "window_start": "2026-11-04T11:00:00Z",
  "window_end": "2026-11-04T13:00:00Z",
  "department": "SNT",
  "safety_dependency": "INTERLOCKING_REQUIRED",
  "priority": 0.8
}
```

## 5. TrainMovement

Purpose: scheduled train pass-through data used for disruption estimation.

Fields:

- `movement_id: string` (required)
- `train_id: string` (required)
- `section_id: string` (required)
- `from_km: number` (required)
- `to_km: number` (required)
- `movement_start: datetime` (required)
- `movement_end: datetime` (required)
- `direction: enum` (required) — `UP`, `DOWN`, `BOTH`
- `speed_class: enum` (required) — `LOW`, `MEDIUM`, `HIGH`, `EXPRESS`
- `traffic_density: number` (required, 0-1 scale or vehicles per window)
- `priority_class: enum` (optional) — `FREIGHT`, `PASSENGER`, `SUPERFAST`, `EMERGENCY`
- `is_critical: boolean` (optional)

Example:

```json
{
  "movement_id": "mv_900",
  "train_id": "train_121",
  "section_id": "sec_12",
  "from_km": 120,
  "to_km": 145,
  "movement_start": "2026-11-03T08:40:00Z",
  "movement_end": "2026-11-03T09:10:00Z",
  "direction": "UP",
  "speed_class": "HIGH",
  "traffic_density": 0.83,
  "priority_class": "PASSENGER",
  "is_critical": false
}
```

## 6. Resource

Purpose: maintenance resource calendar and capability record.

Fields:

- `resource_id: string` (required)
- `resource_type: enum` (required) — `TRACK_MACHINE`, `USFD_VEHICLE`, `TOWER_WAGON`, `SNT_CREW`, `ENGINEERING_CREW`, `SIGNAL_CREW`, `TRACTION_SUPPORT`, `OTHER`
- `department: enum` (required) — `ENGINEERING`, `P_WAY`, `TRD`, `SNT`, `SIGNALING`, `TRACTION`, `OTHER`
- `location: string` (required)
- `available_windows: array<MaintenanceWindow>` (required)
- `capacity: number` (required)
- `skills: array<string>` (optional)
- `is_operational: boolean` (required)
- `maintenance_status: enum` (optional) — `AVAILABLE`, `BUSY`, `UNDER_MAINTENANCE`, `UNAVAILABLE`

Example:

```json
{
  "resource_id": "res_veh_12",
  "resource_type": "USFD_VEHICLE",
  "department": "ENGINEERING",
  "location": "sec_12",
  "available_windows": [{ "window_id": "win_77", "start": "2026-11-03T06:00:00Z", "end": "2026-11-03T18:00:00Z", "section_id": "sec_12" }],
  "capacity": 1,
  "skills": ["usfd", "inspection"],
  "is_operational": true,
  "maintenance_status": "AVAILABLE"
}
```

## 7. MaintenanceWindow

Purpose: candidate scheduling availability interval.

Fields:

- `window_id: string` (required)
- `section_id: string` (required)
- `start: datetime` (required)
- `end: datetime` (required)
- `window_type: enum` (required) — `BLOCK`, `MIDDAY`, `NIGHT`, `POSSESSION`, `EMERGENCY`
- `availability: enum` (required) — `AVAILABLE`, `PARTIAL`, `UNAVAILABLE`
- `department_compatibility: array<enum>` (optional)
- `max_concurrent_tasks: number` (optional)
- `notes: string` (optional)

Example:

```json
{
  "window_id": "win_77",
  "section_id": "sec_12",
  "start": "2026-11-03T23:00:00Z",
  "end": "2026-11-03T23:59:00Z",
  "window_type": "NIGHT",
  "availability": "AVAILABLE",
  "department_compatibility": ["TRD", "ENGINEERING"],
  "max_concurrent_tasks": 2,
  "notes": "Approved night block with reduced traffic"
}
```

## 8. CompatibilityCandidate

Purpose: pair or group compatibility result from the compatibility engine.

Fields:

- `candidate_id: string` (required)
- `task_ids: array<string>` (required)
- `section_id: string` (required)
- `compatibility_score: number` (required, 0-1 scale)
- `spatial_score: number` (optional, 0-1)
- `temporal_score: number` (optional, 0-1)
- `resource_score: number` (optional, 0-1)
- `department_compatibility: boolean` (required)
- `safety_compatibility: boolean` (required)
- `reasons: array<string>` (required)
- `rejected_reasons: array<string>` (optional)
- `estimated_total_duration_minutes: number` (optional)
- `status: enum` (required) — `COMPATIBLE`, `PARTIAL`, `REJECTED`

Example:

```json
{
  "candidate_id": "comp_045",
  "task_ids": ["task_010", "task_021"],
  "section_id": "sec_12",
  "compatibility_score": 0.84,
  "spatial_score": 0.9,
  "temporal_score": 0.82,
  "resource_score": 0.78,
  "department_compatibility": true,
  "safety_compatibility": true,
  "reasons": ["same section", "overlapping maintenance window", "shared crew type"],
  "rejected_reasons": [],
  "estimated_total_duration_minutes": 180,
  "status": "COMPATIBLE"
}
```

## 9. CriticalityScore

Purpose: output of criticality scoring for a task or defect.

Fields:

- `entity_id: string` (required) — task or defect id
- `score: number` (required, 0-1 scale)
- `priority_class: enum` (required) — `P1`, `P2`, `P3`, `P4`
- `risk_level: enum` (required) — `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `feature_contributions: object` (required)
- `explanation: string` (required)
- `model_version: string` (required)
- `confidence: number` (optional, 0-1)
- `scoring_mode: enum` (required) — `RULE_BASED`, `MODEL_BASED`

Example:

```json
{
  "entity_id": "usfd_101",
  "score": 0.94,
  "priority_class": "P1",
  "risk_level": "CRITICAL",
  "feature_contributions": {
    "severity": 0.28,
    "urgency": 0.22,
    "safety_risk": 0.2,
    "traffic_density": 0.09,
    "speed_class": 0.07,
    "deadline_proximity": 0.08
  },
  "explanation": "High severity, critical safety risk, and extreme urgency dominate the score.",
  "model_version": "criticality_v1_rule_2026Q4",
  "confidence": 0.9,
  "scoring_mode": "RULE_BASED"
}
```

## 10. ShadowBlockCandidate

Purpose: candidate combined block that can reduce disruption and improve efficiency.

Fields:

- `shadow_block_id: string` (required)
- `primary_task_id: string` (required)
- `participating_task_ids: array<string>` (required)
- `sections: array<string>` (required)
- `departments: array<enum>` (required)
- `proposed_window_start: datetime` (required)
- `proposed_window_end: datetime` (required)
- `estimated_duration_minutes: number` (required)
- `estimated_corridor_occupancy: number` (required, 0-1 or occupancy percentage)
- `potential_time_saving_minutes: number` (required)
- `resource_usage: object` (required)
- `conflict_status: enum` (required) — `FEASIBLE`, `CONFLICT`, `REJECTED`
- `shadow_benefit_score: number` (optional, 0-1)
- `reasons: array<string>` (optional)

Example:

```json
{
  "shadow_block_id": "sb_301",
  "primary_task_id": "task_001",
  "participating_task_ids": ["task_010", "task_021"],
  "sections": ["sec_12", "sec_13"],
  "departments": ["TRD", "ENGINEERING"],
  "proposed_window_start": "2026-11-03T23:00:00Z",
  "proposed_window_end": "2026-11-04T01:30:00Z",
  "estimated_duration_minutes": 150,
  "estimated_corridor_occupancy": 0.68,
  "potential_time_saving_minutes": 95,
  "resource_usage": { "track_machine": 1, "usfd_vehicle": 1 },
  "conflict_status": "FEASIBLE",
  "shadow_benefit_score": 0.81,
  "reasons": ["shared corridor", "reduced duplicate occupation", "compatible departments"]
}
```

## 11. OptimizationRequest

Purpose: internal request for deterministic optimization run.

Fields:

- `request_id: string` (required)
- `mode: enum` (required) — `BALANCED`, `SAFETY_FIRST`, `DISRUPTION_MINIMIZATION`, `EMERGENCY`
- `tasks: array<MaintenanceTask>` (required)
- `train_movements: array<TrainMovement>` (required)
- `resources: array<Resource>` (required)
- `maintenance_windows: array<MaintenanceWindow>` (required)
- `shadow_block_candidates: array<ShadowBlockCandidate>` (optional)
- `criticality_scores: array<CriticalityScore>` (required)
- `constraints: object` (required)
- `weights: object` (required)
- `solver_settings: object` (optional)
- `scenario_id: string` (optional)

Example:

```json
{
  "request_id": "opt_req_700",
  "mode": "BALANCED",
  "tasks": ["task_001", "task_010", "task_021"],
  "train_movements": ["mv_900", "mv_901"],
  "resources": ["res_veh_12"],
  "maintenance_windows": ["win_77"],
  "shadow_block_candidates": ["sb_301"],
  "criticality_scores": ["crit_usfd_101"],
  "constraints": {
    "max_block_minutes": 180,
    "deadline_hard": true,
    "resource_capacity": true
  },
  "weights": {
    "maintenance_value": 0.45,
    "shadow_block_benefit": 0.24,
    "train_disruption_penalty": 0.31
  },
  "solver_settings": {
    "max_runtime_seconds": 30,
    "allow_partial_solution": true
  }
}
```

## 12. OptimizationResult

Purpose: outcome of a scheduling optimization pass.

Fields:

- `request_id: string` (required)
- `status: enum` (required) — `OPTIMAL`, `FEASIBLE`, `PARTIAL`, `INFEASIBLE`, `FAILED`
- `selected_task_ids: array<string>` (required)
- `unscheduled_task_ids: array<string>` (required)
- `schedule_candidates: array<ScheduleCandidate>` (required)
- `shadow_blocks: array<ShadowBlockCandidate>` (required)
- `train_conflicts: array<Conflict>` (required)
- `resource_utilization: object` (required)
- `objective_score: number` (required)
- `baseline_comparison: object` (required)
- `solver_statistics: object` (required)
- `generated_at: datetime` (required)

Example:

```json
{
  "request_id": "opt_req_700",
  "status": "FEASIBLE",
  "selected_task_ids": ["task_001", "task_010"],
  "unscheduled_task_ids": ["task_021"],
  "schedule_candidates": ["sched_01"],
  "shadow_blocks": ["sb_301"],
  "train_conflicts": ["conf_112"],
  "resource_utilization": { "res_veh_12": 0.62 },
  "objective_score": 0.78,
  "baseline_comparison": { "delta_objective": 0.12, "train_disruption_reduction_pct": 18.4 },
  "solver_statistics": { "runtime_ms": 1840, "iterations": 1450 },
  "generated_at": "2026-11-03T00:05:00Z"
}
```

## 13. ScheduleCandidate

Purpose: a candidate schedule plan for a set of tasks and associated block allocations.

Fields:

- `schedule_id: string` (required)
- `task_ids: array<string>` (required)
- `blocks: array<object>` (required)
- `start_time: datetime` (required)
- `end_time: datetime` (required)
- `estimated_disruption_minutes: number` (required)
- `resource_assignments: object` (required)
- `confidence: number` (optional)
- `status: enum` (required) — `VALID`, `PARTIAL`, `REJECTED`

Example:

```json
{
  "schedule_id": "sched_01",
  "task_ids": ["task_001", "task_010"],
  "blocks": [{ "block_id": "blk_55", "section_id": "sec_12", "start": "2026-11-03T23:00:00Z", "end": "2026-11-04T01:30:00Z" }],
  "start_time": "2026-11-03T23:00:00Z",
  "end_time": "2026-11-04T01:30:00Z",
  "estimated_disruption_minutes": 95,
  "resource_assignments": { "res_veh_12": ["task_001"] },
  "confidence": 0.88,
  "status": "VALID"
}
```

## 14. Conflict

Purpose: conflicts detected during schedule validation or optimization.

Fields:

- `conflict_id: string` (required)
- `conflict_type: enum` (required) — `TRAIN_CONFLICT`, `RESOURCE_CONFLICT`, `WINDOW_CONFLICT`, `SAFETY_CONFLICT`, `DEADLINE_CONFLICT`
- `entity_ids: array<string>` (required)
- `section_id: string` (optional)
- `start: datetime` (required)
- `end: datetime` (required)
- `severity: enum` (required) — `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `description: string` (required)

Example:

```json
{
  "conflict_id": "conf_112",
  "conflict_type": "TRAIN_CONFLICT",
  "entity_ids": ["task_021", "mv_900"],
  "section_id": "sec_12",
  "start": "2026-11-03T23:45:00Z",
  "end": "2026-11-04T00:05:00Z",
  "severity": "HIGH",
  "description": "Maintenance block overlaps a high-priority passenger train"
}
```

## 15. WhatIfScenario

Purpose: reoptimization scenario specification.

Fields:

- `scenario_id: string` (required)
- `scenario_type: enum` (required) — `TRAIN_DELAY`, `BLOCK_UNAVAILABLE`, `RESOURCE_UNAVAILABLE`, `EMERGENCY_TASK_INSERTED`, `TASK_DURATION_CHANGED`, `TASK_ADDED`
- `base_schedule_id: string` (required)
- `affected_task_ids: array<string>` (required)
- `affected_train_ids: array<string>` (optional)
- `new_constraints: object` (required)
- `description: string` (required)
- `created_at: datetime` (required)

Example:

```json
{
  "scenario_id": "whatif_01",
  "scenario_type": "TRAIN_DELAY",
  "base_schedule_id": "sched_01",
  "affected_task_ids": ["task_010"],
  "affected_train_ids": ["train_121"],
  "new_constraints": { "train_delay_minutes": 15 },
  "description": "Passenger train delayed by 15 minutes causing re-evaluation of block windows.",
  "created_at": "2026-11-03T00:10:00Z"
}
```

## 16. EmergencyEvent

Purpose: emergency maintenance trigger requiring immediate reoptimization.

Fields:

- `event_id: string` (required)
- `event_type: enum` (required) — `NEW_USFD_DEFECT`, `TRACK_FAILURE`, `SIGNAL_FAILURE`, `OTHER`
- `section_id: string` (required)
- `affected_asset_id: string` (optional)
- `severity: enum` (required) — `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `detected_at: datetime` (required)
- `impact_summary: string` (required)
- `related_task_id: string` (optional)

Example:

```json
{
  "event_id": "emg_001",
  "event_type": "NEW_USFD_DEFECT",
  "section_id": "sec_12",
  "affected_asset_id": "asset_rail_042",
  "severity": "CRITICAL",
  "detected_at": "2026-11-03T07:05:00Z",
  "impact_summary": "Critical rail defect detected in high-traffic section",
  "related_task_id": "task_999"
}
```

## 17. Explanation

Purpose: deterministic, rule-traceable output explaining why a decision was made.

Fields:

- `explanation_id: string` (required)
- `entity_type: enum` (required) — `BLOCK`, `TASK`, `WINDOW`, `GROUPING`, `SCHEDULE`, `REJECTION`
- `entity_id: string` (required)
- `summary: string` (required)
- `reason_codes: array<string>` (required)
- `evidence: object` (required)
- `deterministic_inputs: object` (required)
- `generated_by: enum` (required) — `CRITICALITY_ENGINE`, `COMPATIBILITY_ENGINE`, `SHADOW_BLOCK_ENGINE`, `OPTIMIZATION_ENGINE`, `EXPLAINABILITY_ENGINE`

Example:

```json
{
  "explanation_id": "exp_111",
  "entity_type": "BLOCK",
  "entity_id": "blk_55",
  "summary": "Block selected because it maximizes criticality-weighted maintenance value while avoiding train conflict.",
  "reason_codes": ["criticality_score_high", "window_available", "train_conflict_avoided"],
  "evidence": {
    "criticality_score": 0.94,
    "window_conflict": false,
    "train_disruption_minutes": 95
  },
  "deterministic_inputs": {
    "task_ids": ["task_001", "task_010"],
    "weights": { "maintenance_value": 0.45, "train_disruption_penalty": 0.31 }
  },
  "generated_by": "OPTIMIZATION_ENGINE"
}
```

## Additional shared types

### ResourceRequirement

- `resource_type: enum` (required)
- `count: number` (required)
- `min_skill_level: string` (optional)

### TimeRange

- `start: datetime` (required)
- `end: datetime` (required)

### SectionLocation

- `section_id: string` (required)
- `from_km: number` (required)
- `to_km: number` (required)

## Governance notes

- No schema should be directly translated into SQL or Prisma.
- These objects are only for AI module internal processing.
- Validation should be performed at runtime in preprocessing and engine layers.
- Any model-based scoring must still emit deterministic feature contributions and explanations.
