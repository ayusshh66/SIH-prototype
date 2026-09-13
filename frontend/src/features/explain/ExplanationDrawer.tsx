import React from 'react';
import { Drawer } from '../../components/common/Drawer';
import { Explanation } from '../../types/api';
import { Badge } from '../../components/common/Badge';

interface Props {
  explanation: Explanation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ExplanationDrawer: React.FC<Props> = ({ explanation, isOpen, onClose }) => {
  if (!explanation) return <Drawer isOpen={isOpen} onClose={onClose} title="Explanation Trace"><></></Drawer>;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Trace: ${explanation.entity_id}`}>
      <div className="space-y-6">
        
        <div className="flex items-center justify-between mb-2">
           <Badge variant="default">{explanation.entity_type}</Badge>
           <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest">
             PROVENANCE: {explanation.generated_by}
           </span>
        </div>

        <div className="bg-surface-card border-l-4 border-text-primary p-4 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
           <p className="font-mono text-sm leading-relaxed text-text-primary">
             {explanation.summary}
           </p>
        </div>

        <div>
          <h3 className="font-mono font-bold text-[10px] text-text-muted uppercase tracking-widest mb-3 border-b-2 border-surface-border pb-2">Reason Codes</h3>
          <div className="flex flex-wrap gap-2">
            {explanation.reason_codes.map(code => (
              <span key={code} className="bg-background-main border-2 border-surface-border px-2 py-1 font-mono text-xs text-status-optimal shadow-[2px_2px_0px_0px_rgba(16,185,129,0.2)]">
                 {code}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-mono font-bold text-[10px] text-text-muted uppercase tracking-widest mb-3 border-b-2 border-surface-border pb-2">Quantitative Evidence</h3>
          <div className="bg-background-main border-2 border-surface-border overflow-x-auto p-4 custom-scrollbar">
             <pre className="font-mono text-xs text-text-primary">
               {JSON.stringify(explanation.evidence, null, 2)}
             </pre>
          </div>
        </div>

        <div>
          <h3 className="font-mono font-bold text-[10px] text-text-muted uppercase tracking-widest mb-3 border-b-2 border-surface-border pb-2">Deterministic Inputs</h3>
          <div className="bg-background-main border-2 border-surface-border overflow-x-auto p-4 custom-scrollbar">
             <pre className="font-mono text-xs text-text-primary">
               {JSON.stringify(explanation.deterministic_inputs, null, 2)}
             </pre>
          </div>
        </div>

      </div>
    </Drawer>
  );
};
