# AI Test Case Specification

This document defines test structure and scenarios for AI-side validation.

## 1. Test structure

Each test case should include:

```json
{
  "case_id": "string",
  "name": "string",
  "category": "string",
  "description": "string",
  "inputs": {},
  "expected_outputs": {},
  "assertions": ["string"],
  "notes": "string"
}
```

## 2. Core test scenarios

### A. Single critical USFD defect

Purpose: validate criticality scoring and emergency scheduling behavior.

Input:

- one USFD defect with high urgency and severe safety risk
- one or more train movements in the same corridor
- one feasible night possession

Expected output:

- criticality score elevated to `P1` or near-threshold
- block selection in earliest feasible safe window
- high explanation confidence

Assertions:

- score >= 0.85
- selected block has no train conflict
- explanation references input features and constraints

### B. Multiple compatible Engineering/TRD/S&T tasks

Purpose: validate compatibility grouping.

Input:

- engineering, TRD, and SNT tasks in same/aligned section
- overlapping maintenance windows
- shared or compatible resource set

Expected output:

- compatibility candidates generated
- grouped candidate score above threshold
- no safety incompatibility

Assertions:

- candidate count >= 1
- compatibility_score > 0.7
- reasons list explains grouping

### C. Train conflict

Purpose: validate conflict detection and penalty behavior.

Input:

- maintenance task overlaps with passenger or express train pass-through

Expected output:

- conflict generated
- optimizer avoids or repositions block when possible

Assertions:

- `TRAIN_CONFLICT` among conflict list
- objective score reduced versus no-conflict baseline

### D. Resource conflict

Purpose: validate resource bottleneck handling.

Input:

- many tasks requiring same vehicle or crew
- narrow resource availability

Expected output:

- resource utilization saturation detected
- schedule either prioritizes fewer tasks or uses alternative feasible windows

Assertions:

- `RESOURCE_CONFLICT` present when capacity exceeded
- selected tasks fit resource capacity

### E. Deadline constraint

Purpose: validate urgency and scheduling deadlines.

Input:

- tasks with near-deadline or expired period

Expected output:

- deadline-constrained tasks prioritized
- unscheduled tasks explained by deadline infeasibility or lower value

Assertions:

- high-priority tasks scheduled before low-priority tasks
- unscheduled explanation includes timing or deadline constraint

### F. Shadow block opportunity

Purpose: validate grouped maintenance benefits.

Input:

- compatible tasks within same corridor and time window
- high benefit from combined possession

Expected output:

- one or more shadow block candidates created
- potential time saving > 0
- schedule adopts block when feasible

Assertions:

- `shadow_block_count >= 1`
- `potential_time_saving_minutes > 0`
- resource_usage is consistent

### G. Emergency defect insertion

Purpose: test emergency handling and schedule reconstruction.

Input:

- base schedule
- inserted `NEW_USFD_DEFECT` event with high criticality

Expected output:

- emergency task inserted
- feasible windows recomputed
- schedule reoptimized

Assertions:

- `resulting_schedule` differs from original
- emergency task is in selected set
- explanation describes emergency priority

### H. Train delay reoptimization

Purpose: validate what-if handling for delay events.

Input:

- delayed train movement
- affected section and block window

Expected output:

- schedule updated to reduce train disruption
- changed blocks or moved tasks
- metric differences reported

Assertions:

- `affected_trains` includes the delayed train
- `metric_differences` populated
- explanation of changes is present

### I. Block unavailable

Purpose: validate reoptimization when a planned block is unavailable.

Input:

- current schedule includes a block that becomes unavailable

Expected output:

- alternative feasible window is chosen or tasks are rescheduled
- block status updated to rejected or unavailable

Assertions:

- changed_blocks reported
- new schedule valid or partial
- explanation references unavailability

### J. Large mixed scenario

Purpose: validate performance and robustness under complex conditions.

Input:

- large set of maintenance tasks
- multiple sections
- mixed departments
- multiple train movements and resources
- several shadow block opportunities

Expected output:

- schedule objective computed
- unscheduled tasks reduced where feasible
- solver runtime recorded

Assertions:

- count of tasks and blocks processed
- all required metrics returned
- runtime under realistic threshold for prototype

### K. Unsafe Shadow Block Candidate

Purpose: validate rejection of an apparent grouping that violates safety or interlocking conditions.

Input:

- multiple tasks in the same or nearby section
- overlapping windows and shared resources
- apparent grouping opportunity for shadow block generation
- but incompatible safety or interlocking condition is present

Expected output:

- candidate rejected by compatibility/safety rule engine
- `SAFETY_CONFLICT` recorded
- tasks scheduled separately or moved to alternative windows
- explanation cites the deterministic safety condition

Assertions:

- `conflict_status == REJECTED`
- conflict type includes `SAFETY_CONFLICT`
- candidate is not selected into the schedule
- explanation references the explicit safety/interlocking constraint

## 3. Acceptance criteria

A scenario is successful when:

- engine outputs are valid against the contract
- schedule remains feasible
- no invented safety rules appear in explanations
- explanation references deterministic evidence
- metrics are returned in consistent units

## 4. Synthetic data constraints

- all data must be synthetic and realistic
- no access to internal railway systems assumed
- timing and locations must be valid within the prototype domain
- all tests must be reproducible from seeded synthetic data
