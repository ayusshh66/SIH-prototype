import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { modalScale } from '../../lib/motion';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = '540px',
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.65 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black backdrop-blur-[2px]"
            onClick={onClose}
            role="presentation"
          />

          {/* Modal Dialog */}
          <motion.div
            variants={modalScale}
            initial="initial"
            animate="animate"
            exit="exit"
            className="relative bg-surface-raised border border-border-hairline rounded-lg shadow-floating flex flex-col overflow-hidden w-full z-10"
            style={{ maxWidth }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-hairline bg-surface shrink-0">
              <div>
                <div className="text-h3 font-semibold text-content-primary">{title}</div>
                {subtitle && (
                  <div className="text-micro text-content-tertiary font-mono uppercase mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
              <button
                className="p-1.5 rounded-sm hover:bg-surface-sunken transition-colors text-content-tertiary hover:text-content-primary"
                onClick={onClose}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh] custom-scrollbar text-content-primary">
              {children}
            </div>
            {footer && (
              <div className="px-6 py-3.5 border-t border-border-hairline flex justify-end gap-3 bg-surface-sunken/60 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
