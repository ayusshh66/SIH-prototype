# Indian Railways AI-Powered Automatic Block Planning System
# Frontend Architecture & Implementation Specification

**Document Version:** 1.0.0  
**Target Platform:** Indian Railways Automatic Block Planning System (SIH26027 Prototype)  
**Workspace:** `frontend/` (React 18/19 + TypeScript + Vite)  
**Target Roles:** Developer A (Shell, Dashboard, Planning Timeline, Assets), Developer B (Tasks, Criticality, Shadow Blocks, Conflicts, What-If, Emergency, Explainability)

---

## 1. Frontend Goal

The frontend is the mission-critical operational interface for Indian Railways Section Controllers, Divisional Operations Managers, and P-Way/TRD/S&T Maintenance Engineers. Its primary objective is to make complex, multi-department AI scheduling, risk models, and disruption simulations transparent, actionable, and operator-verifiable.

### Core Responsibilities
The frontend is responsible for ingesting, visualizing, and facilitating operator review for:
1. **Maintenance Task Criticality:** Presenting deterministic multi-factor risk scores ($0\text{--}100$ scale) and priority classifications ($\text{P1}$ through $\text{P4}$) with factor weight breakdowns.
2. **Task Compatibility:** Visualizing spatial, temporal, and resource compatibility across Civil Engineering ($\text{ENG}$), Traction Distribution ($\text{TRD}$), and Signal & Telecommunication ($\text{S\&T}$).
3. **Shadow-Block Opportunities:** Identifying and surfacing integrated corridor possessions where secondary tasks piggyback on primary maintenance blocks to save section possession hours.
4. **Optimized Block Schedules:** Rendering conflict-free, multi-department block allocations across railway corridors and operational time windows.
5. **Train Impact & Disruption:** Displaying estimated train delays, passenger/freight impact, and traffic density penalties across scheduled train movements.
6. **Unified Operational Conflicts:** Highlighting train conflicts, resource shortages, window violations, safety/interlocking constraints, and deadline breaches.
7. **What-If Scenario Simulation:** Providing interactive parameter controls for operational disruptions (train delays, block cancellations, duration surges, added tasks) and side-by-side schedule comparisons.
8. **Emergency Planning:** Supporting rapid entry, validation, urgency evaluation, and expedited re-optimization for emergency track and signal defects.
9. **Deterministic Explanations:** Presenting mathematically grounded, rule-traceable evidence for why every scheduling decision, priority assignment, or candidate rejection was made.

### Strict Non-Responsibilities (Safety Boundary)
> [!IMPORTANT]
> **Authoritative Decision Isolation:** The frontend is strictly a presentation and interaction layer. 
> - The frontend **MUST NOT** perform scheduling algorithms, slot allocation heuristics, or optimization solvers.
> - The frontend **MUST NOT** evaluate safety feasibility, interlocking constraints, or corridor possession rules.
> - The frontend **MUST NOT** calculate or adjust criticality scores, priority rankings, or penalty weights.
> - The frontend **MUST NOT** invent, hallucinate, or synthesize conflict explanations or rejection reasons. Every metric and explanation rendered must originate directly from backend database records or AI engine outputs.

---

## 2. System Boundary & Layered Architecture

The system enforces a clean, one-way dependency boundary from browser UI down to mathematical engines:

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend (UI)                         │
│  - React + TypeScript Single Page Application (SPA)        │
│  - State Management: Server Cache (Query) + UI URL State    │
│  - Presentation, Filtering, Timeline Scrubbing, Forms       │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST (JSON)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Backend API Layer                      │
│  - Node.js / Express + TypeScript                           │
│  - PostgreSQL Persistence via Drizzle ORM                  │
│  - Authoritative Data Store: Assets, Tasks, Trains, Corridors│
│  - Integration Endpoints (TMS, SMMS, TDMS, COA Simulators)  │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC / HTTP / Subprocess Adapter
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           AI Orchestration / Planning Services              │
│  - AgentOrchestrator (`ai/agents/orchestrator.py`)          │
│  - Preprocessing, Payload Normalization, Step Verification   │
│  - Execution Sequence: Validate → Score → Compat → Blocks  │
│    → Optimize → Scenarios → Explain                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ Internal Method Invocations
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       AI Engines                            │
│  - CriticalityEngine (Rule-based & Extensible ML)          │
│  - CompatibilityEngine (Spatial / Temporal / Interlocking) │
│  - ShadowBlockEngine (Possession clustering)               │
│  - OptimizationEngine (Multi-objective MIP / Solver)       │
│  - WhatIfEngine & EmergencyEngine (Re-optimization)         │
│  - ExplainabilityEngine (Deterministic Evidence Assembly)  │
└─────────────────────────────────────────────────────────────┘
```

### Layer Authority & Ownership Matrix

| Dimension | Frontend Layer | Backend API Layer | AI Orchestration Layer | AI Engines Layer |
| :--- | :--- | :--- | :--- | :--- |
| **Scheduling Decision** | Presentation Only | Persists Accepted Runs | Pipeline Coordination | **Authoritative** (OptimizationEngine) |
| **Safety Feasibility** | Warning Rendering | Integrity Validation | Safety Pipeline Hook | **Authoritative** (Rules & Constraints) |
| **Criticality Scoring** | Display ($0\text{--}100$) | Ingestion Storage | Invocations Coordinator | **Authoritative** (CriticalityEngine) |
| **Data Persistence** | Local/Session Cache | **Authoritative** (PostgreSQL) | Stateless Run Cache | Stateless Computations |
| **Audit Logs** | Audit Viewer | **Authoritative** (auditLogs) | Execution Trace Tags | Traceability Proofs |
| **External Systems** | User Interactions | TMS/COA Ingest Adapters| Synthetic Data Feeds | Preprocessed Payloads |

*Direct browser-to-Python execution is explicitly prohibited.* The frontend communicates strictly with the backend API or a mock-contract adapter conforming identically to the backend/AI contract.

---

## 3. Frontend Information Architecture

The application is structured into 9 operational workspaces accessible through a unified Railway Operations Command Shell.

```
App Shell (Navbar, Status Banner, Corridor Selector, Active Time Horizon)
 │
 ├── 1. Dashboard (`/`)
 ├── 2. Planning & Schedule (`/planning`)
 ├── 3. Maintenance Tasks (`/tasks`)
 ├── 4. Shadow Blocks (`/shadow-blocks`)
 ├── 5. Trains & Movements (`/trains`)
 ├── 6. Conflicts & Alerts (`/conflicts`)
 ├── 7. What-If Scenarios (`/what-if`)
 ├── 8. Emergency Planning (`/emergency`)
 ├── 9. Explainability & Decisions (`/explain`)
 └── 10. System Status & Audit Logs (`/system`)
