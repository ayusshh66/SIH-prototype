import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const LoadingIntro: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  useEffect(() => {
    onComplete();
  }, [onComplete]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-50 bg-canvas flex flex-col items-center justify-center p-6 select-none"
      >
        <div className="absolute inset-0 bg-[linear-gradient(var(--border-hairline)_1px,transparent_1px),linear-gradient(90deg,var(--border-hairline)_1px,transparent_1px)] bg-[size:32px_32px] opacity-35 pointer-events-none" />

        <div className="relative z-10 w-full max-w-sm border border-border-hairline bg-surface rounded-md p-5 shadow-floating">
          <div className="flex items-center gap-3 border-b border-border-hairline pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-accent-500/30 bg-accent-500/10 text-accent-400 text-small font-semibold font-mono">
              A
            </div>
            <div>
              <p className="text-small font-semibold text-content-primary tracking-[0.18em] uppercase">
                AVIRAT
              </p>
              <p className="text-micro font-mono text-content-tertiary uppercase tracking-[0.16em]">
                Rail Planning
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 text-content-secondary">
            <span className="h-2 w-2 rounded-full bg-accent-500 animate-pulse" />
            <span className="text-small font-mono text-content-tertiary uppercase tracking-[0.16em]">
              Initializing workspace
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default LoadingIntro;
