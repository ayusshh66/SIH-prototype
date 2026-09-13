import React from 'react';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'info'
  | 'optimal'
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'ENG'
  | 'TRD'
  | 'SNT';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  icon,
  className = '',
}) => {
  const baseStyle =
    'inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider border-2 border-surface-border shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-none bg-surface-card';

  const variants: Record<BadgeVariant, string> = {
    default: 'text-text-primary border-surface-border',
    primary: 'text-department-eng border-department-eng',
    success: 'text-status-optimal border-status-optimal',
    optimal: 'text-status-optimal border-status-optimal',
    warning: 'text-status-warning border-status-warning',
    danger: 'text-status-critical border-status-critical',
    critical: 'text-status-critical border-status-critical',
    info: 'text-department-eng border-department-eng',
    p1: 'text-status-critical border-status-critical',
    p2: 'text-status-warning border-status-warning',
    p3: 'text-department-eng border-department-eng',
    p4: 'text-text-muted border-surface-border',
    ENG: 'text-department-eng border-department-eng',
    TRD: 'text-department-trd border-department-trd',
    SNT: 'text-department-snt border-department-snt',
  };

  return (
    <span
      className={`badge badge-${variant} ${baseStyle} ${variants[variant] || variants.default} ${className}`}
    >
      {icon && <span className="inline-flex mr-1.5 items-center shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
