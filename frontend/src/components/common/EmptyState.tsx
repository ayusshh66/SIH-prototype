import React from 'react';
import { Database } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No Records Available',
  description = 'No operational data or alerts match the current filter parameters.',
  icon = <Database size={40} strokeWidth={1.5} className="text-content-tertiary" />,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={`p-12 border border-border-hairline border-dashed rounded-md bg-surface-sunken/40 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="mb-4 text-content-tertiary">
        {icon}
      </div>
      <div className="text-h3 font-semibold text-content-primary mb-1.5">
        {title}
      </div>
      <div className="text-small text-content-secondary max-w-sm mb-6">
        {description}
      </div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
