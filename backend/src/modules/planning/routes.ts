import { Router } from "express";
import { generatePlan, getRuns, getDashboard } from "./planning.controller";

const router = Router();

router.post("/generate", generatePlan);
router.get("/runs", getRuns);
router.get("/dashboard", getDashboard);

export default router;
