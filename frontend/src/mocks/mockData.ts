import type { MaintenanceTask, OptimizationResult, ShadowBlockCandidate } from '../types/api';

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

// ── Emergency Planning Mock ────────────────────────────────────────
// Shaped exactly like EmergencyEngine.insert_emergency_event() return
export const mockEmergencyResult = {
  emergency_task: {
    task_id: "task_emg_EMG-001",
    task_type: "USFD",
    railway_section_id: "sec_12_ndls_agc",
    from_km: 45.3,
    to_km: 46.0,
    department: "ENGINEERING",
    status: "PLANNED",
    requested_start: "2026-11-03T11:00:00Z",
    requested_end: "2026-11-03T13:00:00Z",
    estimated_duration_minutes: 120,
    required_resources: [{ resource_type: "USFD_VEHICLE", count: 1 }],
    priority_hint: "CRITICAL",
    safety_class: "HIGH_SAFETY",
    deadline: "2026-11-04T11:00:00Z",
    description: "EMERGENCY NEW_USFD_DEFECT: Transverse rail fissure detected at Km 45.3, immediate USFD scan and rail replacement required",
    asset_id: "ast_45a"
  },
  urgency: "CRITICAL" as const,
  affected_section: "sec_12_ndls_agc",
  feasible_windows: [
    {
      window_id: "win_emg_01",
      section_id: "sec_12_ndls_agc",
      start: "2026-11-03T11:00:00Z",
      end: "2026-11-03T13:00:00Z",
      availability: "AVAILABLE",
      impact_summary: "Requires looping freight train BOXN-402 at Palwal"
    },
    {
      window_id: "win_emg_02",
      section_id: "sec_12_ndls_agc",
      start: "2026-11-03T13:30:00Z",
      end: "2026-11-03T15:30:00Z",
      availability: "AVAILABLE",
      impact_summary: "Delays Gatimaan Express by 14 mins"
    },
    {
      window_id: "win_emg_03",
      section_id: "sec_12_ndls_agc",
      start: "2026-11-03T16:00:00Z",
      end: "2026-11-03T18:00:00Z",
      availability: "AVAILABLE",
      impact_summary: "Overlaps existing TRD inspection block"
    }
  ],
  reoptimization_request: {
    request_id: "emg_reopt_EMG-001",
    mode: "EMERGENCY"
  },
  resulting_schedule: {
    schedule_id: "sched_emg_001",
    task_ids: ["task_emg_EMG-001", "TSK-ENG-NDLS-045-01"],
    blocks: [{
      block_id: "blk_emg_01",
      section_id: "sec_12_ndls_agc",
      start: "2026-11-03T11:00:00Z",
      end: "2026-11-03T13:00:00Z",
      durationMinutes: 120
    }],
    start_time: "2026-11-03T11:00:00Z",
    end_time: "2026-11-03T13:00:00Z",
    estimated_disruption_minutes: 12,
    resource_assignments: { USFD_VEHICLE: ["usfd_v1"] },
    status: "FEASIBLE"
  },
  optimization_result: {
    status: "FEASIBLE",
    selected_task_ids: ["task_emg_EMG-001", "TSK-ENG-NDLS-045-01"],
    unscheduled_task_ids: ["TSK-SNT-NDLS-045-03"],
    objective_score: 0.76,
    resource_utilization: { USFD_VEHICLE: 0.85, track_machine: 0.6 },
    solver_statistics: { runtime_ms: 820, iterations: 25 }
  },
  errors: [] as string[],
  explanation: "Emergency event 'EMG-001' (NEW_USFD_DEFECT) in section 'sec_12_ndls_agc' processed. Created emergency task 'task_emg_EMG-001' with criticality 0.97 (P1). Scheduled successfully in block blk_emg_01."
};

// ── What-If Scenario Mock ──────────────────────────────────────────
// Shaped exactly like WhatIfEngine.reoptimize() return
export const mockWhatIfResult = {
  original_schedule_id: "sched_base",
  new_schedule: {
    schedule_id: "sched_whatif_001",
    task_ids: ["TSK-ENG-NDLS-045-01", "TSK-TRD-NDLS-046-02"],
    blocks: [{
      block_id: "blk_shifted_01",
      section_id: "sec_12_ndls_agc",
      start: "2026-11-04T00:30:00Z",
      end: "2026-11-04T03:00:00Z",
      durationMinutes: 150
    }],
    start_time: "2026-11-04T00:30:00Z",
    end_time: "2026-11-04T03:00:00Z",
    estimated_disruption_minutes: 27,
    resource_assignments: { track_machine: ["tm_01"], tower_wagon: ["tw_01"] },
    status: "FEASIBLE"
  },
  all_schedule_candidates: [],
  changed_blocks: ["blk_55a1", "blk_shifted_01"],
  affected_tasks: ["TSK-ENG-NDLS-045-01", "TSK-TRD-NDLS-046-02"],
  affected_trains: ["12002"],
  metric_differences: {
    objective_score: -0.04,
    train_disruption_minutes: 15,
    resource_utilization_delta: 0.02
  },
  explanation: "Train delay of 45min applied to 1 train movement(s). Schedule reoptimized (FEASIBLE): 2 task(s) scheduled. Objective delta: -0.040, Disruption delta: +15.0min.",
  errors: [] as string[],
  optimization_result: {
    status: "FEASIBLE",
    selected_task_ids: ["TSK-ENG-NDLS-045-01", "TSK-TRD-NDLS-046-02"],
    unscheduled_task_ids: ["TSK-SNT-NDLS-045-03"],
    objective_score: 0.77,
    resource_utilization: { track_machine: 0.82 },
    solver_statistics: { runtime_ms: 1200, iterations: 38 }
  }
};

