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
    <div className={`p-8 border border-[#EF4444]/30 border-dashed rounded-xl bg-[#EF4444]/5 flex flex-col items-center justify-center text-center ${className}`}>
      <div className="text-[#EF4444] drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] mb-3">
        <AlertCircle size={36} />
      </div>
      <div className="font-mono font-bold text-[11px] text-[#EF4444] uppercase tracking-widest mb-2 drop-shadow-[0_0_5px_rgba(239,68,68,0.3)]">
        {title}
      </div>
      <div className="font-mono text-xs text-gray-400 mb-6 max-w-md">
        {message}
      </div>
      {onRetry && (
        <Button variant="danger" size="sm" onClick={onRetry}>
          Retry Request
        </Button>
      )}
    </div>
  );
};
