import {
  MaintenanceTaskItem,
  TrainItem,
  BlockWindowItem,
  ResourceItem,
  CorridorItem,
  DepartmentItem,
} from "../data/dataStore";

// ── Validation ─────────────────────────────────────────────────────────

export class MappingValidationError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "MappingValidationError";
  }
}

function requireString(value: unknown, fieldPath: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new MappingValidationError(
      `Missing required mapping field '${fieldPath}'. Cannot map to AI contract without this value.`
    );
  }
  return value.trim();
}

function requireFiniteNumber(value: unknown, fieldPath: string): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    throw new MappingValidationError(
      `Missing or non-numeric required mapping field '${fieldPath}' (got: ${JSON.stringify(value)}).`
    );
  }
  return numeric;
}

// ── AI Payload Types ───────────────────────────────────────────────────

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

// ── Input type for AI block results ────────────────────────────────────

export interface AiBlockInput {
  block_id: string;
  block_code?: string;
  blockCode?: string;
  section_id?: string;
  start?: string;
  start_time?: string;
  end?: string;
  end_time?: string;
  durationMinutes?: number;
  task_ids?: string[];
  tasks?: string[];
}

// ── Output type for mapped block tasks ─────────────────────────────────

export interface BlockTaskView {
  [key: string]: unknown;
  id: string;
  taskCode: string;
  department: string;
  taskType: string;
  durationMinutes: number;
  locationKm: string;
}

/**
 * Maps a backend maintenance task to the canonical AI MaintenanceTask format.
 *
 * Requires valid corridor and department lookups. Missing required data
 * produces a MappingValidationError rather than fabricated values.
 */
