import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { drawerSlide } from '../../lib/motion';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black backdrop-blur-[2px] z-40"
            onClick={onClose}
            role="presentation"
          />

          {/* Drawer Panel */}
          <motion.div
            variants={drawerSlide}
            initial="initial"
            animate="animate"
            exit="exit"
            className={`fixed inset-y-0 right-0 w-full ${
              width ? '' : 'sm:w-[480px]'
            } bg-surface-raised border-l border-border-hairline shadow-drawer z-50 flex flex-col`}
            style={width ? { width } : undefined}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-hairline bg-surface shrink-0">
              <div>
                <div className="text-h3 font-semibold text-content-primary">
                  {title}
                </div>
                {subtitle && (
                  <div className="text-micro text-content-tertiary font-mono uppercase mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-sm hover:bg-surface-sunken transition-colors text-content-tertiary hover:text-content-primary"
                aria-label="Close drawer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 flex-1 overflow-y-auto custom-scrollbar text-content-primary">
              {children}
            </div>

            {/* Sticky Action Footer */}
            {footer && (
              <div className="px-6 py-3.5 border-t border-border-hairline bg-surface-sunken/60 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
