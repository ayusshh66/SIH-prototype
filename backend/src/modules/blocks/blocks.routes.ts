import { Router } from "express";
import { getBlocks, getBlockById, approveBlock, rejectBlock } from "./blocks.controller";

const router = Router();

router.get("/blocks", getBlocks);
router.get("/blocks/:id", getBlockById);
router.post("/blocks/:id/approve", approveBlock);
router.post("/blocks/:id/reject", rejectBlock);

export default router;