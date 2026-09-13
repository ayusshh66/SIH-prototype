import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Conflict } from '../../types/api';

export const ConflictAlertCard: React.FC<{ conflict: Conflict }> = ({ conflict }) => {
  const isCritical = conflict.severity === 'CRITICAL';
  
  return (
    <Card className={`flex flex-col h-full border-l-4 ${isCritical ? 'border-l-status-critical' : 'border-l-status-warning'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold font-mono text-text-primary">{conflict.conflict_id}</h3>
          <p className="text-xs text-text-muted font-mono uppercase mt-1">
            Section: {conflict.section_id}
          </p>
        </div>
        <Badge variant={isCritical ? 'critical' : 'warning'}>
           {conflict.conflict_type}
        </Badge>
      </div>

      <div className="flex-1 space-y-4">
        <div>
          <p className="font-mono text-sm leading-relaxed text-text-primary">
            {conflict.description}
          </p>
        </div>

        <div>
          <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Affected Entities</h4>
          <div className="flex flex-wrap gap-2">
            {conflict.entity_ids.map(id => (
               <span key={id} className="bg-background-main border border-surface-border px-2 py-1 font-mono text-xs text-text-muted">
                 {id}
               </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-surface-border flex justify-between items-center text-xs font-mono">
        <span className="text-text-muted">Detected: {conflict.start.split('T')[1].slice(0,5)}</span>
        <button className="text-text-primary hover:underline font-bold uppercase tracking-wider">Dismiss Alert</button>
      </div>
    </Card>
  );
};
