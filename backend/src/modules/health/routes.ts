import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    service: "railway-block-planning-backend",
    database: "configured",
    timestamp: new Date().toISOString(),
  });
});

export default router;
