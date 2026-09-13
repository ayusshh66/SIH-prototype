import React from 'react';
import { Card } from '../../components/common/Card';

interface Props {
  result: any;
}

export const ScheduleDiffViewer: React.FC<Props> = ({ result }) => {
  return (
    <Card className="h-full flex flex-col space-y-6">
       <div className="flex justify-between items-center pb-4 border-b-2 border-surface-border">
          <h3 className="font-mono font-bold text-lg text-text-primary uppercase">Simulated Output: SCHED-SIM-01</h3>
          <span className="px-3 py-1 bg-status-optimal/10 text-status-optimal border-2 border-status-optimal font-mono text-xs font-bold uppercase tracking-wider">FEASIBLE</span>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <div className="bg-background-main border-2 border-surface-border p-4 text-center flex flex-col items-center justify-center">
            <span className="block text-[10px] text-text-muted font-mono uppercase mb-2">Objective Δ</span>
            <span className="font-bold text-2xl text-status-critical font-mono">{result.deltaObjective}</span>
         </div>
         <div className="bg-background-main border-2 border-surface-border p-4 text-center flex flex-col items-center justify-center">
            <span className="block text-[10px] text-text-muted font-mono uppercase mb-2">Train Disruption Δ</span>
            <span className="font-bold text-2xl text-status-warning font-mono">+{result.trainDisruptionDelta}m</span>
         </div>
         <div className="bg-background-main border-2 border-surface-border p-4 text-center flex flex-col items-center justify-center">
            <span className="block text-[10px] text-text-muted font-mono uppercase mb-2">Resource Util. Δ</span>
            <span className="font-bold text-2xl text-text-primary font-mono">{result.resourceUtilizationDelta}%</span>
         </div>
       </div>

       <div className="flex-1 border-2 border-surface-border bg-background-main relative overflow-hidden flex flex-col min-h-[200px]">
          <div className="p-3 border-b-2 border-surface-border font-mono text-xs font-bold text-text-muted bg-surface-card flex justify-between">
            <span>SHIFT DETECTED</span>
            <span>BLK-NDLS-01</span>
          </div>
          <div className="flex-1 p-4 relative">
             <div className="absolute left-8 right-8 top-1/4 h-8 border-2 border-surface-border bg-surface-card opacity-50 flex items-center px-2 font-mono text-[10px] line-through text-text-muted">
                BASELINE (23:00 - 01:30)
             </div>
             <div className="absolute left-24 right-4 top-1/2 h-8 border-2 border-status-shadow bg-status-shadow/20 flex items-center px-2 font-mono text-[10px] text-white shadow-[4px_4px_0px_0px_rgba(139,92,246,0.5)] z-10">
                SIMULATED SHIFT (00:30 - 03:00)
             </div>
             <div className="absolute left-[30%] top-0 bottom-0 border-l border-dashed border-status-critical/50 z-0"></div>
          </div>
       </div>

       <div className="p-4 bg-surface-card border-l-4 border-status-shadow font-mono text-xs leading-relaxed text-text-primary shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
          <span className="font-bold block uppercase tracking-widest text-status-shadow mb-2">Explanation</span>
          {result.explanation}
       </div>
    </Card>
  );
};
