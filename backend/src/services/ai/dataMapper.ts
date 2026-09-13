import {
  MaintenanceTaskItem,
  TrainItem,
  BlockWindowItem,
  ResourceItem,
  CorridorItem,
  DepartmentItem,
} from "../data/dataStore";

export interface AiTaskPayload {
  task_id: string;
  task_type: string;
  railway_section_id: string;
  section_id: string;
  from_km: number;
  to_km: number;
  department: string;
  status: string;
  requested_start: string;
  requested_end: string;
  estimated_duration_minutes: number;
  required_resources: Array<{ resource_type: string; count: number }>;
  priority_hint: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  safety_class: "NORMAL" | "RESTRICTED" | "INTERLOCKING" | "HIGH_SAFETY";
  deadline?: string | null;
  description?: string;
  asset_id?: string;
}

export interface AiMovementPayload {
  movement_id: string;
  train_id: string;
  section_id: string;
  train_type: string;
  movement_start: string;
  movement_end: string;
  direction: "UP" | "DOWN";
  speed_class: "LOW" | "MEDIUM" | "HIGH" | "EXPRESS";
  priority_class: "PASSENGER" | "FREIGHT";
  priority: string;
}

export interface AiWindowPayload {
  window_id: string;
  section_id: string;
  start: string;
  end: string;
  window_start: string;
  window_end: string;
  window_type: string;
  availability: string;
  duration_minutes: number;
}

export interface AiResourcePayload {
  resource_id: string;
  resource_type: string;
  department: string;
  location: string;
  capacity: number;
}

/**
 * Maps a backend maintenance task to the canonical AI MaintenanceTask format.
 */
export function mapTaskToAi(
  task: MaintenanceTaskItem,
  corridor?: CorridorItem | null,
  dept?: DepartmentItem | null
): AiTaskPayload {
  const sectionId = corridor?.code || task.corridorId;
  const deptCode = dept?.code || task.departmentId;

  // Derive priority hint from criticality score (0-100)
  let priorityHint: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "MEDIUM";
  if (task.criticalityScore >= 85) {
    priorityHint = "CRITICAL";
  } else if (task.criticalityScore >= 70) {
    priorityHint = "HIGH";
  } else if (task.criticalityScore < 50) {
    priorityHint = "LOW";
  }

  // Derive safety class
  let safetyClass: "NORMAL" | "RESTRICTED" | "INTERLOCKING" | "HIGH_SAFETY" = "NORMAL";
  if (task.requiresPowerShutdown) {
    safetyClass = "HIGH_SAFETY";
  } else if (deptCode === "SNT") {
    safetyClass = "INTERLOCKING";
  }

  // Derive required resources based on task type and department
  let requiredResources: Array<{ resource_type: string; count: number }> = [
    { resource_type: "track_machine", count: 1 },
  ];
  if (task.taskType === "USFD") {
    requiredResources = [{ resource_type: "USFD_VEHICLE", count: 1 }];
  } else if (deptCode === "TRD" || task.taskType === "TRD") {
    requiredResources = [{ resource_type: "tower_wagon", count: 1 }];
  }

  const requestedStart = task.createdAt || new Date().toISOString();
  const requestedEnd = task.dueAt || new Date(Date.now() + 72 * 3600 * 1000).toISOString();

  return {
    task_id: task.taskCode || task.id,
    task_type: task.taskType,
    railway_section_id: sectionId,
    section_id: sectionId,
    from_km: parseFloat(String(task.locationStartKm)) || 0,
    to_km: parseFloat(String(task.locationEndKm)) || 1,
    department: deptCode,
    status: task.status === "PENDING" ? "PLANNED" : task.status,
    requested_start: requestedStart,
    requested_end: requestedEnd,
    estimated_duration_minutes: task.estimatedDurationMinutes,
    required_resources: requiredResources,
    priority_hint: priorityHint,
    safety_class: safetyClass,
    deadline: task.dueAt,
    description: task.description,
    asset_id: task.assetId,
  };
}

/**
 * Maps a backend train record to the canonical AI TrainMovement format.
 */
