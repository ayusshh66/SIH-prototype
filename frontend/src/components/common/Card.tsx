import React from 'react';

export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string }> = ({ children, className = '', title }) => {
  return (
    <div className={`bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col ${className}`}>
      {title && (
        <div className="px-4 py-2 border-b-2 border-surface-border bg-background-main font-mono text-sm uppercase font-bold text-text-muted">
          {title}
        </div>
      )}
      <div className="p-4 flex-1">
        {children}
      </div>
    </div>
  );
};
