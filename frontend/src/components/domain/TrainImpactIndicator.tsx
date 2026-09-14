import React from 'react';
import { Train, Clock } from 'lucide-react';
import type { TrainType, SpeedClass } from '@/types/domain';

export interface TrainImpactIndicatorProps {
  trainNumber: string;
  trainName?: string;
  trainType?: TrainType | string;
  speedClass?: SpeedClass | string;
  delayMinutes: number;
  maxBaselineDelay?: number;
  className?: string;
}

export const TrainImpactIndicator: React.FC<TrainImpactIndicatorProps> = ({
  trainNumber,
  trainName,
  trainType,
  delayMinutes,
  maxBaselineDelay = 60,
  className = '',
}) => {
  const isDelayed = delayMinutes > 0;
  const isSevere = delayMinutes >= 30;

  // Mini-bar fill percentage
  const barWidth = Math.min(Math.round((delayMinutes / maxBaselineDelay) * 100), 100);

  const statusTone = isSevere
    ? 'bg-crit-p1-bg text-crit-p1 border-crit-p1/30'
    : isDelayed
    ? 'bg-status-partial-bg text-status-partial border-status-partial/30'
    : 'bg-status-feasible-bg text-status-feasible border-status-feasible/30';

  const barFillColor = isSevere
    ? 'bg-crit-p1'
    : isDelayed
    ? 'bg-status-partial'
    : 'bg-status-feasible';

  return (
    <div
      className={`inline-flex items-center gap-3 px-3 py-1.5 rounded-sm bg-surface border border-border-hairline text-small ${className}`}
    >
      <Train size={14} className="text-accent-400 shrink-0" />
      <div className="flex items-center gap-2 font-mono">
        <span className="font-semibold text-content-primary tabular-nums">{trainNumber}</span>
        {trainName && <span className="text-content-secondary font-sans text-micro">{trainName}</span>}
        {trainType && <span className="text-content-tertiary text-micro">({trainType})</span>}
      </div>

      {/* Disruption relative horizontal mini-bar */}
      <div className="w-16 h-1.5 bg-surface-sunken rounded-full overflow-hidden shrink-0 border border-border-hairline/40">
        <div
          className={`h-full ${barFillColor} transition-all duration-300`}
          style={{ width: `${Math.max(barWidth, isDelayed ? 12 : 4)}%` }}
        />
      </div>

      <div
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm border text-micro font-mono font-medium shrink-0 tabular-nums ${statusTone}`}
      >
        <Clock size={11} />
        <span>{delayMinutes > 0 ? `+${delayMinutes}m` : 'On Time'}</span>
      </div>
    </div>
  );
};

export default TrainImpactIndicator;
