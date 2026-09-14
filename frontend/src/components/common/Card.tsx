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
      className={`bg-[#111827] border border-white/10 rounded-xl shadow-lg flex flex-col overflow-hidden ${className}`}
      style={style}
    >
      {(title || subtitle || actions) && (
        <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex items-center justify-between gap-4">
          <div>
            {title && (
              <div className="text-sm font-semibold tracking-wide text-gray-300">
                {title}
              </div>
            )}
            {subtitle && (
              <div className="text-xs text-gray-500 mt-0.5 font-mono">
                {subtitle}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4 flex-1">{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-white/10 bg-black/20">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
