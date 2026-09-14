import React from 'react';
import { Drawer } from '../../components/common/Drawer';
import type { Explanation } from '../../types/api';

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
           <span className="px-2 py-1 text-[9px] font-bold uppercase border border-[#06B6D4]/30 bg-[#06B6D4]/10 text-[#06B6D4] rounded tracking-widest shadow-[0_0_8px_rgba(6,182,212,0.2)]">
             {explanation.entity_type}
           </span>
           <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
             PROVENANCE: <span className="text-gray-300">{explanation.generated_by}</span>
           </span>
        </div>

        <div className="bg-black/40 backdrop-blur-md rounded-r-xl border-l-2 border-[#8B5CF6] p-4 shadow-lg relative overflow-hidden">
           <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/[0.05] to-transparent pointer-events-none" />
           <p className="font-mono text-[11px] leading-relaxed text-gray-300 relative z-10">
             {explanation.summary}
           </p>
        </div>

        <div>
          <h3 className="font-mono font-bold text-[10px] text-gray-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Reason Codes</h3>
          <div className="flex flex-wrap gap-2">
            {explanation.reason_codes.map(code => (
              <span key={code} className="bg-black/50 border border-white/10 rounded px-2 py-1 font-mono text-[10px] text-[#10B981] font-bold tracking-widest shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                 {code}
              </span>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-mono font-bold text-[10px] text-gray-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Quantitative Evidence</h3>
          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-x-auto p-4 custom-scrollbar">
             <pre className="font-mono text-[11px] text-gray-300">
               {JSON.stringify(explanation.evidence, null, 2)}
             </pre>
          </div>
        </div>

        <div>
          <h3 className="font-mono font-bold text-[10px] text-gray-500 uppercase tracking-widest mb-3 border-b border-white/10 pb-2">Deterministic Inputs</h3>
          <div className="bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-x-auto p-4 custom-scrollbar">
             <pre className="font-mono text-[11px] text-gray-300">
               {JSON.stringify(explanation.deterministic_inputs, null, 2)}
             </pre>
          </div>
        </div>

      </div>
    </Drawer>
  );
};
