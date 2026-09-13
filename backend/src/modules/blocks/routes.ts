import { Router } from "express";
import {
  getBlocks,
  getBlockById,
  updateBlockStatus,
  approveBlock,
  rejectBlock,
} from "./blocks.controller";

const router = Router();

router.get("/", getBlocks);
router.get("/:id", getBlockById);
router.patch("/:id/status", updateBlockStatus);
router.post("/:id/approve", approveBlock);
router.post("/:id/reject", rejectBlock);

export default router;
