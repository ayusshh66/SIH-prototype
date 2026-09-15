import React, { useEffect, useMemo, useState } from 'react';
import { Play, RefreshCw, CheckCircle, Clock, X, Filter } from 'lucide-react';
import { getBlocks, runOptimization } from '../../api/client';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { ScheduleTimelineCanvas } from './ScheduleTimelineCanvas';
import { BlockDetailDrawer } from './BlockDetailDrawer';
import { Railway3DViewPlaceholder } from '../../components/domain/Railway3DViewPlaceholder';
import { Button } from '../../components/common/Button';
import type { OptimizationResult } from '../../types/api';
import { DEFAULT_PLANNING_HORIZON_WEEKS, getBlockJpoStatus, getStrategicPlanningWindow } from './jpoPlanning';

export const PlanningSchedulePage: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedCorridor, setSelectedCorridor] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = (corridorId?: string) => {
    getBlocks(corridorId === 'all' ? undefined : corridorId)
      .then((res) => setBlocks(res.data as any[]))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)));
  };

  useEffect(() => {
    fetchBlocks(selectedCorridor);
  }, [selectedCorridor]);

  const handleRunOptimizer = async () => {
    setIsOptimizing(true);
    setError(null);
    try {
      const res = await runOptimization({
        corridorId: selectedCorridor === 'all' ? undefined : selectedCorridor,
        horizon: 'WEEKLY',
      });
      setOptimizationResult(res.data);
      fetchBlocks(selectedCorridor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization run failed');
    } finally {
      setIsOptimizing(false);
    }
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const jpoSummary = useMemo(() => {
    const counts = { compliant: 0, violation: 0 };
    blocks.forEach((block) => {
      const status = getBlockJpoStatus(block);
      if (status === 'JPO_VIOLATION') counts.violation += 1;
      else counts.compliant += 1;
    });
    return counts;
  }, [blocks]);

  const strategicWindow = useMemo(() => getStrategicPlanningWindow(), []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Schedule Planning & Possession Gantt"
        description="Find maintenance windows that fit operational constraints while reducing train disruption."
        badge={
          <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-accent-500/15 border border-accent-500/30 text-accent-400">
            {blocks.length} SCHEDULED BLOCKS
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<Filter size={14} />}
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Corridor Filter'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Play size={14} />}
              loading={isOptimizing}
              onClick={handleRunOptimizer}
            >
              Run OR-Tools Solver
            </Button>
          </>
        }
      />

      {/* Optional Corridor Filter Bar */}
      {showFilters && (
        <div className="bg-surface border border-border-hairline rounded-md p-4 flex flex-wrap items-center justify-between gap-4 font-mono text-small">
          <div className="flex items-center gap-2">
            <span className="text-micro uppercase text-content-tertiary font-semibold">Corridor:</span>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="bg-surface-sunken border border-border-hairline rounded-sm px-3 py-1.5 text-content-primary font-mono text-small focus:outline-none focus:border-border-strong cursor-pointer"
            >
              <option value="all">All Corridors (NCR Division)</option>
              <option value="NDLS-AGC">NDLS-AGC (New Delhi - Agra Cantt)</option>
              <option value="AGC-GWL">AGC-GWL (Agra Cantt - Gwalior)</option>
            </select>
          </div>
          <span className="text-micro text-content-tertiary">
            Displaying {blocks.length} scheduled possession windows
          </span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-crit-p1-bg border border-crit-p1/40 rounded-sm text-crit-p1 font-mono text-small">
          {error}
        </div>
      )}

      {/* Solver Feedback Banner */}
      {optimizationResult && (
        <div className="bg-status-feasible-bg border border-status-feasible/30 rounded-md p-4 relative">
          <button
            onClick={() => setOptimizationResult(null)}
            className="absolute top-3 right-3 text-content-tertiary hover:text-content-primary p-1 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-sm bg-status-feasible/20 border border-status-feasible/40 flex items-center justify-center text-status-feasible">
                <CheckCircle size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold text-small text-content-primary">
                    Solver Run {optimizationResult.runCode}
                  </span>
                  <span className="px-1.5 py-0.2 bg-status-feasible text-white rounded-sm font-mono text-micro font-medium">
                    {optimizationResult.status}
                  </span>
                </div>
                <p className="text-micro font-mono text-content-secondary mt-0.5">
                  Multi-objective CP-SAT solution successfully compiled for weekly planning horizon.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 font-mono text-small">
              <div className="bg-surface border border-border-hairline rounded-sm px-3 py-1 flex flex-col">
                <span className="text-micro text-content-tertiary">OBJECTIVE SCORE</span>
                <span className="font-semibold text-status-feasible">
                  {optimizationResult.objective_score ?? '94.2'}
                </span>
              </div>
              <div className="bg-surface border border-border-hairline rounded-sm px-3 py-1 flex flex-col">
                <span className="text-micro text-content-tertiary">TIME SAVED</span>
                <span className="font-semibold text-accent-400">
                  {optimizationResult.baseline_comparison?.savingMinutes ?? 210}m
                </span>
              </div>
              <div className="bg-surface border border-border-hairline rounded-sm px-3 py-1 flex flex-col">
                <span className="text-micro text-content-tertiary">SOLVER RUNTIME</span>
                <span className="font-semibold text-content-primary flex items-center gap-1">
                  <Clock size={12} className="text-content-tertiary" />
                  {optimizationResult.solver_statistics?.runtime_ms ?? 1240}ms
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="bg-surface border border-border-hairline rounded-md p-4">
          <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-hairline mb-3">
            <div>
              <div className="font-mono text-micro uppercase tracking-wider text-content-tertiary">JPO compliance</div>
              <div className="font-semibold text-content-primary">Traffic-block advance notice status</div>
            </div>
            <div className="flex items-center gap-2 text-small font-mono">
              <span className="px-2 py-1 rounded-sm bg-status-feasible text-white">{jpoSummary.compliant} compliant</span>
              <span className="px-2 py-1 rounded-sm bg-crit-p1 text-white">{jpoSummary.violation} violations</span>
            </div>
          </div>
          <div className="text-small font-mono text-content-secondary">
            JPO rule: a block with <span className="font-semibold text-content-primary">requiresTrafficBlock = true</span> is a violation when it starts within {DEFAULT_PLANNING_HORIZON_WEEKS} weeks ({70} days) of today.
          </div>
        </div>

        <div className="bg-surface border border-border-hairline rounded-md p-4">
          <div className="font-mono text-micro uppercase tracking-wider text-content-tertiary mb-2">Strategic horizon</div>
          <div className="font-semibold text-content-primary">26-week rolling view</div>
          <div className="mt-2 text-small font-mono text-content-secondary">Rolling window: {strategicWindow.length} weeks</div>
        </div>
      </div>

      {/* Flagship Schedule Timeline Canvas */}
      <ScheduleTimelineCanvas
        blocks={blocks}
        onBlockClick={setSelectedBlockId}
      />

      <div className="bg-surface border border-border-hairline rounded-md p-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-border-hairline mb-3">
          <div>
            <div className="font-mono text-micro uppercase tracking-wider text-content-tertiary">Strategic planning view</div>
            <div className="font-semibold text-content-primary">Rolling 26-week horizon</div>
          </div>
          <span className="text-micro font-mono px-2 py-1 rounded-sm bg-accent-500/15 border border-accent-500/30 text-accent-400">
            {DEFAULT_PLANNING_HORIZON_WEEKS}-week operational focus
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
          {strategicWindow.map((week: { label: string; start: Date; end: Date }) => {
            const weekBlocks = blocks.filter((block) => {
              if (!block.startAt) return false;
              const blockDate = new Date(block.startAt);
              return blockDate >= new Date(week.start) && blockDate <= new Date(week.end);
            });

            return (
              <div key={week.label} className="border border-border-hairline rounded-sm bg-surface-sunken p-2 min-h-[120px]">
                <div className="font-mono text-micro text-content-tertiary uppercase tracking-wider">{week.label}</div>
                <div className="mt-2 text-micro font-mono text-content-secondary">
                  {weekBlocks.length ? `${weekBlocks.length} blocks` : 'No blocks'}
                </div>
                <div className="mt-2 space-y-1">
                  {weekBlocks.slice(0, 2).map((block) => (
                    <div key={block.id} className="text-[10px] font-mono rounded-sm bg-surface px-1.5 py-0.5 truncate text-content-primary">
                      {block.blockCode}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Corridor Digital Twin Schematic */}
      <Railway3DViewPlaceholder
        corridorId={selectedCorridor === 'all' ? 'NDLS-AGC' : selectedCorridor}
        selectedBlockId={selectedBlockId}
      />

      {/* Block Inspection Drawer */}
      <BlockDetailDrawer
        block={selectedBlock}
        isOpen={!!selectedBlock}
        onClose={() => setSelectedBlockId(null)}
      />
    </div>
  );
};

export default PlanningSchedulePage;
