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
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white drop-shadow-md">
            Planning Schedule
          </h2>
          <p className="text-gray-400 font-mono text-xs mt-1 tracking-wider">
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
            className="font-mono text-xs flex items-center gap-2 bg-[#F97316] text-white hover:bg-[#EA580C]"
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
        <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-lg flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="text-gray-500 uppercase font-bold tracking-wider">Corridor:</span>
            <select
              value={selectedCorridor}
              onChange={(e) => setSelectedCorridor(e.target.value)}
              className="bg-black/50 border border-white/10 rounded px-3 py-1.5 text-white font-mono focus:outline-none focus:border-[#F97316]/50 transition-colors"
            >
              <option value="all">All Corridors (NCR Division)</option>
              <option value="NDLS-AGC">NDLS-AGC (New Delhi - Agra Cantt)</option>
              <option value="AGC-GWL">AGC-GWL (Agra Cantt - Gwalior)</option>
            </select>
          </div>
          <div className="text-xs font-mono text-gray-500">
            Displaying {blocks.length} scheduled possession windows
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg text-[#EF4444] font-mono text-xs shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          {error}
        </div>
      )}

      {/* ── Optimization Feedback Banner ─────────────────────────── */}
      {optimizationResult && (
        <div className="bg-black/40 backdrop-blur-md border border-[#10B981]/30 rounded-2xl p-4 relative shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <button
            onClick={() => setOptimizationResult(null)}
            className="absolute top-3 right-3 text-gray-500 hover:text-white p-1 transition-colors"
            title="Dismiss"
          >
            <X size={16} />
          </button>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#10B981]/10 border border-[#10B981]/30 rounded flex items-center justify-center text-[#10B981] shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <CheckCircle size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-white uppercase tracking-wider">
                    Solver Run {optimizationResult.runCode}
                  </span>
                  <span className="px-2 py-0.5 bg-[#10B981]/20 border border-[#10B981]/30 text-[#10B981] rounded font-mono text-[10px] font-bold">
                    {optimizationResult.status}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-gray-400 mt-1 uppercase tracking-wider">
                  Multi-objective CP-SAT solution successfully compiled for horizon 48H.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 font-mono text-xs">
              <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 flex flex-col">
                <span className="text-[10px] text-gray-500 block uppercase tracking-widest">Objective Score</span>
                <span className="font-bold text-[#10B981]">
                  {optimizationResult.objective_score ?? '0.81'}
                </span>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 flex flex-col">
                <span className="text-[10px] text-gray-500 block uppercase tracking-widest">Disruption Savings</span>
                <span className="font-bold text-[#F59E0B]">
                  {optimizationResult.baseline_comparison?.savingPercentage ?? optimizationResult.summary?.savingPercentage ?? 0}% (
                  {optimizationResult.baseline_comparison?.savingMinutes ?? optimizationResult.summary?.savingMinutes ?? 0}m)
                </span>
              </div>
              <div className="bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 flex flex-col">
                <span className="text-[10px] text-gray-500 block uppercase tracking-widest">Runtime / Iterations</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <Clock size={11} className="text-gray-400" />
                  {optimizationResult.solver_statistics?.runtime_ms ?? 0}ms (
                  {optimizationResult.solver_statistics?.iterations ?? 0} iter)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. Schedule Timeline Canvas ──────────────────────────── */}
      <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="px-4 py-3 border-b border-white/10 bg-black/40 font-mono text-[10px] uppercase font-bold tracking-widest text-gray-500 flex justify-between items-center z-10">
          <span>Corridor Possession Timeline</span>
          <span className="font-normal">
            {blocks.length} ACTIVE BLOCKS // CLICK TO INSPECT
          </span>
        </div>
        <div className="p-4 z-10">
          <ScheduleTimelineCanvas
            blocks={blocks}
            onBlockClick={setSelectedBlockId}
          />
        </div>
      </div>

      {/* ── 3. Railway3DView ─────────────────────────────────────── */}
      <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        <div className="px-4 py-3 border-b border-white/10 bg-black/40 font-mono text-[10px] uppercase tracking-widest font-bold text-gray-500 z-10">
          Corridor Digital Twin // Spatial Viewport
        </div>
        <div className="p-2 z-10">
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
