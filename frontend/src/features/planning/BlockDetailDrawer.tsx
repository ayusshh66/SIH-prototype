import React from 'react';
import { Drawer } from '../../components/common/Drawer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DepartmentBadge } from '../../components/domain/DepartmentBadge';
import { Card } from '../../components/common/Card';
import { ShieldCheck, Truck, Clock, MapPin, CheckCircle, XCircle, KeyRound } from 'lucide-react';
import {
  PTW_HANDSHAKE_STATES,
  canAdvanceTo,
  generatePrivateNumber,
  getInitialHandshakeState,
  getNextState,
  getPrivateNumberForState,
  getStateDisplayName,
  isTrdWork,
} from './blockHandshake';
import { getBlockJpoStatus } from './jpoPlanning';

export const BlockDetailDrawer: React.FC<{
  block: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ block, isOpen, onClose }) => {
  if (!block) return null;

  const isTRD = isTrdWork(block);
  const [handshakeState, setHandshakeState] = React.useState(() => getInitialHandshakeState(block));
  const [privateNumber, setPrivateNumber] = React.useState(() => getPrivateNumberForState(block, getInitialHandshakeState(block)));

  React.useEffect(() => {
    const nextState = getInitialHandshakeState(block);
    setHandshakeState(nextState);
    setPrivateNumber(getPrivateNumberForState(block, nextState));
  }, [block]);

  const currentIndex = PTW_HANDSHAKE_STATES.indexOf(handshakeState);
  const nextState = getNextState(handshakeState, block);
  const jpoStatus = getBlockJpoStatus(block);
  const isJpoViolation = jpoStatus === 'JPO_VIOLATION';

  const handleAdvance = () => {
    const targetState = nextState;
    if (!targetState) return;
    if (!canAdvanceTo(handshakeState, targetState, block)) return;
    setHandshakeState(targetState);
    const generatedPrivateNumber = getPrivateNumberForState(block, targetState);
    if (generatedPrivateNumber) {
      setPrivateNumber(generatedPrivateNumber);
    }
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={`Block: ${block.blockCode}`}
      subtitle={`CORRIDOR: NDLS-AGC // KM ${block.locationStartKm}–${block.locationEndKm}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <Button variant="danger" size="sm" icon={<XCircle size={14} />}>
            Reject / Revoke
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<CheckCircle size={14} />}
              onClick={handleAdvance}
              disabled={!nextState}
            >
              {nextState ? 'Advance Handshake' : 'Handshake Complete'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Badges strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            tone={block.status === 'APPROVED' ? 'status-feasible' : 'status-partial'}
            showDot
          >
            {block.status}
          </Badge>
          {block.departments?.map((d: any) => (
            <DepartmentBadge key={d} department={d} />
          ))}
          {block.isShadowBlock && (
            <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-safety-restricted text-white uppercase">
              SHADOW COMBO
            </span>
          )}
          <span
            className={`text-micro font-mono px-2 py-0.5 rounded-sm uppercase ${
              isJpoViolation ? 'bg-crit-p1 text-white' : 'bg-status-feasible text-white'
            }`}
          >
            {jpoStatus}
          </span>
        </div>

        <div className="p-3.5 bg-surface-sunken border border-border-hairline rounded-sm space-y-3">
          <div className="flex items-center gap-2 text-accent-400 text-micro font-mono font-semibold uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Digital PTW / Safety Handshake</span>
          </div>

          <div className="space-y-2">
            {PTW_HANDSHAKE_STATES.map((state, index) => {
              const isCompleted = index < currentIndex;
              const isCurrent = state === handshakeState;
              const isScadaState = state === 'SCADA_DE_ENERGIZATION_VERIFIED';

              return (
                <div
                  key={state}
                  className={[
                    'flex items-center gap-3 rounded-sm border px-2 py-2 font-mono text-small',
                    isCompleted ? 'border-status-feasible bg-status-feasible-bg text-content-primary' : '',
                    isCurrent ? 'border-accent-500 bg-accent-50 text-content-primary' : 'border-border-hairline bg-surface text-content-secondary',
                  ].join(' ')}
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border text-micro font-semibold">
                    {index + 1}
                  </span>
                  <span className="flex-1">
                    {getStateDisplayName(state, block)}
                    {isScadaState && !isTRD && <span className="ml-2 text-content-tertiary">(NOT REQUIRED)</span>}
                  </span>
                  {isCompleted && <CheckCircle size={14} className="text-status-feasible" />}
                  {isCurrent && <span className="text-accent-500 text-micro uppercase">current</span>}
                </div>
              );
            })}
          </div>

          {privateNumber && (
            <div className="flex items-center justify-between rounded-sm border border-status-feasible/30 bg-status-feasible-bg px-3 py-2 font-mono text-small">
              <div className="flex items-center gap-2 text-content-primary">
                <KeyRound size={14} />
                <span>Private Number</span>
              </div>
              <span className="font-semibold text-status-feasible">{privateNumber}</span>
            </div>
          )}

          {isTRD && (
            <div className="text-micro font-mono text-content-secondary">
              Simulated SCADA de-energization verification required before Permit to Work.
            </div>
          )}
        </div>

        {/* Spatial & Temporal Metrics */}
        <div className="grid grid-cols-2 gap-3 font-mono">
          <div className="p-3 bg-surface border border-border-hairline rounded-sm">
            <span className="text-micro text-content-tertiary block flex items-center gap-1 uppercase">
              <MapPin size={11} /> Track Limits
            </span>
            <span className="text-body font-semibold text-content-primary">
              Km {block.locationStartKm} → {block.locationEndKm}
            </span>
          </div>

          <div className="p-3 bg-surface border border-border-hairline rounded-sm">
            <span className="text-micro text-content-tertiary block flex items-center gap-1 uppercase">
              <Clock size={11} /> Duration
            </span>
            <span className="text-body font-semibold text-content-primary">
              {block.durationMinutes} mins
            </span>
          </div>
        </div>

        {/* Shadow savings highlight */}
        {block.savedMinutes > 0 && (
          <div className="p-3 bg-status-feasible-bg border border-status-feasible/30 rounded-sm flex items-center justify-between font-mono">
            <span className="text-small text-content-primary">
              Shadow Consolidation Saving
            </span>
            <span className="text-body font-semibold text-status-feasible tabular-nums">
              +{block.savedMinutes} mins corridor relief
            </span>
          </div>
        )}

        {/* Scheduled Tasks in Block */}
        <div>
          <h4 className="text-micro font-mono uppercase tracking-wider text-content-tertiary mb-2 pb-1 border-b border-border-hairline">
            Integrated Work Orders ({block.blockTasks?.length || 0})
          </h4>
          <div className="space-y-2">
            {block.blockTasks?.map((bt: any) => (
              <div
                key={bt.id}
                className="p-3 bg-surface border border-border-hairline rounded-sm flex items-center justify-between font-mono"
              >
                <div className="flex flex-col">
                  <span className="text-small font-semibold text-content-primary">
                    {bt.maintenanceTaskId}
                  </span>
                  <span className="text-micro text-content-tertiary uppercase">
                    {bt.status}
                  </span>
                </div>
                <DepartmentBadge department={bt.departmentId} />
              </div>
            ))}
          </div>
        </div>

        {/* Allocated Resources */}
        <div>
          <h4 className="text-micro font-mono uppercase tracking-wider text-content-tertiary mb-2 pb-1 border-b border-border-hairline flex items-center gap-1.5">
            <Truck size={13} />
            <span>Assigned Heavy Machinery & Gangs</span>
          </h4>
          <div className="space-y-1.5 font-mono text-small">
            <div className="p-2 bg-surface-sunken border border-border-hairline rounded-sm flex justify-between">
              <span className="text-content-secondary">USFD Ultrasonic Buggy #12</span>
              <span className="text-status-feasible text-micro">ALLOCATED</span>
            </div>
            <div className="p-2 bg-surface-sunken border border-border-hairline rounded-sm flex justify-between">
              <span className="text-content-secondary">OHE 4-Wheeler Tower Wagon TW-04</span>
              <span className="text-status-feasible text-micro">ISOLATION CONFIRMED</span>
            </div>
          </div>
        </div>

        {/* Deterministic Explanation */}
        <div className="p-3.5 bg-surface-sunken border-l-4 border-l-accent-500 border border-border-hairline rounded-sm space-y-1">
          <div className="flex items-center gap-1.5 text-accent-400 text-micro font-mono font-semibold uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>AI Solved Window Feasibility</span>
          </div>
          <p className="text-small text-content-secondary font-mono leading-relaxed">
            Consolidated simultaneously with P-Way track tamping to avoid separate train holds. Verified zero conflict with 12002 Shatabdi.
          </p>
        </div>
      </div>
    </Drawer>
  );
};

export default BlockDetailDrawer;
