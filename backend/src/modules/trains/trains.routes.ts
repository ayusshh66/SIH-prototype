import { Router } from "express";
import { getTrains, getTrainForecasts } from "./trains.controller";

const router = Router();

// Notice /forecast is placed ABOVE /:id if you were to have an ID route
router.get("/trains/forecast", getTrainForecasts);
router.get("/trains", getTrains);

export default router;