export const DEFAULT_PLANNING_HORIZON_WEEKS: number;
export const STRATEGIC_26_WEEK_HORIZON_WEEKS: number;
export const JPO_WINDOW_DAYS: number;
export const PLANNING_HORIZON_OPTIONS: readonly [
  'WEEKLY',
  'MONTHLY',
  'STRATEGIC_26_WEEK'
];

export type JpoStatus = 'JPO_COMPLIANT' | 'JPO_VIOLATION';

export function getBlockJpoStatus(
  block?: {
    isJpoViolation?: boolean;
    is_jpo_violation?: boolean;
    requiresTrafficBlock?: boolean;
    requires_traffic_block?: boolean;
    startAt?: string | Date;
    start_date?: string | Date;
    startDate?: string | Date;
  },
  referenceDate?: Date
): JpoStatus;

export function getStrategicPlanningWindow(referenceDate?: Date): Array<{
  index: number;
  label: string;
  start: Date;
  end: Date;
  isoStart: string;
  isoEnd: string;
}>;
