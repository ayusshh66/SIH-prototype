import { MaintenanceTask, BlockStatus, OptimizationResult, Conflict, ShadowBlockCandidate, TaskType } from '../types/api';

export const mockTasks: MaintenanceTask[] = [
  {
    id: "TSK-ENG-NDLS-045-01",
    taskCode: "TSK-ENG-NDLS-045",
    assetId: "ast_45a",
    departmentId: "ENG",
    corridorId: "NDLS-AGC",
    defectId: "df_01",
    taskType: "DEFECT_REPAIR",
    description: "Rail head split scan and fishplate tightening",
    locationStartKm: 45.200,
    locationEndKm: 46.100,
    criticalityScore: 94,
    urgencyScore: 90,
    safetyScore: 95,
    operationalImpactScore: 85,
    priorityScore: 92.4,
    estimatedDurationMinutes: 150,
    overdueDays: 1,
    dueAt: "2026-11-04T18:00:00.000Z",
    status: "PENDING",
    requiredBlock: true,
    requiresPowerShutdown: false,
    createdAt: "2026-11-02T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z"
  },
  {
    id: "TSK-TRD-NDLS-046-02",
    taskCode: "TSK-TRD-NDLS-046",
    assetId: "ast_ohe_46",
    departmentId: "TRD",
    corridorId: "NDLS-AGC",
    taskType: "PREVENTIVE",
    description: "OHE cantilever check",
    locationStartKm: 45.000,
    locationEndKm: 46.500,
    criticalityScore: 78,
    urgencyScore: 60,
    safetyScore: 80,
    operationalImpactScore: 60,
    priorityScore: 75.0,
    estimatedDurationMinutes: 120,
    overdueDays: 0,
    dueAt: "2026-11-10T18:00:00.000Z",
    status: "PENDING",
    requiredBlock: true,
    requiresPowerShutdown: true,
    createdAt: "2026-11-02T10:00:00.000Z",
    updatedAt: "2026-11-02T10:00:00.000Z"
  }
];

export const mockShadowBlocks: ShadowBlockCandidate[] = [
  {
    shadow_block_id: "SB-NDLS-301",
    primary_task_id: "TSK-ENG-NDLS-045-01",
    participating_task_ids: ["TSK-TRD-NDLS-046-02", "TSK-SNT-NDLS-045-03"],
    sections: ["sec_12_ndls_agc"],
    departments: ["ENG", "TRD", "SNT"],
    proposed_window_start: "2026-11-03T23:00:00Z",
    proposed_window_end: "2026-11-04T01:30:00Z",
    estimated_duration_minutes: 150,
    estimated_corridor_occupancy: 0.68,
    potential_time_saving_minutes: 95,
    resource_usage: { track_machine: 1, tower_wagon: 1, snt_crew: 1 },
    conflict_status: "FEASIBLE",
    shadow_benefit_score: 0.81,
    reasons: [
      "Collocated section (Km 45.2 - 46.1)",
      "Synchronized night possession window",
      "Consolidated 3 isolated closures into 1 possession"
    ]
  }
];

export const mockOptimizationRuns: OptimizationResult[] = [
  {
    runId: "run_0192a",
    runCode: "RUN-20261103-W1",
    status: "OPTIMAL",
    selected_task_ids: ["TSK-ENG-NDLS-045-01", "TSK-TRD-NDLS-046-02"],
    unscheduled_task_ids: ["TSK-SNT-NDLS-045-03"],
    schedule_candidates: [],
    shadow_blocks: mockShadowBlocks,
    train_conflicts: [],
    resource_utilization: { track_machine: 0.8 },
    objective_score: 0.81,
    baseline_comparison: {
      delta_objective: 0.05,
      train_disruption_reduction_pct: 20.8,
      savingMinutes: 270,
      savingPercentage: 28.4
    },
    solver_statistics: {
      runtime_ms: 1840,
      iterations: 50
    },
    generated_at: "2026-11-03T06:12:00.000Z"
  }
];

export const mockBlocks = [
  {
    id: "blk_55a1",
    blockCode: "BLK-NDLS-01",
    corridorId: "c01a...",
    startAt: "2026-11-03T23:00:00.000Z",
    endAt: "2026-11-04T01:30:00.000Z",
    durationMinutes: 150,
    status: "PROPOSED",
    planningHorizon: "WEEKLY",
    optimizationScore: 0.78,
    baselineDurationMinutes: 245,
    savedMinutes: 95,
    departments: ["ENG", "TRD"],
    locationStartKm: 45.000,
    locationEndKm: 46.500,
    blockTasks: [
      {
        id: "bt_01",
        maintenanceTaskId: "TSK-ENG-NDLS-045-01",
        departmentId: "ENG",
        startAt: "2026-11-03T23:00:00.000Z",
        endAt: "2026-11-04T01:30:00.000Z",
        status: "SCHEDULED"
      },
      {
        id: "bt_02",
        maintenanceTaskId: "TSK-TRD-NDLS-046-02",
        departmentId: "TRD",
        startAt: "2026-11-03T23:00:00.000Z",
        endAt: "2026-11-04T01:00:00.000Z",
        status: "SCHEDULED"
      }
    ]
  },
  {
    id: "blk_55a2",
    blockCode: "BLK-NDLS-02",
    corridorId: "c01a...",
    startAt: "2026-11-04T02:00:00.000Z",
    endAt: "2026-11-04T04:30:00.000Z",
    durationMinutes: 150,
    status: "APPROVED",
    planningHorizon: "WEEKLY",
    optimizationScore: 0.85,
    baselineDurationMinutes: 150,
    savedMinutes: 0,
    departments: ["SNT"],
    locationStartKm: 120.000,
    locationEndKm: 121.500,
    blockTasks: []
  }
];

export const mockDashboardData = {
  summary: {
    totalTasks: 42,
    pendingTasks: 18,
    scheduledTasks: 20,
    completedTasks: 4,
    overdueTasks: 3,
    totalBlocks: 8,
    proposedBlocks: 4,
    approvedBlocks: 3,
    executedBlocks: 1,
    totalHoursSaved: 4.5,
    activeCorridors: 2,
    departmentsCount: 3,
    p1Tasks: 4,
    p2Tasks: 11
  },
  recentRuns: mockOptimizationRuns
};
