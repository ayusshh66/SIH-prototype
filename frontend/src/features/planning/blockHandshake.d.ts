export const PTW_HANDSHAKE_STATES: string[];

export function isTrdWork(blockOrDepartment?: any): boolean;
export function getInitialHandshakeState(block?: any): string;
export function getStateDisplayName(state: string, block?: any): string;
export function getNextState(currentState: string, block?: any): string | null;
export function canAdvanceTo(currentState: string, nextState: string, block?: any): boolean;
export function generatePrivateNumber(blockCode: string): string;
export function getPrivateNumberForState(block?: any, state?: string): string | null;