```

### Detailed Page Specifications

#### 1. Dashboard (`/`)
* **Purpose:** High-level operational cockpit summarizing real-time corridor health, pending vs. scheduled maintenance backlog, active blocks, and optimization performance.
* **Primary User:** Chief Controller / Divisional Operations Manager (DOM).
* **Data Required:** Summary KPIs (total tasks, pending, scheduled, overdue), corridor breakdown, recent optimization runs, active possession blocks, current conflict alerts.
* **Source:** Backend `GET /api/planning/dashboard`, `GET /api/conflicts`.
* **Key Components:** `KpiGrid`, `CorridorStatusBar`, `OptimizationEfficiencyCard`, `HighPriorityTaskWidget`, `ActiveBlockMiniTimeline`, `AlertTicker`.
* **Main Actions:** Corridor filter dropdown, "Generate Optimization" quick-action modal trigger, direct drill-down into critical tasks.
* **States:** 
  * *Loading:* Skeleton KPI tiles and pulsating timeline bar.
  * *Empty:* Zero-state prompt: "No active corridors found. Check system seed."
  * *Error:* Banner alert with retry button and fallback to cached snapshot.

#### 2. Planning / Schedule (`/planning`)
* **Purpose:** Interactive Gantt-style schedule visualizer for multi-department maintenance blocks and train paths across 24-hour and 7-day planning horizons.
* **Primary User:** Section Controller / Assistant Operations Manager.
* **Data Required:** Planned blocks, block tasks, scheduled train movements, block windows, optimization status (`OPTIMAL`, `FEASIBLE`, `PARTIAL`, `INFEASIBLE`, `FAILED`).
* **Source:** Backend `GET /api/blocks`, `GET /api/trains/block-windows`, `POST /api/planning/generate`, AI Orchestration payload.
* **Key Components:** `ScheduleTimelineCanvas`, `BlockGanttRow`, `TrainMovementPath`, `PossessionWindowOverlay`, `ScheduleStatusHeader`, `BlockDetailDrawer`, `UnscheduledTasksTray`.
* **Main Actions:** Run optimization, filter by corridor (`NDLS-AGC`, `AGC-GWL`), toggle train movement overlay, zoom scale (4h / 12h / 24h / 7d), approve/reject block.
* **States:**
  * *Loading:* Horizontal track skeleton loaders with status spinner.
  * *Empty:* "No blocks scheduled for selected window. Click 'Run Optimizer' to generate schedule."
  * *Error:* Detailed solver failure banner with error code and unscheduled task list.

#### 3. Maintenance Tasks (`/tasks`)
* **Purpose:** Comprehensive repository of all permanent way, traction, and signaling work items awaiting possession or in-flight.
* **Primary User:** Senior Section Engineer (P-Way, TRD, S&T).
* **Data Required:** Array of `MaintenanceTask` records, associated defects, asset codes, priority scores, overdue days.
* **Source:** Backend `GET /api/maintenance/tasks/all`, `GET /api/maintenance/tasks/:id`.
* **Key Components:** `TaskDataTable`, `PriorityScoreBadge`, `DepartmentPill`, `OverdueCounter`, `TaskDetailSheet`, `CriticalityFactorBreakdown`.
* **Main Actions:** Search by task code/asset, filter by department (`ENG`, `TRD`, `SNT`), filter by status, trigger priority recalculation, view task explanation.
* **States:**
  * *Loading:* Table row pulse animations.
  * *Empty:* "No maintenance tasks match the current filter criteria."
  * *Error:* Inline table error with "Reload Tasks" action.

#### 4. Shadow Blocks (`/shadow-blocks`)
* **Purpose:** Surface joint-maintenance opportunities where multiple departments share a single track possession window to eliminate duplicate train closures.
* **Primary User:** Planning Controller / Inter-Departmental Coordination Cell.
* **Data Required:** Array of `ShadowBlockCandidate` records (both feasible and rejected candidates), estimated time savings, corridor occupancy.
* **Source:** AI Engine `find_shadow_opportunities`, Backend `GET /api/blocks?type=shadow`.
* **Key Components:** `ShadowBlockMatrix`, `CandidateCard`, `SavingsBadge`, `MultiDeptParticipationList`, `RejectionReasonCallout`.
* **Main Actions:** Accept candidate for schedule insertion, inspect rejection evidence, filter by corridor section.
* **States:**
  * *Loading:* Card grid skeleton.
  * *Empty:* "No shadow block candidates discovered for this window."
  * *Error:* Error card with deterministic engine diagnostic logs.

#### 5. Trains & Train Movements (`/trains`)
* **Purpose:** Visibility into timetable train schedules, speed classifications, priority hierarchies, and estimated disruption impact caused by planned blocks.
* **Primary User:** Train Controller / Punctuality Officer.
* **Data Required:** Array of `TrainMovement` / `Train` records, scheduled arrival/departures, train type (`PASSENGER`, `EXPRESS`, `GOODS`, `SPECIAL`), estimated delay minutes.
* **Source:** Backend `GET /api/trains`, `GET /api/trains/forecasts`.
* **Key Components:** `TrainMovementList`, `DisruptionMetricCard`, `SpeedClassBadge`, `TrainPriorityTag`, `TrainPassageConflictIndicator`.
* **Main Actions:** Filter by train type (Passenger vs. Goods), search train number (`12002`, `22436`), inspect passage conflicts with maintenance blocks.
* **States:**
  * *Loading:* Timetable loading shimmer.
  * *Empty:* "No train movements recorded for this corridor."
  * *Error:* Connection alert to COA integration feed.

#### 6. Conflicts & Alerts (`/conflicts`)
* **Purpose:** Centralized operations alert dashboard categorizing all operational violations: train path conflicts, resource shortages, window overflows, safety/interlocking risks, and deadline breaches.
* **Primary User:** Safety Officer / Section Controller.
* **Data Required:** Array of `Conflict` records, severity (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), affected entity IDs, start/end timestamps.
* **Source:** AI Optimization Result `train_conflicts` / Backend conflict endpoints.
* **Key Components:** `ConflictCategoryTabs`, `ConflictAlertCard`, `SeverityIndicator`, `AffectedEntitiesPillList`, `RecommendedActionBox`.
* **Main Actions:** Filter by conflict category, dismiss reviewed alert, jump to affected block in Planning timeline.
* **States:**
  * *Loading:* Alert card placeholders.
  * *Empty:* "Clear Section: Zero active conflicts or safety violations detected." (Green banner).
  * *Error:* Critical error state: "Unable to verify section safety constraints."

#### 7. What-If Scenarios (`/what-if`)
* **Purpose:** Interactive sandbox allowing dispatchers to simulate operational incidents (e.g. 45-min train delay, locomotive failure, track possession curtailment) and preview re-optimized block schedules.
* **Primary User:** Senior Divisional Operations Manager (Sr. DOM).
* **Data Required:** Active baseline schedule, scenario configuration parameters, diff metrics (`objective_score`, `train_disruption_minutes`, `resource_utilization_delta`), changed blocks list.
* **Source:** AI Engine `what_if_reoptimize` via Backend `POST /api/planning/scenarios/what-if`.
* **Key Components:** `ScenarioConfigForm`, `ScheduleDiffViewer` (Baseline vs. Simulated), `DeltaMetricsBadge`, `ImpactedTrainsList`, `ReoptimizationLog`.
* **Main Actions:** Select scenario type, adjust input variables (delay duration, blocked section), execute re-optimization, apply or discard simulated schedule.
* **States:**
  * *Loading:* Dual-progress simulation spinner with solver iteration indicator.
  * *Empty:* "Select a scenario type above to begin operational impact simulation."
  * *Error:* Infeasible scenario notice with mathematical cause.

#### 8. Emergency Planning (`/emergency`)
* **Purpose:** Expedited workflow for unscheduled urgent defects (e.g., fractured rail detected by USFD, OHE pantograph entanglement, track circuit failure) requiring immediate possession insertion.
* **Primary User:** Emergency Incident Commander / Chief Controller.
* **Data Required:** Emergency defect payload (`EmergencyEvent`), available emergency possession slots, urgency rating, expedited schedule candidate.
* **Source:** AI Engine `insert_emergency_event` via Backend `POST /api/planning/emergency`.
* **Key Components:** `EmergencyIncidentForm`, `HighUrgencyBanner`, `ImmediateSlotPicker`, `EmergencySchedulePreview`, `DownstreamImpactSummary`.
* **Main Actions:** Fast-register defect, evaluate emergency slot options, trigger emergency block insertion, notify section field units.
* **States:**
  * *Loading:* High-priority pulsing solver spinner.
  * *Empty:* "No active emergency events recorded. System operating in standard schedule mode."
  * *Error:* "Emergency Slot Conflict: No feasible window without disrupting P1 critical services."

#### 9. Explainability & Decision Detail (`/explain`)
* **Purpose:** Dedicated decision audit console allowing operators to inspect the mathematical and rule-based rationale behind any schedule selection, task prioritization, or candidate rejection.
* **Primary User:** Railway Safety Board / Operations Quality Auditor.
* **Data Required:** `Explanation` records containing `entity_id`, `entity_type`, `summary`, `reason_codes`, `evidence`, `deterministic_inputs`, `generated_by`.
* **Source:** AI Engine `ExplainabilityEngine` via Backend `GET /api/planning/explanations/:id`.
* **Key Components:** `DecisionExplanationCard`, `EvidenceKeyValueTable`, `ReasonCodeTagCloud`, `EngineProvenanceBadge`, `MathematicalFormulaViewer`.
* **Main Actions:** Query explanation by Task ID or Block ID, export formal decision audit report.
* **States:**
  * *Loading:* Code/data inspection skeleton.
  * *Empty:* "Select any task, block, or conflict from other pages to view its deterministic trace."
  * *Error:* "Explanation trace unavailable for the requested entity."

---

## 4. Dashboard Design & Railway Operational Metrics

The dashboard avoids generic SaaS vanity graphs and focuses strictly on real operational indicators supported by the contracts.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  INDIAN RAILWAYS AUTOMATIC BLOCK PLANNING Cockpit  [ Corridor: NDLS-AGC ▼ ] [Horizon: 7D]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [ CRITICAL TASKS (P1) ]  [ HIGH TASKS (P2) ]  [ ACTIVE BLOCKS ]  [ SHADOW SAVINGS ]   │
│           4                     11                     6               210 Mins (3.5h) │
│    +1 Overdue Rail          5 TRD / 6 S&T       3 Executing, 3 Appr.   18.4% Disruption│
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│ SCHEDULED vs PENDING     │ RECENT OPTIMIZATION RUN     │ ACTIVE CORRIDOR STATUS        │
│ ┌──────────────────────┐ │ Run: OPT-20261103-01        │ NDLS-AGC (Km 0 - 195)         │
│ │ Scheduled: 24 (68%)  │ │ Status: OPTIMAL (1.84s)     │ Traffic Density: 0.83 (HIGH)  │
│ │ Pending:   11 (32%)  │ │ Objective Score: 0.78       │ Double Track Electrified      │
│ └──────────────────────┘ │ Train Delay: 95m (↓20.8%)   │ Track Possessions: 2 Active   │
├──────────────────────────┴─────────────────────────────┴───────────────────────────────┤
│ ACTIVE OPERATIONAL ALERTS (3)                                                          │
│ ⚠ [TRAIN_CONFLICT] Block BLK-04 overlaps 12002 Shatabdi Exp at Km 45.2 (HIGH)         │
│ ⚠ [RESOURCE_CONFLICT] USFD Vehicle V-12 double-allocated between Task 01 and Task 04 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Supported Metric Definitions
1. **Critical Tasks ($P_1$):** Total count of tasks where `priority_class === "P1"` or `criticalityScore >= 85`.
2. **High Priority Tasks ($P_2$):** Total count of tasks with `priority_class === "P2"` ($70 \le \text{Score} < 85$).
3. **Scheduled vs. Unscheduled Ratio:** Tasks allocated to blocks vs. tasks left in `PENDING` / `UNSCHEDULED` state.
4. **Active & Planned Maintenance Blocks:** Total blocks grouped by status (`PROPOSED`, `APPROVED`, `EXECUTED`).
5. **Shadow Block Efficiency:** Total combined blocks created, cumulative minutes saved (`savingMinutes`), and percentage compression (`savingPercentage`).
6. **Train Disruption Impact:** Cumulative estimated delay minutes (`train_disruption_minutes`) vs. baseline (`baseline_train_disruption`), showing net percentage reduction.
7. **Solver Optimization Status:** Latest run outcome badge (`OPTIMAL`, `FEASIBLE`, `PARTIAL`, `INFEASIBLE`, `FAILED`) with solver runtime in milliseconds (`solver_runtime_ms`).
8. **Corridor Health & Asset Availability:** Active track km count, degraded assets (`assetStatus === "DEGRADED"`), and possession windows remaining.

---

## 5. Planning / Schedule UI Architecture

The core planning interface represents a specialized railway corridor timetable and block layout.

### Visual Components
* **Y-Axis (Corridor Spatial Grid):** Railway kilometer distance markers (e.g., Km 0.000 New Delhi to Km 195.000 Agra Cantt), showing station locations and block sections.
* **X-Axis (Time Horizon):** 24-hour or 7-day temporal axis with hour increments, highlighting night possession windows (typically 23:00 to 04:00) with shaded vertical bands.
* **Block Possession Bars:** Colored horizontal rectangles representing maintenance blocks.
  * Bar height spans the affected kilometer range (`locationStartKm` to `locationEndKm`).
  * Bar width spans start time to end time (`startAt` to `endAt`).
  * Bar color indicates participating departments: Solid Indigo for Civil Engineering (`ENG`), Amber for Traction (`TRD`), Emerald for Signaling (`SNT`), and Striped/Multi-color for Integrated Shadow Blocks.
* **Nested Task Indicators:** Sub-segments inside a block bar showing individual maintenance tasks, their assigned duration, and equipment crew badges.
* **Train Trajectories (Time-Distance Paths):** Diagonal paths traversing the canvas representing train movements.
  * Down trains slope downwards; Up trains slope upwards.
  * Superfast/Passenger trains represented with sharp distinct lines (e.g. Red for Vande Bharat/Rajdhani, Blue for Mail/Express, Grey for Freight).
  * Intersections between a train path and a maintenance block bar trigger glowing conflict markers.

### Schedule Status Presentation Hierarchy

| Status Enum | UI Badge Style | Operator Visual Presentation & Action |
| :--- | :--- | :--- |
| `OPTIMAL` | **Emerald Pill** (Glow) | Full multi-objective convergence. Zero hard constraint violations. All high-criticality tasks scheduled. Ready for divisional sign-off. |
| `FEASIBLE` | **Blue Pill** | Valid schedule without safety violations. Minor secondary soft-constraint compromises (e.g., non-critical task deferred). |
| `PARTIAL` | **Amber Pill** | High-criticality tasks accommodated, but several medium/low tasks could not be scheduled due to window/crew shortages. Drawer lists deferred tasks. |
| `INFEASIBLE` | **Rose/Red Pill** | Constraints conflict (e.g., emergency task required in fully occupied corridor without allowable train reschedule window). Requires human supervisor override. |
| `FAILED` | **Dark Crimson Pill** | Engine or solver execution error. Traces displayed in diagnostic pane with error codes. |

---

## 6. Maintenance Task UI & Deterministic Breakdown

The Maintenance Task UI allows operators to inspect, filter, and drill into individual work orders.

### Table Columns & Data Types
1. **Task Code:** `taskCode` (e.g., `TSK-ENG-NDLS-045-01`).
2. **Department:** Badge rendering `ENG`, `TRD`, or `SNT`.
3. **Asset & Km:** Location string (`assetCode` @ `locationStartKm` - `locationEndKm`).
4. **Task Type:** Pill rendering `USFD`, `TRD`, `SNT`, `ENGINEERING`, `DEFECT_REPAIR`.
5. **Criticality / Priority:** Dual indicator showing priority rank (`P1`, `P2`, `P3`, `P4`) alongside numerical score ($0\text{--}100$).
6. **Duration:** Formatted minutes (`estimatedDurationMinutes`, e.g., `150 mins`).
7. **Deadline / Due Date:** ISO date with color-coded countdown (`overdueDays` > 0 triggers overdue badge).
8. **Possession Status:** `SCHEDULED` (linked to Block ID), `PENDING`, `IN_PROGRESS`, `COMPLETED`.

### Deterministic Criticality Breakdown Panel
When an operator selects a task, a sliding detail sheet renders the exact factor contributions computed by `CriticalityEngine`:

```
┌─────────────────────────────────────────────────────────────────┐
│ TASK DETAILS: TSK-ENG-NDLS-045-01 (Rail Head Split Defect)       │
├─────────────────────────────────────────────────────────────────┤
│ CRITICALITY SCORE: 94 / 100   [ PRIORITY: P1 ]  [ RISK: CRITICAL]│
│ Model: criticality_v1_rule_2026Q4  |  Mode: RULE_BASED          │
├─────────────────────────────────────────────────────────────────┤
│ FACTOR CONTRIBUTIONS                                            │
│ Severity (CRITICAL)           [████████████████░░░░]  0.28 / 0.30│
│ Urgency (Immediate Action)    [███████████████░░░░░]  0.22 / 0.25│
│ Safety Risk (Derailment Risk) [██████████████████░░]  0.20 / 0.20│
│ Traffic Density (0.83 HDN)    [█████████░░░░░░░░░░░]  0.09 / 0.10│
│ Speed Class (130 km/h High)   [███████░░░░░░░░░░░░░]  0.07 / 0.08│
│ Deadline Proximity (< 24 hrs) [████████░░░░░░░░░░░░]  0.08 / 0.07│
├─────────────────────────────────────────────────────────────────┤
│ DETERMINISTIC EXPLANATION:                                      │
│ "High severity (HEAD_SPLIT), critical safety risk, and extreme  │
│  urgency dominate the score. Immediate track possession required│
│  prior to 2026-11-04T18:00:00Z."                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Criticality Presentation & Terminology Standard

