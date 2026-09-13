# Backend AI Integration Contract (Documentation Only)

This document is a conceptual contract for future backend-to-AI integration. It is intentionally documentation-only and does not implement routes, controllers, database logic, or schema objects.

## Conceptual flow

```text
Backend
    ↓
AI Request
    ↓
AI Engine
    ↓
AI Result
    ↓
Backend
```

## 1. Backend responsibility

The backend is responsible for:

- authenticating users and permission checks
- persistence of operational data
- serving upstream system data to AI in normalized payloads
- receiving AI results and storing them in its own persistence layer
- orchestrating downstream UI or operational workflows

The backend must not implement AI optimization logic directly.

## 2. AI service responsibility

The AI service is responsible for:

- validation of inbound AI request payloads
- preprocessing task and movement data
- criticality scoring
- compatibility evaluation
- shadow block generation
- schedule optimization
- explanation generation
- scenario reoptimization and emergency handling

## 3. Example request contract

```json
{
  "request_id": "ai_req_101",
  "scenario": "NORMAL_PLANNING",
  "tasks": ["MaintenanceTask"],
  "train_movements": ["TrainMovement"],
  "resources": ["Resource"],
  "maintenance_windows": ["MaintenanceWindow"],
  "constraints": {
    "safety_rules": true,
    "deadline_hard": true,
    "resource_capacity": true
  },
  "weights": {
    "maintenance_value": 0.45,
    "shadow_block_benefit": 0.25,
    "train_disruption_penalty": 0.30
  },
  "mode": "BALANCED"
}
```

## 4. Example response contract

```json
{
  "request_id": "ai_req_101",
  "status": "FEASIBLE",
  "selected_task_ids": ["task_001", "task_010"],
  "unscheduled_task_ids": ["task_021"],
  "schedule_candidates": ["ScheduleCandidate"],
  "shadow_blocks": ["ShadowBlockCandidate"],
  "train_conflicts": ["Conflict"],
  "metrics": {
    "scheduled_task_count": 2,
    "critical_task_coverage": 0.9,
    "number_of_blocks": 1,
    "shadow_block_count": 1,
    "corridor_occupancy": 0.68,
    "baseline_occupancy": 0.82,
    "train_disruption_minutes": 95,
    "baseline_train_disruption": 120,
    "reduction_percentage": 20.8,
    "resource_utilization": 0.62,
    "shadow_block_utilization": 0.75,
    "optimization_objective_score": 0.78,
    "solver_runtime_ms": 1840
  },
  "explanations": ["Explanation"]
}
```

## 5. Proposed integration boundaries

### Backend -> AI

- maintenance tasks
- defect records
- train movement calendars
- resource calendars
- possession windows
- safety and policy constraints
- optimization weights or mode
- scenario metadata for what-if or emergency events

### AI -> Backend

- optimized schedule candidate(s)
- task selection and unscheduled task list
- shadow blocks
- explanations for decisions
- metrics summary
- conflict list
- emergency or what-if reoptimization results

## 6. Non-goals for this milestone

This contract must not define:

- Prisma schemas
- SQL migration files
- route handlers
- frontend rendering contracts
- authentication flows
- direct database access logic

## 7. Integration invariants

- The AI service accepts canonical JSON payloads and returns canonical JSON payloads.
- The backend owns storage and data source integrity.
- The AI service owns optimization logic and explanation traces.
- All generated explanations must be traceable to deterministic rules and engine outputs.
- The AI service must never assume internal railway operational systems beyond the provided payload.

## 8. Future implementation note

Backend teammates may later implement HTTP or service-layer adapters that map these conceptual payloads to their actual APIs without affecting the internal AI logic.
