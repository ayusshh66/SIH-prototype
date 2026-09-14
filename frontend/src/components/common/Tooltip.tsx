import React, { useState } from 'react';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className="absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 bg-[#18181B] text-white text-[11px] font-mono px-2 py-1 rounded border border-white/10 whitespace-nowrap shadow-lg z-[100] pointer-events-none"
        >
          {content}
        </div>
      )}
    </div>
  );
};

