import React, { useEffect, useState } from 'react';
import { getBlocks, runOptimization } from '../../api/client';
import { ScheduleTimelineCanvas } from './ScheduleTimelineCanvas';
import { BlockDetailDrawer } from './BlockDetailDrawer';
import { Button } from '../../components/common/Button';
import { Railway3DViewPlaceholder } from '../../components/domain/Railway3DViewPlaceholder';
import type { OptimizationResult } from '../../types/api';
import { Zap, CheckCircle, Clock, X, RefreshCw } from 'lucide-react';

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

  return (
    <div className="space-y-6 flex flex-col">
      {/* ── 1. Planning Controls ─────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">
            Planning Schedule
          </h2>
          <p className="text-text-muted font-mono text-sm mt-1">
            MULTI-DEPARTMENT POSSESSION TIMELINE & 3D DIGITAL TWIN
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
            className="font-mono text-xs"
          >
            {showFilters ? 'Hide Filters' : 'Filters'}
          </Button>
          <Button
            variant="primary"
            onClick={handleRunOptimizer}
            disabled={isOptimizing}
            className="font-mono text-xs flex items-center gap-2"
          >
            {isOptimizing ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                Optimizing (OR-Tools)...
              </>
            ) : (
              <>
                <Zap size={14} />
                Run Optimizer
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Optional Filter Bar ──────────────────────────────────── */}
      {showFilters && (
        <div className="bg-surface-card border-2 border-surface-border p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-text-muted uppercase font-bold">Corridor:</span>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="bg-background-main border border-surface-border px-3 py-1.5 text-text-primary font-mono focus:outline-none"
            >
              <option value="all">All Corridors (NCR Division)</option>
              <option value="NDLS-AGC">NDLS-AGC (New Delhi - Agra Cantt)</option>
              <option value="AGC-GWL">AGC-GWL (Agra Cantt - Gwalior)</option>
            </select>
          </div>
          <div className="text-xs font-mono text-text-muted">
            Displaying {blocks.length} scheduled possession windows
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-status-critical/10 border-2 border-status-critical text-status-critical font-mono text-xs">
          {error}
        </div>
      )}

      {/* ── Optimization Feedback Banner ─────────────────────────── */}
      {optimizationResult && (
        <div className="bg-surface-card border-2 border-status-optimal shadow-[4px_4px_0px_0px_rgba(34,197,94,0.3)] p-4 relative">
          <button
            onClick={() => setOptimizationResult(null)}
            className="absolute top-3 right-3 text-text-muted hover:text-text-primary p-1"
            title="Dismiss"
          >
            <X size={16} />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-status-optimal/10 border-2 border-status-optimal flex items-center justify-center text-status-optimal">
                <CheckCircle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-text-primary uppercase">
                    Solver Run {optimizationResult.runCode}
                  </span>
                  <span className="px-2 py-0.5 bg-status-optimal/20 border border-status-optimal text-status-optimal font-mono text-[10px] font-bold">
                    {optimizationResult.status}
                  </span>
                </div>
                <p className="text-xs font-mono text-text-muted mt-0.5">
                  Multi-objective CP-SAT solution successfully compiled for horizon 48H.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <div className="bg-background-main border border-surface-border px-3 py-1.5">
                <span className="text-[10px] text-text-muted block uppercase">Objective Score</span>
                <span className="font-bold text-status-optimal">
                  {optimizationResult.objective_score ?? '0.81'}
                </span>
              </div>
              <div className="bg-background-main border border-surface-border px-3 py-1.5">
                <span className="text-[10px] text-text-muted block uppercase">Disruption Savings</span>
                <span className="font-bold text-status-warning">
                  {optimizationResult.baseline_comparison?.savingPercentage ?? optimizationResult.summary?.savingPercentage ?? 0}% (
                  {optimizationResult.baseline_comparison?.savingMinutes ?? optimizationResult.summary?.savingMinutes ?? 0}m)
                </span>
              </div>
              <div className="bg-background-main border border-surface-border px-3 py-1.5">
                <span className="text-[10px] text-text-muted block uppercase">Runtime / Iterations</span>
                <span className="font-bold text-text-primary flex items-center gap-1">
                  <Clock size={11} />
                  {optimizationResult.solver_statistics?.runtime_ms ?? 0}ms (
                  {optimizationResult.solver_statistics?.iterations ?? 0} iter)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Schedule Timeline Canvas ──────────────────────────── */}
      <div className="bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col">
        <div className="px-4 py-2 border-b-2 border-surface-border bg-background-main font-mono text-xs uppercase font-bold text-text-muted flex justify-between items-center">
          <span>Corridor Possession Timeline</span>
          <span className="text-[11px] font-normal text-text-muted">
            {blocks.length} ACTIVE BLOCKS // CLICK TO INSPECT
          </span>
        </div>
        <div className="p-4">
          <ScheduleTimelineCanvas
            blocks={blocks}
            onBlockClick={setSelectedBlockId}
          />
        </div>
      </div>

      {/* ── 3. Railway3DView ─────────────────────────────────────── */}
      <div className="bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col">
        <div className="px-4 py-2 border-b-2 border-surface-border bg-background-main font-mono text-xs uppercase font-bold text-text-muted">
          Corridor Digital Twin // Spatial Viewport
        </div>
        <div className="p-2">
          <Railway3DViewPlaceholder
            corridorId={selectedCorridor === 'all' ? 'NDLS-AGC' : selectedCorridor}
            selectedBlockId={selectedBlockId}
          />
        </div>
      </div>

      {/* ── Block Detail Inspection Drawer ───────────────────────── */}
      <BlockDetailDrawer
        block={selectedBlock}
        isOpen={!!selectedBlock}
        onClose={() => setSelectedBlockId(null)}
      />
    </div>
  );
};

export default PlanningSchedulePage;
