import { Router } from "express";
import { getAssets, getAssetById, createAsset, updateAsset } from "./assets.controller";

const router = Router();

router.get("/", getAssets);
router.post("/", createAsset);
router.get("/:id", getAssetById);
router.patch("/:id", updateAsset);

export default router;