To maintain complete consistency with the AI contracts (`OPTIMIZATION_CONTRACT.md §2` and `AI_DOMAIN_CONTRACT.md §9`), the frontend adheres strictly to the following scales and classifications:

* **Internal Score:** $0.0 \text{ to } 1.0$ (float scalar).
* **UI Display Score:** $0 \text{ to } 100$ (computed as $\text{round}(\text{internal\_score} \times 100)$).
* **Priority Classes:**
  * **$P_1$ (Critical):** Display score $\ge 85$. Immediate same-cycle possession required.
  * **$P_2$ (High):** Display score $70 \le \text{Score} < 85$. Target execution within 48 hours.
  * **$P_3$ (Medium):** Display score $50 \le \text{Score} < 70$. Regular planned weekly window.
  * **$P_4$ (Low):** Display score $< 50$. Routine cyclical possession.
* **Risk Levels:** `CRITICAL`, `HIGH`, `MEDIUM`, `LOW`.
* **Scoring Modes:** `RULE_BASED` (current active engine) and `MODEL_BASED` (future ML).

> [!NOTE]
> The frontend never recalculates the score. If the user edits a task attribute (e.g. changes severity or overdue days), the frontend sends a `POST /api/maintenance/tasks/:id/recalculate-priority` request to the backend and renders the returned server-computed score.

