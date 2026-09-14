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
  | 'SNT'
  | 'shadow';

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
    'inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded text-white shrink-0';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-white/10 text-gray-300',
    primary: 'bg-[#F97316]',
    success: 'bg-[#10B981]',
    optimal: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-[#EF4444]',
    critical: 'bg-[#EF4444]',
    info: 'bg-[#3B82F6]',
    p1: 'bg-[#EF4444]',
    p2: 'bg-[#F59E0B]',
    p3: 'bg-[#3B82F6]',
    p4: 'bg-white/20',
    ENG: 'bg-[#3B82F6]',
    TRD: 'bg-[#F59E0B]',
    SNT: 'bg-[#10B981]',
    shadow: 'bg-[#8B5CF6]',
  };

  return (
    <span
      className={`${baseStyle} ${variants[variant] || variants.default} ${className}`}
    >
      {icon && <span className="inline-flex mr-1 items-center shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
