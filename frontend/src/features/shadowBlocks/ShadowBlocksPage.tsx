import React, { useEffect, useState } from 'react';
import { getShadowBlocks } from '../../api/client';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { ShadowBlockCard } from './ShadowBlockCard';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import type { ShadowBlockCandidate } from '../../types/api';

export const ShadowBlocksPage: React.FC = () => {
  const [candidates, setCandidates] = useState<ShadowBlockCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShadowBlocks()
      .then((res) => setCandidates(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Shadow Block Optimization"
        description="AI-generated joint possession windows clustering Engineering, TRD, and S&T tasks under single track possessions to minimize train disruption."
        badge={
          <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-status-feasible-bg border border-status-feasible/30 text-status-feasible">
            {candidates.filter((c) => c.conflict_status !== 'REJECTED').length} FEASIBLE COMBOS
          </span>
        }
      />

      {error && <ErrorState title="Shadow Block Engine Failed" message={error} />}

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={320} />
          ))}
        </div>
      ) : candidates.length === 0 && !error ? (
        <EmptyState
          title="No Shadow Block Candidates"
          description="No overlapping tasks meet the safety buffer criteria for simultaneous shadow execution in this horizon."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {candidates.map((candidate) => (
            <ShadowBlockCard key={candidate.shadow_block_id} candidate={candidate} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShadowBlocksPage;