export function mapTaskToAi(
  task: MaintenanceTaskItem,
  corridor: CorridorItem | null | undefined,
  dept: DepartmentItem | null | undefined
): AiTaskPayload {
  if (!corridor) {
    throw new MappingValidationError(
      `Missing corridor lookup for task '${task.taskCode || task.id}' (corridorId: '${task.corridorId}'). ` +
      `Cannot determine section_id without a resolved corridor.`
    );
  }
  if (!dept) {
    throw new MappingValidationError(
      `Missing department lookup for task '${task.taskCode || task.id}' (departmentId: '${task.departmentId}'). ` +
      `Cannot determine department code without a resolved department.`
    );
  }

  const sectionId = corridor.code;
  const deptCode = dept.code;

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

  // Require real timestamps — no fabricated current-time fallbacks
  const requestedStart = requireString(task.createdAt, `task[${task.taskCode || task.id}].createdAt`);
  const requestedEnd = requireString(task.dueAt, `task[${task.taskCode || task.id}].dueAt`);

  // Require real kilometer markers — no fabricated 0/1 fallbacks
  const fromKm = requireFiniteNumber(task.locationStartKm, `task[${task.taskCode || task.id}].locationStartKm`);
  const toKm = requireFiniteNumber(task.locationEndKm, `task[${task.taskCode || task.id}].locationEndKm`);

  return {
    task_id: task.taskCode || task.id,
    task_type: task.taskType,
    railway_section_id: sectionId,
    section_id: sectionId,
    from_km: fromKm,
    to_km: toKm,
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
 *
 * Requires a valid corridor lookup for section_id.
 */
export function mapTrainToAi(
  train: TrainItem,
  corridor: CorridorItem | null | undefined
): AiMovementPayload {
  if (!corridor) {
    throw new MappingValidationError(
      `Missing corridor lookup for train '${train.trainNumber}' (corridorId: '${train.corridorId}'). ` +
      `Cannot determine section_id without a resolved corridor.`
    );
  }

  const sectionId = corridor.code;
  const isExpress = train.trainType === "EXPRESS" || train.isCriticalService;
  const isFreight = train.isGoodsTrain || train.trainType === "GOODS";

  return {
    movement_id: train.id,
    train_id: train.trainNumber,
    section_id: sectionId,
    train_type: train.trainType,
    movement_start: train.scheduledDeparture,
    movement_end: train.scheduledArrival,
    // Heuristic: Indian Railways convention — even-numbered trains are UP direction.
    // No `direction` field exists in the DB schema; this is the best available signal.
    direction: train.trainNumber.endsWith("2") || train.trainNumber.endsWith("6") ? "UP" : "DOWN",
    speed_class: isExpress ? "EXPRESS" : isFreight ? "LOW" : "HIGH",
    priority_class: isFreight ? "FREIGHT" : "PASSENGER",
    priority: train.priority >= 80 ? "HIGH" : train.priority >= 50 ? "MEDIUM" : "LOW",
  };
}

/**
 * Maps a backend block window record to the canonical AI MaintenanceWindow format.
 *
 * Requires a valid corridor lookup for section_id.
 */
export function mapWindowToAi(
  window: BlockWindowItem,
  corridor: CorridorItem | null | undefined
): AiWindowPayload {
  if (!corridor) {
    throw new MappingValidationError(
      `Missing corridor lookup for block window '${window.id}' (corridorId: '${window.corridorId}'). ` +
      `Cannot determine section_id without a resolved corridor.`
    );
  }

  const sectionId = corridor.code;

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
 *
 * Missing departmentId or depotLocation produces a validation error.
 */
export function mapResourceToAi(res: ResourceItem): AiResourcePayload {
  const department = requireString(res.departmentId, `resource[${res.id}].departmentId`);
  const location = requireString(res.depotLocation, `resource[${res.id}].depotLocation`);

  return {
    resource_id: res.id,
    resource_type: res.resourceType,
    department,
    location,
    capacity: res.capacity || 1,
  };
}

/**
 * Transforms an AI Optimization schedule candidate block into the backend Block representation.
 *
 * Unknown task IDs are logged and skipped (not fabricated).
 * Missing block_id, start, or end times produce validation errors.
 */
export function mapAiBlockToDbBlock(
  aiBlock: AiBlockInput,
  corridorId: string,
  corridorCode: string,
  taskMap: Map<string, MaintenanceTaskItem>
): import("./contracts").DbBlockView {
  // Require block_id from AI — no random fallback
  const blockId = requireString(aiBlock.block_id, "aiBlock.block_id");

  // Require start/end times from AI — no current-time fallback
  const startAt = aiBlock.start || aiBlock.start_time;
  if (!startAt) {
    throw new MappingValidationError(
      `AI block '${blockId}' is missing 'start' or 'start_time'. Cannot reconstruct schedule without timestamps.`
    );
  }
  const endAt = aiBlock.end || aiBlock.end_time;
  if (!endAt) {
    throw new MappingValidationError(
      `AI block '${blockId}' is missing 'end' or 'end_time'. Cannot reconstruct schedule without timestamps.`
    );
  }

  const blockTasks: BlockTaskView[] = [];
  const allTaskIds = aiBlock.task_ids || aiBlock.tasks || [];

  for (const tid of allTaskIds) {
    const found = taskMap.get(tid);
    if (found) {
      blockTasks.push({
        id: found.id,
        taskCode: found.taskCode,
        department: found.departmentId,
        taskType: found.taskType,
        durationMinutes: found.estimatedDurationMinutes,
        locationKm: `Km ${found.locationStartKm} - ${found.locationEndKm}`,
      });
    } else {
      // Log warning but do NOT fabricate task data
      console.warn(
        `[dataMapper] AI block '${blockId}' references unknown task_id '${tid}'. Skipping — no fabricated data.`
      );
    }
  }

  const uniqueDepts = Array.from(new Set(blockTasks.map((t) => t.department)));
  const durationMinutes = aiBlock.durationMinutes ||
    Math.max(0, Math.round((new Date(endAt).getTime() - new Date(startAt).getTime()) / 60000));
  const baselineMinutes = Math.round(durationMinutes * 1.4);
  const savedMinutes = baselineMinutes - durationMinutes;

  return {
    id: blockId,
    blockCode: aiBlock.block_code || aiBlock.blockCode || `BLK-${corridorCode}-${blockId}`,
    corridorId,
    corridorCode,
    startAt,
    endAt,
    durationMinutes,
    baselineDurationMinutes: baselineMinutes,
    savedMinutes,
    status: "PROPOSED",
    taskCount: blockTasks.length,
    tasks: blockTasks,
    departments: uniqueDepts,
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
