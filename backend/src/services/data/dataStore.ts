import { db, isDatabaseConfigured } from "../../db";
import {
  departments,
  corridors,
  assets,
  defects,
  maintenanceTasks,
  trains,
  blockWindows,
  blocks,
  blockTasks,
  optimizationRuns,
} from "../../db/schema";
import { eq, desc, and, like, or } from "drizzle-orm";
import type { DbBlockView, CriticalityScore } from "../ai/contracts";

export interface DepartmentItem {
  id: string;
  code: string;
  name: string;
}

export interface CorridorItem {
  id: string;
  code: string;
  name: string;
  zone?: string;
  division?: string;
  startKm: string;
  endKm: string;
  status: string;
}

export interface AssetItem {
  id: string;
  assetCode: string;
  assetType: string;
  departmentId: string;
  corridorId: string;
  locationKm: string;
  criticalityScore: number;
  safetyScore: number;
  healthScore: number;
  status: string;
}

export interface MaintenanceTaskItem {
  id: string;
  taskCode: string;
  assetId: string;
  departmentId: string;
  corridorId: string;
  defectId?: string | null;
  taskType: "USFD" | "TRD" | "SNT" | "ENGINEERING" | "DEFECT_REPAIR" | "PREVENTIVE" | "CORRECTIVE" | "INSPECTION" | "EMERGENCY" | "OTHER";
  description: string;
  locationStartKm: string | number;
  locationEndKm: string | number;
  criticalityScore: number;
  urgencyScore: number;
  safetyScore: number;
  operationalImpactScore: number;
  priorityScore: string | number;
  estimatedDurationMinutes: number;
  overdueDays: number;
  dueAt: string | null;
  status: "PENDING" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "BLOCKED";
  requiredBlock: boolean;
  requiresPowerShutdown: boolean;
  createdAt: string;
  updatedAt: string;
  criticalityDetail?: CriticalityScore;
}

export interface OptimizationRunRecord {
  id?: string;
  runId?: string;
  runCode: string;
  horizon: string;
  startDate: string;
  endDate: string;
  tasksConsidered: number;
  tasksScheduled: number;
  blocksGenerated: number;
  totalBlockMinutes: number;
  baselineBlockMinutes: number;
  estimatedSavingsMinutes: number;
  optimizationScore: string;
  status: string;
  createdAt: string;
}

export interface TrainItem {
  id: string;
  trainNumber: string;
  trainName: string;
  trainType: "PASSENGER" | "EXPRESS" | "GOODS" | "SPECIAL";
  corridorId: string;
  scheduledArrival: string;
  scheduledDeparture: string;
  priority: number;
  isGoodsTrain: boolean;
  isCriticalService: boolean;
  status: string;
  createdAt: string;
}

export interface BlockWindowItem {
  id: string;
  corridorId: string;
  startAt: string;
  endAt: string;
  availableMinutes: number;
  source: "COA" | "MANUAL" | "PREDICTED";
  status: string;
  createdAt: string;
}

export interface ResourceItem {
  id: string;
  resourceCode: string;
  resourceType: string;
  departmentId: string;
  depotLocation: string;
  capacity: number;
  status: string;
}

// ── Canonical Seed Data for In-Memory Fallback ─────────────────────────

const SEED_DEPARTMENTS: DepartmentItem[] = [
  { id: "dept_eng", code: "ENG", name: "Civil Engineering & Permanent Way" },
  { id: "dept_trd", code: "TRD", name: "Traction Distribution & OHE" },
  { id: "dept_snt", code: "SNT", name: "Signal & Telecommunication" },
];

const SEED_CORRIDORS: CorridorItem[] = [
  {
    id: "corr_ndls_agc",
    code: "NDLS-AGC",
    name: "New Delhi to Agra Cantt High Density Network",
    zone: "Northern Railway",
    division: "Delhi",
    startKm: "0.000",
    endKm: "195.000",
    status: "ACTIVE",
  },
  {
    id: "corr_agc_gwl",
    code: "AGC-GWL",
    name: "Agra Cantt to Gwalior Junction Section",
    zone: "North Central Railway",
    division: "Agra",
    startKm: "195.000",
    endKm: "314.000",
    status: "ACTIVE",
  },
];