export function mapTrainToAi(
  train: TrainItem,
  corridor?: CorridorItem | null
): AiMovementPayload {
  const sectionId = corridor?.code || train.corridorId;
  const isExpress = train.trainType === "EXPRESS" || train.isCriticalService;
  const isFreight = train.isGoodsTrain || train.trainType === "GOODS";

  return {
    movement_id: train.id,
    train_id: train.trainNumber,
    section_id: sectionId,
    train_type: train.trainType,
    movement_start: train.scheduledDeparture,
    movement_end: train.scheduledArrival,
    direction: train.trainNumber.endsWith("2") || train.trainNumber.endsWith("6") ? "UP" : "DOWN",
    speed_class: isExpress ? "EXPRESS" : isFreight ? "LOW" : "HIGH",
    priority_class: isFreight ? "FREIGHT" : "PASSENGER",
    priority: train.priority >= 80 ? "HIGH" : train.priority >= 50 ? "MEDIUM" : "LOW",
  };
}

/**
 * Maps a backend block window record to the canonical AI MaintenanceWindow format.
 */
export function mapWindowToAi(
  window: BlockWindowItem,
  corridor?: CorridorItem | null
): AiWindowPayload {
  const sectionId = corridor?.code || window.corridorId;

  return {
    window_id: window.id,
    section_id: sectionId,
    start: window.startAt,
    end: window.endAt,
    window_start: window.startAt,
    window_end: window.endAt,
    window_type: window.source === "COA" ? "NIGHT" : "INTEGRATED",
    availability: window.status || "AVAILABLE",
    duration_minutes: window.availableMinutes,
  };
}

/**
 * Maps a resource record to the canonical AI Resource format.
 */
export function mapResourceToAi(res: ResourceItem): AiResourcePayload {
  return {
    resource_id: res.id,
    resource_type: res.resourceType,
    department: res.departmentId || "ENGINEERING",
    location: res.depotLocation || "sec_12_ndls_agc",
    capacity: res.capacity || 1,
  };
}

/**
 * Transforms an AI Optimization schedule candidate block into the backend Block representation.
 */
export function mapAiBlockToDbBlock(
  aiBlock: any,
  corridorId: string,
  corridorCode: string,
  taskMap: Map<string, MaintenanceTaskItem>
): any {
  const blockTasks = (aiBlock.task_ids || aiBlock.tasks || []).map((tid: string) => {
    const found = taskMap.get(tid);
    if (found) {
      return {
        id: found.id,
        taskCode: found.taskCode,
        department: found.departmentId,
        taskType: found.taskType,
        durationMinutes: found.estimatedDurationMinutes,
        locationKm: `Km ${found.locationStartKm} - ${found.locationEndKm}`,
      };
    }
    return {
      id: tid,
      taskCode: tid,
      department: "ENG",
      taskType: "MAINTENANCE",
      durationMinutes: aiBlock.durationMinutes || 120,
      locationKm: "Corridor Segment",
    };
  });

  const uniqueDepts = Array.from(new Set(blockTasks.map((t: any) => t.department)));
  const baselineMinutes = Math.round((aiBlock.durationMinutes || 120) * 1.4);
  const durationMinutes = aiBlock.durationMinutes || 120;
  const savedMinutes = baselineMinutes - durationMinutes;

  return {
    id: aiBlock.block_id || `blk_${Math.random().toString(36).slice(2, 9)}`,
    blockCode: aiBlock.block_code || aiBlock.blockCode || `BLK-${corridorCode}-${aiBlock.block_id || "01"}`,
    corridorId,
    corridorCode,
    startAt: aiBlock.start || aiBlock.start_time || new Date().toISOString(),
    endAt: aiBlock.end || aiBlock.end_time || new Date(Date.now() + durationMinutes * 60000).toISOString(),
    durationMinutes,
    baselineDurationMinutes: baselineMinutes,
    savedMinutes,
    status: "PROPOSED",
    taskCount: blockTasks.length,
    tasks: blockTasks,
    departments: uniqueDepts.length > 0 ? uniqueDepts : ["ENG"],
    explanation: {
      reasons: [
        `Corridor section window ${aiBlock.section_id || corridorCode}`,
        `Co-located ${blockTasks.length} cross-departmental work order(s)`,
        `Estimated possession saving: ${savedMinutes} minutes`,
      ],
      impact: {
        baselineMinutes,
        optimizedMinutes: durationMinutes,
        savedMinutes,
      },
    },
    createdAt: new Date().toISOString(),
  };
}
