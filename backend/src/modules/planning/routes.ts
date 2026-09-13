import { Router } from "express";
import {
  generatePlan,
  getConflicts,
  getDashboard,
  getExplanations,
  getRuns,
  getShadowBlockCandidates,
  runEmergencyScenario,
  runWhatIfScenario,
} from "./planning.controller";

const router = Router();

router.post("/generate", generatePlan);
router.get("/runs", getRuns);
router.get("/dashboard", getDashboard);
router.get("/shadow-blocks/candidates", getShadowBlockCandidates);
router.post("/what-if", runWhatIfScenario);
router.post("/emergency", runEmergencyScenario);
router.get("/explanations", getExplanations);
router.get("/conflicts", getConflicts);

export default router;
