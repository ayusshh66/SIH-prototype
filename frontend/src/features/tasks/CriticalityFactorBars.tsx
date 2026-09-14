import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  score: number; // 0-100
  factors: {
    severity: number;
    urgency: number;
    safety_risk: number;
    traffic_density: number;
    speed_class: number;
    deadline_proximity: number;
  };
}

export const CriticalityFactorBars: React.FC<Props> = ({ score, factors }) => {
  // Fixed semantic hues per operational factor
  const bars = [
    { label: 'Severity', value: factors.severity, max: 0.30, color: 'bg-accent-500', barColor: 'bg-accent-500' },
    { label: 'Urgency', value: factors.urgency, max: 0.25, color: 'bg-crit-p2', barColor: 'bg-crit-p2' },
    { label: 'Safety Risk', value: factors.safety_risk, max: 0.20, color: 'bg-crit-p1', barColor: 'bg-crit-p1' },
    { label: 'Traffic Density', value: factors.traffic_density, max: 0.10, color: 'bg-safety-interlocking', barColor: 'bg-safety-interlocking' },
    { label: 'Speed Class', value: factors.speed_class, max: 0.08, color: 'bg-dept-pway', barColor: 'bg-dept-pway' },
    { label: 'Deadline Proximity', value: factors.deadline_proximity, max: 0.07, color: 'bg-safety-restricted', barColor: 'bg-safety-restricted' },
  ];

  return (
    <div className="space-y-4 font-mono">
      <div className="flex justify-between items-end pb-4 border-b border-border-hairline">
        <div>
          <span className="text-micro text-content-tertiary font-medium block uppercase tracking-wider mb-1">
            Criticality Priority Score
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-display font-semibold text-content-primary tabular-nums tracking-tight">
              {score}
            </span>
            <span className="text-mono-lg text-content-tertiary">/100</span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`px-2 py-1 rounded-sm text-micro font-medium border uppercase tracking-wider ${
              score >= 80
                ? 'bg-crit-p1-bg text-crit-p1 border-crit-p1/30'
                : score >= 60
                ? 'bg-crit-p2-bg text-crit-p2 border-crit-p2/30'
                : score >= 40
                ? 'bg-crit-p3-bg text-crit-p3 border-crit-p3/30'
                : 'bg-crit-p4-bg text-crit-p4 border-crit-p4/30'
            }`}
          >
            {score >= 80 ? 'P1 · CRITICAL' : score >= 60 ? 'P2 · HIGH' : score >= 40 ? 'P3 · MEDIUM' : 'P4 · LOW'}
          </span>
        </div>
      </div>

      <div className="space-y-3.5 pt-2">
        <h4 className="text-micro font-medium text-content-tertiary uppercase tracking-wider">
          Feature Contribution Breakdown
        </h4>
        {bars.map((bar, idx) => {
          const pct = Math.min(Math.round((bar.value / bar.max) * 100), 100);
          return (
            <div key={bar.label} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-small">
                <span className="text-content-secondary flex items-center gap-1.5 font-sans">
                  <span className={`w-2 h-2 rounded-full ${bar.color}`} />
                  {bar.label}
                </span>
                <span className="text-content-tertiary font-mono tabular-nums text-micro">
                  {bar.value.toFixed(2)} / {bar.max.toFixed(2)} ({pct}%)
                </span>
              </div>
              <div className="h-2 w-full bg-surface-sunken border border-border-hairline rounded-sm overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-full ${bar.barColor} rounded-sm`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CriticalityFactorBars;