---

## 8. Shadow Block UI & Multi-Department Integration

Shadow blocks represent the core innovation of the SIH prototype: grouping maintenance across departments into a single block window.

### UI States for Shadow Blocks
1. **Selected / Accepted Shadow Block:** Rendered on the schedule canvas with a distinctive green boundary and multi-department badge ribbon.
2. **Candidate Shadow Block:** Surfaced in the "Opportunities" tab as an actionable card showing calculated time savings and shared corridor benefits.
3. **Rejected Candidate:** Displayed in the "Infeasible / Rejected" filter with explicit deterministic rejection evidence.

### Shadow Block Card Layout
```
┌─────────────────────────────────────────────────────────────────┐
│ SHADOW BLOCK: SB-301 (Agra Section Km 134.2 - 136.1)            │
│ Status: FEASIBLE  |  Benefit Score: 0.81  |  Time Saved: 95 mins│
├─────────────────────────────────────────────────────────────────┤
│ PRIMARY TASK:                                                   │
│ [ENG] TSK-001: Rail Defect Scan (USFD Vehicle V-12)             │
│                                                                 │
│ INTEGRATED SECONDARY TASKS (Piggybacked):                       │
│ ↳ [TRD] TSK-010: OHE Cantilever Inspection (Tower Wagon TW-04)  │
│ ↳ [SNT] TSK-021: Point Machine Interlocking Overhaul (Crew SNT-2)│
├─────────────────────────────────────────────────────────────────┤
│ Proposed Window: 2026-11-03 23:00 to 2026-11-04 01:30 (150 mins)│
│ Corridor Occupancy: 68% (Reduced duplicate closure by 95 mins)  │
├─────────────────────────────────────────────────────────────────┤
│ [ Button: Approve & Insert in Schedule ]  [ Button: View Proof ]│
└─────────────────────────────────────────────────────────────────┘
```

