import { Request, Response } from "express";
import { db } from "../../db";
import { maintenanceTasks } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getTasks = async (req: Request, res: Response) => {
  try {
    const tasks = await db.select().from(maintenanceTasks);
    res.json({ data: tasks });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const task = await db.select().from(maintenanceTasks).where(eq(maintenanceTasks.id, req.params.id));
    if (!task.length) return res.status(404).json({ error: "Task not found" });
    res.json({ data: task[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch task" });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const newTask = await db.insert(maintenanceTasks).values(req.body).returning();
    res.status(201).json({ data: newTask[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const updatedTask = await db
      .update(maintenanceTasks)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(maintenanceTasks.id, req.params.id))
      .returning();
    res.json({ data: updatedTask[0] });
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
};