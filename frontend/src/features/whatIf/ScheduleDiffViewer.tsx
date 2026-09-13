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
      <div className="flex flex-wrap justify-between items-center gap-3 pb-4 border-b-2 border-surface-border">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-mono font-bold text-lg text-text-primary uppercase tracking-wide">
              {result.new_schedule?.schedule_id ?? 'SIMULATED_REOPT_OUTPUT'}
            </h3>
            <span
              className={`px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider border-2 flex items-center gap-1.5 ${
                isFeasible
                  ? 'bg-status-optimal/10 text-status-optimal border-status-optimal'
                  : 'bg-status-critical/10 text-status-critical border-status-critical'
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
          <p className="text-xs font-mono text-text-muted mt-1">
            BASE SCHEDULE: {result.original_schedule_id}
          </p>
        </div>

        {onReset && (
          <button
            onClick={onReset}
            className="px-3 py-1.5 border-2 border-surface-border bg-background-main hover:bg-surface-card text-text-muted hover:text-text-primary font-mono text-xs uppercase font-bold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw size={13} />
            Reset Sandbox
          </button>
        )}
      </div>

      {/* ── KPI Delta Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Objective Delta */}
        <div className="bg-background-main border-2 border-surface-border p-3 flex flex-col">
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Objective Δ</span>
            <Zap size={12} className="text-status-warning" />
          </span>
          <span
            className={`font-bold text-xl font-mono ${
              metrics.objective_score >= 0 ? 'text-status-optimal' : 'text-status-critical'
            }`}
          >
            {metrics.objective_score >= 0 ? `+${metrics.objective_score.toFixed(3)}` : metrics.objective_score.toFixed(3)}
          </span>
          <span className="text-[10px] font-mono text-text-muted mt-1">
            Score: {result.optimization_result?.objective_score ?? 0}
          </span>
        </div>

        {/* Train Disruption Delta */}
        <div className="bg-background-main border-2 border-surface-border p-3 flex flex-col">
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">
            Train Disruption Δ
          </span>
          <span className="font-bold text-xl text-status-warning font-mono">
            +{metrics.train_disruption_minutes}m
          </span>
          <span className="text-[10px] font-mono text-text-muted mt-1">
            Passage delay absorbed
          </span>
        </div>

        {/* Resource Utilization Delta */}
        <div className="bg-background-main border-2 border-surface-border p-3 flex flex-col">
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">
            Resource Util. Δ
          </span>
          <span className="font-bold text-xl text-text-primary font-mono">
            {metrics.resource_utilization_delta >= 0 ? `+` : ''}
            {(metrics.resource_utilization_delta * 100).toFixed(0)}%
          </span>
          <span className="text-[10px] font-mono text-text-muted mt-1">
            Efficiency shift
          </span>
        </div>

        {/* Solver Statistics */}
        <div className="bg-background-main border-2 border-surface-border p-3 flex flex-col">
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-wider mb-1">
            Solver Statistics
          </span>
          <span className="font-bold text-xl text-text-primary font-mono">
            {solverStats ? `${solverStats.runtime_ms}ms` : '0ms'}
          </span>
          <span className="text-[10px] font-mono text-text-muted mt-1">
            {solverStats ? `${solverStats.iterations ?? 0} iterations` : 'No solver stats returned'}
          </span>
        </div>
      </div>

      {/* ── Visual Schedule Shift Comparison ──────────────────── */}
      <div className="border-2 border-surface-border bg-background-main flex flex-col">
        <div className="p-3 border-b-2 border-surface-border font-mono text-xs font-bold text-text-muted bg-surface-card flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Layers size={13} className="text-status-shadow" />
            POSSESSION WINDOW SHIFT TIMELINE
          </span>
          <span className="text-[11px] text-status-warning">BACKEND AI RESULT</span>
        </div>
        <div className="p-4 space-y-4">
          {(result.new_schedule?.blocks ?? []).map((block) => (
            <div key={block.block_id} className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-text-muted">
                <span>RE-OPTIMIZED BLOCK: {block.block_id}</span>
                <span className="text-status-optimal font-bold">
                  {new Date(block.start).toLocaleTimeString()} - {new Date(block.end).toLocaleTimeString()}
                </span>
              </div>
              <div className="h-9 bg-surface-card border-2 border-surface-border/80 relative flex items-center px-3">
                <div className="h-6 bg-status-shadow/20 border-2 border-status-shadow flex items-center justify-between px-2 font-mono text-[10px] text-white shadow-[2px_2px_0px_0px_rgba(139,92,246,0.6)]">
                  <span className="font-bold">{block.section_id}</span>
                  <span className="text-[9px] bg-status-shadow px-1 py-0.2">{result.new_schedule?.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Affected Entities Badges ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-background-main border-2 border-surface-border p-3">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2 font-bold">
            Changed Blocks ({changedBlocks.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {changedBlocks.map((b) => (
              <span
                key={b}
                className="px-2 py-0.5 bg-surface-card border border-surface-border font-mono text-xs text-text-primary"
              >
                {b}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-background-main border-2 border-surface-border p-3">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2 font-bold">
            Affected Trains ({affectedTrains.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {affectedTrains.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 bg-status-warning/10 border border-status-warning/40 font-mono text-xs text-status-warning font-bold"
              >
                Train {t}
              </span>
            ))}
          </div>
        </div>

        <div className="bg-background-main border-2 border-surface-border p-3">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest block mb-2 font-bold">
            Protected Tasks ({affectedTasks.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {affectedTasks.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 bg-status-optimal/10 border border-status-optimal/40 font-mono text-xs text-status-optimal"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── AI Explanation ────────────────────────────────────── */}
      <div className="p-4 bg-surface-card border-l-4 border-status-shadow font-mono text-xs leading-relaxed text-text-primary shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold block uppercase tracking-widest text-status-shadow text-xs">
            Multi-Objective Solver Explanation
          </span>
          <span className="text-[10px] text-text-muted">// OR-Tools Constraint Engine</span>
        </div>
        <p className="text-text-primary/90 font-mono">
          {result.explanation}
        </p>
      </div>
    </Card>
  );
};
