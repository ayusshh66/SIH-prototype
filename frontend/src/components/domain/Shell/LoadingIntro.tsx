import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Radio, Terminal } from 'lucide-react';

interface EngineCheck {
  id: string;
  name: string;
  subsystem: string;
  ready: boolean;
}

const ENGINES = [
  { id: 'crit', name: 'Criticality Scoring Engine', subsystem: 'XGBoost · P1-P4 Classifier' },
  { id: 'compat', name: 'Safety Compatibility Matrix', subsystem: 'IR Operating Manual §16' },
  { id: 'shadow', name: 'Shadow Block Generator', subsystem: 'Multi-Department Clustering' },
  { id: 'opt', name: 'OR-Tools CP-SAT Solver', subsystem: 'MILP Disruption Minimizer' },
  { id: 'explain', name: 'Explainability & Audit Ledger', subsystem: 'Deterministic Reason Codes' },
];

export const LoadingIntro: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [engineStates, setEngineStates] = useState<EngineCheck[]>(
    ENGINES.map((e) => ({ ...e, ready: false }))
  );
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // Sequentially light up engines staggered 150ms apart
    ENGINES.forEach((_, idx) => {
      setTimeout(() => {
        setEngineStates((prev) =>
          prev.map((eng, i) => (i <= idx ? { ...eng, ready: true } : eng))
        );
      }, 350 + idx * 160);
    });

    // Complete intro after all lights + brief pause
    const finishTimeout = setTimeout(() => {
      setBooting(false);
      setTimeout(onComplete, 300);
    }, 350 + ENGINES.length * 160 + 500);

    return () => clearTimeout(finishTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {booting && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-canvas flex flex-col items-center justify-center p-6 select-none"
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(var(--border-hairline)_1px,transparent_1px),linear-gradient(90deg,var(--border-hairline)_1px,transparent_1px)] bg-[size:32px_32px] opacity-40 pointer-events-none" />

          <div className="relative z-10 w-full max-w-md bg-surface border border-border-hairline rounded-md p-6 shadow-floating flex flex-col gap-5">
            {/* Header / Brand */}
            <div className="flex items-center justify-between border-b border-border-hairline pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400">
                  <Radio size={18} className="animate-pulse" />
                </div>
                <div>
                  <h2 className="text-small font-semibold text-content-primary tracking-tight">
                    RAIL-CONSOLE OPS SYSTEM
                  </h2>
                  <p className="text-micro font-mono text-content-tertiary uppercase tracking-wider">
                    Pipeline Self-Check Initializing
                  </p>
                </div>
              </div>

              <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-surface-sunken text-accent-400 border border-border-hairline">
                v2.4-PROD
              </span>
            </div>

            {/* Engine Status Lights */}
            <div className="space-y-2.5">
              {engineStates.map((eng, idx) => (
                <motion.div
                  key={eng.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`flex items-center justify-between p-2.5 rounded-sm border transition-colors ${
                    eng.ready
                      ? 'bg-status-feasible-bg border-status-feasible/30 text-content-primary'
                      : 'bg-surface-sunken border-border-hairline text-content-disabled'
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-small font-medium font-mono">
                      {eng.name}
                    </span>
                    <span className="text-micro font-mono text-content-tertiary">
                      {eng.subsystem}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-3">
                    {eng.ready ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-1 text-status-feasible font-mono text-micro font-semibold"
                      >
                        <CheckCircle2 size={14} />
                        <span>READY</span>
                      </motion.div>
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-content-disabled animate-pulse" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Terminal telemetry footer */}
            <div className="pt-2 border-t border-border-hairline flex items-center justify-between text-micro font-mono text-content-tertiary">
              <span className="flex items-center gap-1.5">
                <Terminal size={12} />
                <span>IR_SOLVER_NODE_01</span>
              </span>
              <span>100% DETERMINISTIC AUDIT</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingIntro;
