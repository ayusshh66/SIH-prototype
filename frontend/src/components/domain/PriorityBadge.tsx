import React from 'react';
import { Flame, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import type { PriorityLevel, PriorityClass } from '@/types/domain';

export interface PriorityBadgeProps {
  priority: PriorityLevel | PriorityClass;
  score?: number;
  showIcon?: boolean;
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  score,
  showIcon = true,
  className = '',
}) => {
  const norm = String(priority).toUpperCase();
  const isCritical = norm === 'CRITICAL' || norm === 'P1';
  const isHigh = norm === 'HIGH' || norm === 'P2';
  const isMedium = norm === 'MEDIUM' || norm === 'P3';

  let toneClasses = 'bg-crit-p4-bg text-crit-p4 border-crit-p4-border';
  let label = 'P4 · LOW';
  let Icon = CheckCircle2;

  if (isCritical) {
    toneClasses = 'bg-crit-p1-bg text-crit-p1 border-crit-p1-border';
    label = 'P1 · CRITICAL';
    Icon = Flame;
  } else if (isHigh) {
    toneClasses = 'bg-crit-p2-bg text-crit-p2 border-crit-p2-border';
    label = 'P2 · HIGH';
    Icon = AlertTriangle;
  } else if (isMedium) {
    toneClasses = 'bg-crit-p3-bg text-crit-p3 border-crit-p3-border';
    label = 'P3 · MEDIUM';
    Icon = ShieldAlert;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-micro font-medium rounded-sm border uppercase tracking-wider select-none shrink-0 ${toneClasses} ${className}`}
    >
      {showIcon && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      <span className="font-mono">{label}</span>
      {score !== undefined && (
        <span className="font-mono tabular-nums opacity-90 pl-1 border-l border-current/25">
          {score}
        </span>
      )}
    </span>
  );
};

export default PriorityBadge;
