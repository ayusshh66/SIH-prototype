import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';

export const RecentRunsCard: React.FC<{ runs: any[] }> = ({ runs }) => {
  return (
    <Card title="Recent Optimization Run" className="h-full">
      {runs.length === 0 ? (
        <div className="text-sm text-text-muted font-mono">No runs recorded.</div>
      ) : (
        <div className="space-y-4 mt-2 h-full flex flex-col justify-center">
          {runs.map(run => (
            <div key={run.runId} className="flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <span className="font-bold font-mono text-lg">{run.runCode}</span>
                <Badge variant={run.status.toLowerCase() as any}>{run.status} ({run.solver_statistics.runtime_ms}ms)</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mt-2 border-t-2 border-surface-border pt-4">
                <div>
                  <span className="text-text-muted block font-mono text-xs mb-1">OBJECTIVE SCORE</span>
                  <span className="font-bold font-mono">{run.objective_score}</span>
                </div>
                <div>
                  <span className="text-text-muted block font-mono text-xs mb-1">TRAIN DELAY REDUCTION</span>
                  <span className="font-bold text-status-optimal font-mono">↓ {run.baseline_comparison.train_disruption_reduction_pct}%</span>
                </div>
                <div>
                  <span className="text-text-muted block font-mono text-xs mb-1">TIME SAVED</span>
                  <span className="font-bold font-mono text-status-shadow">{run.baseline_comparison.savingMinutes} mins</span>
                </div>
                <div>
                  <span className="text-text-muted block font-mono text-xs mb-1">RESOURCE UTILIZATION</span>
                  <span className="font-bold font-mono">{Math.round(run.resource_utilization.track_machine * 100)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};
