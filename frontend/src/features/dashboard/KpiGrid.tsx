import React from 'react';
import { Card } from '../../components/common/Card';

export const KpiGrid: React.FC<{ summary: any }> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      <Card className="flex flex-col">
        <span className="text-[10px] tracking-widest font-mono font-bold text-[#EF4444] uppercase">Critical Tasks (P1)</span>
        <span className="text-3xl font-bold mt-2 text-white">{summary.p1Tasks}</span>
        <span className="text-[10px] text-gray-500 mt-2 border-t border-white/10 pt-2 uppercase tracking-wide">+1 Overdue Rail Defect</span>
      </Card>
      
      <Card className="flex flex-col">
        <span className="text-[10px] tracking-widest font-mono font-bold text-[#F59E0B] uppercase">High Tasks (P2)</span>
        <span className="text-3xl font-bold mt-2 text-white">{summary.p2Tasks}</span>
        <span className="text-[10px] text-gray-500 mt-2 border-t border-white/10 pt-2 uppercase tracking-wide">5 TRD / 6 S&T</span>
      </Card>
      
      <Card className="flex flex-col">
        <span className="text-[10px] tracking-widest font-mono font-bold text-[#3B82F6] uppercase">Active Blocks</span>
        <span className="text-3xl font-bold mt-2 text-white">{summary.activeCorridors * 3}</span>
        <span className="text-[10px] text-gray-500 mt-2 border-t border-white/10 pt-2 uppercase tracking-wide">3 Executing, 3 Appr.</span>
      </Card>

      <Card className="flex flex-col">
        <span className="text-[10px] tracking-widest font-mono font-bold text-[#8B5CF6] uppercase">Shadow Savings</span>
        <span className="text-3xl font-bold mt-2 text-white">210</span>
        <span className="text-[10px] text-gray-500 mt-2 border-t border-white/10 pt-2 uppercase tracking-wide">Mins (3.5h) saved</span>
      </Card>
    </div>
  );
};
