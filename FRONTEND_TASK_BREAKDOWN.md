# Indian Railways AI Block Planning — Frontend Task Breakdown

**Document Version:** 1.0.0  
**Target:** 2 Frontend Developers (Developer A & Developer B)  
**Workspace:** `frontend/`  
**Companion Documents:** `FRONTEND_ARCHITECTURE.md`, `FRONTEND_API_MAPPING.md`

---

## 1. Overview & Team Ownership Strategy

To maximize velocity for the Smart India Hackathon (SIH) prototype while eliminating Git merge conflicts, the frontend work is strictly partitioned into modular feature verticals built on top of a shared contract and mock layer.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: SHARED FOUNDATION                            │
│   Project Scaffold, TypeScript Contracts, Mock Data Provider, Design System    │
└────────────────────────┬────────────────────────────────┬───────────────────────┘
                         │                                │
                         ▼                                ▼
┌──────────────────────────────────────────┐   ┌──────────────────────────────────────────┐
│           DEVELOPER A (TRACK 1)          │   │           DEVELOPER B (TRACK 2)          │
│   App Shell, Cockpit & Timeline Canvas   │   │  Tasks, Shadow Blocks, Scenarios & Safety│
├──────────────────────────────────────────┤   ├──────────────────────────────────────────┤
│ Phase 2A: Application Shell & Nav        │   │ Phase 3A: Task Inventory & Filters       │
│ Phase 2B: Dashboard Operational Cockpit  │   │ Phase 3B: Criticality Detail Sheet       │
│ Phase 2C: Planning Timeline Canvas       │   │ Phase 3C: Shadow Block Matrix            │
│ Phase 2D: Block Detail Drawer            │   │ Phase 4A: Trains & Disruption Cards      │
│                                          │   │ Phase 4B: Unified Conflicts Drawer       │
│                                          │   │ Phase 4C: What-If Simulation Sandbox     │
│                                          │   │ Phase 4D: Emergency Planning Protocol    │
└────────────────────────┬─────────────────┘   └──────────────────┬───────────────────────┘
                         │                                        │
                         └───────────────────┬────────────────────┘
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        PHASE 5: INTEGRATION & EXPLAINABILITY                    │
│   Reusable Explainability Drawer, Backend API Toggle, End-to-End Demo Flow      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Ownership & Protection Matrix

| Directory / File Area | Primary Owner | Secondary Reviewer | Collision Prevention Rule |
| :--- | :--- | :--- | :--- |
| `frontend/src/types/api.ts` | **Joint** (Phase 1) | Both | **FROZEN** after Phase 1. Any addition requires mutual sign-off. |
| `frontend/src/mocks/` | **Joint** (Phase 1) | Both | Dev A adds timeline/run mocks; Dev B adds conflict/scenario mocks. |
| `frontend/src/api/client.ts` | **Developer A** | Developer B | Developer B consumes methods exported by Developer A. |
| `frontend/src/components/common/` | **Developer A** | Developer B | Generic UI atoms. Dev B requests new variants rather than rewriting. |
| `frontend/src/features/dashboard/` | **Developer A** | Developer B | Strictly isolated to Dev A. |
| `frontend/src/features/planning/` | **Developer A** | Developer B | Strictly isolated to Dev A. |
| `frontend/src/features/tasks/` | **Developer B** | Developer A | Strictly isolated to Dev B. |
| `frontend/src/features/shadowBlocks/`| **Developer B**| Developer A | Strictly isolated to Dev B. |
| `frontend/src/features/trains/` | **Developer B** | Developer A | Strictly isolated to Dev B. |
| `frontend/src/features/conflicts/` | **Developer B** | Developer A | Strictly isolated to Dev B. |
| `frontend/src/features/whatIf/` | **Developer B** | Developer A | Strictly isolated to Dev B. |
| `frontend/src/features/emergency/` | **Developer B** | Developer A | Strictly isolated to Dev B. |
| `frontend/src/features/explain/` | **Developer B** | Developer A | Dev B builds drawer; Dev A mounts it in Planning canvas. |

---

## 3. Phase 1: Foundation, Contracts & Design System (Shared)

### Task 1.1: Project Scaffolding & Build Setup
* **Owner:** Developer A (with Dev B verification)
* **Priority:** Critical Block (Day 1)
* **Dependencies:** None
* **Files:**
  * `frontend/package.json`
  * `frontend/vite.config.ts`
  * `frontend/tsconfig.json`
  * `frontend/index.html`
  * `frontend/src/main.tsx`
  * `frontend/src/App.tsx`
