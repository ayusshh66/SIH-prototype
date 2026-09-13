import React from 'react';

export interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  actions,
  children,
  footer,
  className = '',
  style,
}) => {
  return (
    <div
      className={`bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col ${className}`}
      style={style}
    >
      {(title || subtitle || actions) && (
        <div className="px-4 py-2.5 border-b-2 border-surface-border bg-background-main flex items-center justify-between gap-4">
          <div>
            {title && (
              <div className="font-mono text-sm uppercase font-bold text-text-muted">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-xs text-text-muted mt-0.5">
                {subtitle}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t-2 border-surface-border bg-background-main/50">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