### Rendering Rejected Candidates
If a candidate was rejected by `ShadowBlockEngine`, the UI must clearly display the conflict type and deterministic reason:
* **Example:** `Conflict Status: REJECTED (SAFETY_CONFLICT)`
* **Rendered Explanation:** *"Tasks TSK-001 (P-Way heavy tamping) and TSK-021 (S&T point sensor calibration) cannot co-occupy Section 12 simultaneously due to interlocking clearance rule IR-SIG-402."*

---

## 9. Train Movement UI & Disruption Representation

The Train Movement interface allows operators to observe how planned maintenance interacts with the timetable.

### Field Mapping & Visual Truth
* **Train Identification:** Displays `trainNumber` (e.g. `22436`), `trainName` (e.g. `Vande Bharat Express`), and `trainType` (`EXPRESS`, `PASSENGER`, `GOODS`, `SPECIAL`).
* **Direction & Class:** Direction (`UP`, `DOWN`, `BOTH`), `speedClass` (`HIGH`, `EXPRESS`), `priority_class` (`SUPERFAST`, `PASSENGER`, `FREIGHT`).
* **Movement Bounds:** `movement_start`, `movement_end`, `from_km`, `to_km`.
* **Disruption Nature:** The UI explicitly labels delays as **"Estimated Disruption Penalty"** or **"Simulated Passage Delay"** to ensure dispatchers understand data comes from optimization heuristics/synthetic schedules rather than live GPS feeds.

---

## 10. Unified Conflicts & Alerts Architecture

Every conflict detected during scheduling is routed into a unified operational alert drawer.

### Conflict Classification Schema

| Conflict Type Enum | Meaning in Railway Context | Visual Severity | Required UI Evidence |
| :--- | :--- | :--- | :--- |
| `TRAIN_CONFLICT` | Block overlaps with scheduled train path on non-isolated track | **HIGH / CRITICAL** | Overlapping Train ID, Train Number, passage time interval, affected section km. |
| `RESOURCE_CONFLICT` | Same specialized machinery (e.g. USFD vehicle, Tower Wagon) allocated simultaneously | **HIGH** | Resource ID, conflicting Task IDs, overlapping duration. |
| `WINDOW_CONFLICT` | Task duration exceeds available possession window grant | **MEDIUM** | Window ID, available minutes vs. required minutes, window start/end. |
| `SAFETY_CONFLICT` | Interlocking rule, traction power rule, or spatial clearance violation | **CRITICAL** | Specific rule code, incompatible task pair, safety risk score. |
| `DEADLINE_CONFLICT` | Scheduled time extends past regulatory defect rectification deadline | **HIGH** | Defect ID, deadline timestamp, scheduled block end timestamp. |

The frontend renders the deterministic `description` and `entity_ids` provided by the backend, never formulating speculative text.

---

## 11. What-If Scenario Simulation Workflow

The What-If module enables dispatchers to test operational contingencies and preview re-optimized results before making field commitments.

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Current Active Schedule (Base: SCHED-01)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ User selects scenario type & sets parameters
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Scenario Configuration Form                              │
│    Type: TRAIN_DELAY (or BLOCK_UNAVAILABLE, TASK_ADDED, etc)│
│    Parameters: Train 12002 delayed by +45 mins at NDLS      │
└──────────────────────────────┬──────────────────────────────┘
                               │ Submit: POST /api/planning/scenarios/what-if
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. AI Re-Optimization Execution                             │
│    Solver runs multi-objective re-evaluation                │
└──────────────────────────────┬──────────────────────────────┘
                               │ Returns ReoptimizationResult
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Visual Comparison View (Baseline vs. Simulated Schedule) │
│    - Side-by-side or overlay timeline diff                  │
│    - Highlighted changed blocks & shifted tasks             │
│    - Delta Metrics: Disruption Δ, Objective Δ, Occupancy Δ │
│    - Deterministic Re-optimization Explanation             │
└─────────────────────────────────────────────────────────────┘
```

### Supported Scenario Types
1. `TRAIN_DELAY`: Specifies delayed train and minutes delay.
2. `BLOCK_UNAVAILABLE`: Cancels a planned corridor maintenance window.
3. `RESOURCE_UNAVAILABLE`: Simulates machinery or crew breakdown.
4. `EMERGENCY_TASK_INSERTED`: Injects an urgent defect task into the timeline.
5. `TASK_DURATION_CHANGED`: Extends estimated work duration.
6. `TASK_ADDED`: Introduces an additional work order into the pending pool.

---

## 12. Emergency Planning Workflow

Emergency planning represents an expedited operational protocol when safety-critical defects arise.

### Operational Sequence
1. **Defect Entry:** Operator fills streamlined emergency form specifying:
   * Event Type (`NEW_USFD_DEFECT`, `TRACK_FAILURE`, `SIGNAL_FAILURE`).
   * Corridor & Exact Km (e.g. `NDLS-AGC` @ Km 45.200).
   * Defect Severity (`CRITICAL` / `HIGH`).
2. **Instant Criticality Assessment:** Immediate display of auto-calculated criticality score (typically $\ge 90$) and maximum allowable time-to-repair.
3. **Emergency Possession Discovery:** System highlights next feasible 60-120 minute possession windows across the section.
4. **Emergency Optimization Request:** AI engine computes minimum-disruption block insertion.
5. **Impact Briefing:** UI details which passenger/freight trains must be regulated or looped, and outputs emergency dispatch documentation.

---

## 13. Reusable Explainability Component

A shared `ExplanationDrawer` component is integrated across all views to render rule-traceable evidence.

### Component Structure
* **Header:** Entity badge (e.g. `[BLOCK] BLK-55` or `[TASK] TSK-001`), generated by badge (`OPTIMIZATION_ENGINE`, `CRITICALITY_ENGINE`, `SHADOW_BLOCK_ENGINE`).
* **Summary Banner:** High-level deterministic summary sentence.
* **Reason Codes:** Chip list of exact machine reason codes (e.g. `criticality_score_high`, `window_available`, `train_conflict_avoided`).
* **Evidence Grid:** Key-value table of quantitative attributes directly used in the decision (e.g., `criticality_score: 0.94`, `train_disruption_minutes: 95`, `window_conflict: false`).
* **Deterministic Inputs:** Collapsible JSON/tree viewer showing exact parameter weights and input IDs.

---

## 14. API Contract & TypeScript Types Layer

To ensure strict decoupling, all data structures are defined in a centralized types layer (`frontend/src/types/api.ts`) that matches the backend and AI contracts identically.

```typescript
// frontend/src/types/api.ts

