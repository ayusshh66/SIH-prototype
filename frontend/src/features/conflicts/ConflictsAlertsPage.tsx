import React, { useEffect, useState } from 'react';
import { ErrorState } from '../../components/common/ErrorState';
import { getConflicts } from '../../api/client';
import { Conflict } from '../../types/api';
import { ConflictAlertCard } from './ConflictAlertCard';
import { ConflictCategoryTabs } from './ConflictCategoryTabs';

export const ConflictsAlertsPage: React.FC = () => {
  const [filter, setFilter] = useState<string>('ALL');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConflicts()
      .then((res) => setConflicts(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  const filteredConflicts = conflicts.filter((c) => filter === 'ALL' || c.conflict_type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white drop-shadow-md">Conflicts & Alerts</h2>
          <p className="text-gray-400 font-mono text-xs mt-1 tracking-wider">UNIFIED OPERATIONAL VIOLATIONS</p>
        </div>
      </div>

      <ConflictCategoryTabs activeTab={filter} onTabChange={setFilter} />

      {error && <ErrorState title="Conflict Feed Failed" message={error} />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredConflicts.map((conflict) => (
          <ConflictAlertCard key={conflict.conflict_id} conflict={conflict} />
        ))}
        {!error && filteredConflicts.length === 0 && (
          <div className="col-span-full p-8 border border-white/10 rounded-2xl text-center font-mono text-[#10B981] bg-black/20 backdrop-blur-md shadow-xl flex items-center justify-center">
            <span className="bg-[#10B981]/10 px-4 py-2 rounded border border-[#10B981]/30 tracking-widest uppercase text-xs shadow-[0_0_10px_rgba(16,185,129,0.2)]">
              CLEAR SECTION: ZERO ACTIVE CONFLICTS RETURNED BY BACKEND AI DATA.
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
