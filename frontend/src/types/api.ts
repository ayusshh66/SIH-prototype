export type DepartmentCode = "ENG" | "TRD" | "SNT";
export type AssetStatus = "ACTIVE" | "DEGRADED" | "FAILED" | "UNDER_MAINTENANCE" | "RETIRED";
export type TaskStatus = "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "BLOCKED";
export type TaskType = "USFD" | "TRD" | "SNT" | "ENGINEERING" | "DEFECT_REPAIR" | "PREVENTIVE" | "CORRECTIVE" | "INSPECTION" | "EMERGENCY" | "OTHER";
export type DefectSeverity = "MINOR" | "MODERATE" | "SEVERE" | "CRITICAL" | "LOW" | "MEDIUM" | "HIGH";
export type TrainType = "PASSENGER" | "EXPRESS" | "GOODS" | "SPECIAL";
export type BlockStatus = "DRAFT" | "PROPOSED" | "APPROVED" | "REJECTED" | "EXECUTED" | "CANCELLED";
export type PlanningHorizon = "WEEKLY" | "MONTHLY" | "STRATEGIC_26_WEEK";
export type JpoStatus = "JPO_COMPLIANT" | "JPO_VIOLATION";
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
  evidence: Record<string, unknown>;
  deterministic_inputs: Record<string, unknown>;
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
      tasks?: Array<Record<string, unknown>>;
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
  summary?: {
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
