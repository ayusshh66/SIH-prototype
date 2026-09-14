import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Telemetry / Pipeline Retrieval Error',
  message = 'Failed to load operational data. Check connection to the optimization solver service.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-8 border border-crit-p1/30 border-dashed rounded-md bg-crit-p1-bg flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="text-crit-p1 mb-3">
        <AlertTriangle size={36} strokeWidth={1.5} />
      </div>
      <div className="text-h3 font-semibold text-crit-p1 mb-1.5">
        {title}
      </div>
      <div className="text-small text-content-secondary max-w-md mb-6">
        {message}
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry Connection
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
