import { Router } from "express";
import { sql } from "drizzle-orm";
import { db, isDatabaseConfigured } from "../../db";
import { aiAdapter } from "../../services/ai/aiAdapter.service";

const router = Router();

router.get("/", async (_req, res) => {
  const checks = {
    backend: {
      status: "HEALTHY",
      timestamp: new Date().toISOString(),
    },
    database: {
      status: "NOT_CONFIGURED",
      configured: isDatabaseConfigured,
      error: undefined as string | undefined,
    },
    python_bridge: {
      status: "UNKNOWN",
      error: undefined as string | undefined,
    },
    ai_engines: {
      status: "UNKNOWN",
      engines: [] as string[],
      error: undefined as string | undefined,
    },
    mode: {
      mock: process.env.VITE_USE_MOCK === "true" || process.env.USE_MOCK === "true",
      source: process.env.VITE_USE_MOCK === "true" || process.env.USE_MOCK === "true" ? "mock" : "live",
    },
  };

  if (isDatabaseConfigured && db) {
    try {
      await db.execute(sql`select 1`);
      checks.database.status = "HEALTHY";
    } catch (error) {
      checks.database.status = "FAILED";
      checks.database.error = error instanceof Error ? error.message : String(error);
    }
  }

  try {
    const aiHealth = await aiAdapter.checkAiHealth();
    checks.python_bridge.status = aiHealth.status === "HEALTHY" ? "HEALTHY" : "FAILED";
    checks.ai_engines.status = aiHealth.status;
    checks.ai_engines.engines = aiHealth.engines || [];
    checks.ai_engines.error = aiHealth.error;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.python_bridge.status = "FAILED";
    checks.python_bridge.error = message;
    checks.ai_engines.status = "FAILED";
    checks.ai_engines.error = message;
  }

  const success =
    checks.backend.status === "HEALTHY" &&
    checks.python_bridge.status === "HEALTHY" &&
    checks.ai_engines.status === "HEALTHY" &&
    checks.database.status !== "FAILED";

  res.status(success ? 200 : 503).json({
    success,
    data: checks,
    error: success ? undefined : "One or more runtime health checks failed.",
  });
});

export default router;
