import React from 'react';
import { Hammer, Zap, Radio, Layers } from 'lucide-react';
import type { DepartmentCode } from '@/types/domain';

export interface DepartmentBadgeProps {
  department: DepartmentCode | string;
  showIcon?: boolean;
  className?: string;
}

export const DepartmentBadge: React.FC<DepartmentBadgeProps> = ({
  department,
  showIcon = true,
  className = '',
}) => {
  const norm = String(department).toUpperCase();
  let leftBorderClass = 'border-l-dept-engineering text-dept-engineering';
  let fullName = 'Civil Eng (P-Way)';
  let Icon = Hammer;

  if (norm === 'TRD' || norm.includes('TRACTION')) {
    leftBorderClass = 'border-l-dept-trd text-dept-trd';
    fullName = 'Traction (OHE)';
    Icon = Zap;
  } else if (norm === 'SNT' || norm.includes('SIGNAL') || norm.includes('TELECOM')) {
    leftBorderClass = 'border-l-dept-snt text-dept-snt';
    fullName = 'Signal & Telecom';
    Icon = Radio;
  } else if (norm === 'PWAY') {
    leftBorderClass = 'border-l-dept-pway text-dept-pway';
    fullName = 'Permanent Way';
    Icon = Hammer;
  } else {
    leftBorderClass = 'border-l-dept-other text-content-secondary';
    fullName = norm;
    Icon = Layers;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-micro font-medium rounded-sm border-l-4 border-t border-r border-b border-border-hairline bg-surface-sunken uppercase tracking-wider select-none shrink-0 ${leftBorderClass} ${className}`}
      title={fullName}
    >
      {showIcon && <Icon size={12} strokeWidth={2} aria-hidden="true" />}
      <span className="font-mono text-content-primary">{department}</span>
    </span>
  );
};

export default DepartmentBadge;
