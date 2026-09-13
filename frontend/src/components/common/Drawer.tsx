'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  width,
}) => {
  const [render, setRender] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setRender(true);
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleAnimationEnd = () => {
    if (!isOpen) setRender(false);
  };

  if (!render) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-background-main/60 backdrop-blur-md z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
        role="presentation"
      />
      <div
        className={`fixed inset-y-0 right-0 w-full ${
          width ? '' : 'md:w-[480px]'
        } bg-surface-card/95 backdrop-blur-lg border-l-2 border-surface-border shadow-[-8px_0px_0px_0px_rgba(31,41,55,0.5)] z-50 flex flex-col transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={width ? { width } : undefined}
        onTransitionEnd={handleAnimationEnd}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b-2 border-surface-border bg-background-main/80 backdrop-blur-sm shrink-0">
          <div className="text-lg font-bold font-mono text-text-primary tracking-tight uppercase">
            {title}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-border transition-colors border-2 border-transparent hover:border-surface-border text-text-muted hover:text-text-primary"
            aria-label="Close drawer"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">{children}</div>
        {footer && (
          <div className="p-4 border-t-2 border-surface-border bg-background-main/80 backdrop-blur-sm shrink-0">
            {footer}
          </div>
        )}
      </div>
    </>
  );
};

export default Drawer;
