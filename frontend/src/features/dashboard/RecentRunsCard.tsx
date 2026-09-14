import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const RecentRunsCard: React.FC<{ runs?: any[] }> = ({ runs = [] }) => {
  const safeRuns = Array.isArray(runs) ? runs : [];

  return (
    <Card title="Recent Optimization Run" className="h-full">
      {safeRuns.length === 0 ? (
        <div className="text-sm text-gray-500 font-mono">No runs recorded.</div>
      ) : (
        <div className="space-y-4 mt-2 h-full flex flex-col justify-center">
          {safeRuns.map((run) => {
            const status = run?.status ?? 'UNKNOWN';
            const runtimeMs = typeof run?.solver_statistics?.runtime_ms === 'number'
              ? `${run.solver_statistics.runtime_ms}ms`
              : 'N/A';
            const objectiveScore = run?.objective_score ?? run?.optimizationScore ?? 0;
            const baselineMinutes = Number(run?.baselineBlockMinutes ?? run?.baseline_comparison?.baselineMinutes ?? 0);
            const totalMinutes = Number(run?.totalBlockMinutes ?? run?.baseline_comparison?.optimizedMinutes ?? 0);
            const timeSavedMinutes = Number(run?.estimatedSavingsMinutes ?? run?.baseline_comparison?.savingMinutes ?? 0);
            const reductionPct = baselineMinutes > 0 ? Math.round(((baselineMinutes - totalMinutes) / baselineMinutes) * 100) : 0;
            const resourceUtilization = run?.resource_utilization ?? {};
            const resourceEntries = Object.values(resourceUtilization as Record<string, number>);
            const resourcePct = resourceEntries.length > 0
              ? Math.round((resourceEntries.reduce((sum, value) => sum + Number(value || 0), 0) / resourceEntries.length) * 100)
              : null;

            return (
              <div key={run?.runId ?? run?.id ?? run?.runCode ?? Math.random()} className="flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                  <span className="font-bold font-mono text-lg text-white">{run?.runCode ?? run?.id ?? 'RUN'}</span>
                  <Badge variant={String(status).toLowerCase() as any}>
                    {status} {runtimeMs !== 'N/A' ? `(${runtimeMs})` : ''}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm mt-2 border-t border-white/10 pt-4">
                  <div>
                    <span className="text-gray-500 block font-mono text-[10px] tracking-widest mb-1 uppercase">Objective Score</span>
                    <span className="font-bold font-mono text-white">{objectiveScore}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-mono text-[10px] tracking-widest mb-1 uppercase">Train Delay Reduction</span>
                    <span className="font-bold text-[#10B981] font-mono">
                      {run?.baseline_comparison?.train_disruption_reduction_pct != null || baselineMinutes > 0
                        ? `↓ ${run?.baseline_comparison?.train_disruption_reduction_pct ?? reductionPct}%`
                        : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-mono text-[10px] tracking-widest mb-1 uppercase">Time Saved</span>
                    <span className="font-bold font-mono text-[#8B5CF6]">
                      {timeSavedMinutes > 0 ? `${timeSavedMinutes} mins` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block font-mono text-[10px] tracking-widest mb-1 uppercase">Resource Utilization</span>
                    <span className="font-bold font-mono text-white">
                      {resourcePct == null ? '—' : `${resourcePct}%`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