* **Details:**
  * Initialize Vite with React + TypeScript template in `frontend/`.
  * Configure path aliases (`@/` mapping to `src/`).
  * Install dependencies: `lucide-react` (icons), `clsx` (class utilities).
  * Configure vanilla CSS token architecture in `frontend/src/index.css`.
* **Acceptance Criteria:** `npm run dev` boots cleanly on `http://localhost:5173` without TypeScript warnings.

### Task 1.2: Central API & Domain Type Definitions
* **Owner:** Developer B (with Dev A verification)
* **Priority:** Critical Block (Day 1)
* **Dependencies:** Task 1.1
* **Files:**
  * `frontend/src/types/api.ts`
* **Details:**
  * Transcribe all models and enums from `AI_DOMAIN_CONTRACT.md` and database schemas verbatim.
  * Define `MaintenanceTask`, `CriticalityScoreDetail`, `ShadowBlockCandidate`, `TrainMovement`, `Conflict`, `WhatIfScenario`, `EmergencyEvent`, `Explanation`, `OptimizationResult`.
  * Ensure literal string unions for all enums (`"P1" | "P2" | "P3" | "P4"`, `"ENG" | "TRD" | "SNT"`, `"TRAIN_CONFLICT"`, etc.).
* **Acceptance Criteria:** Type file compiles with 0 errors. Exports all interfaces required by both developers.

### Task 1.3: High-Fidelity Mock Data Provider
* **Owner:** Developer A & Developer B (Collaborative)
* **Priority:** High (Day 1)
* **Dependencies:** Task 1.2
* **Files:**
  * `frontend/src/mocks/corridors.ts` (Dev A: NDLS-AGC & AGC-GWL)
  * `frontend/src/mocks/tasks.ts` (Dev B: 25 realistic P-Way, TRD, S&T tasks)
  * `frontend/src/mocks/blocks.ts` (Dev A: Planned blocks with assigned tasks)
  * `frontend/src/mocks/shadowBlocks.ts` (Dev B: Feasible and rejected candidates)
  * `frontend/src/mocks/trains.ts` (Dev A: Vande Bharat 22436, Shatabdi 12002, Freight)
  * `frontend/src/mocks/conflicts.ts` (Dev B: Train, resource, safety conflicts)
  * `frontend/src/mocks/explanations.ts` (Dev B: Grounded mathematical traces)
* **Acceptance Criteria:** Mock data matches `FRONTEND_API_MAPPING.md` payloads exactly and can be imported cleanly.

### Task 1.4: Common Design System Atoms
* **Owner:** Developer A
* **Priority:** High (Day 1)
* **Dependencies:** Task 1.1
* **Files:**
  * `frontend/src/components/common/Button.tsx`
  * `frontend/src/components/common/Badge.tsx` (P1-P4, ENG/TRD/SNT, Status pills)
  * `frontend/src/components/common/Card.tsx`
  * `frontend/src/components/common/Modal.tsx`
  * `frontend/src/components/common/Drawer.tsx`
  * `frontend/src/components/common/Skeleton.tsx`
* **Details:**
  * Build reusable, accessible components using the Dark Operations theme.
  * Ensure `Badge` supports department codes, priority levels, and conflict severities.
* **Acceptance Criteria:** Components render cleanly in isolation with story-like demo test cases.

---

## 4. Developer A: Track 1 (Shell, Cockpit & Timeline Canvas)

### Task A.1: Application Shell & Operations Navigation
* **Assignee:** Developer A
* **Phase:** Phase 2
* **Dependencies:** Task 1.1, Task 1.4
* **Files:**
  * `frontend/src/components/domain/Shell/Header.tsx`
  * `frontend/src/components/domain/Shell/Sidebar.tsx`
  * `frontend/src/components/domain/Shell/CorridorSelector.tsx`
  * `frontend/src/routes.tsx`
* **Details:**
  * Implement top bar with Indian Railways branding, current UTC/IST clock, and division indicator.
  * Implement corridor picker (`NDLS-AGC` / `AGC-GWL`) stored in URL state (`?corridor=...`).
  * Implement sidebar navigation linking to all 9 application pages with notification badge counters.
* **Acceptance Criteria:** Navigation smoothly switches active routes with persistent corridor context.

