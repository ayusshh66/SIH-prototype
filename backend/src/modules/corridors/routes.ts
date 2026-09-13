import { Router } from "express";
import {
  getCorridors,
  getCorridorById,
  getCorridorWindows,
  createCorridor,
  updateCorridor,
  deleteCorridor,
} from "./corridors.controller";

const router = Router();

router.get("/", getCorridors);
router.post("/", createCorridor);
router.get("/:id", getCorridorById);
router.patch("/:id", updateCorridor);
router.delete("/:id", deleteCorridor);
router.get("/:id/windows", getCorridorWindows);

export default router;
