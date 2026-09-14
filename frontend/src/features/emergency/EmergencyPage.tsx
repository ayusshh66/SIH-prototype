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
          <span className="bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30 px-2 py-1 rounded font-mono text-[10px] uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">
            PRIORITY EXPEDITED
          </span>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Fast-Entry Incident Card ──────────────────────────────── */}
        <Card title="1. Emergency Defect Intake" subtitle="Define the emergency event parameters">
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Defect / Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#06B6D4]/50 transition-colors"
              >
                <option value="NEW_USFD_DEFECT">NEW_USFD_DEFECT (Transverse Rail Fissure)</option>
                <option value="TRACK_FAILURE">TRACK_FAILURE (Buckled Rail / Weld Failure)</option>
                <option value="SIGNAL_FAILURE">SIGNAL_FAILURE (Interlocking Drop)</option>
                <option value="OTHER">OTHER (Obstruction / Derailment Risk)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Railway Section</label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#06B6D4]/50 transition-colors"
              >
                <option value="NDLS-AGC">NDLS-AGC (New Delhi - Agra Cantt)</option>
                <option value="AGC-GWL">AGC-GWL (Agra Cantt - Gwalior Jn)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#EF4444]/50 transition-colors"
                >
                  <option value="CRITICAL">CRITICAL (P1)</option>
                  <option value="HIGH">HIGH (P2)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Kilometer Location</label>
                <input
                  value={kmLocation}
                  onChange={(e) => setKmLocation(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#06B6D4]/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">
                Estimated Clearance Window: <span className="text-white bg-[#06B6D4]/10 border border-[#06B6D4]/30 px-2 py-0.5 rounded ml-2 shadow-[0_0_8px_rgba(6,182,212,0.2)]">{durationMinutes} mins</span>
              </label>
              <input
                type="range"
                min="60"
                max="300"
                step="30"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#06B6D4] mt-3"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-2">
                <span>60m</span><span>120m</span><span>180m</span><span>240m</span><span>300m</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-gray-500 mb-1">Impact Summary (optional)</label>
              <input
                value={impactSummary}
                onChange={(e) => setImpactSummary(e.target.value)}
                placeholder="Brief description of the defect..."
                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-[#06B6D4]/50 placeholder:text-gray-600 transition-colors"
              />
            </div>

            <Button
              variant="danger"
              icon={state === 'loading' ? <Loader2 size={16} className="animate-spin" /> : <Flame size={16} />}
              onClick={handleSubmit}
              disabled={state === 'loading'}
              className="w-full py-3 tracking-widest text-[11px]"
            >
              {state === 'loading' ? 'Evaluating Emergency Slot...' : 'Evaluate Emergency Slot'}
            </Button>

            {state === 'loading' && (
              <div className="p-3 bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-lg text-[#F59E0B] text-xs font-mono flex items-center gap-2 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                <Loader2 size={16} className="animate-spin" />
                <span>Dispatching to EMERGENCY re-optimization solver...</span>
              </div>
            )}

            {state === 'error' && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#EF4444] text-xs font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <XCircle size={16} />
                <span>Error: {errorMsg}</span>
              </div>
            )}

            {state === 'success' && result && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-[#EF4444] text-[10px] uppercase tracking-widest font-mono flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                <AlertTriangle size={16} />
                <span>
                  Emergency defect dispatched. Priority: <span className="font-bold text-white">{result.urgency}</span> | Section: <span className="font-bold text-white">{result.affected_section}</span>
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
            <div className="h-full flex items-center justify-center min-h-[200px] border border-white/5 border-dashed rounded-xl bg-black/20">
              <span className="font-mono text-gray-500 text-[10px] font-bold tracking-widest uppercase">
                SUBMIT EMERGENCY EVENT TO DISCOVER SLOTS
              </span>
            </div>
          )}

          {state === 'loading' && (
            <div className="h-full flex items-center justify-center min-h-[200px] border border-white/5 border-dashed rounded-xl bg-black/20">
              <div className="font-mono text-[#F59E0B] flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                <span className="text-[10px] font-bold tracking-widest">EVALUATING FEASIBLE WINDOWS...</span>
              </div>
            </div>
          )}

          {state === 'success' && result && (
            <div className="space-y-3">
              {result.feasible_windows.map((win, i) => (
                <div
                  key={win.window_id}
                  className={`p-4 bg-black/40 backdrop-blur-sm rounded-xl border transition-all flex items-center justify-between cursor-pointer group ${
                    selectedWindowId === win.window_id
                      ? 'border-[#10B981] shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-[#10B981]/5'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                  onClick={() => setSelectedWindowId(win.window_id)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className={selectedWindowId === win.window_id ? 'text-[#10B981]' : 'text-gray-500'} />
                      <span className="font-mono text-sm font-bold text-white">
                        {formatTimeWindow(win.start, win.end)}
                      </span>
                      {i === 0 && (
                        <span className="px-1.5 py-0.5 bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 rounded text-[9px] font-mono font-bold uppercase tracking-widest shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                          Recommended
                        </span>
                      )}
                    </div>
                    {win.impact_summary && (
                      <div className="text-[10px] text-gray-500 mt-2 font-mono uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={10} className="text-[#F59E0B]" />
                        {win.impact_summary}
                      </div>
                    )}
                  </div>
                  <Button
                    variant={selectedWindowId === win.window_id ? 'primary' : 'outline'}
                    size="sm"
                    className="text-[10px] tracking-widest uppercase"
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
                    className="w-full py-3 text-[11px] tracking-widest uppercase"
                    icon={<CheckCircle size={16} />}
                  >
                    Confirm Emergency Block Possession
                  </Button>
                </div>
              )}
            </div>
          )}

          {state === 'error' && (
            <div className="h-full flex items-center justify-center min-h-[200px] border border-white/5 border-dashed rounded-xl bg-black/20">
              <div className="font-mono text-[#EF4444] text-[10px] tracking-widest font-bold uppercase text-center flex flex-col items-center">
                <XCircle size={24} className="mx-auto mb-2 opacity-80" />
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
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest font-bold">Status</span>
                <span className={`px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-widest rounded border ${
                  result.resulting_schedule.status === 'FEASIBLE'
                    ? 'text-[#10B981] border-[#10B981]/30 bg-[#10B981]/10 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : 'text-[#F59E0B] border-[#F59E0B]/30 bg-[#F59E0B]/10 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                }`}>
                  {result.resulting_schedule.status}
                </span>
              </div>
              {result.resulting_schedule.blocks.map((blk) => (
                <div key={blk.block_id} className="p-3 bg-black/40 backdrop-blur-md rounded-lg border border-white/10">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin size={12} className="text-[#06B6D4]" />
                    <span className="font-mono text-[11px] font-bold text-white tracking-widest">{blk.block_id}</span>
                  </div>
                  <div className="font-mono text-xs text-gray-400">
                    {formatTimeWindow(blk.start, blk.end)}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 p-3 bg-[#F59E0B]/10 rounded-lg border border-[#F59E0B]/30">
                <Zap size={14} className="text-[#F59E0B]" />
                <span className="text-[10px] uppercase tracking-widest font-bold font-mono text-[#F59E0B]">
                  Estimated disruption: <span className="text-white">{result.resulting_schedule.estimated_disruption_minutes} mins</span>
                </span>
              </div>
              <div className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                Tasks scheduled: <span className="text-gray-300">{result.resulting_schedule.task_ids.join(', ')}</span>
              </div>
            </div>
          </Card>

          {/* Optimization Stats */}
          {result.optimization_result && (
            <Card title="Solver Statistics" subtitle="Optimization engine performance">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
                    <div className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-widest mb-2 relative z-10">Objective</div>
                    <div className="text-2xl font-bold font-mono text-white relative z-10">
                      {result.optimization_result.objective_score.toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent pointer-events-none" />
                    <div className="text-[9px] font-bold font-mono text-gray-500 uppercase tracking-widest mb-2 relative z-10">Runtime</div>
                    <div className="text-2xl font-bold font-mono text-white relative z-10">
                      {result.optimization_result.solver_statistics.runtime_ms}<span className="text-sm text-gray-500 ml-1">ms</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-[#10B981]/10 rounded-lg border border-[#10B981]/30">
                  <Shield size={14} className="text-[#10B981]" />
                  <span className="text-[10px] uppercase font-bold tracking-widest font-mono text-[#10B981]">
                    <span className="text-white">{result.optimization_result.selected_task_ids.length}</span> task(s) scheduled, {' '}
                    <span className="text-white">{result.optimization_result.solver_statistics.iterations ?? 0}</span> iterations
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* AI Explanation */}
          <Card title="AI Explanation" subtitle="Deterministic decision trace">
            <div className="p-4 bg-black/40 backdrop-blur-md rounded-r-xl border-l-2 border-[#10B981] shadow-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-[#10B981]/[0.05] to-transparent pointer-events-none" />
              <p className="font-mono text-[11px] leading-relaxed text-gray-300 relative z-10">
                {result.explanation}
              </p>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-3 space-y-2">
                {result.errors.map((err, i) => (
                  <div key={i} className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/30 rounded p-2 flex items-center gap-2">
                    <XCircle size={12} className="shrink-0" />
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
