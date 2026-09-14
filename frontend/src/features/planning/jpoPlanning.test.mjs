import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_PLANNING_HORIZON_WEEKS,
  STRATEGIC_26_WEEK_HORIZON_WEEKS,
  getBlockJpoStatus,
  getStrategicPlanningWindow,
} from './jpoPlanning.js';

const referenceDate = new Date('2026-01-01T00:00:00.000Z');
const dayMs = 24 * 60 * 60 * 1000;

test('block exactly 70 days ahead is compliant', () => {
  const block = {
    startAt: new Date(referenceDate.getTime() + 70 * dayMs).toISOString(),
    requiresTrafficBlock: true,
  };

  assert.equal(getBlockJpoStatus(block, referenceDate), 'JPO_COMPLIANT');
});

test('block less than 70 days ahead triggers violation', () => {
  const block = {
    startAt: new Date(referenceDate.getTime() + 69 * dayMs).toISOString(),
    requiresTrafficBlock: true,
  };

  assert.equal(getBlockJpoStatus(block, referenceDate), 'JPO_VIOLATION');
});

test('block more than 70 days ahead is compliant', () => {
  const block = {
    startAt: new Date(referenceDate.getTime() + 71 * dayMs).toISOString(),
    requiresTrafficBlock: true,
  };

  assert.equal(getBlockJpoStatus(block, referenceDate), 'JPO_COMPLIANT');
});

test('block without traffic-block requirement is compliant', () => {
  const block = {
    startAt: new Date(referenceDate.getTime() + 10 * dayMs).toISOString(),
    requiresTrafficBlock: false,
  };

  assert.equal(getBlockJpoStatus(block, referenceDate), 'JPO_COMPLIANT');
});

test('26-week horizon covers 26 weeks', () => {
  const window = getStrategicPlanningWindow(referenceDate);
  assert.equal(window.length, STRATEGIC_26_WEEK_HORIZON_WEEKS);
  assert.equal(window[0].label, 'W1');
  assert.equal(window[window.length - 1].label, `W${STRATEGIC_26_WEEK_HORIZON_WEEKS}`);
  assert.equal(DEFAULT_PLANNING_HORIZON_WEEKS, 10);
});
