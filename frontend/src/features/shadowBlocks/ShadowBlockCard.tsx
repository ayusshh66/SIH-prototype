import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { DepartmentBadge } from '../../components/domain/DepartmentBadge';
import { ShieldAlert, CheckCircle2, Clock, Zap } from 'lucide-react';
import type { ShadowBlockCandidate } from '../../types/api';

export const ShadowBlockCard: React.FC<{ candidate: ShadowBlockCandidate }> = ({ candidate }) => {
  const isRejected = candidate.conflict_status === 'REJECTED';
  const isFeasible = (candidate.conflict_status as string) !== 'REJECTED' && (candidate.conflict_status as string) !== 'CONFLICT';

  return (
    <Card
      className={`flex flex-col h-full relative transition-colors ${
        isRejected ? 'border-crit-p1/40' : 'border-status-feasible/40'
      }`}
    >
      {/* Top Header Strip with Hazard Pattern if rejected */}
      {isRejected && (
        <div className="hazard-stripes h-2.5 w-full border-b border-crit-p1/30" />
      )}

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        {/* Title & Status */}
        <div className="flex justify-between items-start gap-2">
          <div>
            <span className="text-micro font-mono uppercase tracking-wider text-content-tertiary">
              {candidate.sections.join(' · ')}
            </span>
            <h3 className="text-h3 font-mono font-semibold text-content-primary">
              {candidate.shadow_block_id}
            </h3>
          </div>

          <Badge
            tone={isRejected ? 'crit-p1' : 'status-feasible'}
            showDot
          >
            {candidate.conflict_status}
          </Badge>
        </div>

        {/* Department chips */}
        <div className="flex flex-wrap gap-1.5">
          {candidate.departments.map((dept) => (
            <DepartmentBadge key={dept} department={dept} />
          ))}
        </div>

        {/* Metrics Row */}
        <div className="grid grid-cols-2 gap-3 py-3 border-y border-border-hairline font-mono">
          <div className="p-2.5 bg-surface-sunken rounded-sm">
            <span className="text-micro text-content-tertiary block uppercase">Benefit Score</span>
            <span className="text-h2 font-semibold text-content-primary tabular-nums">
              {candidate.shadow_benefit_score}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-sm ${
              isFeasible ? 'bg-status-feasible-bg text-status-feasible' : 'bg-surface-sunken text-content-tertiary'
            }`}
          >
            <span className="text-micro block uppercase flex items-center gap-1">
              <Clock size={11} /> Time Saved
            </span>
            <span className="text-h2 font-semibold tabular-nums">
              +{candidate.potential_time_saving_minutes}m
            </span>
          </div>
        </div>

        {/* Primary & Participating Work Orders */}
        <div className="space-y-2 font-mono text-small">
          <div>
            <span className="text-micro text-content-tertiary uppercase block mb-1">Anchor Possession:</span>
            <div className="p-2 bg-surface-sunken border border-border-hairline rounded-sm font-semibold text-content-primary">
              {candidate.primary_task_id}
            </div>
          </div>

          <div>
            <span className="text-micro text-content-tertiary uppercase block mb-1">
              Piggyback Tasks ({candidate.participating_task_ids.length}):
            </span>
            <div className="space-y-1">
              {candidate.participating_task_ids.map((id) => (
                <div
                  key={id}
                  className="p-1.5 pl-3 border-l-2 border-accent-500 bg-surface-sunken/40 rounded-r-sm text-micro text-content-secondary"
                >
                  ↳ {id}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rejected Safety Evidence Quote */}
        {isRejected && candidate.reasons && (
          <div className="p-3 bg-crit-p1-bg border border-crit-p1/30 rounded-sm font-mono text-micro space-y-1">
            <span className="text-crit-p1 font-semibold flex items-center gap-1 uppercase">
              <ShieldAlert size={12} /> Safety Incompatibility Evidence:
            </span>
            <p className="text-content-secondary leading-snug">
              "{candidate.reasons[0]}"
            </p>
          </div>
        )}

        {/* Action Footer */}
        <div className="pt-3 border-t border-border-hairline flex gap-2 mt-auto">
          {isFeasible && (
            <Button variant="primary" size="sm" className="flex-1" icon={<Zap size={13} />}>
              Approve Combo
            </Button>
          )}
          <Button variant="secondary" size="sm" className="flex-1">
            Audit Feasibility
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ShadowBlockCard;
