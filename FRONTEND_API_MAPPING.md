# Indian Railways AI Block Planning — Frontend API & Data Mapping Specification

**Document Version:** 1.0.0  
**Target:** Frontend Integration Layer (`frontend/src/api/`)  
**Companion Documents:** `FRONTEND_ARCHITECTURE.md`, `FRONTEND_TASK_BREAKDOWN.md`

This document establishes the exact mapping between frontend user interfaces, backend REST endpoints, and underlying Python AI engine contracts. Where an endpoint already exists in the Express backend, it is documented with its live signature. Where an advanced AI engine capability exists in `ai/` but lacks an Express HTTP route, it is clearly classified as an **AI Integration Requirement**, with its contract-compliant mock adapter specification.

---

## Architecture Summary Matrix

```
┌───────────────────────────┬───────────────────────────────┬───────────────────────────────┬──────────────────────────────┐
│ Frontend Page / Component │ Required Data                 │ Backend Source                │ AI Engine Source             │
├───────────────────────────┼───────────────────────────────┼───────────────────────────────┼──────────────────────────────┤
│ 1. Dashboard Cockpit      │ Summary KPIs, Runs, Alerts    │ GET /api/planning/dashboard   │ OptimizationEngine (metrics) │
│ 2. Planning Timeline      │ Blocks, Windows, Trains       │ GET /api/blocks, /windows     │ OptimizationEngine.optimize  │
│ 3. Maintenance Tasks      │ Task Inventory, Criticality   │ GET /api/maintenance/tasks    │ CriticalityEngine.score      │
│ 4. Shadow Blocks          │ Joint Candidates, Savings     │ (Integration Requirement)     │ ShadowBlockEngine.generate   │
│ 5. Train Movements        │ Timetable, Speed, Penalties   │ GET /api/trains, /forecasts   │ TrainMovement (synthetic)    │
│ 6. Conflicts & Alerts     │ Safety, Train, Resource Clashes│ (Integration Requirement)    │ Conflict (AI Domain §14)     │
│ 7. What-If Scenarios      │ Simulation Diffs, Deltas      │ (Integration Requirement)     │ WhatIfEngine.reoptimize      │
│ 8. Emergency Planning     │ Defect Ingestion, Urgent Slot │ (Integration Requirement)     │ EmergencyEngine.insert_event │
│ 9. Explainability Drawer  │ Deterministic Evidence Traces │ GET /api/blocks/:id (partial) │ ExplainabilityEngine.explain │
│ 10. System Status         │ Server & DB Health, Corridors │ GET /, /api/health, /corridors│ Preprocessing / Validator    │
└───────────────────────────┴───────────────────────────────┴───────────────────────────────┴──────────────────────────────┘
```

---

## Detailed Endpoint & Field Specifications

### 1. Dashboard Cockpit (`/`)

#### Endpoint 1.1: Dashboard KPI Summary
* **Frontend Component:** `KpiGrid`, `ActiveCorridorCard`, `RecentRunsWidget`
* **HTTP Method & Path:** `GET /api/planning/dashboard`
* **Backend Handler:** `backend/src/modules/planning/planning.controller.ts:getDashboard`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND**
* **Request:** No parameters or query parameters.
* **Response:**
  ```json
  {
    "success": true,
    "data": {
      "summary": {
        "totalTasks": 42,
        "pendingTasks": 18,
        "scheduledTasks": 20,
        "completedTasks": 4,
        "overdueTasks": 3,
        "totalBlocks": 8,
        "proposedBlocks": 4,
        "approvedBlocks": 3,
        "executedBlocks": 1,
        "totalHoursSaved": 4.5,
        "activeCorridors": 2,
        "departmentsCount": 3
      },
      "recentRuns": [
        {
          "id": "7b8e1f02-...",
          "runCode": "RUN-20261103-01",
          "horizon": "WEEKLY",
          "startDate": "2026-11-03T00:00:00.000Z",
          "endDate": "2026-11-10T00:00:00.000Z",
          "tasksConsidered": 25,
          "tasksScheduled": 18,
          "blocksGenerated": 6,
          "totalBlockMinutes": 720,
          "baselineBlockMinutes": 990,
          "estimatedSavingsMinutes": 270,
          "optimizationScore": "0.82",
          "status": "COMPLETED",
          "createdAt": "2026-11-03T06:12:00.000Z"
        }
      ],
      "recentBlocks": [
        {
          "id": "9c1a02...",
          "blockCode": "BLK-NDLS-AGC-20261103-01",
          "corridorId": "c01a...",
          "startAt": "2026-11-03T23:00:00.000Z",
          "endAt": "2026-11-04T02:00:00.000Z",
          "durationMinutes": 180,
          "status": "PROPOSED",
          "savedMinutes": 90
        }
      ]
    }
  }
  ```
