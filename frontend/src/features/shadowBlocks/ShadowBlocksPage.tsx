import React, { useEffect, useState } from 'react';
import { getShadowBlocks } from '../../api/client';
import { ShadowBlockCard } from './ShadowBlockCard';
import { ShadowBlockCandidate } from '../../types/api';
import { ErrorState } from '../../components/common/ErrorState';

export const ShadowBlocksPage: React.FC = () => {
  const [candidates, setCandidates] = useState<ShadowBlockCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShadowBlocks()
      .then(res => setCandidates(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">Shadow Blocks</h2>
          <p className="text-text-muted font-mono text-sm mt-1">INTEGRATED MULTI-DEPARTMENT POSSESSIONS</p>
        </div>
      </div>

      {error && <ErrorState title="Shadow Block Engine Failed" message={error} />}
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {candidates.map(candidate => (
           <ShadowBlockCard key={candidate.shadow_block_id} candidate={candidate} />
        ))}
        {!error && candidates.length === 0 && (
          <div className="col-span-full p-8 border-2 border-surface-border text-center font-mono text-text-muted bg-surface-card">
            NO SHADOW BLOCK CANDIDATES RETURNED BY AI ENGINE.
          </div>
        )}
      </div>
    </div>
  );
};
