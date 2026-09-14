import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PTW_HANDSHAKE_STATES,
  canAdvanceTo,
  generatePrivateNumber,
  getInitialHandshakeState,
  getNextState,
  getPrivateNumberForState,
  isTrdWork,
} from './blockHandshake.js';

test('valid state transitions follow the required sequence', () => {
  assert.equal(getNextState('REQUESTED'), 'PRIMARY_BLOCK_GRANTED');
  assert.equal(getNextState('PRIMARY_BLOCK_GRANTED'), 'PRIVATE_NUMBER_ISSUED');
  assert.equal(getNextState('PRIVATE_NUMBER_ISSUED'), 'SHADOW_PARTICIPANTS_ATTACHED');
  assert.equal(getNextState('SHADOW_PARTICIPANTS_ATTACHED'), 'SCADA_DE_ENERGIZATION_VERIFIED');
  assert.equal(getNextState('SCADA_DE_ENERGIZATION_VERIFIED'), 'PERMIT_TO_WORK_ISSUED');
  assert.equal(getNextState('PERMIT_TO_WORK_ISSUED'), 'WORK_COMPLETE_LINE_CLEAR');
  assert.equal(getNextState('WORK_COMPLETE_LINE_CLEAR'), 'BLOCK_CLOSED');
});

test('invalid state transition is rejected', () => {
  assert.equal(canAdvanceTo('REQUESTED', 'BLOCK_CLOSED'), false);
  assert.equal(canAdvanceTo('BLOCK_CLOSED', 'REQUESTED'), false);
  assert.equal(canAdvanceTo('WORK_COMPLETE_LINE_CLEAR', 'PERMIT_TO_WORK_ISSUED'), false);
});

test('private number is generated only after block grant', () => {
  const block = { blockCode: 'B-107' };
  assert.equal(getPrivateNumberForState(block, 'REQUESTED'), null);
  const pn = getPrivateNumberForState(block, 'PRIMARY_BLOCK_GRANTED');
  assert.match(pn, /^PN-/);
  assert.equal(generatePrivateNumber(block.blockCode), pn);
});

test('TRD requires simulated SCADA verification before PTW', () => {
  assert.equal(isTrdWork('TRD'), true);
  assert.equal(getNextState('SHADOW_PARTICIPANTS_ATTACHED', { departmentId: 'TRD' }), 'SCADA_DE_ENERGIZATION_VERIFIED');
  assert.equal(canAdvanceTo('SHADOW_PARTICIPANTS_ATTACHED', 'SCADA_DE_ENERGIZATION_VERIFIED', { departmentId: 'TRD' }), true);
  assert.equal(canAdvanceTo('SCADA_DE_ENERGIZATION_VERIFIED', 'PERMIT_TO_WORK_ISSUED', { departmentId: 'TRD' }), true);
});

test('block cannot close before work complete', () => {
  assert.equal(canAdvanceTo('PERMIT_TO_WORK_ISSUED', 'BLOCK_CLOSED'), false);
  assert.equal(canAdvanceTo('WORK_COMPLETE_LINE_CLEAR', 'BLOCK_CLOSED'), true);
  assert.equal(getNextState('WORK_COMPLETE_LINE_CLEAR'), 'BLOCK_CLOSED');
});

test('initial state defaults to REQUESTED', () => {
  assert.equal(getInitialHandshakeState({}), 'REQUESTED');
  assert.equal(PTW_HANDSHAKE_STATES.length, 8);
});
