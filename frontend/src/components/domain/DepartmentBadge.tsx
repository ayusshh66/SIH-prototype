import React from 'react';
import { Hammer, Zap, Radio } from 'lucide-react';
import type { DepartmentCode } from '@/types/domain';

export interface DepartmentBadgeProps {
  department: DepartmentCode;
  showIcon?: boolean;
  className?: string;
}

export const DepartmentBadge: React.FC<DepartmentBadgeProps> = ({
  department,
  showIcon = true,
  className = '',
}) => {
  let badgeClass = 'badge-dept-eng';
  let fullName = 'Civil Eng (P-Way)';
  let Icon = Hammer;

  if (department === 'TRD') {
    badgeClass = 'badge-dept-trd';
    fullName = 'Traction (OHE)';
    Icon = Zap;
  } else if (department === 'SNT') {
    badgeClass = 'badge-dept-snt';
    fullName = 'Signal & Telecom';
    Icon = Radio;
  }

  return (
    <span className={`badge ${badgeClass} ${className}`} title={fullName}>
      {showIcon && <Icon size={12} aria-hidden="true" />}
      <span>{department}</span>
    </span>
  );
};
