import { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { optimizationRuns, maintenanceTasks, blocks, corridors, departments } from "../../db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { runOptimization } from "./optimizer";

export const generatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon, startDate, endDate, corridorId } = req.body;
    const result = await runOptimization({ horizon, startDate, endDate, corridorId });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

export const getRuns = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const runs = await db.select().from(optimizationRuns).orderBy(desc(optimizationRuns.createdAt));
    res.json({ success: true, count: runs.length, data: runs });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    // 1. Task counts
    const allTasks = await db.select().from(maintenanceTasks);
    const pendingTasks = allTasks.filter((t) => t.status === "PENDING").length;
    const scheduledTasks = allTasks.filter((t) => t.status === "SCHEDULED").length;
    const completedTasks = allTasks.filter((t) => t.status === "COMPLETED").length;
    const overdueTasks = allTasks.filter((t) => t.overdueDays > 0).length;

    // 2. Block counts
    const allBlocks = await db.select().from(blocks);
    const proposedBlocks = allBlocks.filter((b) => b.status === "PROPOSED").length;
    const approvedBlocks = allBlocks.filter((b) => b.status === "APPROVED").length;
    const executedBlocks = allBlocks.filter((b) => b.status === "EXECUTED").length;

    // 3. Total savings
    const totalMinutesSaved = allBlocks.reduce((acc, b) => acc + (b.savedMinutes || 0), 0);
    const totalHoursSaved = Number((totalMinutesSaved / 60).toFixed(1));

    // 4. Corridors and Departments
    const allCorridors = await db.select().from(corridors);
    const allDepts = await db.select().from(departments);

    // 5. Recent runs
    const recentRuns = await db
      .select()
      .from(optimizationRuns)
      .orderBy(desc(optimizationRuns.createdAt))
      .limit(5);

    // 6. Recent blocks
    const recentBlocks = await db
      .select()
      .from(blocks)
      .orderBy(desc(blocks.createdAt))
      .limit(5);

    res.json({
      success: true,
      data: {
        summary: {
          totalTasks: allTasks.length,
          pendingTasks,
          scheduledTasks,
          completedTasks,
          overdueTasks,
          totalBlocks: allBlocks.length,
          proposedBlocks,
          approvedBlocks,
          executedBlocks,
          totalHoursSaved,
          activeCorridors: allCorridors.length,
          departmentsCount: allDepts.length,
        },
        recentRuns,
        recentBlocks,
      },
    });
  } catch (error) {
    next(error);
  }
};