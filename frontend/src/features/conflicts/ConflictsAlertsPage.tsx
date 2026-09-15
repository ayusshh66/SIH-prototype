import React, { useEffect, useState, useMemo } from 'react';
import { getConflicts } from '../../api/client';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { ConflictCategoryTabs } from './ConflictCategoryTabs';
import { ConflictAlertCard } from './ConflictAlertCard';
import { ErrorState } from '../../components/common/ErrorState';
import { EmptyState } from '../../components/common/EmptyState';
import { Skeleton } from '../../components/common/Skeleton';
import { ShieldCheck } from 'lucide-react';
import type { Conflict } from '../../types/api';

export const ConflictsAlertsPage: React.FC = () => {
  const [filter, setFilter] = useState<string>('ALL');
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getConflicts()
      .then((res) => setConflicts(res.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: conflicts.length };
    conflicts.forEach((item) => {
      c[item.conflict_type] = (c[item.conflict_type] || 0) + 1;
    });
    return c;
  }, [conflicts]);

  const filteredConflicts = conflicts.filter(
    (c) => filter === 'ALL' || c.conflict_type === filter
  );

  const criticalCount = conflicts.filter((c) => c.severity === 'CRITICAL').length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Operational Conflicts & Safety Alerts"
        description="Review scheduling conflicts and understand what is preventing tasks from being planned."
        badge={
          criticalCount > 0 ? (
            <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-crit-p1-bg border border-crit-p1/30 text-crit-p1 font-semibold animate-pulse">
              {criticalCount} CRITICAL CONFLICTS
            </span>
          ) : (
            <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-status-feasible-bg border border-status-feasible/30 text-status-feasible">
              CORRIDOR FEASIBLE
            </span>
          )
        }
      />

      <ConflictCategoryTabs
        activeTab={filter}
        onTabChange={setFilter}
        counts={counts}
      />

      {error && <ErrorState title="Conflict Feed Failed" message={error} />}

      {loading ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height={200} />
          ))}
        </div>
      ) : filteredConflicts.length === 0 && !error ? (
        <EmptyState
          icon={<ShieldCheck size={40} className="text-status-feasible" />}
          title="Zero Conflicts in Category"
          description="All track possessions in this category comply with safety separation rules and timetable headway."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredConflicts.map((conflict) => (
            <ConflictAlertCard key={conflict.conflict_id} conflict={conflict} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ConflictsAlertsPage;
