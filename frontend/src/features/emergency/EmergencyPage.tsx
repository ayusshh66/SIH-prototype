import React, { useState } from 'react';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';
import { submitEmergencyEvent, type EmergencyEventPayload } from '../../api/client';
import {
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  XCircle,
  Zap,
  MapPin,
  AlertOctagon,
} from 'lucide-react';

type EmergencyState = 'idle' | 'loading' | 'success' | 'error';

interface EmergencyResult {
  emergency_task: Record<string, unknown> | null;
  urgency: string;
  affected_section: string;
  feasible_windows: Array<{
    window_id: string;
    section_id: string;
    start: string;
    end: string;
    availability: string;
    impact_summary?: string;
  }>;
  resulting_schedule: {
    schedule_id: string;
    task_ids: string[];
    blocks: Array<{ block_id: string; start: string; end: string; durationMinutes?: number }>;
    estimated_disruption_minutes: number;
    status: string;
  } | null;
  optimization_result?: {
    status: string;
    selected_task_ids: string[];
    objective_score: number;
    solver_statistics: { runtime_ms: number; iterations?: number };
  };
  errors: string[];
  explanation: string;
}

const formatTimeWindow = (isoStart: string, isoEnd: string): string => {
  const start = new Date(isoStart);
  const end = new Date(isoEnd);
  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const diffMin = Math.round((end.getTime() - start.getTime()) / 60000);
  return `${fmt(start)} – ${fmt(end)} (${diffMin} Mins)`;
};

