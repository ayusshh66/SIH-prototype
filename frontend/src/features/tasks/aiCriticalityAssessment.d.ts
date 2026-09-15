export interface AiCriticalityAssessment {
  score: number;
  priorityLevel: string;
  scoringMode: string;
  modelName: string;
  modelVersion: string;
  textSeverityUsed: number | null;
  isModelBased: boolean;
}

export function buildAiCriticalityAssessment(rawAssessment?: any): AiCriticalityAssessment;
