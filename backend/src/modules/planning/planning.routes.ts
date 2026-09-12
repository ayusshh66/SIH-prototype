import { Router } from "express";
import { generatePlan } from "./planning.controller";

const router = Router();

router.post("/planning/generate", generatePlan);

export default router;