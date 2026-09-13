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
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">Conflicts & Alerts</h2>
          <p className="text-text-muted font-mono text-sm mt-1">UNIFIED OPERATIONAL VIOLATIONS</p>
        </div>
      </div>

      <ConflictCategoryTabs activeTab={filter} onTabChange={setFilter} />

      {error && <ErrorState title="Conflict Feed Failed" message={error} />}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredConflicts.map((conflict) => (
          <ConflictAlertCard key={conflict.conflict_id} conflict={conflict} />
        ))}
        {!error && filteredConflicts.length === 0 && (
          <div className="col-span-full p-8 border-2 border-surface-border text-center font-mono text-status-optimal bg-surface-card">
            CLEAR SECTION: ZERO ACTIVE CONFLICTS RETURNED BY BACKEND AI DATA.
          </div>
        )}
      </div>
    </div>
  );
};
