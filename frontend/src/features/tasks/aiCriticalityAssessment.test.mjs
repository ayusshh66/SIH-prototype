import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAiCriticalityAssessment } from './aiCriticalityAssessment.js';

const modelBasedPayload = {
  score: 0.8765,
  predicted_criticality: 0.8765,
  priority_level: 'P1',
  priority_class: 'P1',
  scoring_mode: 'MODEL_BASED',
  model_name: 'GradientBoostingRegressor',
  model_version: 'criticality_gbr_v1',
  text_severity_used: 0.64,
};

test('MODEL_BASED metadata renders', () => {
  const result = buildAiCriticalityAssessment(modelBasedPayload);
  assert.equal(result.scoringMode, 'MODEL_BASED');
  assert.equal(result.modelName, 'GradientBoostingRegressor');
  assert.equal(result.modelVersion, 'criticality_gbr_v1');
  assert.equal(result.isModelBased, true);
  assert.equal(result.score, 0.8765);
});

test('RULE_BASED renders correctly', () => {
  const result = buildAiCriticalityAssessment({ score: 0.61, scoring_mode: 'RULE_BASED' });
  assert.equal(result.scoringMode, 'RULE_BASED');
  assert.equal(result.isModelBased, false);
  assert.equal(result.modelName, 'RULE_BASED');
  assert.equal(result.score, 0.61);
});

test('missing metadata does not crash', () => {
  const result = buildAiCriticalityAssessment(null);
  assert.equal(result.scoringMode, 'RULE_BASED');
  assert.equal(result.score, 0);
  assert.equal(result.isModelBased, false);
});

test('displayed score matches API value exactly', () => {
  const result = buildAiCriticalityAssessment(modelBasedPayload);
  assert.equal(result.score, modelBasedPayload.predicted_criticality);
  assert.equal(result.score, modelBasedPayload.score);
});