### Task A.2: Dashboard Operational Cockpit
* **Assignee:** Developer A
* **Phase:** Phase 2
* **Dependencies:** Task A.1, Task 1.3
* **Files:**
  * `frontend/src/features/dashboard/DashboardPage.tsx`
  * `frontend/src/features/dashboard/KpiGrid.tsx`
  * `frontend/src/features/dashboard/RecentRunsCard.tsx`
  * `frontend/src/features/dashboard/CorridorStatusBar.tsx`
* **Details:**
  * Render 4 primary KPI cards: Critical ($P_1$) Tasks, High ($P_2$) Tasks, Active Blocks, and Hours Saved.
  * Render Scheduled vs. Pending maintenance ratio bar.
  * Render Latest Optimization Run card displaying runtime (ms) and disruption reduction percentage.
  * Display high-priority active alerts ticker.
* **Acceptance Criteria:** Dashboard populates with mock data matching `GET /api/planning/dashboard`.

### Task A.3: Planning Schedule Timeline Canvas
* **Assignee:** Developer A
* **Phase:** Phase 2
* **Dependencies:** Task A.1, Task 1.3
* **Files:**
  * `frontend/src/features/planning/PlanningSchedulePage.tsx`
  * `frontend/src/features/planning/ScheduleTimelineCanvas.tsx`
  * `frontend/src/features/planning/BlockGanttBar.tsx`
  * `frontend/src/features/planning/PossessionWindowOverlay.tsx`
* **Details:**
  * Render interactive time-distance schedule canvas:
    * Y-Axis: Corridor Kilometers ($0.000\text{ to }195.000\text{ km}$).
    * X-Axis: 24-hour time ruler with shaded night possession windows ($23:00\text{--}04:00$).
  * Render colored block possession rectangles with department icons.
  * Support zoom levels ($4\text{h}$, $12\text{h}$, $24\text{h}$).
  * Clicking a block bar triggers URL parameter update `?selectedBlock=:id`.
* **Acceptance Criteria:** Canvas accurately renders scheduled blocks over the kilometer distance and time grid without visual clipping.

### Task A.4: Block Detail Drawer & Action Controls
* **Assignee:** Developer A
* **Phase:** Phase 2
* **Dependencies:** Task A.3
* **Files:**
  * `frontend/src/features/planning/BlockDetailDrawer.tsx`
  * `frontend/src/features/planning/UnscheduledTasksTray.tsx`
* **Details:**
  * When `?selectedBlock=:id` is active, open right-side drawer showing block metadata:
    * Block Code, Start/End Time, Total Duration, Saved Minutes.
    * Nested tasks list with department badges and work descriptions.
    * Action buttons: "Approve Block", "Reject Block", "View AI Explanation".
  * Bottom collapsible tray listing unscheduled tasks that could not fit into the window.
* **Acceptance Criteria:** Drawer opens smoothly upon block click, shows nested tasks, and triggers approval state updates.

---

## 5. Developer B: Track 2 (Tasks, Shadow Blocks, Conflicts, Scenarios & Safety)

### Task B.1: Maintenance Task Inventory Table
* **Assignee:** Developer B
* **Phase:** Phase 3
* **Dependencies:** Task 1.2, Task 1.3, Task 1.4
* **Files:**
  * `frontend/src/features/tasks/MaintenanceTasksPage.tsx`
  * `frontend/src/features/tasks/TaskDataTable.tsx`
  * `frontend/src/features/tasks/TaskFilterBar.tsx`
* **Details:**
  * Render data table with sorting and filtering:
    * Department Filter (`ALL`, `ENG`, `TRD`, `SNT`).
    * Priority Filter (`P1`, `P2`, `P3`, `P4`).
    * Status Filter (`ALL`, `PENDING`, `SCHEDULED`, `COMPLETED`).
  * Display task code, location km, estimated duration, due date, and overdue indicators.
  * Clicking a row opens the Task Detail Sheet.
* **Acceptance Criteria:** Table filters instantly, supports column sorting by priority and duration, and handles empty search states.

### Task B.2: Deterministic Criticality Breakdown Sheet
* **Assignee:** Developer B
* **Phase:** Phase 3
* **Dependencies:** Task B.1
* **Files:**
  * `frontend/src/features/tasks/TaskDetailSheet.tsx`
  * `frontend/src/features/tasks/CriticalityFactorBars.tsx`
* **Details:**
  * Render sliding detail sheet showing task characteristics.
  * Display overall criticality dial ($0\text{--}100$) and Priority Class ($P_1\text{--}P_4$).
  * Render bar chart of contributing feature weights: Severity, Urgency, Safety Risk, Traffic Density, Speed Class, Deadline Proximity.
  * Display deterministic explanation text string and model version badge (`criticality_v1_rule_2026Q4`).
  * Action: "Recalculate Priority" button calling API recalculation endpoint.