export type DepartmentCode = "ENG" | "TRD" | "SNT";
export type AssetStatus = "ACTIVE" | "DEGRADED" | "FAILED" | "UNDER_MAINTENANCE" | "RETIRED";
export type TaskStatus = "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "BLOCKED";
export type TaskType = "USFD" | "TRD" | "SNT" | "ENGINEERING" | "DEFECT_REPAIR" | "PREVENTIVE" | "CORRECTIVE" | "INSPECTION" | "EMERGENCY" | "OTHER";
export type DefectSeverity = "MINOR" | "MODERATE" | "SEVERE" | "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
export type TrainType = "PASSENGER" | "EXPRESS" | "GOODS" | "SPECIAL";
export type BlockStatus = "DRAFT" | "PROPOSED" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED";
export type PlanningHorizon = "WEEKLY" | "MONTHLY";
export type ConflictType = "TRAIN_CONFLICT" | "RESOURCE_CONFLICT" | "WINDOW_CONFLICT" | "SAFETY_CONFLICT" | "DEADLINE_CONFLICT";
export type ConflictSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type OptimizationStatus = "OPTIMAL" | "FEASIBLE" | "PARTIAL" | "INFEASIBLE" | "FAILED";
export type PriorityClass = "P1" | "P2" | "P3" | "P4";
export type ScenarioType = "TRAIN_DELAY" | "BLOCK_UNAVAILABLE" | "RESOURCE_UNAVAILABLE" | "EMERGENCY_TASK_INSERTED" | "TASK_DURATION_CHANGED" | "TASK_ADDED";

