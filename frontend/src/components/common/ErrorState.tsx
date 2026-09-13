import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'System Warning / Retrieval Error',
  message = 'Failed to load operational data. Check network connection or backend service status.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`state-container ${className}`} style={{ border: '1px solid var(--priority-critical-border)', borderRadius: 'var(--radius-md)', background: 'var(--priority-critical-bg)' }}>
      <div className="state-icon" style={{ color: 'var(--priority-critical)' }}>
        <AlertCircle size={36} />
      </div>
      <div className="state-title" style={{ color: 'var(--priority-critical)' }}>
        {title}
      </div>
      <div className="state-description" style={{ color: 'var(--text-secondary)' }}>
        {message}
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry} style={{ marginTop: 'var(--space-2)' }}>
          Retry Request
        </Button>
      )}
    </div>
  );
};