* **Acceptance Criteria:** Sheet displays exact factor contributions from the contract without performing calculations in the client.

### Task B.3: Shadow Block Opportunity Matrix
* **Assignee:** Developer B
* **Phase:** Phase 3
* **Dependencies:** Task 1.2, Task 1.3
* **Files:**
  * `frontend/src/features/shadowBlocks/ShadowBlocksPage.tsx`
  * `frontend/src/features/shadowBlocks/ShadowBlockCard.tsx`
  * `frontend/src/features/shadowBlocks/RejectionProofModal.tsx`
* **Details:**
  * Render cards for Feasible and Rejected shadow block candidates.
  * Highlight primary task + piggybacked secondary tasks.
  * Display calculated time saved ($95\text{ mins}$) and corridor occupancy ($68\%$).
  * For rejected candidates, display explicit rejection reason badge (e.g. `SAFETY_CONFLICT: IR-SIG-402 rule violation`).
  * Action: "Approve Shadow Block" and "Inspect Rejection Evidence".
* **Acceptance Criteria:** Matrix distinctly separates feasible and rejected opportunities, rendering full multi-department participation.

### Task B.4: Train Movements & Disruption Cards
* **Assignee:** Developer B
* **Phase:** Phase 4
* **Dependencies:** Task 1.2, Task 1.3
* **Files:**
  * `frontend/src/features/trains/TrainMovementsPage.tsx`
  * `frontend/src/features/trains/TrainMovementList.tsx`
  * `frontend/src/features/trains/DisruptionSummaryCard.tsx`
* **Details:**
  * List all timetable trains with train numbers (`22436`, `12002`), train names, and train types.
  * Display direction (`UP` / `DOWN`), speed class, and traffic density score.
  * Clearly label disruption metric as "Estimated Optimization Penalty / Simulated Delay".
  * Render passage conflict indicator when a train trajectory intersects a planned maintenance block.
* **Acceptance Criteria:** Timetable renders cleanly with clear visual differentiation between passenger express and freight services.

### Task B.5: Unified Conflicts & Operations Alert Center
* **Assignee:** Developer B
* **Phase:** Phase 4
* **Dependencies:** Task 1.2, Task 1.3
* **Files:**
  * `frontend/src/features/conflicts/ConflictsAlertsPage.tsx`
  * `frontend/src/features/conflicts/ConflictAlertCard.tsx`
  * `frontend/src/features/conflicts/ConflictCategoryTabs.tsx`
* **Details:**
  * Tabbed filter by conflict type: `ALL`, `TRAIN_CONFLICT`, `RESOURCE_CONFLICT`, `WINDOW_CONFLICT`, `SAFETY_CONFLICT`, `DEADLINE_CONFLICT`.
  * Display severity badge (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).
  * Render affected task/block/train entity IDs with clickable pills.
  * Display deterministic reason text and recommended dispatcher action.
* **Acceptance Criteria:** All conflict categories display correct severity styles and entity associations.

### Task B.6: What-If Scenario Simulation Sandbox
* **Assignee:** Developer B
* **Phase:** Phase 4
* **Dependencies:** Task B.4, Task 1.3
* **Files:**
  * `frontend/src/features/whatIf/WhatIfScenariosPage.tsx`
  * `frontend/src/features/whatIf/ScenarioConfigForm.tsx`
  * `frontend/src/features/whatIf/ScheduleDiffViewer.tsx`
* **Details:**
  * Form supporting 6 scenario types (`TRAIN_DELAY`, `BLOCK_UNAVAILABLE`, `RESOURCE_UNAVAILABLE`, etc.).
  * Interactive inputs: select train, input delay minutes ($15\text{--}120\text{m}$), choose unavailable window.
  * "Run Simulation" action triggers AI re-optimization.
  * Diff view renders Baseline Schedule vs. Simulated Schedule side-by-side with shifted blocks highlighted.
  * Delta metrics: Objective Score $\Delta$, Train Disruption $\Delta$, Resource Utilization $\Delta$.
* **Acceptance Criteria:** Scenario runs and outputs schedule diff with quantitative delta indicators.

