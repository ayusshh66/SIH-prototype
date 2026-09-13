import React from 'react';
import { Inbox } from 'lucide-react';
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
  title = 'No Data Available',
  description = 'No operational records or alerts to display for this criteria.',
  icon = <Inbox size={36} />,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`state-container ${className}`}>
      <div className="state-icon">{icon}</div>
      <div className="state-title">{title}</div>
      <div className="state-description">{description}</div>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction} style={{ marginTop: 'var(--space-2)' }}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
