import React from 'react';
import { CheckCircle2, AlertCircle, AlertOctagon, Clock } from 'lucide-react';
import type { OptimizationStatus } from '@/types/domain';

export interface OptimizationBadgeProps {
  status: OptimizationStatus | string;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

export const OptimizationBadge: React.FC<OptimizationBadgeProps> = ({
  status,
  score,
  showIcon = true,
  className = '',
}) => {
  const norm = String(status).toUpperCase();

  let toneClasses = 'bg-status-feasible-bg text-status-feasible border-status-feasible/30';
  let Icon = CheckCircle2;

  switch (norm) {
    case 'OPTIMAL':
    case 'FEASIBLE':
      toneClasses = 'bg-status-feasible-bg text-status-feasible border-status-feasible/30';
      Icon = CheckCircle2;
      break;
    case 'PARTIAL':
      toneClasses = 'bg-status-partial-bg text-status-partial border-status-partial/30';
      Icon = Clock;
      break;
    case 'INFEASIBLE':
      toneClasses = 'bg-crit-p2-bg text-crit-p2 border-crit-p2-border';
      Icon = AlertCircle;
      break;
    case 'FAILED':
    case 'REJECTED':
      toneClasses = 'bg-crit-p1-bg text-crit-p1 border-crit-p1-border';
      Icon = AlertOctagon;
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-micro font-medium rounded-sm border uppercase tracking-wider select-none shrink-0 ${toneClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      {showIcon && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      <span className="font-mono">{norm}</span>
      {score !== undefined && (
        <span className="font-mono tabular-nums opacity-90 pl-1 border-l border-current/25">
          {score}%
        </span>
      )}
    </span>
  );
};

export default OptimizationBadge;
