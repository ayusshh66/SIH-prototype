import { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { maintenanceTasks, defects } from "../../db/schema";
import { eq, desc } from "drizzle-orm";
import { calculatePriorityScore } from "../planning/priority.engine";

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusQuery = req.query.status as string;
    let query = db.select().from(maintenanceTasks).$dynamic();

    if (statusQuery) {
      query = query.where(eq(maintenanceTasks.status, statusQuery as any));
    }

    const tasks = await query.orderBy(desc(maintenanceTasks.priorityScore));
    res.json({ success: true, count: tasks.length, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const getAllTasks = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const allTasks = await db.select().from(maintenanceTasks).orderBy(desc(maintenanceTasks.createdAt));
    res.json({ success: true, count: allTasks.length, data: allTasks });
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const task = await db.select().from(maintenanceTasks).where(eq(maintenanceTasks.id, req.params.id as any));
    if (!task.length) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }
    res.json({ success: true, data: task[0] });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = { ...req.body };

    // Calculate initial priority score
    let defectSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null = null;
    if (body.defectId) {
      const defectRecord = await db.select().from(defects).where(eq(defects.id, body.defectId as any));
      if (defectRecord.length) {
        defectSeverity = defectRecord[0].severity as any;
      }
    }

    const score = calculatePriorityScore({
      criticalityScore: body.criticalityScore,
      urgencyScore: body.urgencyScore,
      safetyScore: body.safetyScore,
      operationalImpactScore: body.operationalImpactScore,
      overdueDays: body.overdueDays,
      taskType: body.taskType,
      defectSeverity,
      requiresPowerShutdown: body.requiresPowerShutdown,
    });

    body.priorityScore = String(score);

    const [newTask] = await db.insert(maintenanceTasks).values(body).returning();
    res.status(201).json({ success: true, data: newTask });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [updatedTask] = await db
      .update(maintenanceTasks)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(maintenanceTasks.id, req.params.id as any))
      .returning();

    if (!updatedTask) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    res.json({ success: true, data: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const recalculatePriority = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const taskRecord = await db.select().from(maintenanceTasks).where(eq(maintenanceTasks.id, taskId as any));
    if (!taskRecord.length) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    const task = taskRecord[0];
    let defectSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null = null;
    if (task.defectId) {
      const defect = await db.select().from(defects).where(eq(defects.id, task.defectId as any));
      if (defect.length) defectSeverity = defect[0].severity as any;
    }

    const score = calculatePriorityScore({
      criticalityScore: task.criticalityScore,
      urgencyScore: task.urgencyScore,
      safetyScore: task.safetyScore,
      operationalImpactScore: task.operationalImpactScore,
      overdueDays: task.overdueDays,
      taskType: task.taskType,
      defectSeverity,
      requiresPowerShutdown: task.requiresPowerShutdown,
    });

    const [updated] = await db
      .update(maintenanceTasks)
      .set({ priorityScore: String(score), updatedAt: new Date() })
      .where(eq(maintenanceTasks.id, taskId as any))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const completeTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id as string;
    const [completed] = await db
      .update(maintenanceTasks)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(maintenanceTasks.id, taskId as any))
      .returning();

    if (!completed) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    res.json({ success: true, message: "Task marked as COMPLETED", data: completed });
  } catch (error) {
    next(error);
  }
};