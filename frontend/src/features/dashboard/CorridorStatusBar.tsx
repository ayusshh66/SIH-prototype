import React from 'react';

export const CorridorStatusBar: React.FC = () => {
  return (
    <div className="bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h3 className="font-mono text-sm font-bold text-text-muted uppercase">Active Corridor</h3>
        <p className="text-xl font-bold tracking-wide mt-1 text-text-primary">NDLS-AGC <span className="text-sm font-normal text-text-muted">(Km 0 - 195)</span></p>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xs font-mono text-text-muted uppercase">Traffic Density</span>
          <span className="font-bold text-status-critical">0.83 (HIGH)</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-mono text-text-muted uppercase">Track Type</span>
          <span className="font-bold text-text-primary">Double Electrified</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-mono text-text-muted uppercase">Status</span>
          <span className="font-bold text-status-optimal">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
