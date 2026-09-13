import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'p1' | 'p2' | 'p3' | 'p4' | 'ENG' | 'TRD' | 'SNT' | 'optimal' | 'warning' | 'critical' | 'default';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'default', className = '' }) => {
  const baseStyle = "inline-flex items-center px-2 py-0.5 text-xs font-bold uppercase tracking-wider border-2 border-surface-border shadow-[2px_2px_0px_0px_rgba(255,255,255,0.1)] rounded-none bg-surface-card";
  
  const variants = {
    p1: "text-status-critical border-status-critical",
    p2: "text-status-warning border-status-warning",
    p3: "text-department-eng border-department-eng",
    p4: "text-text-muted border-surface-border",
    ENG: "text-department-eng border-department-eng",
    TRD: "text-department-trd border-department-trd",
    SNT: "text-department-snt border-department-snt",
    optimal: "text-status-optimal border-status-optimal",
    warning: "text-status-warning border-status-warning",
    critical: "text-status-critical border-status-critical",
    default: "text-text-primary border-surface-border"
  };

  return (
    <span className={`${baseStyle} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};
