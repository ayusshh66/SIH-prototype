import React from 'react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: 'critical' | 'high' | 'optimal' | 'blue' | 'none';
  trend?: string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  accent = 'blue',
  trend,
  className = '',
}) => {
  const accentClass = accent !== 'none' ? `accent-${accent}` : '';

  return (
    <div className={`kpi-card ${accentClass} ${className}`}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        {icon && <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>}
      </div>
      <div className="kpi-value">{value}</div>
      {(subtext || trend) && (
        <div className="kpi-subtext">
          {trend && (
            <span style={{ fontWeight: 600, color: 'var(--text-cyan)', fontFamily: 'var(--font-mono)' }}>
              {trend}
            </span>
          )}
          {subtext && <span>{subtext}</span>}
        </div>
      )}
    </div>
  );
};
