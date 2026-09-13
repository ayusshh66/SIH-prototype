import React from 'react';

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
  const bars = [
    { label: 'Severity', value: factors.severity, max: 0.30 },
    { label: 'Urgency', value: factors.urgency, max: 0.25 },
    { label: 'Safety Risk', value: factors.safety_risk, max: 0.20 },
    { label: 'Traffic Density', value: factors.traffic_density, max: 0.10 },
    { label: 'Speed Class', value: factors.speed_class, max: 0.08 },
    { label: 'Deadline Proximity', value: factors.deadline_proximity, max: 0.07 },
  ];

  return (
    <div className="space-y-4 font-mono">
      <div className="flex justify-between items-end mb-6">
        <div>
           <span className="text-xs text-text-muted block uppercase tracking-widest mb-1">Overall Priority Score</span>
           <span className="text-5xl font-bold text-text-primary">{score}</span>
           <span className="text-xl text-text-muted">/100</span>
        </div>
      </div>
      
      <div className="space-y-3 border-t-2 border-surface-border pt-4">
        <h4 className="text-xs font-bold text-text-primary uppercase tracking-widest mb-4">Factor Contributions</h4>
        {bars.map(bar => {
           const pct = (bar.value / bar.max) * 100;
           return (
             <div key={bar.label} className="flex flex-col gap-1">
               <div className="flex justify-between text-xs">
                 <span className="text-text-primary">{bar.label}</span>
                 <span className="text-text-muted">{bar.value.toFixed(2)} / {bar.max.toFixed(2)}</span>
               </div>
               <div className="h-3 w-full bg-background-main border border-surface-border overflow-hidden p-[1px]">
                 <div 
                   className="h-full bg-status-critical"
                   style={{ width: `${pct}%` }}
                 />
               </div>
             </div>
           );
        })}
      </div>
    </div>
  );
};
