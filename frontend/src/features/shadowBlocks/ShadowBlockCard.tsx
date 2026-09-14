import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ShadowBlockCandidate } from '../../types/api';

export const ShadowBlockCard: React.FC<{ candidate: ShadowBlockCandidate }> = ({ candidate }) => {
  const isRejected = candidate.conflict_status === 'REJECTED';
  
  return (
    <Card className={`flex flex-col h-full relative ${isRejected ? '!border-[#EF4444]/50 opacity-90' : 'border-white/10'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold font-mono text-white">{candidate.shadow_block_id}</h3>
          <p className="text-xs text-gray-500 font-mono uppercase mt-1 tracking-widest">
            Section: <span className="text-gray-300">{candidate.sections.join(', ')}</span>
          </p>
        </div>
        <Badge variant={isRejected ? 'critical' : 'optimal'}>
           {candidate.conflict_status}
        </Badge>
      </div>

      <div className="flex-1 space-y-4">
        <div className="flex flex-wrap gap-2">
           {candidate.departments.map(dept => (
              <Badge key={dept} variant={dept as any}>{dept}</Badge>
           ))}
        </div>

        <div className="grid grid-cols-2 gap-4 border-y border-white/10 py-4">
          <div>
            <span className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest">Benefit Score</span>
            <span className="text-xl font-bold font-mono text-white">{candidate.shadow_benefit_score}</span>
          </div>
          <div>
            <span className="block text-[10px] text-gray-500 font-mono uppercase tracking-widest">Time Saved</span>
            <span className={`text-xl font-bold font-mono ${isRejected ? 'text-gray-500' : 'text-[#8B5CF6]'}`}>
              {candidate.potential_time_saving_minutes}m
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Primary Task</h4>
          <div className="font-mono text-sm bg-black/50 border border-white/10 p-2 rounded text-gray-300">
            {candidate.primary_task_id}
          </div>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Secondary Tasks</h4>
          <ul className="space-y-1 font-mono text-sm">
            {candidate.participating_task_ids.map(id => (
               <li key={id} className="text-gray-300 pl-3 border-l-2 border-white/10">↳ {id}</li>
            ))}
          </ul>
        </div>
        
        {isRejected && candidate.reasons && (
          <div className="mt-4 p-4 bg-black/40 border border-[#EF4444]/50 rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <h4 className="text-[10px] font-bold text-[#EF4444] uppercase tracking-widest flex items-center gap-2 mb-2">
              Rejection Reason
            </h4>
            <p className="font-mono text-xs text-gray-400 leading-relaxed">
              {candidate.reasons[0]}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-white/10 flex gap-3 mt-auto">
        {!isRejected && <Button variant="primary" className="flex-1 py-3">Approve</Button>}
        <Button variant="secondary" className="flex-1 py-3">View Proof</Button>
      </div>
    </Card>
  );
};
