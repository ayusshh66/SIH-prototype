import { Request, Response } from "express";
import { db } from "../../db";
import { optimizationRuns } from "../../db/schema";

export const generatePlan = async (req: Request, res: Response) => {
  const { horizon, startDate, endDate } = req.body;

  // For the MVP, hardcode the algorithm response structure exactly as requested
  // Later, you will swap this out for the logic inside priority.engine.ts and optimizer.ts
  
  const responseData = {
    runId: `RUN-${Math.floor(1000 + Math.random() * 9000)}`,
    summary: {
      tasksConsidered: 142,
      tasksScheduled: 131,
      blocksGenerated: 27,
      baselineBlockHours: 112,
      optimizedBlockHours: 78,
      savingHours: 34,
      savingPercentage: 30.3
    },
    blocks: [
      {
        start: "2026-09-15T10:00:00",
        end: "2026-09-15T13:00:00",
        corridor: "C001",
        tasks: ["ENG-102", "TRD-443", "SNT-218"],
        departments: ["Engineering", "TRD", "S&T"],
        explanation: {
          reason: [
            "3 maintenance tasks share the same corridor",
            "All tasks are geographically compatible",
            "No passenger train conflicts",
            "2 tasks are overdue"
          ],
          impact: {
            separateDuration: 360,
            combinedDuration: 180,
            savingMinutes: 180
          }
        }
      }
    ]
  };

  res.status(200).json(responseData);
};