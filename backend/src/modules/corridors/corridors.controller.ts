import { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { corridors, blockWindows } from "../../db/schema";
import { eq } from "drizzle-orm";
import { dataStore } from "../../services/data/dataStore";

export const getCorridors = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!db) {
      const allCorridors = await dataStore.getCorridors();
      return res.json({ success: true, count: allCorridors.length, data: allCorridors });
    }
    const allCorridors = await db.select().from(corridors);
    res.json({ success: true, count: allCorridors.length, data: allCorridors });
  } catch (error) {
    next(error);
  }
};

export const getCorridorById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const corridorId = req.params.id as string;
    if (!db) {
      const corridor = (await dataStore.getCorridors()).find((item) => item.id === corridorId || item.code === corridorId);
      if (!corridor) {
        return res.status(404).json({ success: false, error: "Corridor not found" });
      }
      return res.json({ success: true, data: corridor });
    }
    const corridor = await db.select().from(corridors).where(eq(corridors.id, corridorId as any));
    if (!corridor.length) {
      return res.status(404).json({ success: false, error: "Corridor not found" });
    }
    res.json({ success: true, data: corridor[0] });
  } catch (error) {
    next(error);
  }
};

export const getCorridorWindows = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const corridorId = req.params.id as string;
    if (!db) {
      const windows = (await dataStore.getBlockWindows()).filter((win) => win.corridorId === corridorId);
      return res.json({ success: true, count: windows.length, data: windows });
    }
    const windows = await db
      .select()
      .from(blockWindows)
      .where(eq(blockWindows.corridorId, corridorId as any));

    res.json({ success: true, count: windows.length, data: windows });
  } catch (error) {
    next(error);
  }
};

export const createCorridor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [created] = await db.insert(corridors).values(req.body).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateCorridor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const corridorId = req.params.id as string;
    const [updated] = await db
      .update(corridors)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(corridors.id, corridorId as any))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "Corridor not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const deleteCorridor = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const corridorId = req.params.id as string;
    const [deleted] = await db
      .delete(corridors)
      .where(eq(corridors.id, corridorId as any))
      .returning();

    if (!deleted) {
      return res.status(404).json({ success: false, error: "Corridor not found" });
    }

    res.json({ success: true, message: "Corridor deleted successfully", data: deleted });
  } catch (error) {
    next(error);
  }
};