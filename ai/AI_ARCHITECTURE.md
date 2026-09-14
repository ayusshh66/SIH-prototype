# AI Architecture

## Purpose

This directory is the isolated AI / ML / optimization workspace for SIH 2026 prototype SIH26027. It is intentionally decoupled from backend, database, frontend, and authentication ownership.

This module contains only deterministic planning contracts, synthetic data definitions, optimization design, evaluation logic, and documentation for future integration.

## Safe isolated location

`ai/`

This is the designated boundary for AI-only work. No backend routes, SQL schemas, Prisma models, or user-management code are created here.

## Proposed internal structure

```text
ai/
├── data/
├── preprocessing/
├── criticality/
├── compatibility/
├── shadow_blocks/
├── optimization/
├── scenarios/
├── explainability/
├── agents/
├── evaluation/
├── tests/
├── AI_ARCHITECTURE.md
├── AI_DOMAIN_CONTRACT.md
├── OPTIMIZATION_CONTRACT.md
├── AGENT_TOOL_CONTRACT.md
├── TEST_CASE_SPEC.md
├── BACKEND_AI_INTEGRATION.md
```

## Scope of this module

The AI module owns:

- maintenance defect criticality scoring
- compatibility evaluation across departments and assets
- shadow-block generation
- schedule optimization subject to operational constraints
- what-if reoptimization and emergency handling
- deterministic explanation generation
- synthetic evaluation metrics and test case contracts

It does not own:

- backend services
- database schema design
- REST API implementation
- authentication or authorization
- file upload business logic
- frontend UI integration
- production railway system integration

## Internal architecture

### 1. Data layer

Responsible for synthetic datasets and normalized input objects used by engines.

- task descriptions
- defect events
- train movement calendars
- resource calendars
- maintenance windows
- operational constraints

### 2. Preprocessing

Responsible for validation, normalization, and transformation of raw data into AI domain objects before modeling.

- time-window alignment
- section and km normalization
- deduplication of tasks and train intervals
- unit and safety rule validation

### 3. Criticality engine

Takes defect and task characteristics and outputs a deterministic criticality score and explanation.

Supported modes:

- RULE_BASED scoring
- MODEL_BASED scoring

The current prototype includes a trained GradientBoostingRegressor criticality model (`criticality_gbr_v2`). It evaluates a 7-feature vector in this exact order:

1. severity
2. urgency
3. safety_risk
4. traffic_density
5. speed_class
6. deadline_proximity
7. text_severity

`text_severity` is derived from the existing inspection-text severity model and is used as an additional bounded feature input to the model-based criticality pipeline. The model-based path remains deterministic and bounded to 0.0–1.0 for the final score, while the rule-based path remains available for explicit fallback and compatibility testing.

Architecture principle: ML estimates criticality/risk; deterministic rules control safety/compatibility; the optimizer controls scheduling. The training data used in this prototype is synthetic, domain-informed, and not real Indian Railways historical data.

### 4. Compatibility engine

Builds pairwise and grouped compatibility candidates for same or nearby railway sections, overlapping windows, and shared resources.

### 5. Shadow block engine

Generates high-value maintenance groupings that reduce train disruption and resource idle time.

### 6. Optimization engine

Solves a constrained multi-objective scheduling problem.

Objective:

```text
maximize maintenance_value + shadow_block_benefit - train_disruption
```

Constraints:

- task duration
- deadlines
- safety and interlocking rules
- resource availability
- train conflicts
- block feasibility
- maintenance windows

### 7. What-if and emergency modules

Handle reoptimization after operational change events and emergency defect insertion.

### 8. Explainability module

Generates traceable explanations from optimization outputs, not from LLM imagination.

### 9. Agent orchestration layer

Provides a deterministic tool interface for downstream orchestration and human-readable explanations.

### 10. Evaluation layer

Measures schedule quality, disruption reduction, resource use, and solver performance.

## Design principles

1. Internal contracts only; no database schema creation.
2. Deterministic optimization rules and deterministic explanations.
3. Synthetic data only; no assumptions about Indian Railways internal systems.
4. All AI decisions must be traceable to scored features and constraints.
5. Safety constraints are never invented by the LLM.
6. ML estimates priority or risk; rule engine determines deterministic compatibility and safety; optimization determines schedule; LLM only orchestrates and explains.
7. AI logic remains isolated and merge-friendly.

## Architectural responsibility split

- ML / scoring layer: estimates risk, criticality, urgency, and priority from features.
- Rule engine: evaluates compatibility, safety feasibility, interlocking constraints, and deterministic rejection reasons.
- Optimization engine: determines feasible schedule selections and block assignments under objective functions.
- LLM / orchestration layer: gathers inputs, invokes tools, and provides explanations based on engine outputs only.

## Merge safety

This module can be merged later into backend code without conflicting with database or route code because it is intentionally self-contained under `ai/` and refers only to abstract contracts.