// ── Explanations Mock ──────────────────────────────────────────────
// Shaped exactly like Explanation type from api.ts
import type { Explanation } from '../types/api';

export const mockExplanations: Explanation[] = [
  {
    explanation_id: "EXP-BLK-01",
    entity_type: "BLOCK",
    entity_id: "BLK-NDLS-01",
    summary: "Maintenance block scheduled during nocturnal freight corridor lull (23:00 - 01:30) to minimize passenger disruption while co-locating TRD cantilever and ENG rail defect repairs.",
    reason_codes: ["NOCTURNAL_INTERVAL_OPTIMAL", "SHADOW_BLOCK_COMPATIBLE", "CREW_CONCURRENCY_OK"],
    evidence: {
      passenger_train_conflicts: 0,
      freight_diversion_penalty_minutes: 12,
      saved_possession_minutes: 95,
      department_overlap_ratio: 0.85
    },
    deterministic_inputs: {
      section: "NDLS-AGC (Km 45.0 - 46.5)",
      primary_task: "TSK-ENG-NDLS-045-01",
      secondary_task: "TSK-TRD-NDLS-046-02",
      power_shutdown_required: true
    },
    generated_by: "AI_EXPLAINABILITY_ENGINE_V1"
  },
  {
    explanation_id: "EXP-GRP-02",
    entity_type: "GROUPING",
    entity_id: "SB-NDLS-301",
    summary: "TRD maintenance combined into engineering possession window because both activities require track isolation within 1.5 km and TRD team is certified for concurrent track work.",
    reason_codes: ["SPATIAL_PROXIMITY_UNDER_2KM", "OHE_SHUTDOWN_SHARED", "SAFETY_CLEARANCE_VALID"],
    evidence: {
      spatial_distance_km: 0.2,
      power_shutdown_shared: true,
      corridor_occupancy_savings: "38%"
    },
    deterministic_inputs: {
      location_start_km: 45.0,
      location_end_km: 46.5,
      participating_departments: ["ENG", "TRD"]
    },
    generated_by: "SHADOW_BLOCK_OPTIMIZER"
  },
  {
    explanation_id: "EXP-REJ-03",
    entity_type: "REJECTION",
    entity_id: "TSK-SNT-NDLS-099",
    summary: "Signal relay replacement rejected from Block BLK-NDLS-01 due to insufficient headway with Gatimaan Express passage scheduled at 02:05.",
    reason_codes: ["HEADWAY_VIOLATION", "BUFFER_BELOW_MINIMUM", "PASSENGER_TRAIN_HIGH_PRIORITY"],
    evidence: {
      required_buffer_minutes: 30,
      available_buffer_minutes: 14,
      priority_train: "12050 Gatimaan Exp"
    },
    deterministic_inputs: {
      conflict_km: 45.2,
      train_speed_kmh: 160
    },
    generated_by: "COMPATIBILITY_CHECKER"
  }
];

// ── Train Movements Mock ───────────────────────────────────────────
export const mockTrainMovements = [
  {
    movement_id: "mv_22436_01",
    train_id: "22436",
    train_number: "22436",
    train_name: "Vande Bharat Express",
    train_type: "EXPRESS" as const,
    speed_class: "EXPRESS" as const,
    section_id: "sec_12_ndls_agc",
    movement_start: "2026-11-03T06:00:00Z",
    movement_end: "2026-11-03T08:30:00Z",
    priority: "HIGH",
    direction: "UP"
  },
  {
    movement_id: "mv_12002_01",
    train_id: "12002",
    train_number: "12002",
    train_name: "Bhopal Shatabdi",
    train_type: "EXPRESS" as const,
    speed_class: "HIGH" as const,
    section_id: "sec_12_ndls_agc",
    movement_start: "2026-11-03T06:15:00Z",
    movement_end: "2026-11-03T08:05:00Z",
    priority: "HIGH",
    direction: "DOWN"
  },
  {
    movement_id: "mv_12050_01",
    train_id: "12050",
    train_number: "12050",
    train_name: "Gatimaan Express",
    train_type: "EXPRESS" as const,
    speed_class: "EXPRESS" as const,
    section_id: "sec_12_ndls_agc",
    movement_start: "2026-11-03T08:10:00Z",
    movement_end: "2026-11-03T09:40:00Z",
    priority: "HIGH",
    direction: "DOWN"
  },
  {
    movement_id: "mv_boxn_402",
    train_id: "BOXN-402",
    train_number: "BOXN-402",
    train_name: "Coal Rake Freight",
    train_type: "GOODS" as const,
    speed_class: "LOW" as const,
    section_id: "sec_12_ndls_agc",
    movement_start: "2026-11-03T10:00:00Z",
    movement_end: "2026-11-03T14:00:00Z",
    priority: "LOW",
    direction: "UP"
  },
  {
    movement_id: "mv_14512_01",
    train_id: "14512",
    train_number: "14512",
    train_name: "Nauchandi Express",
    train_type: "PASSENGER" as const,
    speed_class: "MEDIUM" as const,
    section_id: "sec_12_ndls_agc",
    movement_start: "2026-11-03T15:30:00Z",
    movement_end: "2026-11-03T19:00:00Z",
    priority: "MEDIUM",
    direction: "UP"
  }
];