export interface MaintenanceTask {
  id: string;
  taskCode: string;
  assetId: string;
  departmentId: string;
  corridorId: string;
  defectId?: string | null;
  taskType: TaskType;
  description?: string | null;
  locationStartKm: number | string;
  locationEndKm: number | string;
  criticalityScore: number; // 0-100 display
  urgencyScore: number;
  safetyScore: number;
  operationalImpactScore: number;
  priorityScore: number | string;
  estimatedDurationMinutes: number;
  overdueDays: number;
  dueAt?: string | null;
  status: TaskStatus;
  requiredBlock: boolean;
  requiresPowerShutdown: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CriticalityScoreDetail {
  entity_id: string;
  score: number; // 0.0 - 1.0 internal
  display_score: number; // 0 - 100
  priority_class: PriorityClass;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  feature_contributions: {
    severity: number;
    urgency: number;
    safety_risk: number;
    traffic_density: number;
    speed_class: number;
    deadline_proximity: number;
  };
  explanation: string;
  model_version: string;
  confidence?: number;
  scoring_mode: "RULE_BASED" | "MODEL_BASED";
}

export interface ShadowBlockCandidate {
  shadow_block_id: string;
  primary_task_id: string;
  participating_task_ids: string[];
  sections: string[];
  departments: string[];
  proposed_window_start: string;
  proposed_window_end: string;
  estimated_duration_minutes: number;
  estimated_corridor_occupancy: number;
  potential_time_saving_minutes: number;
  resource_usage: Record<string, number>;
  conflict_status: "FEASIBLE" | "CONFLICT" | "REJECTED";
  shadow_benefit_score?: number;
  reasons?: string[];
}

export interface Conflict {
  conflict_id: string;
  conflict_type: ConflictType;
  entity_ids: string[];
  section_id?: string;
  start: string;
  end: string;
  severity: ConflictSeverity;
  description: string;
}

export interface Explanation {
  explanation_id: string;
  entity_type: "BLOCK" | "TASK" | "WINDOW" | "GROUPING" | "SCHEDULE" | "REJECTION";
  entity_id: string;
  summary: string;
  reason_codes: string[];
  evidence: Record<string, any>;
  deterministic_inputs: Record<string, any>;
  generated_by: string;
}

export interface OptimizationResult {
  runId?: string;
  runCode?: string;
  status: OptimizationStatus;
  selected_task_ids: string[];
  unscheduled_task_ids: string[];
  schedule_candidates: Array<{
    schedule_id: string;
    task_ids: string[];
    blocks: Array<{
      block_id: string;
      blockCode?: string;
      section_id: string;
      start: string;
      end: string;
      durationMinutes?: number;
      tasks?: any[];
    }>;
    start_time: string;
    end_time: string;
    estimated_disruption_minutes: number;
    resource_assignments: Record<string, string[]>;
    confidence?: number;
    status: string;
  }>;
  shadow_blocks: ShadowBlockCandidate[];
  train_conflicts: Conflict[];
  resource_utilization: Record<string, number>;
  objective_score: number;
  baseline_comparison: {
    delta_objective?: number;
    train_disruption_reduction_pct?: number;
    savingMinutes?: number;
    savingPercentage?: number;
  };
  solver_statistics: {
    runtime_ms: number;
    iterations?: number;
  };
  generated_at: string;
  explanations?: Explanation[];
}
```

---

## 15. Mock Data Strategy & High-Fidelity Seed Datasets

To enable immediate parallel development without waiting for end-to-end backend/Python AI integration, the frontend includes a self-contained Mock Data Service (`frontend/src/mocks/`).

### Mock Dataset Integrity Rules
1. **Realistic Railway Domain:** Centered strictly on the seeded `NDLS-AGC` (New Delhi to Agra Cantt) and `AGC-GWL` (Agra Cantt to Gwalior) corridors.
2. **Real Train Numbers:** Incorporates actual train profiles (e.g. `22436 Vande Bharat Express`, `12002 Bhopal Shatabdi Express`, `12626 Kerala Express`, `BOXN Coal Freight`).
3. **Exact Contract Conformance:** All records use actual enum strings (`ENG`, `TRD`, `SNT`, `P1` through `P4`, `HEAD_SPLIT`, etc.).
4. **Edge Cases Represented:**
   * High-urgency $P_1$ rail fracture defect requiring emergency shutdown.
   * Multi-department shadow block opportunity with 95 minutes saved.
   * Incompatible safety grouping rejected with interlocking evidence.
   * Train conflict alert where maintenance overlaps Shatabdi Express.
   * Unscheduled task unable to fit due to resource exhaustion.

### Transparent Switching Mechanism
The API client checks an environment variable:
```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK_AI === "true";
```
When `true`, API calls are intercepted by local mock adapters returning synthetic payloads instantly. When `false`, requests route directly to `http://localhost:5000/api`.

---

## 16. Component Architecture & Design System

Components are segregated into **Generic UI Atoms** and **Domain-Specific Railway Molecules/Organisms**.

```
frontend/src/components/
├── common/                     # Generic Reusable Atoms (Design System)
│   ├── Button/
│   ├── Badge/
│   ├── Card/
│   ├── Modal/
│   ├── Drawer/
│   ├── DataTable/
│   ├── Skeleton/
│   ├── AlertBanner/
│   └── EmptyState/
│
└── domain/                     # Railway Domain-Specific Organisms
    ├── Shell/                  # Top Nav, Corridor Picker, System Status
    ├── Timeline/               # Multi-track Gantt timeline, Block bars, Train paths
    ├── Tasks/                  # Task table row, Criticality score dial, Factor breakdown
    ├── ShadowBlocks/           # Shadow block matrix card, Savings badge
    ├── Conflicts/              # Conflict alert card, Severity icon, Affected entity pills
    ├── WhatIf/                 # Scenario config modal, Schedule diff side-by-side
    ├── Emergency/              # Emergency defect fast-entry form, Urgency banner
    └── Explainability/         # Deterministic explanation drawer & evidence viewer
```

---

## 17. State Management Architecture

A lightweight, robust state strategy is employed without third-party Redux bloat:

1. **Server State (Async Data):**
   * Handled via a simple React hook pattern (`useQuery` / `useApiFetch`) with caching, request deduplication, and loading/error flags.
2. **URL Search Parameter State (Filters & Selection):**
   * Active corridor (`?corridor=NDLS-AGC`), selected time horizon (`?horizon=WEEKLY`), selected task/block (`?selectedBlock=BLK-55`), and table filters are serialized directly to URL query params.
   * *Benefits:* Bookmarkable operational states, seamless sharing between controllers, and browser back/forward navigation support.
3. **Local Component State:**
   * Form inputs, slider values, modal open/close states, and interactive timeline zoom levels are kept local to components.

---

## 18. Routing Configuration

Routing is managed via React Router v6 in `frontend/src/routes.tsx`:

| Route Path | Page Component | Description |
| :--- | :--- | :--- |
| `/` | `DashboardPage` | Overview KPIs, corridor health, recent runs, active alerts |
| `/planning` | `PlanningSchedulePage` | Interactive corridor timeline, block allocations, train paths |
| `/tasks` | `MaintenanceTasksPage` | Task inventory, criticality scores, filtering, department breakdown |
| `/shadow-blocks` | `ShadowBlocksPage` | Integrated shadow-block candidates, savings, rejected groupings |
| `/trains` | `TrainMovementsPage` | Train timetable, traffic density, estimated disruption penalties |
| `/conflicts` | `ConflictsAlertsPage` | Unified operational violations, safety risks, resource bottlenecks |
| `/what-if` | `WhatIfScenariosPage` | Simulation sandbox, disruption forms, baseline vs. simulated diff |
| `/emergency` | `EmergencyPlanningPage`| Rapid incident entry, emergency slot discovery, auto-insertion |
| `/explain` | `ExplainabilityPage` | Decision audit log, deterministic reasoning, mathematical evidence |
| `/system` | `SystemStatusPage` | Backend health, database connectivity, corridor seed inspector |

---

## 19. Visual Design Language (Railway Control Room Theme)

The UI adheres to a high-density, mission-critical operations aesthetic inspired by modern railway control centers:

* **Dark Operations Palette:**
  * Background Main: `#0B0F19` (Deep Obsidian)
  * Surface Card / Panel: `#111827` (Dark Slate Blue)
  * Surface Border: `#1F2937` (Subtle Steel Gray)
  * Text Primary: `#F9FAFB` (Crisp Off-White)
  * Text Muted: `#9CA3AF` (Muted Metallic Gray)
* **Railway Department Accents:**
  * Civil Engineering (`ENG`): `#3B82F6` (Electric Railway Blue)
  * Traction Distribution (`TRD`): `#F59E0B` (High-Voltage Amber)
  * Signal & Telecom (`SNT`): `#10B981` (Signal Green)
* **Operational Status Accents:**
  * Optimal / Safe / Approved: `#10B981` (Signal Green)
  * Warning / High Risk / Caution: `#F59E0B` (Caution Amber)
  * Critical / Derailment Risk / Conflict: `#EF4444` (Danger Red)
  * Shadow Block Integrated Possession: `#8B5CF6` (Possession Violet)
* **Typography & Monospace Data:**
  * Sans-Serif Font: `Inter`, system-ui for high legibility.
  * Monospaced Font: `JetBrains Mono` or `Courier New` for train numbers, timestamps, kilometer markers (`Km 134.200`), and coordinates.

---

## 20. Responsiveness & Screen Standards

* **Primary Screen Target:** $1920 \times 1080$ Full HD and $1440 \times 900$ control room workstations.
* **Secondary Laptop Support:** Fluid layout with collapsible sidebar down to $1280 \times 800$.
* **Timeline Scaling:** Horizontal scrolling canvas with fixed Y-axis corridor markers on narrower viewports. Timeline readability is never compromised for mobile-first simplifications.

---

## 21. Accessibility & Contrast Standards

* **WCAG 2.1 AA Compliance:** Minimum 4.5:1 contrast ratio across all text and interactive badges against dark surfaces.
* **Color-Blind Redundant Coding:** Status indicators combine color with explicit text labels and geometric icons (e.g. Danger Red triangle for conflicts, Green checkmark for approved blocks).
* **Keyboard Navigation:** Full tab order, escape key handling for modal/drawer dismissals, and ARIA labels on all timeline scrubbing controls.

---

## 22. Two-Developer Work Split & Boundary Protection

The codebase is organized so Developer A and Developer B can work in parallel on distinct directory trees with zero Git merge conflicts.

```
                  ┌─────────────────────────────────────┐
                  │          SHARED CONTRACTS           │
                  │  - frontend/src/types/api.ts        │
                  │  - frontend/src/mocks/data.ts       │
                  │  - frontend/src/api/client.ts       │
                  │  - frontend/src/components/common/  │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│          DEVELOPER A            │   │          DEVELOPER B            │
│  - App Shell & Navigation       │   │  - Maintenance Tasks Table      │
│  - Dashboard Cockpit            │   │  - Task Detail & Criticality    │
│  - Planning Timeline & Canvas   │   │  - Shadow Block Matrix          │
│  - Corridor & Asset Views       │   │  - Train Movements & Impact     │
│  - System Health Status         │   │  - Conflicts & Alert Drawer     │
│  Directory:                     │   │  - What-If Simulation Sandbox   │
│  frontend/src/features/         │   │  - Emergency Planning Protocol  │
│    ├── dashboard/               │   │  - Reusable Explainability      │
│    ├── planning/                │   │  Directory:                     │
│    └── system/                  │   │  frontend/src/features/         │
│                                 │   │    ├── tasks/                   │
│                                 │   │    ├── shadowBlocks/            │
│                                 │   │    ├── trains/                  │
│                                 │   │    ├── conflicts/               │
│                                 │   │    ├── whatIf/                  │
│                                 │   │    ├── emergency/               │
│                                 │   │    └── explain/                 │
└─────────────────────────────────┘   └─────────────────────────────────┘
```

### Conflict Avoidance Invariants
1. `types/api.ts` is the single source of truth. Any type change must be reviewed jointly.
2. Developer A owns the App Shell, Main Layout, and Timeline Canvas.
3. Developer B owns Feature Drawers, Detail Panels, and Simulation Forms.
4. Neither developer edits backend or AI files.

---

## 23. Implementation Phases

* **Phase 1: Foundation & Contracts (Day 1)**
  * Initialize Vite + React 18 + TypeScript in `frontend/`.
  * Define `types/api.ts` matching backend & AI domain contracts.
  * Build Mock Data Provider (`src/mocks/`) and central API Client (`src/api/client.ts`).
  * Implement Common Design System Atoms (`Button`, `Badge`, `Card`, `Modal`, `Drawer`).
* **Phase 2: App Shell & Core Planning Canvas (Day 2 - Dev A)**
  * Implement Top Navigation, Corridor Selector, and Horizon toggles.
  * Build Dashboard KPI cockpit with real mock metrics.
  * Construct Planning Schedule Timeline Canvas (X-axis time, Y-axis corridor km, block bars).
* **Phase 3: Task Inventory & Shadow Blocks (Day 2 - Dev B)**
  * Build Maintenance Tasks Table with department filters and priority sorting.
  * Implement Criticality Score Detail Sheet with feature contribution bars.
  * Build Shadow Block Matrix with time-saving calculations and rejection reason callouts.
* **Phase 4: Operations Core - Trains, Conflicts, What-If & Emergency (Day 3 - Dev B)**
  * Implement Train Movements list and disruption penalty display.
  * Construct Unified Conflicts & Alerts Center.
  * Build What-If Simulation form with dual schedule diff preview.
  * Build Emergency Defect Insertion fast-entry modal.
* **Phase 5: Decision Explainability & Backend Integration (Day 4 - Dev A & B)**
  * Connect reusable `ExplanationDrawer` across all views.
  * Wire API Client to live Express backend (`http://localhost:5000/api`).
  * Verify live data flow for Corridors, Assets, Tasks, and Planning Runs.
* **Phase 6: End-to-End Verification & Polish (Day 5)**
  * Full SIH demo flow rehearsals.
  * Color contrast checks, keyboard navigation audit, and responsive testing.

---

## 24. Future Machine Learning (XGBoost) Compatibility

While the current engine operates on deterministic rule-based criticality (`scoring_mode: "RULE_BASED"`), the frontend is pre-architected to seamlessly render future model-based risk predictions without code redesign:

```typescript
export interface CriticalityScoreDetail {
  entity_id: string;
  score: number;
  display_score: number;
  priority_class: PriorityClass;
  risk_level: string;
  feature_contributions: Record<string, number>;
  explanation: string;
  model_version: string;
  confidence?: number;                      // Reserved for ML confidence interval
  scoring_mode: "RULE_BASED" | "MODEL_BASED"; // Mode flag
  rule_score?: number;                      // Rule baseline comparison
  model_score?: number;                     // Raw XGBoost prediction
}
```
If `scoring_mode === "MODEL_BASED"`, the UI automatically displays model confidence badges (e.g. `94% Confidence`) and SHAP/tree feature importance weights using the existing `feature_contributions` bar chart.

---

## 25. SIH Final Demo Presentation Flow

A seamless, 7-minute end-to-end demo flow designed to impress evaluators:

1. **Dashboard Overview:** Point out 4 Critical ($P_1$) tasks on the New Delhi–Agra corridor, highlight active blocks, and show current 20.8% train disruption reduction.
2. **Task Deep-Dive:** Open Task `TSK-ENG-NDLS-045-01` (Rail Fracture Risk at Km 45.5). Show the deterministic criticality breakdown (Severity 0.28, Safety Risk 0.20, Urgency 0.22 $\to$ Score 94 / P1).
3. **Shadow Block Discovery:** Navigate to Shadow Blocks. Reveal candidate `SB-301` where Traction OHE maintenance and S&T sensor work piggyback on the P-Way rail possession, saving 95 minutes of track downtime.
4. **Generate Optimized Schedule:** Navigate to Planning Timeline. Trigger "Generate Schedule". Watch the timeline render conflict-free blocks for both single and shadow possessions.
5. **Inspect Train Impact:** Hover over `12002 Bhopal Shatabdi`. Demonstrate that the optimizer successfully scheduled the block into a 2.5-hour night possession window with 0 train passage conflicts.
6. **Open Deterministic Explanation:** Click "Why was this block scheduled?". Show the exact rule trace citing criticality dominance, window fit, and zero passenger conflict.
7. **Simulate What-If Disruption:** Trigger What-If Scenario: "Train 12002 delayed by 45 minutes". Execute re-optimization. Show the dynamic timeline diff where secondary blocks shift seamlessly to preserve safety margins.
8. **Emergency Defect Injection:** Trigger Emergency Event: "Crack detected on Track 1". Watch the emergency protocol immediately recommend an expedited morning slot with full disruption recalculation.

---

## 26. Architectural Acceptance Criteria

To ensure architectural integrity, the frontend implementation must pass every criterion:

- [ ] **Authoritative Isolation:** Zero scheduling, safety rule evaluation, or score recalculation logic exists in the frontend codebase.
- [ ] **Strict Enum Integrity:** All enum values across tasks, departments, statuses, conflicts, and scenarios match `AI_DOMAIN_CONTRACT.md` and database schemas verbatim.
- [ ] **High-Fidelity Mocking:** Mock data service generates contract-compliant payloads for all 9 pages when `VITE_USE_MOCK_AI=true`.
- [ ] **Seamless Backend Toggle:** Switching `VITE_USE_MOCK_AI=false` routes requests directly to the Express backend without altering component code.
- [ ] **Parallel Developer Independence:** Developer A and Developer B can independently build, test, and commit to their designated feature directories without file collisions.
- [ ] **Traceable Explanations:** Every schedule block, priority score, and rejected candidate has a visible, deterministic explanation trace.
- [ ] **Extensible ML Readiness:** The task detail view accepts future model versioning, confidence metrics, and feature weights without structural changes.
