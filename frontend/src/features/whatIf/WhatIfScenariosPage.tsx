"use client";
import React, { useState } from 'react';
import { ScenarioConfigForm } from './ScenarioConfigForm';
import { ScheduleDiffViewer } from './ScheduleDiffViewer';

export const WhatIfScenariosPage: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSimulate = (data: any) => {
    setIsSimulating(true);
    // Mocking an async solver delay
    setTimeout(() => {
      setResult({
        deltaObjective: -0.04,
        trainDisruptionDelta: 15,
        resourceUtilizationDelta: 0,
        explanation: "Block BLK-NDLS-01 shifted forward by 60 minutes to clear delayed passage of Train 12002 without cancelling secondary OHE maintenance."
      });
      setIsSimulating(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">What-If Scenarios</h2>
          <p className="text-text-muted font-mono text-sm mt-1">OPERATIONAL DISRUPTION SIMULATION SANDBOX</p>
        </div>
      </div>
      
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        <div className="lg:col-span-1 overflow-y-auto custom-scrollbar">
          <ScenarioConfigForm onSimulate={handleSimulate} isSimulating={isSimulating} />
        </div>
        <div className="lg:col-span-2 overflow-y-auto custom-scrollbar">
           {isSimulating ? (
             <div className="h-full flex items-center justify-center border-2 border-surface-border border-dashed bg-surface-card/20 min-h-[400px]">
                <div className="font-mono text-status-warning flex flex-col items-center">
                  <div className="w-8 h-8 border-4 border-status-warning border-t-transparent rounded-full animate-spin mb-4"></div>
                  RUNNING MULTI-OBJECTIVE SOLVER...
                </div>
             </div>
           ) : result ? (
             <ScheduleDiffViewer result={result} />
           ) : (
             <div className="h-full flex items-center justify-center border-2 border-surface-border border-dashed bg-surface-card/20 min-h-[400px]">
               <span className="font-mono text-text-muted tracking-widest uppercase text-sm">SELECT SCENARIO AND PARAMETERS TO BEGIN</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
