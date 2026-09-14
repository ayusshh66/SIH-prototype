import React from 'react';
import { Card } from '../../components/common/Card';
import { CheckCircle, AlertTriangle, Zap, RefreshCw, Layers } from 'lucide-react';
import type { WhatIfResult } from '../../api/client';

interface Props {
  result: WhatIfResult;
  onReset?: () => void;
}

export const ScheduleDiffViewer: React.FC<Props> = ({ result, onReset }) => {
  const isFeasible =
    result.new_schedule?.status === 'VALID' ||
    result.new_schedule?.status === 'FEASIBLE' ||
    result.optimization_result?.status === 'FEASIBLE' ||
    result.optimization_result?.status === 'OPTIMAL' ||
    result.optimization_result?.status === 'PARTIAL';

  const metrics = result.metric_differences;

  const solverStats = result.optimization_result?.solver_statistics;
  const changedBlocks = result.changed_blocks ?? [];
  const affectedTrains = result.affected_trains ?? [];
  const affectedTasks = result.affected_tasks ?? [];

  return (
    <Card className="h-full flex flex-col space-y-5">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono font-bold text-lg text-white uppercase tracking-wide">
              {result.new_schedule?.schedule_id ?? 'SIMULATED_REOPT_OUTPUT'}
            </h3>
            <span
              className={`px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border flex items-center gap-1.5 rounded ${
                isFeasible
                  ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
              }`}
            >
              {isFeasible ? (
                <>
                  <CheckCircle size={13} />
                  FEASIBLE RE-OPTIMIZATION
                </>
              ) : (
                <>
                  <AlertTriangle size={13} />
                  INFEASIBLE CONFLICT
                </>
              )}
            </span>
          </div>
          <p className="text-xs font-mono text-gray-500 mt-1 tracking-widest">
            BASE SCHEDULE: <span className="text-gray-300">{result.original_schedule_id}</span>
          </p>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 border border-white/10 rounded-lg bg-black/40 hover:bg-white/5 text-gray-400 hover:text-white font-mono text-[10px] uppercase font-bold flex items-center gap-1.5 transition-colors tracking-widest"
          >
            <RefreshCw size={13} />
            Reset Sandbox
          </button>
        )}
      </div>

      {/* ── KPI Delta Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Objective Delta */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 flex items-center justify-between relative z-10">
            <span>Objective Δ</span>
            <Zap size={12} className="text-[#F59E0B]" />
          </span>
          <span
            className={`font-bold text-xl font-mono relative z-10 ${
              metrics.objective_score >= 0 ? 'text-[#10B981]' : 'text-[#EF4444]'
            }`}
          >
            {metrics.objective_score >= 0 ? `+${metrics.objective_score.toFixed(3)}` : metrics.objective_score.toFixed(3)}
          </span>
          <span className="text-[10px] font-mono text-gray-500 mt-1 relative z-10">
            Score: {result.optimization_result?.objective_score ?? 0}
          </span>
        </div>

        {/* Train Disruption Delta */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-[#F59E0B]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 relative z-10">
            Train Disruption Δ
          </span>
          <span className="font-bold text-xl text-[#F59E0B] font-mono relative z-10">
            +{metrics.train_disruption_minutes}m
          </span>
          <span className="text-[10px] font-mono text-gray-500 mt-1 relative z-10">
            Passage delay absorbed
          </span>
        </div>

        {/* Resource Utilization Delta */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 relative z-10">
            Resource Util. Δ
          </span>
          <span className="font-bold text-xl text-white font-mono relative z-10">
            {metrics.resource_utilization_delta >= 0 ? `+` : ''}
            {(metrics.resource_utilization_delta * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] font-mono text-gray-500 mt-1 relative z-10">
            Efficiency shift
          </span>
        </div>

        {/* Solver Statistics */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3 flex flex-col relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
          <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest mb-1 relative z-10">
            Solver Statistics
          </span>
          <span className="font-bold text-xl text-white font-mono relative z-10">
            {solverStats ? `${solverStats.runtime_ms}ms` : '0ms'}
          </span>
          <span className="text-[10px] font-mono text-gray-500 mt-1 relative z-10">
            {solverStats ? `${solverStats.iterations ?? 0} iterations` : 'No solver stats returned'}
          </span>
        </div>
      </div>

      {/* ── Visual Schedule Shift Comparison ──────────────────── */}
      <div className="border border-white/10 rounded-xl bg-black/20 backdrop-blur-md flex flex-col overflow-hidden">
        <div className="p-3 border-b border-white/10 font-mono text-[10px] font-bold text-gray-400 bg-black/40 flex items-center justify-between tracking-widest">
          <span className="flex items-center gap-1.5">
            <Layers size={13} className="text-[#8B5CF6]" />
            POSSESSION WINDOW SHIFT TIMELINE
          </span>
          <span className="text-[10px] text-[#F59E0B]">BACKEND AI RESULT</span>
        </div>
        <div className="p-4 space-y-4">
          {(result.new_schedule?.blocks ?? []).map((block) => (
            <div key={block.block_id} className="space-y-1">
              <div className="flex justify-between text-[10px] font-mono text-gray-500 tracking-wider">
                <span>RE-OPTIMIZED BLOCK: <span className="text-gray-300">{block.block_id}</span></span>
                <span className="text-[#10B981] font-bold">
                  {new Date(block.start).toLocaleTimeString()} - {new Date(block.end).toLocaleTimeString()}
                </span>
              </div>
              <div className="h-9 bg-black/40 border border-white/10 rounded relative flex items-center px-3">
                <div className="h-6 bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 rounded flex items-center justify-between px-2 font-mono text-[10px] text-white shadow-[0_0_10px_rgba(139,92,246,0.3)]">
                  <span className="font-bold">{block.section_id}</span>
                  <span className="text-[9px] bg-[#8B5CF6] px-1 py-0.5 rounded ml-2 text-white">{result.new_schedule?.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Affected Entities Badges ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2 font-bold">
            Changed Blocks ({changedBlocks.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {changedBlocks.map((b) => (
              <span
                key={b}
                className="px-2 py-0.5 bg-black/50 border border-white/10 rounded font-mono text-[10px] text-white"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2 font-bold">
            Affected Trains ({affectedTrains.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {affectedTrains.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 bg-[#F59E0B]/10 border border-[#F59E0B]/40 rounded font-mono text-[10px] text-[#F59E0B] font-bold shadow-[0_0_8px_rgba(245,158,11,0.15)]"
              >
                Train {t}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-3">
          <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-2 font-bold">
            Protected Tasks ({affectedTasks.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {affectedTasks.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 bg-[#10B981]/10 border border-[#10B981]/40 rounded font-mono text-[10px] text-[#10B981] shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Explanation ────────────────────────────────────── */}
      <div className="p-4 bg-black/40 backdrop-blur-md border-l-2 border-[#8B5CF6] rounded-r-xl font-mono text-xs leading-relaxed text-white shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/[0.05] to-transparent pointer-events-none" />
        <div className="flex items-center gap-2 mb-2 relative z-10">
          <span className="font-bold block uppercase tracking-widest text-[#8B5CF6] text-[10px]">
            Multi-Objective Solver Explanation
          </span>
          <span className="text-[10px] text-gray-500">// OR-Tools Constraint Engine</span>
        </div>
        <p className="text-gray-300 font-mono relative z-10 text-[11px] leading-relaxed">
          {result.explanation}
        </p>
      </div>
    </Card>
  );
};
