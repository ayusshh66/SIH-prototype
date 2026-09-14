import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Play, Train, Clock, Wrench, AlertTriangle } from 'lucide-react';
import type { WhatIfScenarioPayload } from '../../api/client';

interface Props {
  onSimulate: (payload: WhatIfScenarioPayload) => void;
  isSimulating: boolean;
}

type ScenarioType = 'TRAIN_DELAY' | 'BLOCK_UNAVAILABLE' | 'RESOURCE_UNAVAILABLE' | 'TASK_DURATION_CHANGED';

const SCENARIO_TABS: { id: ScenarioType; label: string; icon: React.ElementType }[] = [
  { id: 'TRAIN_DELAY', label: 'Train Delay', icon: Train },
  { id: 'BLOCK_UNAVAILABLE', label: 'Window Curtail', icon: Clock },
  { id: 'RESOURCE_UNAVAILABLE', label: 'Machine Down', icon: Wrench },
  { id: 'TASK_DURATION_CHANGED', label: 'Task Overrun', icon: AlertTriangle },
];

export const ScenarioConfigForm: React.FC<Props> = ({ onSimulate, isSimulating }) => {
  const [scenarioType, setScenarioType] = useState<ScenarioType>('TRAIN_DELAY');
  const [affectedTrain, setAffectedTrain] = useState('12002');
  const [delayMinutes, setDelayMinutes] = useState(45);
  const [affectedBlock, setAffectedBlock] = useState('blk_55a1');
  const [curtailMinutes, setCurtailMinutes] = useState(60);
  const [unavailableResource, setUnavailableResource] = useState('track_machine');
  const [affectedTask, setAffectedTask] = useState('TSK-ENG-NDLS-045-01');
  const [extraDuration, setExtraDuration] = useState(30);
  const [baseScheduleId, setBaseScheduleId] = useState('run_0192a');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let new_constraints: Record<string, unknown> = {};
    let affected_train_ids: string[] = [];
    let affected_task_ids: string[] = [];

    switch (scenarioType) {
      case 'TRAIN_DELAY':
        affected_train_ids = [affectedTrain];
        affected_task_ids = ['TSK-ENG-NDLS-045-01'];
        new_constraints = {
          train_delay_minutes: delayMinutes,
          train_id: affectedTrain,
          section_id: 'NDLS-AGC',
        };
        break;
      case 'BLOCK_UNAVAILABLE':
        affected_task_ids = ['TSK-ENG-NDLS-045-01', 'TSK-TRD-NDLS-046-02'];
        new_constraints = {
          unavailable_block_id: affectedBlock,
          curtailed_minutes: curtailMinutes,
        };
        break;
      case 'RESOURCE_UNAVAILABLE':
        affected_task_ids = ['TSK-ENG-NDLS-045-01'];
        new_constraints = {
          unavailable_resource_type: unavailableResource,
          expected_downtime_hours: 4,
        };
        break;
      case 'TASK_DURATION_CHANGED':
        affected_task_ids = [affectedTask];
        new_constraints = {
          task_id: affectedTask,
          new_duration_minutes: extraDuration,
        };
        break;
    }

    const payload: WhatIfScenarioPayload = {
      scenario_id: `whatif_${Date.now().toString(36)}`,
      scenario_type: scenarioType,
      base_schedule_id: baseScheduleId,
      affected_train_ids,
      affected_task_ids,
      new_constraints,
    };

    onSimulate(payload);
  };

  return (
    <Card
      title="Disruption Configuration"
      eyebrow="Simulation Parameters"
      className="h-full"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-5">
        {/* Segmented Control for Scenario Type */}
        <div className="space-y-1.5">
          <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
            Disruption Scenario Category
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-sunken border border-border-hairline rounded-sm">
            {SCENARIO_TABS.map((tab) => {
              const active = scenarioType === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScenarioType(tab.id)}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-sm text-micro font-mono transition-colors cursor-pointer select-none ${
                    active
                      ? 'bg-accent-500 text-white font-semibold shadow-sm'
                      : 'text-content-secondary hover:text-content-primary hover:bg-surface-raised'
                  }`}
                >
                  <Icon size={12} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {scenarioType === 'TRAIN_DELAY' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                Delayed Train Rake
              </label>
              <select
                value={affectedTrain}
                onChange={(e) => setAffectedTrain(e.target.value)}
                className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 font-mono text-small text-content-primary focus:outline-none focus:border-border-strong cursor-pointer"
              >
                <option value="12002">12002 New Delhi - Bhopal Shatabdi (P1)</option>
                <option value="12050">12050 Gatimaan Express (P1)</option>
                <option value="12952">12952 Mumbai Central Rajdhani (P1)</option>
                <option value="BOXN-402">BOXN-402 Bulk Freight (P4)</option>
              </select>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center text-small">
                <span className="text-micro text-content-tertiary uppercase">Incurred Delay</span>
                <span className="font-semibold text-crit-p2 bg-crit-p2-bg border border-crit-p2/30 px-2 py-0.5 rounded-sm tabular-nums">
                  +{delayMinutes} mins
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="180"
                step="15"
                value={delayMinutes}
                onChange={(e) => setDelayMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-sunken rounded-full appearance-none cursor-pointer accent-accent-500"
              />
              <div className="flex justify-between text-[10px] text-content-tertiary">
                <span>15m</span>
                <span>60m</span>
                <span>120m</span>
                <span>180m</span>
              </div>
            </div>
          </div>
        )}

        {scenarioType === 'BLOCK_UNAVAILABLE' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                Curtailed Possession Window
              </label>
              <select
                value={affectedBlock}
                onChange={(e) => setAffectedBlock(e.target.value)}
                className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 font-mono text-small text-content-primary focus:outline-none focus:border-border-strong cursor-pointer"
              >
                <option value="blk_55a1">BLK-NDLS-01 (NDLS-TKD Track 1)</option>
                <option value="blk_shifted_01">BLK-AGC-02 (Palwal Yard Crossover)</option>
              </select>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center text-small">
                <span className="text-micro text-content-tertiary uppercase">Curtailed Duration</span>
                <span className="font-semibold text-crit-p1 bg-crit-p1-bg border border-crit-p1/30 px-2 py-0.5 rounded-sm tabular-nums">
                  -{curtailMinutes} mins
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="120"
                step="15"
                value={curtailMinutes}
                onChange={(e) => setCurtailMinutes(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-sunken rounded-full appearance-none cursor-pointer accent-crit-p1"
              />
            </div>
          </div>
        )}

        {scenarioType === 'RESOURCE_UNAVAILABLE' && (
          <div className="space-y-2">
            <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
              Defective Heavy Machinery / Crew
            </label>
            <select
              value={unavailableResource}
              onChange={(e) => setUnavailableResource(e.target.value)}
              className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 font-mono text-small text-content-primary focus:outline-none focus:border-border-strong cursor-pointer"
            >
              <option value="track_machine">Continuous Tamping Machine CSM-01</option>
              <option value="tower_wagon">TRD 4-Wheeler Tower Wagon (NDLS Depot)</option>
              <option value="USFD_VEHICLE">USFD Ultrasonic Rail Scanning Rake</option>
            </select>
          </div>
        )}

        {scenarioType === 'TASK_DURATION_CHANGED' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-micro font-mono uppercase tracking-wider text-content-tertiary block font-medium">
                Overrunning Task
              </label>
              <select
                value={affectedTask}
                onChange={(e) => setAffectedTask(e.target.value)}
                className="w-full bg-surface-sunken border border-border-hairline rounded-sm px-3 py-2 font-mono text-small text-content-primary focus:outline-none focus:border-border-strong cursor-pointer"
              >
                <option value="TSK-ENG-NDLS-045-01">TSK-ENG-045-01: Ultrasonic Rail Defect Scan</option>
                <option value="TSK-TRD-NDLS-046-02">TSK-TRD-046-02: OHE Contact Wire Tensioning</option>
              </select>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex justify-between items-center text-small">
                <span className="text-micro text-content-tertiary uppercase">Overrun Added</span>
                <span className="font-semibold text-crit-p2 bg-crit-p2-bg border border-crit-p2/30 px-2 py-0.5 rounded-sm tabular-nums">
                  +{extraDuration} mins
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="90"
                step="15"
                value={extraDuration}
                onChange={(e) => setExtraDuration(Number(e.target.value))}
                className="w-full h-1.5 bg-surface-sunken rounded-full appearance-none cursor-pointer accent-accent-500"
              />
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border-hairline mt-auto space-y-3 font-mono">
          <div className="flex items-center justify-between text-micro text-content-tertiary">
            <label htmlFor="baseScheduleId" className="font-semibold uppercase">
              Baseline Target
            </label>
            <input
              id="baseScheduleId"
              value={baseScheduleId}
              onChange={(e) => setBaseScheduleId(e.target.value)}
              className="w-32 bg-surface-sunken border border-border-hairline rounded-sm px-2 py-1 text-content-primary text-small focus:outline-none focus:border-border-strong"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={isSimulating}
            className="w-full"
            icon={<Play size={14} />}
          >
            Execute What-If Re-Optimization
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default ScenarioConfigForm;
