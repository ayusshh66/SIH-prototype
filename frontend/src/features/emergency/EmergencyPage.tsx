import React, { useState } from 'react';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { submitEmergencyEvent } from '../../api/client';
import type { EmergencyEventPayload } from '../../api/client';
import {
  Flame,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Loader2,
  XCircle,
  Zap,
  MapPin,
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
  return `${fmt(start)} - ${fmt(end)} (${diffMin} Mins)`;
};

export const EmergencyPage: React.FC = () => {
  // Form state
  const [eventType, setEventType] = useState('NEW_USFD_DEFECT');
  const [sectionId, setSectionId] = useState('sec_12_ndls_agc');
  const [severity, setSeverity] = useState('CRITICAL');
  const [kmLocation, setKmLocation] = useState('45.300');
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [impactSummary, setImpactSummary] = useState('');

  // Result state
  const [state, setState] = useState<EmergencyState>('idle');
  const [result, setResult] = useState<EmergencyResult | null>(null);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Emergency Maintenance Planning"
        description="Expedited operational workflow for unscheduled safety-critical defects requiring immediate track possession."
        badge={
          <span className="badge badge-critical font-mono text-xs">
            PRIORITY EXPEDITED
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Fast-Entry Incident Card ──────────────────────────────── */}
        <Card title="1. Emergency Defect Intake" subtitle="Define the emergency event parameters">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1">Defect / Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-text-cyan"
              >
                <option value="NEW_USFD_DEFECT">NEW_USFD_DEFECT (Transverse Rail Fissure)</option>
                <option value="TRACK_FAILURE">TRACK_FAILURE (Buckled Rail / Weld Failure)</option>
                <option value="SIGNAL_FAILURE">SIGNAL_FAILURE (Interlocking Drop)</option>
                <option value="OTHER">OTHER (Obstruction / Derailment Risk)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1">Railway Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-text-cyan"
              >
                <option value="sec_12_ndls_agc">NDLS-AGC (New Delhi - Agra Cantt)</option>
                <option value="sec_15_agc_gwl">AGC-GWL (Agra Cantt - Gwalior Jn)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-text-muted mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-text-cyan"
                >
                  <option value="CRITICAL">CRITICAL (P1)</option>
                  <option value="HIGH">HIGH (P2)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-text-muted mb-1">Kilometer Location</label>
                <input
                  value={kmLocation}
                  onChange={(e) => setKmLocation(e.target.value)}
                  className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-text-cyan"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1">
                Estimated Clearance Window: <span className="text-text-primary">{durationMinutes} mins</span>
              </label>
              <input
                type="range"
                min="60"
                max="300"
                step="30"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full h-2 bg-surface-border appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-text-muted mt-1">
                <span>60m</span><span>120m</span><span>180m</span><span>240m</span><span>300m</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-text-muted mb-1">Impact Summary (optional)</label>
              <input
                value={impactSummary}
                onChange={(e) => setImpactSummary(e.target.value)}
                placeholder="Brief description of the defect..."
                className="w-full bg-background-main border-2 border-surface-border px-3 py-2 text-sm font-mono text-text-primary focus:outline-none focus:border-text-cyan placeholder:text-text-muted/50"
              />
            </div>

            <Button
              variant="danger"
              icon={state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
              onClick={handleSubmit}
              disabled={state === 'loading'}
              className="w-full"
            >
              {state === 'loading' ? 'Evaluating Emergency Slot...' : 'Evaluate Emergency Slot'}
            </Button>

            {state === 'loading' && (
              <div className="p-3 bg-status-warning/10 border-2 border-status-warning text-status-warning text-xs font-mono flex items-center gap-2 animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                <span>Dispatching to EMERGENCY re-optimization solver...</span>
              </div>
            )}

            {state === 'error' && (
              <div className="p-3 bg-status-critical/10 border-2 border-status-critical text-status-critical text-xs font-mono flex items-center gap-2">
                <XCircle size={16} />
                <span>Error: {errorMsg}</span>
              </div>
            )}

            {state === 'success' && result && (
              <div className="p-3 bg-status-critical/10 border-2 border-status-critical text-status-critical text-xs font-mono flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>
                  Emergency defect dispatched. Priority: {result.urgency} | Section: {result.affected_section}
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* ── Feasible Possession Slots ─────────────────────────────── */}
        <Card
          title="2. Feasible Possession Slots"
          subtitle={result ? `${result.feasible_windows.length} windows identified` : 'Minimum train disruption emergency windows'}
        >
          {state === 'idle' && (
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <span className="font-mono text-text-muted text-sm tracking-widest uppercase">
                SUBMIT EMERGENCY EVENT TO DISCOVER SLOTS
              </span>
            </div>
          )}

          {state === 'loading' && (
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <div className="font-mono text-status-warning flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-status-warning border-t-transparent rounded-full animate-spin mb-4" />
                EVALUATING FEASIBLE WINDOWS...
              </div>
            </div>
          )}

          {state === 'success' && result && (
            <div className="space-y-3">
              {result.feasible_windows.map((win, i) => (
                <div
                  key={win.window_id}
                  className={`p-4 bg-background-main border-2 transition-all flex items-center justify-between cursor-pointer ${
                    selectedWindowId === win.window_id
                      ? 'border-status-optimal shadow-[2px_2px_0px_0px_rgba(16,185,129,1)]'
                      : 'border-surface-border hover:border-surface-border/80'
                  }`}
                  onClick={() => setSelectedWindowId(win.window_id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-text-muted" />
                      <span className="font-mono text-sm font-bold text-text-primary">
                        {formatTimeWindow(win.start, win.end)}
                      </span>
                      {i === 0 && (
                        <span className="px-1.5 py-0.5 bg-status-optimal/10 text-status-optimal border border-status-optimal text-[10px] font-mono font-bold uppercase">
                          Recommended
                        </span>
                      )}
                    </div>
                    {win.impact_summary && (
                      <div className="text-xs text-text-muted mt-1 flex items-center gap-1">
                        <AlertTriangle size={10} />
                        {win.impact_summary}
                      </div>
                    )}
                  </div>
                  <Button
                    variant={selectedWindowId === win.window_id ? 'primary' : 'outline'}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWindowId(win.window_id);
                    }}
                  >
                    {selectedWindowId === win.window_id ? 'Selected' : 'Select'}
                  </Button>
                </div>
              ))}

              {selectedWindowId && (
                <div className="pt-2">
                  <Button
                    variant="primary"
                    className="w-full"
                    icon={<CheckCircle size={16} />}
                  >
                    Confirm Emergency Block Possession
                  </Button>
                </div>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="h-full flex items-center justify-center min-h-[200px]">
              <div className="font-mono text-status-critical text-sm text-center">
                <XCircle size={24} className="mx-auto mb-2" />
                Failed to evaluate feasible windows
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Resulting Schedule Summary ──────────────────────────────── */}
      {state === 'success' && result && result.resulting_schedule && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schedule Card */}
          <Card title="3. Resulting Schedule" subtitle={`Schedule: ${result.resulting_schedule.schedule_id}`}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-text-muted uppercase">Status</span>
                <span className={`px-2 py-0.5 font-mono text-xs font-bold uppercase border-2 ${
                  result.resulting_schedule.status === 'FEASIBLE'
                    ? 'text-status-feasible border-status-feasible bg-status-feasible/10'
                    : 'text-status-warning border-status-warning bg-status-warning/10'
                }`}>
                  {result.resulting_schedule.status}
                </span>
              </div>
              {result.resulting_schedule.blocks.map((blk) => (
                <div key={blk.block_id} className="p-3 bg-background-main border-2 border-surface-border">
                  <div className="flex items-center gap-2 mb-1">
                    <MapPin size={12} className="text-text-cyan" />
                    <span className="font-mono text-xs font-bold text-text-primary">{blk.block_id}</span>
                  </div>
                  <div className="font-mono text-xs text-text-muted">
                    {formatTimeWindow(blk.start, blk.end)}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 p-2 bg-status-warning/10 border border-status-warning">
                <Zap size={12} className="text-status-warning" />
                <span className="text-xs font-mono text-status-warning">
                  Estimated disruption: {result.resulting_schedule.estimated_disruption_minutes} mins
                </span>
              </div>
              <div className="text-xs font-mono text-text-muted">
                Tasks scheduled: {result.resulting_schedule.task_ids.join(', ')}
              </div>
            </div>
          </Card>

          {/* Optimization Stats */}
          {result.optimization_result && (
            <Card title="Solver Statistics" subtitle="Optimization engine performance">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background-main border-2 border-surface-border text-center">
                    <div className="text-[10px] font-mono text-text-muted uppercase mb-1">Objective</div>
                    <div className="text-xl font-bold font-mono text-text-primary">
                      {result.optimization_result.objective_score.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 bg-background-main border-2 border-surface-border text-center">
                    <div className="text-[10px] font-mono text-text-muted uppercase mb-1">Runtime</div>
                    <div className="text-xl font-bold font-mono text-text-primary">
                      {result.optimization_result.solver_statistics.runtime_ms}ms
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={14} className="text-status-optimal" />
                  <span className="text-xs font-mono text-text-muted">
                    {result.optimization_result.selected_task_ids.length} task(s) scheduled, {' '}
                    {result.optimization_result.solver_statistics.iterations ?? 0} iterations
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* AI Explanation */}
          <Card title="AI Explanation" subtitle="Deterministic decision trace">
            <div className="p-4 bg-surface-card border-l-4 border-status-optimal">
              <p className="font-mono text-xs leading-relaxed text-text-primary">
                {result.explanation}
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-xs font-mono text-status-critical flex items-center gap-1">
                    <XCircle size={10} />
                    {err}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default EmergencyPage;
