import React, { useEffect, useState } from 'react';
import { getShadowBlocks } from '../../api/client';
import { ShadowBlockCard } from './ShadowBlockCard';
import { ShadowBlockCandidate } from '../../types/api';

export const ShadowBlocksPage: React.FC = () => {
  const [candidates, setCandidates] = useState<ShadowBlockCandidate[]>([]);

  useEffect(() => {
    getShadowBlocks().then(res => {
      if (res.success) setCandidates(res.data);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">Shadow Blocks</h2>
          <p className="text-text-muted font-mono text-sm mt-1">INTEGRATED MULTI-DEPARTMENT POSSESSIONS</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {candidates.map(candidate => (
           <ShadowBlockCard key={candidate.shadow_block_id} candidate={candidate} />
        ))}
        {/* Mocking a rejected one for visual parity if only one exists in mock data */}
        <ShadowBlockCard candidate={{
          shadow_block_id: "SB-NDLS-302",
          primary_task_id: "TSK-ENG-NDLS-088",
          participating_task_ids: ["TSK-SNT-NDLS-089"],
          sections: ["sec_14_agc"],
          departments: ["ENG", "SNT"],
          proposed_window_start: "2026-11-04T02:00:00Z",
          proposed_window_end: "2026-11-04T04:30:00Z",
          estimated_duration_minutes: 150,
          estimated_corridor_occupancy: 0.55,
          potential_time_saving_minutes: 60,
          resource_usage: { track_machine: 1 },
          conflict_status: "REJECTED",
          shadow_benefit_score: 0.20,
          reasons: ["SAFETY_CONFLICT: Concurrent point motor overhaul and track tamping violates IR-SIG-402 interlocking safety rules."]
        }} />
      </div>
    </div>
  );
};