* **Frontend Field Mapping:**
  * `data.summary.totalTasks` $\to$ KPI Card "Total Backlog"
  * `data.summary.pendingTasks` vs `scheduledTasks` $\to$ Donut / Progress Bar
  * `data.summary.totalHoursSaved` $\to$ KPI Card "Cumulative Hours Saved"
  * `data.recentRuns` $\to$ Recent Optimization Runs Table

---

### 2. Planning / Schedule (`/planning`)

#### Endpoint 2.1: Get Corridor Blocks
* **Frontend Component:** `ScheduleTimelineCanvas`, `BlockGanttRow`
* **HTTP Method & Path:** `GET /api/blocks`
* **Query Parameters:** `?corridorId=:uuid&status=PROPOSED`
* **Backend Handler:** `backend/src/modules/blocks/blocks.controller.ts:getBlocks`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND**
* **Response:**
  ```json
  {
    "success": true,
    "count": 6,
    "data": [
      {
        "id": "blk_55a1",
        "blockCode": "BLK-NDLS-01",
        "corridorId": "c01a...",
        "startAt": "2026-11-03T23:00:00.000Z",
        "endAt": "2026-11-04T01:30:00.000Z",
        "durationMinutes": 150,
        "status": "PROPOSED",
        "planningHorizon": "WEEKLY",
        "optimizationScore": "0.78",
        "baselineDurationMinutes": 245,
        "savedMinutes": 95,
        "blockTasks": [
          {
            "id": "bt_01",
            "maintenanceTaskId": "tsk_001",
            "departmentId": "dept_eng",
            "startAt": "2026-11-03T23:00:00.000Z",
            "endAt": "2026-11-04T01:30:00.000Z",
            "status": "SCHEDULED"
          }
        ]
      }
    ]
  }
  ```

#### Endpoint 2.2: Generate / Optimize Schedule
* **Frontend Component:** `ScheduleOptimizationModal`, `RunOptimizerButton`
* **HTTP Method & Path:** `POST /api/planning/generate`
* **Backend Handler:** `backend/src/modules/planning/planning.controller.ts:generatePlan`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND (PROTOTYPE TS OPTIMIZER)**
* **AI Orchestrator Target:** `AgentOrchestrator.orchestrate()` in `ai/agents/orchestrator.py`
* **Request:**
  ```json
  {
    "horizon": "WEEKLY",
    "corridorId": "c01a-ndls-agc",
    "startDate": "2026-11-03T12:00:00Z",
    "endDate": "2026-11-10T12:00:00Z"
  }
  ```
* **Response:**
  ```json
  {
    "success": true,
    "runId": "run_0192a",
    "runCode": "RUN-20261103-W1",
    "summary": {
      "tasksConsidered": 22,
      "tasksScheduled": 17,
      "blocksGenerated": 5,
      "baselineBlockMinutes": 950,
      "optimizedBlockMinutes": 680,
      "savingMinutes": 270,
      "savingPercentage": 28.4,
      "optimizationScore": 0.81
    },
    "blocks": [
      {
        "blockCode": "BLK-NDLS-AGC-01",
        "corridorId": "c01a...",
        "corridorCode": "NDLS-AGC",
        "startAt": "2026-11-03T23:30:00.000Z",
        "endAt": "2026-11-04T02:00:00.000Z",
        "durationMinutes": 150,
        "baselineDurationMinutes": 245,
        "savedMinutes": 95,
        "departments": ["ENG", "TRD"],
        "tasks": [
          {
            "id": "tsk_01",
            "taskCode": "TSK-ENG-NDLS-045",
            "department": "ENG",
            "taskType": "USFD",
            "durationMinutes": 150,
            "locationKm": "45.500"
          }
        ],
        "explanation": {
          "reasons": [
            "Merged USFD rail testing with OHE cantilever check",
            "Avoided passage of 12002 Shatabdi Express"
          ],
          "impact": {
            "baselineMinutes": 245,
            "optimizedMinutes": 150,
            "savedMinutes": 95
          }
        }
      }
    ]
  }
  ```

