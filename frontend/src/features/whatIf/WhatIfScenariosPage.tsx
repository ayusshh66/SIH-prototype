import React, { useState } from 'react';
import { ScenarioConfigForm } from './ScenarioConfigForm';
import { ScheduleDiffViewer } from './ScheduleDiffViewer';
import { runWhatIfScenario, type WhatIfScenarioPayload } from '../../api/client';
import { AlertTriangle, Sparkles } from 'lucide-react';

export const WhatIfScenariosPage: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (payload: WhatIfScenarioPayload) => {
    setIsSimulating(true);
    setError(null);
    try {
      const response = await runWhatIfScenario(payload);
      if (response.success) {
        setResult(response.data);
      } else {
        setError('Solver failed to return a feasible schedule modification.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to communicate with re-optimization engine.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleQuickPreset = (type: 'shatabdi_delay' | 'tower_wagon_down' | 'window_cut') => {
    let preset: WhatIfScenarioPayload;
    if (type === 'shatabdi_delay') {
      preset = {
        scenario_id: `whatif_td_${Date.now().toString(36)}`,
        scenario_type: 'TRAIN_DELAY',
        base_schedule_id: 'sched_base_001',
        affected_train_ids: ['12002'],
        affected_task_ids: ['TSK-ENG-NDLS-045-01'],
        new_constraints: {
          train_delay_minutes: 45,
          train_id: '12002',
          section_id: 'sec_12_ndls_agc',
        },
      };
    } else if (type === 'tower_wagon_down') {
      preset = {
        scenario_id: `whatif_ru_${Date.now().toString(36)}`,
        scenario_type: 'RESOURCE_UNAVAILABLE',
        base_schedule_id: 'sched_base_001',
        affected_task_ids: ['TSK-TRD-NDLS-046-02'],
        new_constraints: {
          unavailable_resource_type: 'tower_wagon',
          expected_downtime_hours: 4,
        },
      };
    } else {
      preset = {
        scenario_id: `whatif_bu_${Date.now().toString(36)}`,
        scenario_type: 'BLOCK_UNAVAILABLE',
        base_schedule_id: 'sched_base_001',
        affected_task_ids: ['TSK-ENG-NDLS-045-01', 'TSK-TRD-NDLS-046-02'],
        new_constraints: {
          unavailable_block_id: 'blk_55a1',
          curtailed_minutes: 60,
        },
      };
    }
    handleSimulate(preset);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">
            What-If Scenarios
          </h2>
          <p className="text-text-muted font-mono text-sm mt-1">
            OPERATIONAL DISRUPTION SIMULATION SANDBOX & SCHEDULE DIFFS
          </p>
        </div>

        {/* Quick Presets for Demo */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-text-muted uppercase flex items-center gap-1">
            <Sparkles size={13} className="text-status-warning" /> Quick Presets:
          </span>
          <button
            onClick={() => handleQuickPreset('shatabdi_delay')}
            disabled={isSimulating}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-surface-card border border-surface-border hover:border-status-warning text-text-primary hover:text-status-warning transition-colors disabled:opacity-50"
          >
            Shatabdi +45m
          </button>
          <button
            onClick={() => handleQuickPreset('tower_wagon_down')}
            disabled={isSimulating}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-surface-card border border-surface-border hover:border-status-warning text-text-primary hover:text-status-warning transition-colors disabled:opacity-50"
          >
            Tower Wagon Down
          </button>
          <button
            onClick={() => handleQuickPreset('window_cut')}
            disabled={isSimulating}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-surface-card border border-surface-border hover:border-status-warning text-text-primary hover:text-status-warning transition-colors disabled:opacity-50"
          >
            -60m Window
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-status-critical/10 border-2 border-status-critical text-status-critical font-mono text-xs flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Layout Grid ─────────────────────────────────────────── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
        <div className="lg:col-span-1 overflow-y-auto custom-scrollbar">
          <ScenarioConfigForm onSimulate={handleSimulate} isSimulating={isSimulating} />
        </div>

        <div className="lg:col-span-2 overflow-y-auto custom-scrollbar">
          {isSimulating ? (
            <div className="h-full flex items-center justify-center border-2 border-surface-border border-dashed bg-surface-card/20 min-h-[450px]">
              <div className="font-mono text-status-warning flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-status-warning border-t-transparent rounded-full animate-spin mb-4" />
                <span className="font-bold tracking-wider">RUNNING MULTI-OBJECTIVE SOLVER...</span>
                <span className="text-xs text-text-muted mt-2">
                  OR-Tools CP-SAT re-evaluating possession windows and train timetables
                </span>
              </div>
            </div>
          ) : result ? (
            <ScheduleDiffViewer result={result} onReset={() => setResult(null)} />
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-surface-border border-dashed bg-surface-card/20 min-h-[450px] p-6 text-center">
              <div className="max-w-md space-y-3">
                <span className="font-mono text-text-muted tracking-widest uppercase text-sm block">
                  SELECT SCENARIO AND DISRUPTION PARAMETERS TO BEGIN
                </span>
                <p className="text-xs font-mono text-text-muted/70">
                  Simulate train delays, machine breakdowns, or possession window curtails to evaluate schedule shifts and train delay penalties without impacting live operations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
