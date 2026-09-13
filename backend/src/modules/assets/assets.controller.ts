import { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { assets } from "../../db/schema";
import { eq } from "drizzle-orm";
import { dataStore } from "../../services/data/dataStore";

export const getAssets = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    if (!db) {
      const allAssets = await dataStore.getAssets();
      return res.json({ success: true, count: allAssets.length, data: allAssets });
    }
    const allAssets = await db.select().from(assets);
    res.json({ success: true, count: allAssets.length, data: allAssets });
  } catch (error) {
    next(error);
  }
};

export const getAssetById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!db) {
      const asset = (await dataStore.getAssets()).find((item) => item.id === req.params.id || item.assetCode === req.params.id);
      if (!asset) {
        return res.status(404).json({ success: false, error: "Asset not found" });
      }
      return res.json({ success: true, data: asset });
    }
    const asset = await db.select().from(assets).where(eq(assets.id, req.params.id as any));
    if (!asset.length) {
      return res.status(404).json({ success: false, error: "Asset not found" });
    }
    res.json({ success: true, data: asset[0] });
  } catch (error) {
    next(error);
  }
};

export const createAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [created] = await db.insert(assets).values(req.body).returning();
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    next(error);
  }
};

export const updateAsset = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [updated] = await db
      .update(assets)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(assets.id, req.params.id as any))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "Asset not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};