export const EmergencyPage: React.FC = () => {
  // Form state
  const [eventType, setEventType] = useState('NEW_USFD_DEFECT');
  const [sectionId, setSectionId] = useState('NDLS-AGC');
  const [severity, setSeverity] = useState('CRITICAL');
  const [kmLocation, setKmLocation] = useState('45.300');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [impactSummary, setImpactSummary] = useState('');

  // Result state
  const [state, setState] = useState<EmergencyState>('idle');
  const [result, setResult] = useState<EmergencyResult | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const handleSubmit = async () => {
    setState('loading');
    setResult(null);
    setSelectedWindowId(null);
    setErrorMsg('');

    const payload: EmergencyEventPayload = {
      event_id: `EMG-${Date.now().toString(36).toUpperCase()}`,
      event_type: eventType,
      section_id: sectionId,
      severity,
      detected_at: new Date().toISOString(),
      estimated_duration_minutes: durationMinutes,
      impact_summary: impactSummary || `Emergency ${eventType} at Km ${kmLocation}`,
      from_km: parseFloat(kmLocation),
      to_km: parseFloat(kmLocation) + 0.7,
    };

    try {
      const res = await submitEmergencyEvent(payload);
      if (res.success) {
        setResult(res.data);
        setState('success');
      } else {
        setErrorMsg('Emergency evaluation returned unsuccessful result');
        setState('error');
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected error');
      setState('error');
    }
  };

  const selectedWindow = result?.feasible_windows.find((w) => w.window_id === selectedWindowId);

  return (
    <div className="space-y-6">
      {/* Highest Alert Priority Emergency Banner */}
      <div className="p-4 rounded-md bg-crit-p1-bg border border-crit-p1/40 flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-sm bg-crit-p1 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <AlertOctagon size={20} />
          </div>
          <div>
            <h2 className="text-small font-mono font-bold text-crit-p1 uppercase tracking-wider">
              CRITICAL UNPLANNED POSSESSION DISPATCH // EXPEDITED WORKFLOW
            </h2>
            <p className="text-micro font-mono text-content-secondary mt-0.5">
              Safety-critical defects override scheduled timetables with automatic OR-Tools train headway re-optimization.
            </p>
          </div>
        </div>

        <span className="text-micro font-mono font-semibold px-2.5 py-1 rounded-sm bg-crit-p1 text-white uppercase shrink-0">
          PRIORITY 1 DISPATCH
        </span>
      </div>

      <SectionHeader
        title="Emergency Track Possession Engine"
        description="Immediate ultrasonic rail fracture repair, track buckle restoration, and traction OHE breakdown clearance."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Defect Intake Card */}
        <Card title="1. Emergency Defect Intake" eyebrow="Incident Parameters">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                Defect / Failure Category
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 text-small font-mono text-content-primary focus:outline-none focus:border-border-strong cursor-pointer"
              >
                <option value="NEW_USFD_DEFECT">NEW_USFD_DEFECT (Transverse Rail Fissure)</option>
                <option value="TRACK_FAILURE">TRACK_FAILURE (Buckled Rail / Weld Failure)</option>
                <option value="SIGNAL_FAILURE">SIGNAL_FAILURE (Interlocking Point Machine Drop)</option>
                <option value="OTHER">OTHER (Obstruction / Derailment Risk)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                Railway Corridor Section
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 text-small font-mono text-content-primary focus:outline-none focus:border-border-strong cursor-pointer"
              >
                <option value="NDLS-AGC">NDLS-AGC (New Delhi - Agra Cantt)</option>
                <option value="AGC-GWL">AGC-GWL (Agra Cantt - Gwalior Jn)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                  Severity Class
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 text-small font-mono text-crit-p1 font-semibold focus:outline-none focus:border-border-strong cursor-pointer"
                >
                  <option value="CRITICAL">P1 · CRITICAL</option>
                  <option value="HIGH">P2 · HIGH</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                  Kilometer Post
                </label>
                <input
                  value={kmLocation}
                  onChange={(e) => setKmLocation(e.target.value)}
                  className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 text-small font-mono text-content-primary focus:outline-none focus:border-border-strong"
                />
              </div>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center text-small">
                <span className="text-micro text-content-tertiary uppercase">Required Track Possession:</span>
                <span className="text-accent-400 font-semibold bg-accent-500/15 border border-accent-500/30 px-2 py-0.5 rounded-sm tabular-nums">
                  {durationMinutes} mins
                </span>
              </div>
              <input
                type="range"
                min="60"
                max="300"
                step="30"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-sunken rounded-full appearance-none cursor-pointer accent-accent-500"
              />
              <div className="flex justify-between text-[10px] text-content-tertiary">
                <span>60m</span><span>120m</span><span>180m</span><span>240m</span><span>300m</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                Incident Notes
              </label>
              <input
                value={impactSummary}
                onChange={(e) => setImpactSummary(e.target.value)}
                placeholder="Observed ultrasonic IMR flaw, point machine failure..."
                className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 text-small font-mono text-content-primary placeholder-content-disabled focus:outline-none focus:border-border-strong"
              />
            </div>

            <Button
              variant="danger"
              size="md"
              icon={<Flame size={16} />}
              loading={state === 'loading'}
              onClick={handleSubmit}
              className="w-full mt-2"
            >
              Evaluate Emergency Possession Windows
            </Button>

            {state === 'error' && (
              <div className="p-3 bg-crit-p1-bg border border-crit-p1/40 rounded-sm text-crit-p1 font-mono text-small flex items-center gap-2">
                <XCircle size={15} />
                <span>Error: {errorMsg}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Feasible Possession Slots Card */}
        <Card
          title="2. Feasible Track Possession Windows"
          eyebrow={result ? `${result.feasible_windows.length} Minimum Disruption Windows Found` : 'Solver Feasibility'}
        >
          {state === 'idle' && (
            <div className="p-12 border border-border-hairline border-dashed rounded-md bg-surface-sunken/40 flex flex-col items-center justify-center text-center">
              <Clock size={32} className="text-content-tertiary mb-2" />
              <span className="font-mono text-small text-content-secondary">
                Submit defect parameters to evaluate minimum train delay windows
              </span>
            </div>
          )}

          {state === 'loading' && (
            <div className="p-12 border border-border-hairline border-dashed rounded-md bg-surface-sunken/40 flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-small text-accent-400">
                Solving timetable headway gaps...
              </span>
            </div>
          )}

          {state === 'success' && result && (
            <div className="space-y-3 font-mono">
              {result.feasible_windows.map((win, i) => {
                const isSelected = selectedWindowId === win.window_id;
                return (
                  <div
                    key={win.window_id}
                    onClick={() => setSelectedWindowId(win.window_id)}
                    className={`p-3.5 rounded-sm border transition-colors cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-status-feasible bg-status-feasible-bg shadow-sm'
                        : 'border-border-hairline bg-surface hover:border-border-strong'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className={isSelected ? 'text-status-feasible' : 'text-content-tertiary'} />
                        <span className="text-small font-semibold text-content-primary">
                          {formatTimeWindow(win.start, win.end)}
                        </span>
                        {i === 0 && (
                          <span className="px-1.5 py-0.2 rounded-sm bg-status-feasible text-white text-micro uppercase font-semibold">
                            OPTIMAL
                          </span>
                        )}
                      </div>
                      {win.impact_summary && (
                        <div className="text-micro text-content-tertiary flex items-center gap-1">
                          <AlertTriangle size={11} className="text-crit-p2" />
                          <span>{win.impact_summary}</span>
                        </div>
                      )}
                    </div>

                    <Button
                      variant={isSelected ? 'primary' : 'outline'}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedWindowId(win.window_id);
                      }}
                    >
                      {isSelected ? 'Selected' : 'Choose'}
                    </Button>
                  </div>
                );
              })}

              {selectedWindowId && (
                <div className="pt-3 border-t border-border-hairline">
                  <Button
                    variant="primary"
                    size="md"
                    className="w-full"
                    icon={<CheckCircle2 size={16} />}
                    onClick={() => setIsConfirmModalOpen(true)}
                  >
                    Confirm Emergency Block Insertion
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm Emergency Possession Possession"
        subtitle="OR-Tools Schedule Injection Confirmation"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setIsConfirmModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={<CheckCircle2 size={15} />}
              onClick={() => {
                setIsConfirmModalOpen(false);
                alert(`Emergency possession confirmed for ${selectedWindowId}. Timetable updated.`);
              }}
            >
              Authorize & Insert Possession
            </Button>
          </>
        }
      >
        <div className="space-y-3 font-mono text-small">
          <p className="text-content-secondary font-sans leading-relaxed">
            You are authorizing an unscheduled emergency track possession. This will automatically adjust train headways and notify sectional controllers:
          </p>

          <div className="p-3 bg-surface-sunken border border-border-hairline rounded-sm space-y-1.5">
            <div><span className="text-content-tertiary">DEFECT:</span> {eventType}</div>
            <div><span className="text-content-tertiary">LOCATION:</span> Km {kmLocation} ({sectionId})</div>
            <div><span className="text-content-tertiary">WINDOW:</span> {selectedWindow ? formatTimeWindow(selectedWindow.start, selectedWindow.end) : ''}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EmergencyPage;
