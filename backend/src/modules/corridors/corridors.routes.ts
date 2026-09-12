import { Router } from "express";
import { getCorridors, getCorridorById, getCorridorWindows } from "./corridors.controller";

const router = Router();

router.get("/corridors", getCorridors);
router.get("/corridors/:id", getCorridorById);
router.get("/corridors/:id/windows", getCorridorWindows);

export default router;