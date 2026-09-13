import { db } from "../../db";
import {
  maintenanceTasks,
  corridors,
  blockWindows,
  trains,
  blocks,
  blockTasks,
  optimizationRuns,
  departments,
} from "../../db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { calculatePriorityScore } from "./priority.engine";

export interface OptimizationOptions {
  horizon?: "WEEKLY" | "MONTHLY";
  startDate?: string;
  endDate?: string;
  corridorId?: string;
}

export interface OptimizationResult {
  runId: string;
  runCode: string;
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
  blocks: Array<{
    id?: string;
    blockCode: string;
    corridorId: string;
    corridorCode: string;
    startAt: string;
    endAt: string;
    durationMinutes: number;
    baselineDurationMinutes: number;
    savedMinutes: number;
    tasks: Array<{
      id: string;
      taskCode: string;
      department: string;
      taskType: string;
      durationMinutes: number;
      locationKm: string;
    }>;
    departments: string[];
    explanation: {
      reasons: string[];
      impact: {
        baselineMinutes: number;
        optimizedMinutes: number;
        savedMinutes: number;
      };
    };
  }>;
}

export async function runOptimization(options: OptimizationOptions = {}): Promise<OptimizationResult> {
  const horizon = options.horizon || "WEEKLY";
  const now = new Date();
  const startDate = options.startDate ? new Date(options.startDate) : new Date(now.getTime() + 12 * 60 * 60 * 1000); // 12h ahead
  const endDate = options.endDate
    ? new Date(options.endDate)
    : new Date(now.getTime() + (horizon === "WEEKLY" ? 7 : 30) * 24 * 60 * 60 * 1000);

  // 1. Fetch departments map
  const allDepartments = await db.select().from(departments);
  const deptMap = new Map(allDepartments.map((d) => [d.id, d.name || d.code]));

  // 2. Fetch corridors map
  const allCorridors = await db.select().from(corridors);
  const corridorMap = new Map(allCorridors.map((c) => [c.id, c]));

  // 3. Fetch all PENDING tasks requiring blocks
  let taskQuery = db
    .select()
    .from(maintenanceTasks)
    .where(and(eq(maintenanceTasks.status, "PENDING"), eq(maintenanceTasks.requiredBlock, true)))
    .$dynamic();

  if (options.corridorId) {
    taskQuery = taskQuery.where(eq(maintenanceTasks.corridorId, options.corridorId as any));
  }

  const pendingTasks = await taskQuery;

  // Recalculate priority scores dynamically and sort by priority desc
  const scoredTasks = pendingTasks
    .map((task) => {
      const score = calculatePriorityScore({
        criticalityScore: task.criticalityScore,
        urgencyScore: task.urgencyScore,
        safetyScore: task.safetyScore,
        operationalImpactScore: task.operationalImpactScore,
        overdueDays: task.overdueDays,
        taskType: task.taskType,
        requiresPowerShutdown: task.requiresPowerShutdown,
      });
      return { ...task, computedPriority: score };
    })
    .sort((a, b) => b.computedPriority - a.computedPriority);

  // 4. Fetch available block windows and scheduled trains
  const availableWindows = await db
    .select()
    .from(blockWindows)
    .where(gte(blockWindows.startAt, startDate));

  const allTrains = await db.select().from(trains);

  // 5. Group candidate tasks by corridor
  const tasksByCorridor = new Map<string, typeof scoredTasks>();
  for (const task of scoredTasks) {
    const list = tasksByCorridor.get(task.corridorId) || [];
    list.push(task);
    tasksByCorridor.set(task.corridorId, list);
  }

  const generatedBlocks: OptimizationResult["blocks"] = [];
  const scheduledTaskIds: string[] = [];

  let totalBaselineMinutes = 0;
  let totalOptimizedMinutes = 0;

  // Process each corridor
  for (const [corridorId, corrTasks] of tasksByCorridor.entries()) {
    const corridor = corridorMap.get(corridorId);
    const corrCode = corridor ? corridor.code : "CORRIDOR";

    // Find block windows for this corridor
    const corrWindows = availableWindows.filter((w) => w.corridorId === corridorId);

    // If no windows pre-seeded, dynamically create safe maintenance slots (e.g. night window 01:00 - 04:30)
    let windowSlots = corrWindows.map((w) => ({
      startAt: new Date(w.startAt),
      endAt: new Date(w.endAt),
      availableMinutes: w.availableMinutes || Math.floor((new Date(w.endAt).getTime() - new Date(w.startAt).getTime()) / 60000),
    }));

    if (windowSlots.length === 0) {
      // Create synthetic candidate maintenance slots for planning simulation
      const slotStart = new Date(startDate);
      slotStart.setHours(1, 30, 0, 0); // 01:30 AM
      const slotEnd = new Date(slotStart.getTime() + 180 * 60 * 1000); // 3 hours window (04:30 AM)
      windowSlots.push({
        startAt: slotStart,
        endAt: slotEnd,
        availableMinutes: 180,
      });
    }

    // Cluster tasks into block windows
    let taskIndex = 0;
    for (const slot of windowSlots) {
      if (taskIndex >= corrTasks.length) break;

      // Check for train conflicts in this slot
      const conflictingTrains = allTrains.filter((t) => {
        if (t.corridorId !== corridorId) return false;
        const arr = new Date(t.scheduledArrival).getTime();
        const dep = new Date(t.scheduledDeparture).getTime();
        const winStart = slot.startAt.getTime();
        const winEnd = slot.endAt.getTime();
        // Train overlaps window and is high-priority passenger or critical service
        const overlaps = (arr >= winStart && arr <= winEnd) || (dep >= winStart && dep <= winEnd);
        return overlaps && (t.isCriticalService || t.trainType === "PASSENGER" || t.trainType === "EXPRESS");
      });

      if (conflictingTrains.length > 0) {
        // Window rejected due to train conflict
        continue;
      }

      // Group nearby tasks up to slot duration
      const cluster: typeof corrTasks = [];
      let maxTaskDuration = 0;
      let clusterBaselineMinutes = 0;

      while (taskIndex < corrTasks.length) {
        const candidate = corrTasks[taskIndex];
        const newMaxDuration = Math.max(maxTaskDuration, candidate.estimatedDurationMinutes);

        // Check window fit
        if (newMaxDuration > slot.availableMinutes && cluster.length > 0) {
          break;
        }

        // Geographical compatibility check: tasks within 25 km of cluster anchor
        if (cluster.length > 0) {
          const anchorKm = parseFloat(cluster[0].locationStartKm);
          const candidateKm = parseFloat(candidate.locationStartKm);
          if (Math.abs(candidateKm - anchorKm) > 25.0) {
            // Far apart, keep for next block
            taskIndex++;
            continue;
          }
        }

        cluster.push(candidate);
        maxTaskDuration = newMaxDuration;
        clusterBaselineMinutes += candidate.estimatedDurationMinutes;
        scheduledTaskIds.push(candidate.id);
        taskIndex++;

        // Bundle 2 to 4 compatible tasks per block
        if (cluster.length >= 4) break;
      }

      if (cluster.length === 0) continue;

      const blockDuration = maxTaskDuration; // Parallel multi-department execution
      const savedMinutes = Math.max(clusterBaselineMinutes - blockDuration, 0);

      totalBaselineMinutes += clusterBaselineMinutes;
      totalOptimizedMinutes += blockDuration;

      const blockCode = `BLK-${corrCode}-${Math.floor(1000 + Math.random() * 9000)}`;
      const deptNames = Array.from(new Set(cluster.map((t) => deptMap.get(t.departmentId) || "Maintenance")));

      const reasons: string[] = [
        `${cluster.length} maintenance tasks bundled on corridor ${corrCode}`,
        `Geographical proximity within section km ${cluster[0].locationStartKm} - ${cluster[cluster.length - 1].locationEndKm}`,
        `Zero conflict with scheduled passenger or express trains`,
      ];

      if (deptNames.length > 1) {
        reasons.push(`Cross-department coordination: ${deptNames.join(", ")} simultaneous execution`);
      }

      const overdueCount = cluster.filter((t) => t.overdueDays > 0).length;
      if (overdueCount > 0) {
        reasons.push(`${overdueCount} overdue tasks prioritized to avoid safety hazards`);
      }

      // Persist block to database
      const [insertedBlock] = await db
        .insert(blocks)
        .values({
          blockCode,
          corridorId: corridorId as any,
          startAt: slot.startAt,
          endAt: new Date(slot.startAt.getTime() + blockDuration * 60 * 1000),
          durationMinutes: blockDuration,
          status: "PROPOSED",
          planningHorizon: horizon,
          baselineDurationMinutes: clusterBaselineMinutes,
          savedMinutes,
          optimizationScore: clusterBaselineMinutes > 0
            ? String(Number(((savedMinutes / clusterBaselineMinutes) * 100).toFixed(2)))
            : "0.00",
        })
        .returning();

      // Persist block tasks & update task statuses
      for (const t of cluster) {
        await db.insert(blockTasks).values({
          blockId: insertedBlock.id,
          maintenanceTaskId: t.id as any,
          departmentId: t.departmentId as any,
          startAt: slot.startAt,
          endAt: new Date(slot.startAt.getTime() + t.estimatedDurationMinutes * 60 * 1000),
          status: "SCHEDULED",
        });

        await db
          .update(maintenanceTasks)
          .set({ status: "SCHEDULED", updatedAt: new Date() })
          .where(eq(maintenanceTasks.id, t.id as any));
      }

      generatedBlocks.push({
        id: insertedBlock.id,
        blockCode,
        corridorId,
        corridorCode: corrCode,
        startAt: slot.startAt.toISOString(),
        endAt: new Date(slot.startAt.getTime() + blockDuration * 60 * 1000).toISOString(),
        durationMinutes: blockDuration,
        baselineDurationMinutes: clusterBaselineMinutes,
        savedMinutes,
        tasks: cluster.map((t) => ({
          id: t.id,
          taskCode: t.taskCode,
          department: deptMap.get(t.departmentId) || "General",
          taskType: t.taskType,
          durationMinutes: t.estimatedDurationMinutes,
          locationKm: `${t.locationStartKm} - ${t.locationEndKm}`,
        })),
        departments: deptNames,
        explanation: {
          reasons,
          impact: {
            baselineMinutes: clusterBaselineMinutes,
            optimizedMinutes: blockDuration,
            savedMinutes,
          },
        },
      });
    }
  }

  const savedTotalMinutes = Math.max(totalBaselineMinutes - totalOptimizedMinutes, 0);
  const savingPercentage =
    totalBaselineMinutes > 0
      ? Number(((savedTotalMinutes / totalBaselineMinutes) * 100).toFixed(1))
      : 0;
  const optimizationScore = savingPercentage;

  const runCode = `RUN-${Math.floor(100000 + Math.random() * 900000)}`;

  // Record optimization run in database
  const [runRecord] = await db
    .insert(optimizationRuns)
    .values({
      runCode,
      horizon,
      startDate,
      endDate,
      tasksConsidered: pendingTasks.length,
      tasksScheduled: scheduledTaskIds.length,
      blocksGenerated: generatedBlocks.length,
      totalBlockMinutes: totalOptimizedMinutes,
      baselineBlockMinutes: totalBaselineMinutes,
      estimatedSavingsMinutes: savedTotalMinutes,
      optimizationScore: String(optimizationScore.toFixed(2)),
      status: "COMPLETED",
    })
    .returning();

  return {
    runId: runRecord.id,
    runCode,
    summary: {
      tasksConsidered: pendingTasks.length,
      tasksScheduled: scheduledTaskIds.length,
      blocksGenerated: generatedBlocks.length,
      baselineBlockMinutes: totalBaselineMinutes,
      optimizedBlockMinutes: totalOptimizedMinutes,
      savingMinutes: savedTotalMinutes,
      savingPercentage,
      optimizationScore,
    },
    blocks: generatedBlocks,
  };
}