#### Endpoint 2.3: Block Approval & Rejection
* **Frontend Component:** `BlockDetailDrawer`
* **HTTP Method & Path:** `POST /api/blocks/:id/approve` and `POST /api/blocks/:id/reject`
* **Backend Handler:** `backend/src/modules/blocks/blocks.controller.ts:approveBlock / rejectBlock`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND**
* **Request:** `{ "approvedBy": "Chief Controller Delhi Division" }`
* **Response:** `{ "success": true, "data": { "id": ":id", "status": "APPROVED", ... } }`

---

### 3. Maintenance Tasks (`/tasks`)

#### Endpoint 3.1: Get All Maintenance Tasks
* **Frontend Component:** `TaskDataTable`, `TaskFilterBar`
* **HTTP Method & Path:** `GET /api/maintenance/tasks/all` or `GET /api/maintenance/tasks?status=PENDING`
* **Backend Handler:** `backend/src/modules/maintenance/maintenance.controller.ts:getAllTasks`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND**
* **Response:**
  ```json
  {
    "success": true,
    "count": 35,
    "data": [
      {
        "id": "70d1a...",
        "taskCode": "TSK-ENG-NDLS-045-01",
        "assetId": "ast_45a",
        "departmentId": "dept_eng",
        "corridorId": "corr_01",
        "defectId": "df_01",
        "taskType": "DEFECT_REPAIR",
        "description": "Rail head split scan and fishplate tightening",
        "locationStartKm": "45.200",
        "locationEndKm": "46.100",
        "criticalityScore": 94,
        "urgencyScore": 90,
        "safetyScore": 95,
        "operationalImpactScore": 85,
        "priorityScore": "92.40",
        "estimatedDurationMinutes": 150,
        "overdueDays": 1,
        "dueAt": "2026-11-04T18:00:00.000Z",
        "status": "PENDING",
        "requiredBlock": true,
        "requiresPowerShutdown": false,
        "createdAt": "2026-11-02T10:00:00.000Z",
        "updatedAt": "2026-11-02T10:00:00.000Z"
      }
    ]
  }
  ```

#### Endpoint 3.2: Recalculate Task Priority
* **Frontend Component:** `TaskDetailSheet`
* **HTTP Method & Path:** `POST /api/maintenance/tasks/:id/recalculate-priority`
* **Backend Handler:** `backend/src/modules/maintenance/maintenance.controller.ts:recalculatePriority`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND**
* **Response:**
  ```json
  {
    "success": true,
    "priorityScore": 92.4,
    "data": { "id": ":id", "priorityScore": "92.40", ... }
  }
  ```

#### Endpoint 3.3: Deterministic Criticality Breakdown (AI Engine)
* **Frontend Component:** `CriticalityFactorBreakdown` in `TaskDetailSheet`
* **Contract Reference:** `OPTIMIZATION_CONTRACT.md §2` / `ai/criticality/engine.py`
* **Status:** **AI INTEGRATION REQUIREMENT / MOCK ADAPTER READY**
* **Internal Input Schema:**
  ```json
  {
    "entity_id": "TSK-ENG-NDLS-045-01",
    "severity": "CRITICAL",
    "urgency": 0.93,
    "safety_risk": 0.97,
    "traffic_density": 0.83,
    "speed_class": "HIGH",
    "deadline": "2026-11-04T18:00:00Z"
  }
  ```
* **Engine Response:**
  ```json
  {
    "entity_id": "TSK-ENG-NDLS-045-01",
    "score": 0.94,
    "display_score": 94,
    "priority_class": "P1",
    "risk_level": "CRITICAL",
    "feature_contributions": {
      "severity": 0.28,
      "urgency": 0.22,
      "safety_risk": 0.20,
      "traffic_density": 0.09,
      "speed_class": 0.07,
      "deadline_proximity": 0.08
    },
    "explanation": "High severity, critical safety risk, and extreme urgency dominate the score.",
    "model_version": "criticality_v1_rule_2026Q4",
    "confidence": 0.92,
    "scoring_mode": "RULE_BASED"
  }
  ```

---

### 4. Shadow Blocks (`/shadow-blocks`)

#### Endpoint 4.1: Find Shadow Block Opportunities
* **Frontend Component:** `ShadowBlockMatrix`, `CandidateCard`
* **Contract Reference:** `OPTIMIZATION_CONTRACT.md §4` / `ai/shadow_blocks/engine.py`
* **Status:** **AI INTEGRATION REQUIREMENT / MOCK ADAPTER READY**
* **Target HTTP Route:** `POST /api/planning/shadow-blocks/candidates` (or Mock Provider)
* **Request:**
  ```json
  {
    "corridor_id": "NDLS-AGC",
    "window_start": "2026-11-03T22:00:00Z",
    "window_end": "2026-11-04T05:00:00Z"
  }
  ```
