export interface PriorityFactors {
  criticalityScore?: number | null;
  urgencyScore?: number | null;
  safetyScore?: number | null;
  operationalImpactScore?: number | null;
  overdueDays?: number | null;
  taskType?: string | null;
  defectSeverity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | null;
  requiresPowerShutdown?: boolean | null;
}

export function calculatePriorityScore(factors: PriorityFactors): number {
  const criticality = Number(factors.criticalityScore ?? 50);
  const safety = Number(factors.safetyScore ?? 50);
  const operational = Number(factors.operationalImpactScore ?? 50);
  const urgency = Number(factors.urgencyScore ?? 50);
  const overdueDays = Number(factors.overdueDays ?? 0);

  // 1. Weighted base calculation (0 to 100)
  // Safety and Criticality are paramount in railway operations
  const baseScore =
    criticality * 0.30 +
    safety * 0.30 +
    operational * 0.20 +
    urgency * 0.20;

  // 2. Overdue penalty (+2 per overdue day, capped at +25)
  const overdueBonus = Math.min(Math.max(overdueDays, 0) * 2, 25);

  // 3. Defect severity weighting
  let defectBonus = 0;
  if (factors.defectSeverity) {
    switch (factors.defectSeverity) {
      case "CRITICAL":
        defectBonus = 20;
        break;
      case "HIGH":
        defectBonus = 12;
        break;
      case "MEDIUM":
        defectBonus = 6;
        break;
      case "LOW":
        defectBonus = 2;
        break;
    }
  }

  // 4. Task type weighting
  let taskTypeBonus = 0;
  if (factors.taskType) {
    switch (factors.taskType) {
      case "EMERGENCY":
        taskTypeBonus = 25;
        break;
      case "DEFECT_REPAIR":
        taskTypeBonus = 12;
        break;
      case "CORRECTIVE":
        taskTypeBonus = 8;
        break;
      case "PREVENTIVE":
        taskTypeBonus = 4;
        break;
      default:
        taskTypeBonus = 0;
    }
  }

  const rawTotal = baseScore + overdueBonus + defectBonus + taskTypeBonus;
  // Format to 2 decimal points, minimum 1.0, maximum 100.0 (or up to 120.0 for critical emergency)
  const finalScore = Math.min(Math.max(rawTotal, 1), 100);

  return Number(finalScore.toFixed(2));
}
