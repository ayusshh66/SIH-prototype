import { Router } from "express";
import {
  getTrains,
  createTrain,
  getTrainForecasts,
  createTrainForecast,
  getBlockWindows,
  createBlockWindow,
} from "./trains.controller";

const router = Router();

router.get("/forecasts", getTrainForecasts);
router.post("/forecasts", createTrainForecast);

router.get("/block-windows", getBlockWindows);
router.post("/block-windows", createBlockWindow);

router.get("/", getTrains);
router.post("/", createTrain);

export default router;
