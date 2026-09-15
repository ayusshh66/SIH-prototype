import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { DepartmentBadge } from '../../components/domain/DepartmentBadge';
import { ShieldAlert, CheckCircle2, Clock, Zap, BarChart2, X } from 'lucide-react';
import type { ShadowBlockCandidate } from '../../types/api';
import { useTranslation } from 'react-i18next';

export const ShadowBlockCard: React.FC<{ candidate: ShadowBlockCandidate }> = ({ candidate }) => {
  const { t } = useTranslation();
  const isRejected = candidate.conflict_status === 'REJECTED';
  const isFeasible = !isRejected && (candidate.conflict_status as string) !== 'CONFLICT';

  const [approveState, setApproveState] = useState<'idle' | 'loading' | 'approved'>('idle');
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  const handleApprove = () => {
    setApproveState('loading');
    // Simulate API call with fallback — always succeeds for demo
    setTimeout(() => setApproveState('approved'), 900);
  };

  const handleAuditOpen = () => setIsAuditOpen(true);
  const handleAuditClose = () => setIsAuditOpen(false);

  return (
    <>
      <Card
        className={`flex flex-col h-full relative transition-colors ${
          isRejected ? 'border-crit-p1/40' : 'border-status-feasible/40'
        }`}
      >
        {/* Hazard stripe for rejected */}
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

            <Badge tone={isRejected ? 'crit-p1' : 'status-feasible'} showDot>
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
              <span className="text-micro text-content-tertiary block uppercase">{t('shadow.benefit_score')}</span>
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
                <Clock size={11} /> {t('shadow.time_saved')}
              </span>
              <span className="text-h2 font-semibold tabular-nums">
                +{candidate.potential_time_saving_minutes}m
              </span>
            </div>
          </div>

          {/* Anchor & Participating */}
          <div className="space-y-2 font-mono text-small">
            <div>
              <span className="text-micro text-content-tertiary uppercase block mb-1">{t('shadow.anchor_possession')}</span>
              <div className="p-2 bg-surface-sunken border border-border-hairline rounded-sm font-semibold text-content-primary">
                {candidate.primary_task_id}
              </div>
            </div>

            <div>
              <span className="text-micro text-content-tertiary uppercase block mb-1">
                {t('shadow.piggyback_tasks')} ({candidate.participating_task_ids.length}):
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

          {/* Rejected safety evidence */}
          {isRejected && candidate.reasons && (
            <div className="p-3 bg-crit-p1-bg border border-crit-p1/30 rounded-sm font-mono text-micro space-y-1">
              <span className="text-crit-p1 font-semibold flex items-center gap-1 uppercase">
                <ShieldAlert size={12} /> {t('shadow.safety_evidence')}
              </span>
              <p className="text-content-secondary leading-snug">
                "{candidate.reasons[0]}"
              </p>
            </div>
          )}

          {/* Approved success banner */}
          {approveState === 'approved' && (
            <div className="p-3 bg-status-feasible-bg border border-status-feasible/40 rounded-sm text-status-feasible font-mono text-small flex items-center gap-2">
              <CheckCircle2 size={14} />
              <div>
                <div className="font-semibold">{t('shadow.approved_title')}</div>
                <div className="text-micro opacity-80">
                  {t('shadow.approved_desc').replace('{{id}}', candidate.shadow_block_id)}
                </div>
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-3 border-t border-border-hairline flex gap-2 mt-auto">
            {isFeasible && approveState !== 'approved' && (
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                icon={approveState === 'loading' ? undefined : <Zap size={13} />}
                loading={approveState === 'loading'}
                onClick={handleApprove}
              >
                {approveState === 'loading' ? 'Approving...' : t('shadow.approve_combo')}
              </Button>
            )}
            {approveState === 'approved' && (
              <div className="flex-1 flex items-center justify-center gap-1.5 text-status-feasible text-small font-mono font-semibold">
                <CheckCircle2 size={14} /> Approved
              </div>
            )}
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              icon={<BarChart2 size={13} />}
              onClick={handleAuditOpen}
            >
              {t('shadow.audit_feasibility')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Audit Feasibility Modal */}
      <Modal
        isOpen={isAuditOpen}
        onClose={handleAuditClose}
        title={`${t('shadow.audit_title').replace('{{id}}', candidate.shadow_block_id)}`}
      >
        <div className="space-y-4 font-mono">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface-sunken rounded-sm border border-border-hairline">
              <span className="text-micro uppercase text-content-tertiary block">{t('shadow.audit_benefit')}</span>
              <span className="text-h2 font-semibold text-content-primary">{candidate.shadow_benefit_score}</span>
            </div>
            <div className="p-3 bg-status-feasible-bg rounded-sm border border-status-feasible/30">
              <span className="text-micro uppercase text-content-tertiary block">{t('shadow.audit_time_saved')}</span>
              <span className="text-h2 font-semibold text-status-feasible">+{candidate.potential_time_saving_minutes}m</span>
            </div>
            <div className="p-3 bg-surface-sunken rounded-sm border border-border-hairline">
              <span className="text-micro uppercase text-content-tertiary block">{t('shadow.audit_occupancy')}</span>
              <span className="text-h2 font-semibold text-content-primary">
                {(candidate.estimated_corridor_occupancy * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-3 bg-surface-sunken rounded-sm border border-border-hairline">
              <span className="text-micro uppercase text-content-tertiary block">{t('shadow.audit_departments')}</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {candidate.departments.map((d) => (
                  <span key={d} className="text-micro px-1.5 py-0.5 rounded-sm bg-surface border border-border-hairline text-content-secondary">{d}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Resource usage */}
          <div className="p-3 bg-surface-sunken border border-border-hairline rounded-sm space-y-1.5">
            <span className="text-micro uppercase text-content-tertiary font-semibold">Resource Allocation</span>
            {Object.entries(candidate.resource_usage).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-small">
                <span className="text-content-secondary capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-semibold text-content-primary tabular-nums">{v} unit(s)</span>
              </div>
            ))}
          </div>

          {/* Reasons / rationale */}
          {candidate.reasons && candidate.reasons.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-micro uppercase text-content-tertiary font-semibold block">
                {isRejected ? 'Rejection Reasons' : 'Compatibility Rationale'}
              </span>
              {candidate.reasons.map((reason, i) => (
                <div
                  key={i}
                  className={`p-2.5 rounded-sm text-small flex items-start gap-2 ${
                    isRejected
                      ? 'bg-crit-p1-bg border border-crit-p1/30 text-crit-p1'
                      : 'bg-status-feasible-bg border border-status-feasible/20 text-status-feasible'
                  }`}
                >
                  <span className="font-mono opacity-60 shrink-0">{i + 1}.</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          )}

          {/* Window */}
          <div className="p-3 bg-surface-sunken border border-border-hairline rounded-sm">
            <span className="text-micro uppercase text-content-tertiary block mb-1">Proposed Window</span>
            <span className="text-small text-content-primary">
              {new Date(candidate.proposed_window_start).toLocaleString('en-IN')}
              {' — '}
              {new Date(candidate.proposed_window_end).toLocaleString('en-IN')}
            </span>
            <span className="text-micro text-content-tertiary block mt-0.5">
              Duration: {candidate.estimated_duration_minutes} mins
            </span>
          </div>

          <div className="flex justify-end pt-2 border-t border-border-hairline">
            <Button variant="outline" size="sm" onClick={handleAuditClose}>
              {t('shadow.audit_close')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ShadowBlockCard;
