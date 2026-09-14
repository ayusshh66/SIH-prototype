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
           <span className="text-[10px] text-gray-500 font-bold block uppercase tracking-widest mb-1">Overall Priority Score</span>
           <span className="text-5xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{score}</span>
           <span className="text-xl text-gray-600">/100</span>
        </div>
      </div>
      
      <div className="space-y-4 border-t border-white/10 pt-4">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Factor Contributions</h4>
        {bars.map(bar => {
           const pct = (bar.value / bar.max) * 100;
           return (
             <div key={bar.label} className="flex flex-col gap-1.5">
               <div className="flex justify-between text-[10px] font-bold tracking-widest uppercase">
                 <span className="text-gray-300">{bar.label}</span>
                 <span className="text-gray-500">{bar.value.toFixed(2)} / {bar.max.toFixed(2)}</span>
               </div>
               <div className="h-2 w-full bg-black/50 border border-white/10 rounded-full overflow-hidden">
                 <div 
                   className="h-full bg-gradient-to-r from-[#EF4444]/50 to-[#EF4444] rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"
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