* **Response Payload (Contract §10):**
  ```json
  {
    "success": true,
    "count": 2,
    "candidates": [
      {
        "shadow_block_id": "SB-NDLS-301",
        "primary_task_id": "TSK-ENG-NDLS-045-01",
        "participating_task_ids": ["TSK-TRD-NDLS-046-02", "TSK-SNT-NDLS-045-03"],
        "sections": ["sec_12_ndls_agc"],
        "departments": ["ENG", "TRD", "SNT"],
        "proposed_window_start": "2026-11-03T23:00:00Z",
        "proposed_window_end": "2026-11-04T01:30:00Z",
        "estimated_duration_minutes": 150,
        "estimated_corridor_occupancy": 0.68,
        "potential_time_saving_minutes": 95,
        "resource_usage": { "track_machine": 1, "tower_wagon": 1, "snt_crew": 1 },
        "conflict_status": "FEASIBLE",
        "shadow_benefit_score": 0.81,
        "reasons": [
          "Collocated section (Km 45.2 - 46.1)",
          "Synchronized night possession window",
          "Consolidated 3 isolated closures into 1 possession"
        ]
      },
      {
        "shadow_block_id": "SB-NDLS-302",
        "primary_task_id": "TSK-ENG-NDLS-088",
        "participating_task_ids": ["TSK-SNT-NDLS-089"],
        "sections": ["sec_14_agc"],
        "departments": ["ENG", "SNT"],
        "proposed_window_start": "2026-11-04T02:00:00Z",
        "proposed_window_end": "2026-11-04T04:30:00Z",
        "estimated_duration_minutes": 150,
        "estimated_corridor_occupancy": 0.55,
        "potential_time_saving_minutes": 60,
        "resource_usage": { "track_machine": 1 },
        "conflict_status": "REJECTED",
        "shadow_benefit_score": 0.20,
        "reasons": [
          "SAFETY_CONFLICT: Concurrent point motor overhaul and track tamping violates IR-SIG-402 interlocking safety rules."
        ]
      }
    ]
  }
  ```

---

### 5. Trains & Movements (`/trains`)

#### Endpoint 5.1: Get Scheduled Trains
* **Frontend Component:** `TrainMovementList`, `DisruptionMetricCard`
* **HTTP Method & Path:** `GET /api/trains`
* **Backend Handler:** `backend/src/modules/trains/trains.controller.ts:getTrains`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND**
* **Response:**
  ```json
  {
    "success": true,
    "count": 4,
    "data": [
      {
        "id": "trn_01",
        "trainNumber": "22436",
        "trainName": "Vande Bharat Express (NDLS - BSB)",
        "trainType": "EXPRESS",
        "corridorId": "c01a...",
        "scheduledArrival": "2026-11-03T06:00:00.000Z",
        "scheduledDeparture": "2026-11-03T06:05:00.000Z",
        "priority": 95,
        "isGoodsTrain": false,
        "isCriticalService": true,
        "status": "SCHEDULED"
      },
      {
        "id": "trn_02",
        "trainNumber": "12002",
        "trainName": "Bhopal Shatabdi Express",
        "trainType": "EXPRESS",
        "corridorId": "c01a...",
        "scheduledArrival": "2026-11-03T06:15:00.000Z",
        "scheduledDeparture": "2026-11-03T06:20:00.000Z",
        "priority": 90,
        "isGoodsTrain": false,
        "isCriticalService": true,
        "status": "SCHEDULED"
      }
    ]
  }
  ```

---

### 6. Conflicts & Alerts (`/conflicts`)

