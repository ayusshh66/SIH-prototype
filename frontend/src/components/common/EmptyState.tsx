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
    <div className={`p-12 border border-white/5 border-dashed rounded-xl bg-black/20 flex flex-col items-center justify-center text-center ${className}`}>
      <div className="text-[#06B6D4] opacity-50 mb-4">
        {icon}
      </div>
      <div className="font-mono font-bold text-[11px] text-gray-300 uppercase tracking-widest mb-2">
        {title}
      </div>
      <div className="font-mono text-xs text-gray-500 mb-6 max-w-md">
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
