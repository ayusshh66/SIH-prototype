import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, TrainTrack, Truck, Clock, ShieldX, CalendarX2 } from 'lucide-react';
import type { ConflictType, ConflictSeverity } from '@/types/domain';
import { criticalConflictPulse } from '../../lib/motion';

export interface ConflictIndicatorProps {
  type: ConflictType | string;
  severity: ConflictSeverity | string;
  affectedEntityId?: string;
  description?: string;
  className?: string;
}

export const ConflictIndicator: React.FC<ConflictIndicatorProps> = ({
  type,
  severity,
  affectedEntityId,
  description,
  className = '',
}) => {
  const normSeverity = String(severity).toUpperCase();
  const isCritical = normSeverity === 'CRITICAL' || normSeverity === 'HIGH';

  let Icon = AlertTriangle;
  switch (type) {
    case 'TRAIN_CONFLICT':
      Icon = TrainTrack;
      break;
    case 'RESOURCE_CONFLICT':
      Icon = Truck;
      break;
    case 'WINDOW_CONFLICT':
      Icon = Clock;
      break;
    case 'SAFETY_CONFLICT':
      Icon = ShieldX;
      break;
    case 'DEADLINE_CONFLICT':
      Icon = CalendarX2;
      break;
  }

  const toneClass =
    normSeverity === 'CRITICAL'
      ? 'border-crit-p1/40 bg-crit-p1-bg text-crit-p1'
      : normSeverity === 'HIGH' || normSeverity === 'WARNING'
      ? 'border-crit-p2/40 bg-crit-p2-bg text-crit-p2'
      : 'border-status-partial/40 bg-status-partial-bg text-status-partial';

  return (
    <div
      className={`p-3 rounded-sm border flex items-start gap-3 transition-colors ${toneClass} ${className}`}
    >
      <motion.div
        animate={isCritical ? criticalConflictPulse.animate : undefined}
        transition={isCritical ? criticalConflictPulse.transition : undefined}
        className="shrink-0 mt-0.5"
      >
        <Icon size={16} strokeWidth={2} />
      </motion.div>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-small font-semibold tracking-wide text-content-primary">
            {type}
          </span>
          <span className="text-micro font-mono font-medium px-1.5 py-0.2 rounded-sm border border-current/30 uppercase">
            {normSeverity}
          </span>
          {affectedEntityId && (
            <span className="text-micro font-mono text-content-tertiary">
              [{affectedEntityId}]
            </span>
          )}
        </div>
        {description && (
          <div className="text-small text-content-secondary leading-snug">
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

export default ConflictIndicator;