#### Endpoint 6.1: Get Active Conflicts
* **Frontend Component:** `ConflictAlertCard`, `ConflictCategoryTabs`
* **Contract Reference:** `AI_DOMAIN_CONTRACT.md §14` (`Conflict`)
* **Status:** **AI INTEGRATION REQUIREMENT / MOCK ADAPTER READY**
* **Payload Structure:**
  ```json
  {
    "success": true,
    "count": 3,
    "conflicts": [
      {
        "conflict_id": "CONF-20261103-01",
        "conflict_type": "TRAIN_CONFLICT",
        "entity_ids": ["TSK-ENG-NDLS-045-01", "trn_02_12002"],
        "section_id": "NDLS-AGC-SEC12",
        "start": "2026-11-03T23:45:00Z",
        "end": "2026-11-04T00:15:00Z",
        "severity": "HIGH",
        "description": "Proposed block overlaps passage slot for Train 12002 Shatabdi Express at Km 45.2. Recommend shifting start to 00:30."
      },
      {
        "conflict_id": "CONF-20261103-02",
        "conflict_type": "RESOURCE_CONFLICT",
        "entity_ids": ["TSK-ENG-NDLS-045-01", "TSK-ENG-NDLS-092"],
        "section_id": "NDLS-AGC-SEC12",
        "start": "2026-11-03T23:00:00Z",
        "end": "2026-11-04T01:30:00Z",
        "severity": "CRITICAL",
        "description": "USFD Testing Vehicle USFD-V-12 allocated simultaneously to two separate rail scans."
      },
      {
        "conflict_id": "CONF-20261103-03",
        "conflict_type": "SAFETY_CONFLICT",
        "entity_ids": ["TSK-ENG-NDLS-088", "TSK-SNT-NDLS-089"],
        "section_id": "NDLS-AGC-SEC14",
        "start": "2026-11-04T02:00:00Z",
        "end": "2026-11-04T04:30:00Z",
        "severity": "CRITICAL",
        "description": "Interlocking safety constraint: S&T point sensor calibration cannot co-occur with heavy mechanical ballast tamping."
      }
    ]
  }
  ```

---

### 7. What-If Scenarios (`/what-if`)

#### Endpoint 7.1: Re-optimize Under Operational Scenario
* **Frontend Component:** `ScenarioConfigForm`, `ScheduleDiffViewer`
* **Contract Reference:** `OPTIMIZATION_CONTRACT.md §6` / `ai/scenarios/what_if.py`
* **Status:** **AI INTEGRATION REQUIREMENT / MOCK ADAPTER READY**
* **Request:**
  ```json
  {
    "scenario_id": "SCEN-WHATIF-01",
    "scenario_type": "TRAIN_DELAY",
    "base_schedule_id": "RUN-20261103-W1",
    "affected_task_ids": ["TSK-ENG-NDLS-045-01"],
    "affected_train_ids": ["trn_02_12002"],
    "new_constraints": {
      "train_delay_minutes": 45,
      "enforce_passenger_punctuality": true
    },
    "description": "Train 12002 Bhopal Shatabdi delayed by 45 minutes arriving at NDLS."
  }
  ```
* **Response:**
  ```json
  {
    "success": true,
    "original_schedule_id": "RUN-20261103-W1",
    "new_schedule": {
      "schedule_id": "SCHED-SIM-01",
      "blocks": [
        {
          "block_id": "BLK-NDLS-01-SHIFTED",
          "section_id": "NDLS-AGC-SEC12",
          "start": "2026-11-04T00:30:00Z",
          "end": "2026-11-04T03:00:00Z",
          "durationMinutes": 150
        }
      ]
    },
    "changed_blocks": ["BLK-NDLS-01"],
    "affected_tasks": ["TSK-ENG-NDLS-045-01", "TSK-TRD-NDLS-046-02"],
    "affected_trains": ["12002"],
    "metric_differences": {
      "objective_score_delta": -0.04,
      "train_disruption_minutes_delta": +15,
      "resource_utilization_delta": 0.0
    },
    "explanation": "Block BLK-NDLS-01 shifted forward by 60 minutes (00:30 - 03:00) to clear delayed passage of Train 12002 without cancelling secondary OHE maintenance."
  }
  ```

---

### 8. Emergency Planning (`/emergency`)

#### Endpoint 8.1: Insert Emergency Defect & Fast-Path Schedule
* **Frontend Component:** `EmergencyIncidentForm`, `EmergencySchedulePreview`
* **Contract Reference:** `OPTIMIZATION_CONTRACT.md §7` / `ai/scenarios/emergency.py`
* **Status:** **AI INTEGRATION REQUIREMENT / MOCK ADAPTER READY**
* **Request:**
  ```json
  {
    "event_id": "EMG-20261103-99",
    "event_type": "NEW_USFD_DEFECT",
    "section_id": "NDLS-AGC-SEC12",
    "affected_asset_id": "AST-TRK-NDLS-045",
    "severity": "CRITICAL",
    "detected_at": "2026-11-03T07:15:00Z",
    "impact_summary": "Transverse rail fissure detected at Km 45.300. Speed restriction 20 km/h in effect."
  }
  ```
