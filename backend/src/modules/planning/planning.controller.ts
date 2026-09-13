import { Request, Response, NextFunction } from "express";
import { aiAdapter } from "../../services/ai/aiAdapter.service";
import { dataStore } from "../../services/data/dataStore";
import type { EmergencyEventPayload, WhatIfScenarioPayload } from "../../services/ai/contracts";

export const generatePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { horizon, corridorId, mode } = req.body;
    const result = await aiAdapter.orchestratePlanning({ horizon, corridorId, mode });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getShadowBlockCandidates = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiAdapter.generateShadowBlocks();
    res.json({ success: true, data: result.shadow_block_candidates });
  } catch (error) {
    next(error);
  }
};

export const runWhatIfScenario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiAdapter.runWhatIf(req.body as WhatIfScenarioPayload);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const runEmergencyScenario = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await aiAdapter.runEmergency(req.body as EmergencyEventPayload);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const getExplanations = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: aiAdapter.getLatestExplanations() });
  } catch (error) {
    next(error);
  }
};

export const getConflicts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ success: true, data: aiAdapter.getLatestConflicts() });
  } catch (error) {
    next(error);
  }
};

export const getRuns = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const runs = await dataStore.getOptimizationRuns();
    res.json({ success: true, count: runs.length, data: runs });
  } catch (error) {
    next(error);
  }
};

export const getDashboard = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [allTasks, allBlocks, allCorridors, allDepts, recentRuns] = await Promise.all([
      dataStore.getTasks(),
      dataStore.getBlocks(),
      dataStore.getCorridors(),
      dataStore.getDepartments(),
      dataStore.getOptimizationRuns(),
    ]);

    const pendingTasks = allTasks.filter((t) => t.status === "PENDING").length;
    const scheduledTasks = allTasks.filter((t) => t.status === "SCHEDULED").length;
    const completedTasks = allTasks.filter((t) => t.status === "COMPLETED").length;
    const overdueTasks = allTasks.filter((t) => t.overdueDays > 0).length;
    const proposedBlocks = allBlocks.filter((b) => b.status === "PROPOSED").length;
    const approvedBlocks = allBlocks.filter((b) => b.status === "APPROVED").length;
    const executedBlocks = allBlocks.filter((b) => b.status === "EXECUTED").length;
    const totalMinutesSaved = allBlocks.reduce((acc, b) => acc + (b.savedMinutes || 0), 0);
    const totalHoursSaved = Number((totalMinutesSaved / 60).toFixed(1));

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
        recentRuns: recentRuns.slice(0, 5),
        recentBlocks: allBlocks.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};
