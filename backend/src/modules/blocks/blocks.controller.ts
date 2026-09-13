import { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { blocks, blockTasks, corridors } from "../../db/schema";
import { eq, desc } from "drizzle-orm";

export const getBlocks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string;
    let query = db.select().from(blocks).$dynamic();

    if (status) {
      query = query.where(eq(blocks.status, status as any));
    }

    const allBlocks = await query.orderBy(desc(blocks.createdAt));
    res.json({ success: true, count: allBlocks.length, data: allBlocks });
  } catch (error) {
    next(error);
  }
};

export const getBlockById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const block = await db.select().from(blocks).where(eq(blocks.id, req.params.id as any));
    if (!block.length) {
      return res.status(404).json({ success: false, error: "Block not found" });
    }

    // Fetch tasks linked to this block
    const tasks = await db
      .select()
      .from(blockTasks)
      .where(eq(blockTasks.blockId, req.params.id as any));

    res.json({ success: true, data: { ...block[0], tasks } });
  } catch (error) {
    next(error);
  }
};

export const updateBlockStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, approvedBy } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: "Missing status field" });
    }

    const updatePayload: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };

    if (status === "APPROVED") {
      updatePayload.approvedBy = approvedBy || "Section Controller";
      updatePayload.approvedAt = new Date();
    }

    const [updated] = await db
      .update(blocks)
      .set(updatePayload)
      .where(eq(blocks.id, id as any))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "Block not found" });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

export const approveBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { approvedBy } = req.body;

    const [updated] = await db
      .update(blocks)
      .set({
        status: "APPROVED",
        approvedBy: approvedBy || "Chief Controller",
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(blocks.id, id as any))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "Block not found" });
    }

    res.json({ success: true, message: "Block approved successfully", data: updated });
  } catch (error) {
    next(error);
  }
};

export const rejectBlock = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const [updated] = await db
      .update(blocks)
      .set({
        status: "REJECTED",
        updatedAt: new Date(),
      })
      .where(eq(blocks.id, id as any))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: "Block not found" });
    }

    res.json({ success: true, message: "Block rejected", data: updated });
  } catch (error) {
    next(error);
  }
};