* **Response:**
  ```json
  {
    "success": true,
    "emergency_task": {
      "task_id": "TSK-EMG-99",
      "task_type": "USFD",
      "severity": "CRITICAL",
      "urgency": 0.98,
      "estimated_duration_minutes": 120,
      "required_resources": [{ "resource_type": "USFD_VEHICLE", "count": 1 }]
    },
    "urgency": "CRITICAL",
    "affected_section": "NDLS-AGC-SEC12",
    "feasible_windows": [
      {
        "window_id": "WIN-EMG-SLOT-1",
        "start": "2026-11-03T11:00:00Z",
        "end": "2026-11-03T13:00:00Z",
        "available_minutes": 120,
        "traffic_impact": "Requires looping Freight BOXN-402 at Palwal Yard"
      }
    ],
    "resulting_schedule": {
      "schedule_id": "SCHED-EMG-01",
      "inserted_block": {
        "block_code": "BLK-EMG-01",
        "start": "2026-11-03T11:00:00Z",
        "end": "2026-11-03T13:00:00Z",
        "durationMinutes": 120
      }
    }
  }
  ```

---

### 9. Explainability & Decision Detail (`/explain`)

#### Endpoint 9.1: Fetch Decision Explanation
* **Frontend Component:** `ExplanationDrawer`, `DecisionExplanationCard`
* **Contract Reference:** `OPTIMIZATION_CONTRACT.md §8` / `ai/explainability/engine.py`
* **Status:** **AI INTEGRATION REQUIREMENT / MOCK ADAPTER READY**
* **Query Signature:** `GET /api/planning/explanations/:entityId`
* **Response Payload (Contract §17):**
  ```json
  {
    "success": true,
    "explanation": {
      "explanation_id": "EXP-BLK-NDLS-01",
      "entity_type": "BLOCK",
      "entity_id": "BLK-NDLS-01",
      "summary": "Block selected because it maximizes criticality-weighted maintenance value (0.94) while avoiding conflicts with high-priority passenger train 12002.",
      "reason_codes": [
        "criticality_score_high",
        "window_available",
        "train_conflict_avoided",
        "shadow_block_piggybacked"
      ],
      "evidence": {
        "criticality_score": 0.94,
        "window_conflict": false,
        "train_disruption_minutes": 0,
        "piggybacked_tasks_count": 2,
        "saved_minutes": 95
      },
      "deterministic_inputs": {
        "task_ids": ["TSK-ENG-NDLS-045-01", "TSK-TRD-NDLS-046-02"],
        "weights": {
          "maintenance_value": 0.45,
          "shadow_block_benefit": 0.25,
          "train_disruption_penalty": 0.30
        }
      },
      "generated_by": "OPTIMIZATION_ENGINE"
    }
  }
  ```

---

### 10. System Status & Asset Inventory (`/system`)

#### Endpoint 10.1: Health & Corridors
* **Frontend Component:** `SystemStatusBar`, `CorridorSelector`
* **HTTP Method & Path:** `GET /api/health` and `GET /api/corridors`
* **Backend Handler:** `backend/src/modules/health/health.controller.ts`, `corridors.controller.ts`
* **Status:** **LIVE & IMPLEMENTED IN BACKEND**
* **Response:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c01a...",
        "code": "NDLS-AGC",
        "name": "New Delhi to Agra Cantt High Density Network",
        "zone": "Northern Railway",
        "division": "Delhi",
        "startKm": "0.000",
        "endKm": "195.000",
        "status": "ACTIVE"
      }
    ]
  }
  ```

---

## Environment Integration Configuration

The frontend API client (`frontend/src/api/client.ts`) switches between mock mode and live Express backend via `.env`:

```env
# Point to local Express backend
VITE_BACKEND_API_URL=http://localhost:5000/api

# Enable mock data adapter for unintegrated Python AI endpoints
VITE_USE_MOCK_AI=true
```

When `VITE_USE_MOCK_AI=true`, live endpoints (`/corridors`, `/assets`, `/maintenance/tasks`, `/blocks`) query the real Express server, while advanced AI routes (`/shadow-blocks/candidates`, `/scenarios/what-if`, `/emergency`, `/explanations`) are fulfilled by the high-fidelity mock adapter. Once the backend team deploys the Python AI bridge, changing `VITE_USE_MOCK_AI=false` switches all traffic seamlessly to the live server.
