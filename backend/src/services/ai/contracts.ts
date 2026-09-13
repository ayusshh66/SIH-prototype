import type {
  AiMovementPayload,
  AiResourcePayload,
  AiTaskPayload,
  AiWindowPayload,
} from "./dataMapper";

export type ApiEnvelope<T> =
  | { success: true; data: T; error?: never }
  | { success: false; data?: never; error: string };

export type PlanningMode = "BALANCED" | "SAFETY_FIRST" | "DISRUPTION_MINIMIZATION" | "EMERGENCY";
export type PlanningHorizon = "WEEKLY" | "MONTHLY" | "48H";
export type OptimizationStatus = "OPTIMAL" | "FEASIBLE" | "PARTIAL" | "INFEASIBLE" | "FAILED";

export interface PlanningOptions {
  corridorId?: string;
  horizon?: PlanningHorizon;
  mode?: PlanningMode;
}

export interface PlanningContext {
  request_id: string;
  mode: PlanningMode;
  tasks: AiTaskPayload[];
  train_movements: AiMovementPayload[];
  resources: AiResourcePayload[];
  maintenance_windows: AiWindowPayload[];
  criticality_scores?: CriticalityScore[];
  shadow_block_candidates?: ShadowBlockCandidate[];
  constraints: Record<string, unknown>;
  weights: {
    maintenance_value: number;
    shadow_block_benefit: number;
    train_disruption_penalty: number;
  };
  solver_settings: Record<string, unknown>;
}

export interface CriticalityScore {
  entity_id: string;
  score: number;
  display_score?: number;
  priority_class?: string;
  risk_level?: string;
  feature_contributions?: Record<string, number>;
  model_version?: string;
  scoring_mode?: string;
}

export interface ScheduleBlock {
  block_id: string;
  section_id: string;
  start: string;
  end: string;
  durationMinutes?: number;
}

export interface ScheduleCandidate {
  schedule_id: string;
  task_ids: string[];
  blocks: ScheduleBlock[];
  start_time: string;
  end_time: string;
  estimated_disruption_minutes: number;
  resource_assignments: Record<string, string[]>;
  status: string;
}

export interface Conflict {
  conflict_id: string;
  conflict_type: string;
  entity_ids: string[];
  section_id?: string;
  start: string;
  end: string;
  severity: string;
  description: string;
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

export interface Explanation {
  explanation_id: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  reason_codes: string[];
  evidence: Record<string, unknown>;
  deterministic_inputs: Record<string, unknown>;
  generated_by: string;
}

export interface OptimizationResult {
  request_id?: string;
  status: OptimizationStatus;
  selected_task_ids: string[];
  unscheduled_task_ids: string[];
  unscheduled_reasons?: Record<string, string>;
  schedule_candidates: ScheduleCandidate[];
  shadow_blocks?: ShadowBlockCandidate[];
  train_conflicts: Conflict[];
  resource_utilization: Record<string, number>;
  objective_score: number;
  total_disruption_minutes?: number;
  baseline_comparison: Record<string, number>;
  solver_statistics: Record<string, number | string>;
  generated_at: string;
}

export interface OrchestrationResult {
  orchestration_id: string;
  request_id: string;
  status: "SUCCESS" | "PARTIAL" | "FAILED";
  execution_sequence: string[];
  criticality_scores: CriticalityScore[];
  compatibility_candidates: unknown[];
  shadow_block_candidates: ShadowBlockCandidate[];
  optimization_result: OptimizationResult | null;
  scenario_result: WhatIfResult | null;
  emergency_result: EmergencyResult | null;
  explanations: Explanation[];
  errors: string[];
  generated_at: string;
}

export interface PlanningResult extends OptimizationResult {
  runId: string;
  runCode: string;
  orchestrationId: string;
  executionSequence: string[];
  shadow_blocks: ShadowBlockCandidate[];
  explanations: Explanation[];
  blocks: DbBlockView[];
  summary: {
    tasksConsidered: number;
    tasksScheduled: number;
    blocksGenerated: number;
    baselineBlockMinutes: number;
    optimizedBlockMinutes: number;
    savingMinutes: number;
    savingPercentage: number;
    optimizationScore: number;
  };
}

export interface DbBlockView {
  id: string;
  blockCode: string;
  corridorId: string;
  corridorCode: string;
  startAt: string;
  endAt: string;
  durationMinutes: number;
  baselineDurationMinutes: number;
  savedMinutes: number;
  status: string;
  taskCount: number;
  tasks: Array<Record<string, unknown>>;
  departments: string[];
  explanation: Record<string, unknown>;
  createdAt: string;
}

export interface WhatIfScenarioPayload {
  scenario_id?: string;
  scenario_type: "TRAIN_DELAY" | "BLOCK_UNAVAILABLE" | "RESOURCE_UNAVAILABLE" | "EMERGENCY_TASK_INSERTED" | "TASK_DURATION_CHANGED" | "TASK_ADDED";
  base_schedule_id: string;
  affected_task_ids?: string[];
  affected_train_ids?: string[];
  new_constraints: Record<string, unknown>;
  description?: string;
}

export interface WhatIfResult {
  original_schedule_id: string;
  new_schedule: ScheduleCandidate | null;
  all_schedule_candidates?: ScheduleCandidate[];
  changed_blocks: string[];
  affected_tasks: string[];
  affected_trains: string[];
  metric_differences: Record<string, number>;
  explanation: string;
  errors: string[];
  optimization_result?: OptimizationResult;
}

export interface EmergencyEventPayload {
  event_id?: string;
  event_type: string;
  section_id: string;
  affected_asset_id?: string;
  severity: string;
  detected_at?: string;
  estimated_duration_minutes: number;
  impact_summary: string;
  from_km: number;
  to_km: number;
  related_task_id?: string;
  required_resources?: Array<{ resource_type: string; count: number }>;
}

export interface EmergencyResult {
  emergency_task: Record<string, unknown> | null;
  urgency: string;
  affected_section: string;
  feasible_windows: Array<Record<string, unknown>>;
  reoptimization_request?: Record<string, unknown> | null;
  resulting_schedule: ScheduleCandidate | null;
  optimization_result?: OptimizationResult;
  errors: string[];
  explanation: string;
}

export interface AiHealthResult {
  status: "HEALTHY" | "DEGRADED" | "FAILED";
  engines: string[];
  error?: string;
}
