import { Request, Response } from "express";
import { db } from "../../db";
import { blocks } from "../../db/schema";
import { eq } from "drizzle-orm";

export const getBlocks = async (req: Request, res: Response) => {
  const allBlocks = await db.select().from(blocks);
  res.json({ data: allBlocks });
};

export const getBlockById = async (req: Request, res: Response) => {
  const block = await db.select().from(blocks).where(eq(blocks.id, req.params.id));
  res.json({ data: block[0] || null });
};

export const approveBlock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await db
    .update(blocks)
    .set({ status: "APPROVED", updatedAt: new Date() })
    .where(eq(blocks.id, id))
    .returning();
  res.json({ data: updated[0] });
};

export const rejectBlock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const updated = await db
    .update(blocks)
    .set({ status: "REJECTED", updatedAt: new Date() })
    .where(eq(blocks.id, id))
    .returning();
  res.json({ data: updated[0] });
};