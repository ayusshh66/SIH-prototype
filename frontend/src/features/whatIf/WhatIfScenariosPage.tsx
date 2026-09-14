import React, { useState } from 'react';
import { ScenarioConfigForm } from './ScenarioConfigForm';
import { ScheduleDiffViewer } from './ScheduleDiffViewer';
import { runWhatIfScenario, type WhatIfResult, type WhatIfScenarioPayload } from '../../api/client';
import { AlertTriangle, Sparkles } from 'lucide-react';

export const WhatIfScenariosPage: React.FC = () => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async (payload: WhatIfScenarioPayload) => {
    setIsSimulating(true);
    setError(null);
    try {
      const response = await runWhatIfScenario(payload);
      setResult(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to communicate with re-optimization engine.');
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
        base_schedule_id: 'run_0192a',
        affected_train_ids: ['12002'],
        affected_task_ids: ['TSK-ENG-NDLS-045-01'],
        new_constraints: {
          train_delay_minutes: 45,
          train_id: '12002',
          section_id: 'NDLS-AGC',
        },
      };
    } else if (type === 'tower_wagon_down') {
      preset = {
        scenario_id: `whatif_ru_${Date.now().toString(36)}`,
        scenario_type: 'RESOURCE_UNAVAILABLE',
        base_schedule_id: 'run_0192a',
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
        base_schedule_id: 'run_0192a',
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
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white drop-shadow-md">
            What-If Scenarios
          </h2>
          <p className="text-gray-400 font-mono text-xs mt-1 tracking-wider">
            OPERATIONAL DISRUPTION SIMULATION SANDBOX & SCHEDULE DIFFS
          </p>
        </div>

        {/* Quick Presets for Demo */}
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md border border-white/5 p-2 rounded-xl shadow-lg">
          <span className="text-xs font-mono text-gray-500 uppercase flex items-center gap-1 tracking-wider mr-2">
            <Sparkles size={13} className="text-[#F59E0B]" /> Quick Presets:
          </span>
          <button
            onClick={() => handleQuickPreset('shatabdi_delay')}
            disabled={isSimulating}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-black/40 border border-white/10 hover:border-[#F59E0B] rounded text-white hover:text-[#F59E0B] transition-colors disabled:opacity-50"
          >
            Shatabdi +45m
          </button>
          <button
            onClick={() => handleQuickPreset('tower_wagon_down')}
            disabled={isSimulating}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-black/40 border border-white/10 hover:border-[#F59E0B] rounded text-white hover:text-[#F59E0B] transition-colors disabled:opacity-50"
          >
            Tower Wagon Down
          </button>
          <button
            onClick={() => handleQuickPreset('window_cut')}
            disabled={isSimulating}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-black/40 border border-white/10 hover:border-[#F59E0B] rounded text-white hover:text-[#F59E0B] transition-colors disabled:opacity-50"
          >
            -60m Window
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/50 rounded-lg text-[#EF4444] shadow-[0_0_15px_rgba(239,68,68,0.2)] font-mono text-xs flex items-center gap-2">
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
            <div className="h-full flex items-center justify-center border border-white/10 border-dashed rounded-2xl bg-black/20 backdrop-blur-md min-h-[450px]">
              <div className="font-mono text-[#F59E0B] flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-[#F59E0B] border-t-transparent rounded-full animate-spin mb-4" />
                <span className="font-bold tracking-wider text-sm shadow-[0_0_15px_rgba(245,158,11,0.5)]">RUNNING MULTI-OBJECTIVE SOLVER...</span>
                <span className="text-xs text-gray-400 mt-2">
                  OR-Tools CP-SAT re-evaluating possession windows and train timetables
                </span>
              </div>
            </div>
          ) : result ? (
            <ScheduleDiffViewer result={result} onReset={() => setResult(null)} />
          ) : (
            <div className="h-full flex items-center justify-center border border-white/10 border-dashed rounded-2xl bg-black/20 backdrop-blur-md min-h-[450px] p-6 text-center shadow-inner">
              <div className="max-w-md space-y-3">
                <span className="font-mono text-gray-500 tracking-widest uppercase text-[10px] block font-bold">
                  SELECT SCENARIO AND DISRUPTION PARAMETERS TO BEGIN
                </span>
                <p className="text-xs font-mono text-gray-600 leading-relaxed">
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
