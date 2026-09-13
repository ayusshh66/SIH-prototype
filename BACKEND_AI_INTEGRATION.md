# Backend ↔ AI Engine Integration Architecture

This document describes the hardened, authoritative integration between the Node/Express backend and the Python AI optimization engines in the SIH Railway Maintenance Planning prototype.

---

## 1. Architectural Principles & Layer Boundaries

```
Frontend (Vite / React)
  │
  ▼ [HTTP REST /api/planning/*]
Backend (Express / TypeScript)
  │  ├── planning.controller.ts (HTTP endpoints)
  │  ├── dataStore.ts (Drizzle ORM / in-memory fallback)
  │  └── ai/
  │       ├── aiAdapter.service.ts (Context preparation, state resolution)
  │       ├── dataMapper.ts (Authoritative mapping & strict validation)
  │       ├── aiBridge.ts (Child process execution)
  │       └── contracts.ts (Shared TypeScript interfaces)
  │
  ▼ [JSON stdin / stdout over python subprocess]
AI Optimization Engines (Python)
     ├── ai.agents.orchestrator (Main pipeline coordinator)
     ├── ai.engines.criticality (Task & asset risk scoring)
     ├── ai.engines.shadow_block (Possession co-location & grouping)
     ├── ai.engines.optimization (Mathematical solver & conflict resolution)
     ├── ai.engines.whatif (Scenario simulation)
     ├── ai.engines.emergency (Disruption & emergency insertion)
     └── ai.engines.explainer (Deterministic explanation generation)
```

### Boundary Guarantees:
- **`ai/` is strictly isolated**: It does not depend on Express, databases, ORM models, or web protocols.
- **Backend owns data & state**: Only the backend accesses PostgreSQL/Drizzle or the in-memory data store.
- **AI owns optimization & algorithms**: Feasibility, conflict detection, shadow blocks, criticality scoring, and schedule optimization are calculated exclusively by the AI engine.

---

## 2. Hardened Data Mapping & Zero Fabricated Defaults

In `backend/src/services/ai/dataMapper.ts`, all silent operational fallbacks have been eliminated in favor of strict, early validation (`MappingValidationError` with HTTP 400):

| Previous Anti-Pattern | Hardened Implementation |
| :--- | :--- |
| Invented UUID passthrough when corridor lookup failed | Throws `MappingValidationError` requiring a valid corridor lookup |
| Invented UUID passthrough when department lookup failed | Throws `MappingValidationError` requiring a valid department lookup |
| Fabricated `requestedStart` / `requestedEnd` from `new Date()` | Strictly validates `task.createdAt` and `task.dueAt` as non-empty ISO strings |
| Fabricated `from_km: 0` / `to_km: 1` when coordinates missing | Strictly validates `locationStartKm` and `locationEndKm` as finite numbers |
| Hardcoded resource location `"sec_12_ndls_agc"` & `"ENGINEERING"` | Strictly requires `resource.depotLocation` and `resource.departmentId` |
| Fabricated synthetic task records for unknown task IDs | Unknown task IDs returned by solver are logged and skipped, never fabricated |
| Fallback `new Date()` for block `start`/`end` | Strictly requires solver output `start` (or `start_time`) and `end` (or `end_time`) |
| Fallback `departments: ["ENG"]` | Dynamically aggregates departments from actual assigned tasks |
| Invented random block ID (`blk_*`) | Strictly requires `block_id` from AI optimization output |

---

## 3. Authoritative What-If Schedule Resolution

The What-If scenario engine (`aiAdapter.service.ts -> runWhatIf`) resolves baseline schedules directly from persisted storage:

1. **Rejection of Ambiguous Magic Strings**:
   - Supplying `"current"`, `"latest"`, or empty strings as `base_schedule_id` immediately throws a `ValidationError` (HTTP 400).
2. **Authoritative Run Lookup**:
   - Resolves against persisted optimization runs (`dataStore.getOptimizationRuns()`) by matching `run.id`, `run.runId`, or `run.runCode`.
   - If no persisted run matches, returns a descriptive 400 error.
3. **Persisted Block Reconstruction**:
   - Reconstructs schedule candidates strictly from persisted blocks (`dataStore.getBlocks()`), preserving assigned tasks and corridor references.
4. **No Volatile Cache Dependency**:
   - Does not rely on ephemeral in-memory variables (`latestPlanningResult`) to serve scenario analysis.

---

## 4. Real Operational Fields for Criticality & Movement

1. **Traffic Density**: Derived directly from the task's `operationalImpactScore` in backend storage:
   ```ts
   const trafficDensity = Math.min(1, (task.operationalImpactScore || 0) / 100);
   ```
   (Replaced former hardcoded `0.85`).
2. **Speed Class**: Removed hardcoded assumptions (`speed_class: "HIGH"`). The AI engine's calibrated defaults are respected if unspecified.
3. **Corridor & Department Dual-Key Lookups**: Lookups are indexed by both primary UUID (`id`) and human-readable operational code (`code`), supporting both relational DB IDs and operational codes seamlessly.

---

## 5. Verification Commands

### Automated Backend Tests
Run the 17 integration and unit tests covering data mapper validation, What-If resolution, and AI bridge communication:
```bash
cd backend
npm test
```

### Backend TypeScript Compilation
Verify zero TypeScript compilation or linting errors:
```bash
cd backend
npx tsc --noEmit
```

### AI Engine Unit Tests
Verify all 150 AI engine unit tests in Python:
```bash
python -m unittest discover -s ai
```
