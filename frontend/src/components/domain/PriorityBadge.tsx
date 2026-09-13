import React from 'react';
import { Flame, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { PriorityLevel, PriorityClass } from '@/types/domain';

export interface PriorityBadgeProps {
  priority: PriorityLevel | PriorityClass;
  showIcon?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showIcon = true,
  className = '',
}) => {
  const norm = priority.toUpperCase();
  const isCritical = norm === 'CRITICAL' || norm === 'P1';
  const isHigh = norm === 'HIGH' || norm === 'P2';
  const isMedium = norm === 'MEDIUM' || norm === 'P3';

  let badgeClass = 'badge-priority-low';
  let label = norm;
  let Icon = CheckCircle2;

  if (isCritical) {
    badgeClass = 'badge-priority-critical';
    label = norm.startsWith('P') ? 'P1 · CRITICAL' : 'CRITICAL';
    Icon = Flame;
  } else if (isHigh) {
    badgeClass = 'badge-priority-high';
    label = norm.startsWith('P') ? 'P2 · HIGH' : 'HIGH';
    Icon = AlertTriangle;
  } else if (isMedium) {
    badgeClass = 'badge-priority-medium';
    label = norm.startsWith('P') ? 'P3 · MEDIUM' : 'MEDIUM';
    Icon = ShieldAlert;
  } else {
    label = norm.startsWith('P') ? 'P4 · LOW' : 'LOW';
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {showIcon && <Icon size={12} aria-hidden="true" />}
      <span>{label}</span>
    </span>
  );
};
