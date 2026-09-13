import { Router } from "express";
import { db } from "../../db";
import { maintenanceTasks, trains, trainForecasts, blockWindows } from "../../db/schema";

const router = Router();

/*
  Demo integration endpoints.
  In production these would receive data from TMS / SMMS / TDMS / COA.
*/

router.post("/tms/maintenance", async (req, res, next) => {
  try {
    const [data] = await db.insert(maintenanceTasks).values({
      ...req.body,
      departmentId: req.body.departmentId,
      taskType: req.body.taskType ?? "PREVENTIVE",
      status: "PENDING",
      requiredBlock: req.body.requiredBlock ?? true,
    }).returning();

    res.status(201).json({
      success: true,
      source: "TMS",
      data,
    });
  } catch (e) { next(e); }
});

router.post("/smms/maintenance", async (req, res, next) => {
  try {
    const [data] = await db.insert(maintenanceTasks).values({
      ...req.body,
      taskType: req.body.taskType ?? "DEFECT_REPAIR",
      status: "PENDING",
      requiredBlock: req.body.requiredBlock ?? true,
    }).returning();

    res.status(201).json({
      success: true,
      source: "SMMS",
      data,
    });
  } catch (e) { next(e); }
});

router.post("/tdms/maintenance", async (req, res, next) => {
  try {
    const [data] = await db.insert(maintenanceTasks).values({
      ...req.body,
      taskType: req.body.taskType ?? "PREVENTIVE",
      status: "PENDING",
      requiredBlock: req.body.requiredBlock ?? true,
    }).returning();

    res.status(201).json({
      success: true,
      source: "TDMS",
      data,
    });
  } catch (e) { next(e); }
});

router.post("/coa/train", async (req, res, next) => {
  try {
    const [data] = await db.insert(trains).values(req.body).returning();

    res.status(201).json({
      success: true,
      source: "COA",
      data,
    });
  } catch (e) { next(e); }
});

router.post("/coa/forecast", async (req, res, next) => {
  try {
    const [data] = await db.insert(trainForecasts).values(req.body).returning();

    res.status(201).json({
      success: true,
      source: "COA",
      data,
    });
  } catch (e) { next(e); }
});

router.post("/coa/block-window", async (req, res, next) => {
  try {
    const [data] = await db.insert(blockWindows).values(req.body).returning();

    res.status(201).json({
      success: true,
      source: "COA",
      data,
    });
  } catch (e) { next(e); }
});

export default router;
