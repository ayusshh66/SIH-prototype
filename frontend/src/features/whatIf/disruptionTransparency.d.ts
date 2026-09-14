export type DisruptionTransparencyStatus = 'unavailable' | 'none' | 'affected';

export interface DisruptionTransparencyResult {
  status: DisruptionTransparencyStatus;
  delayLabel: string;
  affectedTrains: string[];
  delayMinutes: number | null;
  sectionLabel: string;
  timeLabel: string;
  reason: string;
  message: string;
  blockLabel: string;
}

export function buildDisruptionTransparency(source: any): DisruptionTransparencyResult;
