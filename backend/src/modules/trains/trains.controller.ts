import { Request, Response } from "express";
import { db } from "../../db";
import { trains, trainForecasts } from "../../db/schema";

export const getTrains = async (req: Request, res: Response) => {
  const allTrains = await db.select().from(trains);
  res.json({ data: allTrains });
};

export const getTrainForecasts = async (req: Request, res: Response) => {
  const forecasts = await db.select().from(trainForecasts);
  res.json({ data: forecasts });
};