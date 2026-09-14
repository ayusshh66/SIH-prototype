export const PTW_HANDSHAKE_STATES = [
  'REQUESTED',
  'PRIMARY_BLOCK_GRANTED',
  'PRIVATE_NUMBER_ISSUED',
  'SHADOW_PARTICIPANTS_ATTACHED',
  'SCADA_DE_ENERGIZATION_VERIFIED',
  'PERMIT_TO_WORK_ISSUED',
  'WORK_COMPLETE_LINE_CLEAR',
  'BLOCK_CLOSED',
];

export function isTrdWork(blockOrDepartment) {
  if (!blockOrDepartment) return false;
  if (typeof blockOrDepartment === 'string') return blockOrDepartment.toUpperCase() === 'TRD';
  const departmentList = Array.isArray(blockOrDepartment.departments)
    ? blockOrDepartment.departments
    : [blockOrDepartment.departmentId, blockOrDepartment.department];
  return departmentList.some((value) => String(value || '').toUpperCase().includes('TRD'));
}

export function getInitialHandshakeState(block) {
  if (!block) return 'REQUESTED';
  return PTW_HANDSHAKE_STATES.includes(block.handshakeStatus)
    ? block.handshakeStatus
    : 'REQUESTED';
}

export function getStateDisplayName(state, block) {
  if (state === 'SCADA_DE_ENERGIZATION_VERIFIED' && !isTrdWork(block)) {
    return 'SCADA_DE_ENERGIZATION_VERIFIED (NOT REQUIRED)';
  }
  if (state === 'SCADA_DE_ENERGIZATION_VERIFIED') {
    return 'SCADA_DE_ENERGIZATION_VERIFIED (SIMULATED DEMO)';
  }
  return state;
}

export function getNextState(currentState, block) {
  const currentIndex = PTW_HANDSHAKE_STATES.indexOf(currentState);
  if (currentIndex === -1) return null;
  if (currentIndex >= PTW_HANDSHAKE_STATES.length - 1) return null;
  return PTW_HANDSHAKE_STATES[currentIndex + 1];
}

export function canAdvanceTo(currentState, nextState, block) {
  if (!PTW_HANDSHAKE_STATES.includes(currentState) || !PTW_HANDSHAKE_STATES.includes(nextState)) {
    return false;
  }
  if (currentState === 'WORK_COMPLETE_LINE_CLEAR' && nextState === 'BLOCK_CLOSED') {
    return true;
  }
  if (currentState === 'BLOCK_CLOSED') {
    return false;
  }
  if (nextState === 'BLOCK_CLOSED' && currentState !== 'WORK_COMPLETE_LINE_CLEAR') {
    return false;
  }
  return getNextState(currentState, block) === nextState;
}

export function generatePrivateNumber(blockCode) {
  const cleaned = String(blockCode || 'BLOCK').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6) || 'BLOCK';
  const checksum = Array.from(cleaned).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 900 + 100;
  return `PN-${cleaned}-${checksum}`;
}

export function getPrivateNumberForState(block, state) {
  if (!block || !state) return null;
  if (state === 'PRIMARY_BLOCK_GRANTED') {
    return generatePrivateNumber(block.blockCode || block.blockId || 'BLOCK');
  }
  if (state === 'PRIVATE_NUMBER_ISSUED') {
    return generatePrivateNumber(block.blockCode || block.blockId || 'BLOCK');
  }
  return null;
}
