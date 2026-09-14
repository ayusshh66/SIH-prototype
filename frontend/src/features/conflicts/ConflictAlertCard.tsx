import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Conflict } from '../../types/api';

export const ConflictAlertCard: React.FC<{ conflict: Conflict }> = ({ conflict }) => {
  const isCritical = conflict.severity === 'CRITICAL';
  
  return (
    <Card className={`flex flex-col h-full border-l-4 !border-l-[4px] relative overflow-hidden group ${isCritical ? 'border-l-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'border-l-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.1)]'}`}>
      <div className={`absolute inset-0 bg-gradient-to-r opacity-5 pointer-events-none ${isCritical ? 'from-[#EF4444]' : 'from-[#F59E0B]'} to-transparent`} />
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-lg font-bold font-mono text-white tracking-wide">{conflict.conflict_id}</h3>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mt-1">
            Section: <span className="text-gray-300">{conflict.section_id}</span>
          </p>
        </div>
        <Badge variant={isCritical ? 'critical' : 'warning'}>
           {conflict.conflict_type}
        </Badge>
      </div>

      <div className="flex-1 space-y-4 relative z-10">
        <div>
          <p className="font-mono text-sm leading-relaxed text-gray-300">
            {conflict.description}
          </p>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Affected Entities</h4>
          <div className="flex flex-wrap gap-2">
            {conflict.entity_ids.map(id => (
               <span key={id} className="bg-black/50 border border-white/10 px-2 py-1 rounded font-mono text-xs text-gray-400">
                 {id}
               </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-mono relative z-10">
        <span className="text-gray-500 tracking-wider">Detected: {conflict.start.split('T')[1].slice(0,5)}</span>
        <button className="text-white hover:text-gray-300 transition-colors font-bold uppercase tracking-wider text-[10px]">Dismiss Alert</button>
      </div>
    </Card>
  );
};
