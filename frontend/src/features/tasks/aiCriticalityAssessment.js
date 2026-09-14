export function buildAiCriticalityAssessment(rawAssessment) {
  const source = rawAssessment && typeof rawAssessment === 'object' ? rawAssessment : {};

  const score = source.predicted_criticality ?? source.score ?? source.criticalityScore ?? 0;
  const priorityLevel = source.priority_level ?? source.priority_class ?? 'P4';
  const scoringMode = source.scoring_mode ?? 'RULE_BASED';
  const modelName = source.model_name ?? (scoringMode === 'MODEL_BASED' ? 'Unknown model' : 'RULE_BASED');
  const modelVersion = source.model_version ?? (scoringMode === 'MODEL_BASED' ? 'Unknown version' : 'deterministic');
  const textSeverityUsed = source.text_severity_used ?? null;

  return {
    score,
    priorityLevel,
    scoringMode,
    modelName,
    modelVersion,
    textSeverityUsed,
    isModelBased: scoringMode === 'MODEL_BASED',
  };
}
