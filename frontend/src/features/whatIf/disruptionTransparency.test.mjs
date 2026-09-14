import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDisruptionTransparency } from './disruptionTransparency.js';

const sample = {
  affected_trains: ['12002', '12050'],
  new_schedule: {
    estimated_disruption_minutes: 27,
    blocks: [{
      block_id: 'blk_shifted_01',
      section_id: 'sec_12_ndls_agc',
      start: '2026-11-04T00:30:00Z',
      end: '2026-11-04T03:00:00Z',
    }],
  },
  explanation: 'Train delay of 45min applied to 1 train movement(s).',
};

test('affected trains are displayed correctly', () => {
  const result = buildDisruptionTransparency(sample);
  assert.deepEqual(result.affectedTrains, ['12002', '12050']);
  assert.match(result.message, /12002/);
});

test('delay value is displayed correctly', () => {
  const result = buildDisruptionTransparency(sample);
  assert.equal(result.delayMinutes, 27);
  assert.match(result.message, /27 minutes/);
});

test('no-conflict state', () => {
  const result = buildDisruptionTransparency({ affected_trains: [], new_schedule: { estimated_disruption_minutes: 0, blocks: [] }, explanation: 'No disruption' });
  assert.equal(result.status, 'none');
  assert.equal(result.message, 'No train disruption detected');
});

test('missing-data state', () => {
  const result = buildDisruptionTransparency(null);
  assert.equal(result.status, 'unavailable');
  assert.equal(result.message, 'Impact data unavailable');
});

test('estimated impact is clearly labeled', () => {
  const result = buildDisruptionTransparency(sample);
  assert.equal(result.delayLabel, 'Estimated / planned impact');
});
