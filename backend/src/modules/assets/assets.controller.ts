import { Request, Response } from "express";
import { db } from "../../db";
import { assets } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getAssets = async (req: Request, res: Response) => {
  const allAssets = await db.select().from(assets);
  res.json({ data: allAssets });
};

export const getAssetById = async (req: Request, res: Response) => {
  const asset = await db.select().from(assets).where(eq(assets.id, req.params.id));
  res.json({ data: asset[0] || null });
};