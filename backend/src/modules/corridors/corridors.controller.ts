import { Request, Response } from "express";
import { db } from "../../db";
import { corridors, blockWindows } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getCorridors = async (req: Request, res: Response) => {
  const allCorridors = await db.select().from(corridors);
  res.json({ data: allCorridors });
};

export const getCorridorById = async (req: Request, res: Response) => {
  const corridorId = req.params.id as string;
  const corridor = await db.select().from(corridors).where(eq(corridors.id, corridorId as any));
  res.json({ data: corridor[0] || null });
};

export const getCorridorWindows = async (req: Request, res: Response) => {
  const corridorId = req.params.id as string;

  const windows = await db
    .select()
    .from(blockWindows)
    .where(eq(blockWindows.corridorId, corridorId as any));

  res.json({ data: windows });
};