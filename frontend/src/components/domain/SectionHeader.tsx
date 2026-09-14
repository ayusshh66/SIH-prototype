import React from 'react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`pb-5 mb-6 border-b border-border-hairline flex items-start justify-between gap-4 flex-wrap ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-h1 font-semibold text-content-primary tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-small text-content-secondary max-w-3xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 pt-0.5">
          {actions}
        </div>
      )}
    </div>
  );
};

export default SectionHeader;
