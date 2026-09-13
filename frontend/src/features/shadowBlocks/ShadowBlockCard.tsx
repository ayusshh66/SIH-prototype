import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { ShadowBlockCandidate } from '../../types/api';

export const ShadowBlockCard: React.FC<{ candidate: ShadowBlockCandidate }> = ({ candidate }) => {
  const isRejected = candidate.conflict_status === 'REJECTED';
  
  return (
    <Card className={`flex flex-col h-full relative ${isRejected ? 'border-status-critical opacity-90' : 'border-surface-border'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold font-mono text-text-primary">{candidate.shadow_block_id}</h3>
          <p className="text-xs text-text-muted font-mono uppercase mt-1">
            Section: {candidate.sections.join(', ')}
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

        <div className="grid grid-cols-2 gap-4 border-y border-surface-border py-4">
          <div>
            <span className="block text-[10px] text-text-muted font-mono uppercase">Benefit Score</span>
            <span className="text-xl font-bold font-mono text-text-primary">{candidate.shadow_benefit_score}</span>
          </div>
          <div>
            <span className="block text-[10px] text-text-muted font-mono uppercase">Time Saved</span>
            <span className={`text-xl font-bold font-mono ${isRejected ? 'text-text-muted' : 'text-status-shadow'}`}>
              {candidate.potential_time_saving_minutes}m
            </span>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Primary Task</h4>
          <div className="font-mono text-sm bg-background-main border border-surface-border p-2">
            {candidate.primary_task_id}
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold text-text-muted uppercase tracking-widest mb-2">Secondary Tasks</h4>
          <ul className="space-y-1 font-mono text-sm">
            {candidate.participating_task_ids.map(id => (
               <li key={id} className="text-text-primary pl-2 border-l-2 border-surface-border">↳ {id}</li>
            ))}
          </ul>
        </div>
        
        {isRejected && candidate.reasons && (
          <div className="mt-4 p-3 bg-surface-card border-2 border-status-critical shadow-[2px_2px_0px_0px_rgba(239,68,68,1)]">
            <h4 className="text-xs font-bold text-status-critical uppercase tracking-widest flex items-center gap-2 mb-1">
              Rejection Reason
            </h4>
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              {candidate.reasons[0]}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3 mt-auto">
        {!isRejected && <Button variant="primary" className="flex-1 py-3">Approve</Button>}
        <Button variant="secondary" className="flex-1 py-3">View Proof</Button>
      </div>
    </Card>
  );
};
