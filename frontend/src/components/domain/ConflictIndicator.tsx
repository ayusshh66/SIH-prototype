import React from 'react';
import { AlertTriangle, TrainTrack, Truck, Clock, ShieldX, CalendarX2 } from 'lucide-react';
import type { ConflictType, ConflictSeverity } from '@/types/domain';

export interface ConflictIndicatorProps {
  type: ConflictType;
  severity: ConflictSeverity;
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

  const severityClass = `severity-${severity.toLowerCase()}`;

  return (
    <div className={`conflict-indicator ${severityClass} ${className}`}>
      <Icon size={16} style={{ color: severity === 'CRITICAL' ? 'var(--priority-critical)' : 'var(--priority-high)', flexShrink: 0 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
            {type}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              padding: '1px 5px',
              borderRadius: 'var(--radius-xs)',
              background: severity === 'CRITICAL' ? 'var(--priority-critical-bg)' : 'var(--priority-high-bg)',
              color: severity === 'CRITICAL' ? 'var(--priority-critical)' : 'var(--priority-high)',
            }}
          >
            {severity}
          </span>
          {affectedEntityId && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              [{affectedEntityId}]
            </span>
          )}
        </div>
        {description && (
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
            {description}
          </span>
        )}
      </div>
    </div>
  );
};