### Task B.7: Emergency Planning Protocol Workflow
* **Assignee:** Developer B
* **Phase:** Phase 4
* **Dependencies:** Task B.1, Task 1.3
* **Files:**
  * `frontend/src/features/emergency/EmergencyPlanningPage.tsx`
  * `frontend/src/features/emergency/EmergencyIncidentForm.tsx`
  * `frontend/src/features/emergency/EmergencySlotPicker.tsx`
* **Details:**
  * High-visibility emergency header indicating expedited safety protocol.
  * Incident entry form: Defect Type (`NEW_USFD_DEFECT`, `TRACK_FAILURE`), Corridor Section, Kilometer, Urgency.
  * Instant slot discovery card showing nearest available $60\text{--}120\text{ min}$ possession windows.
  * "Execute Emergency Insertion" action showing resulting schedule with affected train delays.
* **Acceptance Criteria:** Emergency flow is distinct from standard planning and outputs immediate recommended possession slots.

---

## 6. Phase 5: Explainability & Live Backend Integration (Collaborative)

### Task 5.1: Reusable Decision Explainability Drawer
* **Owner:** Developer B (Drawer component) & Developer A (Timeline mount)
* **Priority:** Critical (Day 4)
* **Dependencies:** Task A.4, Task B.2
* **Files:**
  * `frontend/src/features/explain/ExplanationDrawer.tsx`
  * `frontend/src/features/explain/EvidenceTable.tsx`
  * `frontend/src/features/explain/ReasonCodeChips.tsx`
* **Details:**
  * Reusable drawer queryable by `entityId` and `entityType` (`BLOCK`, `TASK`, `WINDOW`, `GROUPING`, `REJECTION`).
  * Displays summary sentence, reason codes, quantitative evidence key-values, and engine provenance badge (`OPTIMIZATION_ENGINE`, `CRITICALITY_ENGINE`, etc.).
  * Mounted globally so any "View Explanation" button in Tasks, Planning, or Shadow Blocks opens the exact trace.
* **Acceptance Criteria:** Explanation drawer displays traceable mathematical evidence for both scheduled blocks and rejected candidates.

### Task 5.2: Live Backend Integration & Environment Toggle
* **Owner:** Developer A & Developer B
* **Priority:** High (Day 4)
* **Dependencies:** All previous tasks
* **Files:**
  * `frontend/src/api/client.ts`
  * `frontend/.env.development`
  * `frontend/.env.production`
* **Details:**
  * Configure Axios / Fetch client targeting `http://localhost:5000/api`.
  * Connect live Express endpoints: `GET /api/corridors`, `GET /api/assets`, `GET /api/maintenance/tasks`, `GET /api/blocks`, `GET /api/trains`, `POST /api/planning/generate`.
  * Fallback to mock adapter for unintegrated Python AI routes (`/shadow-blocks`, `/what-if`, `/emergency`) controlled via `VITE_USE_MOCK_AI=true/false`.
* **Acceptance Criteria:** When backend is running, frontend loads live corridor seed data without runtime errors.

---

## 7. Phase 6: Verification, Performance & SIH Demo Dry-Run

### Task 6.1: Quality Assurance & Accessibility Audit
* **Owner:** Developer A & Developer B
* **Priority:** High (Day 5)
* **Checklist:**
  * [ ] WCAG AA color contrast verified across all badges and text on dark theme.
  * [ ] All interactive buttons and drawer close icons accessible via Tab / Enter / Escape keys.
  * [ ] Zero React console errors, warnings, or missing key attributes in tables and timelines.
  * [ ] TypeScript compilation (`tsc --noEmit`) passes with 0 errors.

### Task 6.2: End-to-End SIH Demo Script Rehearsal
* **Owner:** Developer A & Developer B
* **Priority:** High (Day 5)
* **Rehearsal Sequence:**
  1. Open Dashboard: Highlight 4 Critical ($P_1$) tasks on `NDLS-AGC`.
  2. Inspect Task `TSK-ENG-NDLS-045-01`: Walk through 94 Criticality score and factor breakdown.
  3. Inspect Shadow Block `SB-301`: Show 95 minutes saved across ENG, TRD, and S&T.
  4. Open Planning Canvas: Click "Run Optimizer". Show scheduled blocks avoiding train conflicts.
  5. Open Explanation Drawer: Demonstrate deterministic solver proof for the block.
  6. Trigger What-If Simulation: Introduce 45-minute delay on Train 12002. Inspect schedule shift.
  7. Trigger Emergency Defect: Inject rail fracture and show automated emergency slot allocation.
* **Acceptance Criteria:** Entire 7-minute flow executes smoothly without page refreshes or UI stutter.
