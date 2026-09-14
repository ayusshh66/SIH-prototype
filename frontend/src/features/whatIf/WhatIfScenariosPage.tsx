import React, { useState } from 'react';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { ScenarioConfigForm } from './ScenarioConfigForm';
import { ScheduleDiffViewer } from './ScheduleDiffViewer';
import { Button } from '../../components/common/Button';
import { EmptyState } from '../../components/common/EmptyState';
import { runWhatIfScenario, type WhatIfResult, type WhatIfScenarioPayload } from '../../api/client';
import { Sparkles, GitBranch, AlertTriangle } from 'lucide-react';

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
    <div className="space-y-6">
      <SectionHeader
        title="What-If Disruption Sandbox"
        description="Simulate real-time operational failures, late running express trains, and machinery breakdowns to evaluate CP-SAT re-optimization schedule shifts."
        badge={
          <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-accent-500/15 border border-accent-500/30 text-accent-400">
            SANDBOX MODE
          </span>
        }
        actions={
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-micro font-mono text-content-tertiary uppercase mr-1 hidden sm:inline flex items-center gap-1">
              <Sparkles size={12} className="text-accent-400" /> Presets:
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={isSimulating}
              onClick={() => handleQuickPreset('shatabdi_delay')}
            >
              Shatabdi +45m
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSimulating}
              onClick={() => handleQuickPreset('tower_wagon_down')}
            >
              Tower Wagon Defect
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={isSimulating}
              onClick={() => handleQuickPreset('window_cut')}
            >
              Curtail Window 60m
            </Button>
          </div>
        }
      />

      {error && (
        <div className="p-3 bg-crit-p1-bg border border-crit-p1/40 rounded-sm text-crit-p1 font-mono text-small flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Config Form (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <ScenarioConfigForm onSimulate={handleSimulate} isSimulating={isSimulating} />
        </div>

        {/* Right: Diff Viewer (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 min-h-[500px]">
          {isSimulating ? (
            <div className="h-full flex flex-col items-center justify-center p-12 border border-border-hairline rounded-md bg-surface text-center space-y-4 min-h-[480px]">
              <div className="w-10 h-10 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
              <div className="space-y-1">
                <span className="text-h3 font-mono font-semibold text-content-primary block">
                  OR-Tools CP-SAT Re-Optimization...
                </span>
                <p className="text-small font-mono text-content-tertiary max-w-sm">
                  Simulating secondary delays, rolling stock turns, and work crew reallocations.
                </p>
              </div>
            </div>
          ) : result ? (
            <ScheduleDiffViewer result={result} onReset={() => setResult(null)} />
          ) : (
            <EmptyState
              icon={<GitBranch size={40} className="text-content-tertiary" />}
              title="No Active Scenario Simulation"
              description="Configure parameters on the left or select a quick preset above to evaluate timetable impact."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatIfScenariosPage;
