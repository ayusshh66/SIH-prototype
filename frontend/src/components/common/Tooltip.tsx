import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, side = 'top' }) => {
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
      <AnimatePresence>
        {visible && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            className={`absolute ${
              side === 'top'
                ? 'bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2'
                : 'top-[calc(100%+6px)] left-1/2 -translate-x-1/2'
            } bg-surface-raised text-content-primary text-small font-mono px-2.5 py-1 rounded-sm border border-border-hairline whitespace-nowrap shadow-floating z-[100] pointer-events-none select-none`}
          >
            {content}
            <div
              className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-surface-raised border-border-hairline rotate-45 ${
                side === 'top'
                  ? 'bottom-[-4px] border-r border-b'
                  : 'top-[-4px] border-l border-t'
              }`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Tooltip;
