import React from 'react';
import { CheckCircle, AlertCircle, AlertOctagon, Clock } from 'lucide-react';
import type { OptimizationStatus } from '@/types/domain';

export interface OptimizationBadgeProps {
  status: OptimizationStatus;
  showIcon?: boolean;
  className?: string;
}

export const OptimizationBadge: React.FC<OptimizationBadgeProps> = ({
  status,
  showIcon = true,
  className = '',
}) => {
  let badgeClass = 'badge-opt-feasible';
  let Icon = CheckCircle;

  switch (status) {
    case 'OPTIMAL':
      badgeClass = 'badge-opt-optimal';
      Icon = CheckCircle;
      break;
    case 'FEASIBLE':
      badgeClass = 'badge-opt-feasible';
      Icon = CheckCircle;
      break;
    case 'PARTIAL':
      badgeClass = 'badge-opt-partial';
      Icon = Clock;
      break;
    case 'INFEASIBLE':
      badgeClass = 'badge-opt-infeasible';
      Icon = AlertCircle;
      break;
    case 'FAILED':
      badgeClass = 'badge-opt-failed';
      Icon = AlertOctagon;
      break;
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {showIcon && <Icon size={12} aria-hidden="true" />}
      <span>{status}</span>
    </span>
  );
};
