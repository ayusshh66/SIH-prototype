import { Request, Response, NextFunction } from "express";
import { db } from "../../db";
import { trains, trainForecasts, blockWindows } from "../../db/schema";
import { desc, eq } from "drizzle-orm";

export const getTrains = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const allTrains = await db.select().from(trains).orderBy(desc(trains.scheduledArrival));
    res.json({ success: true, count: allTrains.length, data: allTrains });
  } catch (error) {
    next(error);
  }
};

export const createTrain = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [newTrain] = await db.insert(trains).values(req.body).returning();
    res.status(201).json({ success: true, data: newTrain });
  } catch (error) {
    next(error);
  }
};

export const getTrainForecasts = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const forecasts = await db.select().from(trainForecasts).orderBy(desc(trainForecasts.forecastDate));
    res.json({ success: true, count: forecasts.length, data: forecasts });
  } catch (error) {
    next(error);
  }
};

export const createTrainForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [newForecast] = await db.insert(trainForecasts).values(req.body).returning();
    res.status(201).json({ success: true, data: newForecast });
  } catch (error) {
    next(error);
  }
};

export const getBlockWindows = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const corridorId = req.query.corridorId as string;
    let query = db.select().from(blockWindows).$dynamic();

    if (corridorId) {
      query = query.where(eq(blockWindows.corridorId, corridorId as any));
    }

    const windows = await query.orderBy(desc(blockWindows.startAt));
    res.json({ success: true, count: windows.length, data: windows });
  } catch (error) {
    next(error);
  }
};

export const createBlockWindow = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [newWindow] = await db.insert(blockWindows).values(req.body).returning();
    res.status(201).json({ success: true, data: newWindow });
  } catch (error) {
    next(error);
  }
};