const SEED_ASSETS: AssetItem[] = [
  {
    id: "ast_trk_45",
    assetCode: "AST-TRK-NDLS-045",
    assetType: "Continuous Welded Rail (60kg UIC)",
    departmentId: "dept_eng",
    corridorId: "corr_ndls_agc",
    locationKm: "45.500",
    criticalityScore: 88,
    safetyScore: 92,
    healthScore: 70,
    status: "DEGRADED",
  },
  {
    id: "ast_ohe_128",
    assetCode: "AST-OHE-NDLS-128",
    assetType: "25kV AC Traction Catenary & Contact Wire",
    departmentId: "dept_trd",
    corridorId: "corr_ndls_agc",
    locationKm: "46.200",
    criticalityScore: 82,
    safetyScore: 85,
    healthScore: 74,
    status: "ACTIVE",
  },
  {
    id: "ast_sig_88",
    assetCode: "AST-SIG-NDLS-088",
    assetType: "Point Machine & Interlocking Sensor",
    departmentId: "dept_snt",
    corridorId: "corr_ndls_agc",
    locationKm: "45.800",
    criticalityScore: 78,
    safetyScore: 88,
    healthScore: 68,
    status: "DEGRADED",
  },
];

const now = new Date();
const base = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));

const SEED_TASKS: MaintenanceTaskItem[] = [
  {
    id: "task_eng_045_01",
    taskCode: "TSK-ENG-NDLS-045-01",
    assetId: "ast_trk_45",
    departmentId: "ENG",
    corridorId: "corr_ndls_agc",
    defectId: null,
    taskType: "USFD",
    description: "Deep screening and ultrasonic rail defect remediation at Km 45.2 - 46.5",
    locationStartKm: "45.200",
    locationEndKm: "46.500",
    criticalityScore: 92,
    urgencyScore: 88,
    safetyScore: 95,
    operationalImpactScore: 80,
    priorityScore: "91.5",
    estimatedDurationMinutes: 120,
    overdueDays: 0,
    dueAt: new Date(base.getTime() + 48 * 3600 * 1000).toISOString(),
    status: "PENDING",
    requiredBlock: true,
    requiresPowerShutdown: false,
    createdAt: new Date(base.getTime() - 12 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task_trd_046_02",
    taskCode: "TSK-TRD-NDLS-046-02",
    assetId: "ast_ohe_128",
    departmentId: "TRD",
    corridorId: "corr_ndls_agc",
    defectId: null,
    taskType: "TRD",
    description: "OHE cantilever alignment, tension balance, and insulator chemical wash",
    locationStartKm: "45.000",
    locationEndKm: "46.800",
    criticalityScore: 82,
    urgencyScore: 78,
    safetyScore: 86,
    operationalImpactScore: 70,
    priorityScore: "81.0",
    estimatedDurationMinutes: 90,
    overdueDays: 0,
    dueAt: new Date(base.getTime() + 48 * 3600 * 1000).toISOString(),
    status: "PENDING",
    requiredBlock: true,
    requiresPowerShutdown: true,
    createdAt: new Date(base.getTime() - 8 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task_snt_045_03",
    taskCode: "TSK-SNT-NDLS-045-03",
    assetId: "ast_sig_88",
    departmentId: "SNT",
    corridorId: "corr_ndls_agc",
    defectId: null,
    taskType: "SNT",
    description: "Electronic interlocking point machine motor inspection & contact adjustment",
    locationStartKm: "45.300",
    locationEndKm: "45.800",
    criticalityScore: 75,
    urgencyScore: 70,
    safetyScore: 85,
    operationalImpactScore: 65,
    priorityScore: "74.5",
    estimatedDurationMinutes: 60,
    overdueDays: 0,
    dueAt: new Date(base.getTime() + 48 * 3600 * 1000).toISOString(),
    status: "PENDING",
    requiredBlock: true,
    requiresPowerShutdown: false,
    createdAt: new Date(base.getTime() - 6 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "task_eng_088_04",
    taskCode: "TSK-ENG-NDLS-088-04",
    assetId: "ast_trk_45",
    departmentId: "ENG",
    corridorId: "corr_ndls_agc",
    defectId: null,
    taskType: "PREVENTIVE",
    description: "Ballast tamping and track alignment verification between Km 88.0 and 92.0",
    locationStartKm: "88.000",
    locationEndKm: "92.000",
    criticalityScore: 68,
    urgencyScore: 60,
    safetyScore: 70,
    operationalImpactScore: 55,
    priorityScore: "66.0",
    estimatedDurationMinutes: 150,
    overdueDays: 0,
    dueAt: new Date(base.getTime() + 72 * 3600 * 1000).toISOString(),
    status: "PENDING",
    requiredBlock: true,
    requiresPowerShutdown: false,
    createdAt: new Date(base.getTime() - 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const SEED_TRAINS: TrainItem[] = [
  {
    id: "trn_12002",
    trainNumber: "12002",
    trainName: "Bhopal Shatabdi Express",
    trainType: "EXPRESS",
    corridorId: "corr_ndls_agc",
    scheduledDeparture: new Date(base.getTime() + 6 * 3600 * 1000).toISOString(),
    scheduledArrival: new Date(base.getTime() + 8 * 3600 * 1000).toISOString(),
    priority: 95,
    isGoodsTrain: false,
    isCriticalService: true,
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
  },
  {
    id: "trn_12050",
    trainNumber: "12050",
    trainName: "Gatimaan Express",
    trainType: "EXPRESS",
    corridorId: "corr_ndls_agc",
    scheduledDeparture: new Date(base.getTime() + 8 * 3600 * 1000 + 10 * 60000).toISOString(),
    scheduledArrival: new Date(base.getTime() + 10 * 3600 * 1000).toISOString(),
    priority: 95,
    isGoodsTrain: false,
    isCriticalService: true,
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
  },
  {
    id: "trn_boxn_402",
    trainNumber: "BOXN-402",
    trainName: "Freight Coal Rake BOXN-402",
    trainType: "GOODS",
    corridorId: "corr_ndls_agc",
    scheduledDeparture: new Date(base.getTime() + 10 * 3600 * 1000).toISOString(),
    scheduledArrival: new Date(base.getTime() + 14 * 3600 * 1000 + 30 * 60000).toISOString(),
    priority: 30,
    isGoodsTrain: true,
    isCriticalService: false,
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
  },
  {
    id: "trn_14512",
    trainNumber: "14512",
    trainName: "Nauchandi Express",
    trainType: "PASSENGER",
    corridorId: "corr_ndls_agc",
    scheduledDeparture: new Date(base.getTime() + 15 * 3600 * 1000 + 30 * 60000).toISOString(),
    scheduledArrival: new Date(base.getTime() + 19 * 3600 * 1000).toISOString(),
    priority: 60,
    isGoodsTrain: false,
    isCriticalService: false,
    status: "SCHEDULED",
    createdAt: new Date().toISOString(),
  },
];

const SEED_WINDOWS: BlockWindowItem[] = [
  {
    id: "win_night_01",
    corridorId: "corr_ndls_agc",
    startAt: new Date(base.getTime() + 23 * 3600 * 1000).toISOString(),
    endAt: new Date(base.getTime() + 28 * 3600 * 1000).toISOString(),
    availableMinutes: 300,
    source: "COA",
    status: "AVAILABLE",
    createdAt: new Date().toISOString(),
  },
  {
    id: "win_noon_02",
    corridorId: "corr_ndls_agc",
    startAt: new Date(base.getTime() + 11 * 3600 * 1000).toISOString(),
    endAt: new Date(base.getTime() + 14 * 3600 * 1000).toISOString(),
    availableMinutes: 180,
    source: "COA",
    status: "AVAILABLE",
    createdAt: new Date().toISOString(),
  },
  {
    id: "win_agc_gwl_01",
    corridorId: "corr_agc_gwl",
    startAt: new Date(base.getTime() + 22 * 3600 * 1000).toISOString(),
    endAt: new Date(base.getTime() + 25 * 3600 * 1000).toISOString(),
    availableMinutes: 180,
    source: "COA",
    status: "AVAILABLE",
    createdAt: new Date().toISOString(),
  },
];

const SEED_RESOURCES: ResourceItem[] = [
  {
    id: "res_csm_01",
    resourceCode: "CSM-TAMP-01",
    resourceType: "track_machine",
    departmentId: "dept_eng",
    depotLocation: "NDLS Maintenance Depot",
    capacity: 1,
    status: "AVAILABLE",
  },
  {
    id: "res_tw_01",
    resourceCode: "TW-OHE-NDLS-01",
    resourceType: "tower_wagon",
    departmentId: "dept_trd",
    depotLocation: "Palwal OHE Depot",
    capacity: 1,
    status: "AVAILABLE",
  },
  {
    id: "res_usfd_01",
    resourceCode: "USFD-VEH-12",
    resourceType: "USFD_VEHICLE",
    departmentId: "dept_eng",
    depotLocation: "Tughlakabad Yard",
    capacity: 1,
    status: "AVAILABLE",
  },
];

const SEED_BLOCKS: DbBlockView[] = [
  {
    id: "blk_55a1",
    blockCode: "BLK-NDLS-01",
    corridorId: "corr_ndls_agc",
    corridorCode: "NDLS-AGC",
    optimizationRunId: "run_0192a",
    runId: "run_0192a",
    runCode: "RUN-20261103-W1",
    startAt: "2026-11-03T23:00:00.000Z",
    endAt: "2026-11-04T01:30:00.000Z",
    durationMinutes: 150,
    baselineDurationMinutes: 210,
    savedMinutes: 60,
    status: "PROPOSED",
    taskCount: 2,
    tasks: [
      {
        id: "task_eng_045_01",
        taskCode: "TSK-ENG-NDLS-045-01",
        department: "ENG",
        taskType: "USFD",
        durationMinutes: 120,
        locationKm: "Km 45.2 - 46.5",
      },
      {
        id: "task_trd_046_02",
        taskCode: "TSK-TRD-NDLS-046-02",
        department: "TRD",
        taskType: "TRD",
        durationMinutes: 90,
        locationKm: "Km 45.0 - 46.8",
      },
    ],
    departments: ["ENG", "TRD"],
    explanation: {
      reasons: [
        "Collocated section (Km 45.2 - 46.1)",
        "Synchronized night possession window",
        "Consolidated 2 isolated closures into 1 unified possession",
      ],
      impact: {
        baselineMinutes: 210,
        optimizedMinutes: 150,
        savedMinutes: 60,
      },
    },
    createdAt: new Date().toISOString(),
  },
];

const SEED_RUNS: OptimizationRunRecord[] = [
  {
    id: "run_0192a",
    runCode: "RUN-20261103-W1",
    horizon: "WEEKLY",
    startDate: "2026-11-03T00:00:00.000Z",
    endDate: "2026-11-10T00:00:00.000Z",
    tasksConsidered: 4,
    tasksScheduled: 3,
    blocksGenerated: 1,
    totalBlockMinutes: 150,
    baselineBlockMinutes: 210,
    estimatedSavingsMinutes: 60,
    optimizationScore: "0.81",
    status: "OPTIMAL",
    createdAt: new Date().toISOString(),
  },
];

// ── In-Memory State Container ──────────────────────────────────────────

class DataStore {
  private inMemoryTasks: MaintenanceTaskItem[] = [...SEED_TASKS];
  private inMemoryBlocks: DbBlockView[] = [...SEED_BLOCKS];
  private inMemoryRuns: OptimizationRunRecord[] = [...SEED_RUNS];

  async getDepartments(): Promise<DepartmentItem[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const rows = await db.select().from(departments);
      return rows as unknown as DepartmentItem[];
    }
    return SEED_DEPARTMENTS;
  }

  async getCorridors(): Promise<CorridorItem[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const rows = await db.select().from(corridors);
      return rows as unknown as CorridorItem[];
    }
    return SEED_CORRIDORS;
  }

  async getAssets(): Promise<AssetItem[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const rows = await db.select().from(assets);
      return rows as unknown as AssetItem[];
    }
    return SEED_ASSETS;
  }

  async getTasks(status?: string): Promise<MaintenanceTaskItem[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      let query = db.select().from(maintenanceTasks).$dynamic();
      if (status) {
        query = query.where(eq(maintenanceTasks.status, status as typeof maintenanceTasks.status.enumValues[number]));
      }
      const rows = await query.orderBy(desc(maintenanceTasks.priorityScore));
      return rows as unknown as MaintenanceTaskItem[];
    }
    if (status) {
      return this.inMemoryTasks.filter((t) => t.status === status);
    }
    return [...this.inMemoryTasks];
  }

  async getTaskById(id: string): Promise<MaintenanceTaskItem | null> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const rows = await db.select().from(maintenanceTasks).where(eq(maintenanceTasks.id, id));
      return rows.length > 0 ? (rows[0] as unknown as MaintenanceTaskItem) : null;
    }
    return this.inMemoryTasks.find((t) => t.id === id || t.taskCode === id) || null;
  }

  async updateTaskCriticality(
    id: string,
    score: number,
    priorityScore: string | number,
    criticalityDetail?: CriticalityScore
  ): Promise<MaintenanceTaskItem | null> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const [updated] = await db
        .update(maintenanceTasks)
        .set({
          criticalityScore: Math.round(score * 100),
          priorityScore: String(priorityScore),
          updatedAt: new Date(),
        })
        .where(eq(maintenanceTasks.id, id))
        .returning();
      if (updated) {
        return { ...updated, criticalityDetail } as unknown as MaintenanceTaskItem;
      }
      return null;
    }

    const task = this.inMemoryTasks.find((t) => t.id === id || t.taskCode === id);
    if (task) {
      task.criticalityScore = Math.round(score * 100);
      task.priorityScore = priorityScore;
      task.criticalityDetail = criticalityDetail;
      task.updatedAt = new Date().toISOString();
    }
    return task || null;
  }

  async getTrains(): Promise<TrainItem[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const rows = await db.select().from(trains);
      return rows as unknown as TrainItem[];
    }
    return SEED_TRAINS;
  }

  async getBlockWindows(): Promise<BlockWindowItem[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const rows = await db.select().from(blockWindows);
      return rows as unknown as BlockWindowItem[];
    }
    return SEED_WINDOWS;
  }

  async getResources(): Promise<ResourceItem[]> {
    return SEED_RESOURCES;
  }

  async getBlocks(corridorId?: string): Promise<DbBlockView[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      let query = db.select().from(blocks).$dynamic();
      if (corridorId) {
        query = query.where(eq(blocks.corridorId, corridorId));
      }
      const rows = await query.orderBy(desc(blocks.createdAt));
      return rows as unknown as DbBlockView[];
    }
    if (corridorId && corridorId !== "all") {
      return this.inMemoryBlocks.filter(
        (b) => b.corridorId === corridorId || b.corridorCode === corridorId
      );
    }
    return [...this.inMemoryBlocks];
  }

  async getBlocksByRun(runId: string, runCode?: string): Promise<DbBlockView[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      if (runId) {
        const rows = await db
          .select()
          .from(blocks)
          .where(eq(blocks.optimizationRunId, runId))
          .orderBy(desc(blocks.createdAt));
        return rows as unknown as DbBlockView[];
      }
      if (runCode) {
        const rows = await db
          .select()
          .from(blocks)
          .where(like(blocks.blockCode, `%${runCode}%`))
          .orderBy(desc(blocks.createdAt));
        return rows as unknown as DbBlockView[];
      }
      return [];
    }

    if (runId) {
      return this.inMemoryBlocks.filter(
        (b) => b.optimizationRunId === runId || b.runId === runId
      );
    }

    if (runCode) {
      return this.inMemoryBlocks.filter(
        (b) =>
          b.runCode === runCode ||
          b.blockCode.includes(runCode) ||
          (b.explanation && (b.explanation as Record<string, unknown>).runCode === runCode)
      );
    }

    return [];
  }

  async saveBlocks(newBlocks: DbBlockView[], runId?: string): Promise<void> {
    const resolvedRunId = runId || newBlocks[0]?.runId || newBlocks[0]?.optimizationRunId;
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      for (const b of newBlocks) {
        const blkRunId = b.optimizationRunId || b.runId || resolvedRunId || null;
        await db.insert(blocks).values({
          blockCode: b.blockCode,
          corridorId: b.corridorId,
          optimizationRunId: blkRunId,
          startAt: new Date(b.startAt),
          endAt: new Date(b.endAt),
          durationMinutes: b.durationMinutes,
          status: b.status || "PROPOSED",
          planningHorizon: b.planningHorizon || "WEEKLY",
          baselineDurationMinutes: b.baselineDurationMinutes || b.durationMinutes || 0,
          savedMinutes: b.savedMinutes || 0,
        }).onConflictDoNothing();
      }
    }

    for (const b of newBlocks) {
      if (!b.optimizationRunId && resolvedRunId) {
        b.optimizationRunId = resolvedRunId;
      }
      if (!b.runId && resolvedRunId) {
        b.runId = resolvedRunId;
      }
      const idx = this.inMemoryBlocks.findIndex((x) => x.id === b.id || x.blockCode === b.blockCode);
      if (idx >= 0) {
        this.inMemoryBlocks[idx] = b;
      } else {
        this.inMemoryBlocks.unshift(b);
      }
    }
  }

  async getOptimizationRuns(): Promise<OptimizationRunRecord[]> {
    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const rows = await db.select().from(optimizationRuns).orderBy(desc(optimizationRuns.createdAt));
      return rows as unknown as OptimizationRunRecord[];
    }
    return [...this.inMemoryRuns];
  }

  async saveOptimizationRun(run: OptimizationRunRecord): Promise<OptimizationRunRecord> {
    if (!run.id) {
      run.id = run.runId || `run_${Date.now()}`;
    }

    if (isDatabaseConfigured) {
      if (!db) throw new Error("Database is configured but database client is not initialized.");
      const [inserted] = await db.insert(optimizationRuns).values({
        runCode: run.runCode,
        horizon: run.horizon || "WEEKLY",
        startDate: new Date(run.startDate || Date.now()),
        endDate: new Date(run.endDate || Date.now() + 7 * 86400000),
        tasksConsidered: run.tasksConsidered || 0,
        tasksScheduled: run.tasksScheduled || 0,
        blocksGenerated: run.blocksGenerated || 0,
        totalBlockMinutes: run.totalBlockMinutes || 0,
        baselineBlockMinutes: run.baselineBlockMinutes || 0,
        estimatedSavingsMinutes: run.estimatedSavingsMinutes || 0,
        optimizationScore: String(run.optimizationScore || "0.80"),
        status: run.status || "OPTIMAL",
      }).returning();
      const saved = (inserted || run) as OptimizationRunRecord;
      this.inMemoryRuns.unshift(saved);
      return saved;
    }

    this.inMemoryRuns.unshift(run);
    return run;
  }
}

export const dataStore = new DataStore();
