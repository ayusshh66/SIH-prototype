import React from 'react';
import { Train, Clock } from 'lucide-react';
import type { TrainType, SpeedClass } from '@/types/domain';

export interface TrainImpactIndicatorProps {
  trainNumber: string;
  trainName?: string;
  trainType?: TrainType;
  speedClass?: SpeedClass;
  delayMinutes: number;
  className?: string;
}

export const TrainImpactIndicator: React.FC<TrainImpactIndicatorProps> = ({
  trainNumber,
  trainName,
  trainType,
  delayMinutes,
  className = '',
}) => {
  const isDelayed = delayMinutes > 0;

  return (
    <div
      className={`train-impact-chip ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 10px',
        borderRadius: 'var(--radius-sm)',
        background: 'var(--bg-surface-raised)',
        border: '1px solid var(--border-default)',
        fontSize: 'var(--text-xs)',
      }}
    >
      <Train size={14} style={{ color: 'var(--text-cyan)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          {trainNumber}
        </span>
        {trainName && (
          <span style={{ color: 'var(--text-secondary)' }}>
            {trainName}
          </span>
        )}
        {trainType && (
          <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
            ({trainType})
          </span>
        )}
      </div>
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '3px',
          padding: '1px 6px',
          borderRadius: 'var(--radius-xs)',
          background: isDelayed ? 'var(--priority-high-bg)' : 'var(--status-optimal-bg)',
          color: isDelayed ? 'var(--priority-high)' : 'var(--status-optimal)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
        }}
      >
        <Clock size={10} />
        <span>{delayMinutes > 0 ? `+${delayMinutes}m delay` : 'On Time'}</span>
      </div>
    </div>
  );
};
