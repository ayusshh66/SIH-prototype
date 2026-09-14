import React from 'react';

export const CorridorStatusBar: React.FC = () => {
  return (
    <div className="bg-transparent flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h3 className="font-mono text-[10px] tracking-widest font-bold text-gray-500 uppercase">Active Corridor</h3>
        <p className="text-2xl font-bold tracking-wide mt-1 text-white">NDLS-AGC <span className="text-sm font-normal text-gray-400 font-mono ml-2">(Km 0 - 195)</span></p>
      </div>
      
      <div className="flex items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[10px] tracking-widest font-mono text-gray-500 uppercase">Traffic Density</span>
          <span className="font-bold text-[#EF4444] text-lg font-mono">0.83 <span className="text-xs ml-1">(HIGH)</span></span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] tracking-widest font-mono text-gray-500 uppercase">Track Type</span>
          <span className="font-bold text-white text-lg font-mono">Double Electrified</span>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] tracking-widest font-mono text-gray-500 uppercase">Status</span>
          <span className="font-bold text-[#10B981] text-lg font-mono">ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
