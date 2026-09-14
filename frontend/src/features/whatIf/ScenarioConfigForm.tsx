import React, { useState } from 'react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import type { WhatIfScenarioPayload } from '../../api/client';

interface Props {
  onSimulate: (payload: WhatIfScenarioPayload) => void;
  isSimulating: boolean;
}

export const ScenarioConfigForm: React.FC<Props> = ({ onSimulate, isSimulating }) => {
  const [scenarioType, setScenarioType] = useState<'TRAIN_DELAY' | 'BLOCK_UNAVAILABLE' | 'RESOURCE_UNAVAILABLE' | 'TASK_DURATION_CHANGED'>('TRAIN_DELAY');
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
    <Card title="Scenario Configuration" className="h-full">
      <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono block">
            Incident / Disruption Type
          </label>
          <select
            value={scenarioType}
            onChange={(e) => setScenarioType(e.target.value as any)}
            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-sm focus:border-[#F97316]/50 focus:outline-none text-white transition-colors"
          >
            <option value="TRAIN_DELAY">Train Delay / Late Running</option>
            <option value="BLOCK_UNAVAILABLE">Possession Window Curtailed</option>
            <option value="RESOURCE_UNAVAILABLE">Machinery / Resource Breakdown</option>
            <option value="TASK_DURATION_CHANGED">Maintenance Task Overrun</option>
          </select>
        </div>

        {scenarioType === 'TRAIN_DELAY' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono block">
                Affected Train Movement
              </label>
              <select
                value={affectedTrain}
                onChange={(e) => setAffectedTrain(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-sm focus:border-[#F97316]/50 focus:outline-none text-white transition-colors"
              >
                <option value="12002">12002 Bhopal Shatabdi Exp (Priority: High)</option>
                <option value="12050">12050 Gatimaan Express (Priority: High)</option>
                <option value="BOXN-402">BOXN-402 Freight Rake (Priority: Low)</option>
                <option value="14512">14512 Nauchandi Express (Priority: Med)</option>
              </select>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center font-mono">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Delay Incurred
                </span>
                <span className="text-[#F59E0B] font-bold text-sm bg-[#F59E0B]/10 rounded px-2 py-0.5 border border-[#F59E0B]/40">
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
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#F59E0B]"
              />
              <div className="flex justify-between text-[10px] font-mono text-gray-500">
                <span>15 min</span>
                <span>60 min</span>
                <span>120 min</span>
                <span>180 min</span>
              </div>
            </div>
          </>
        )}

        {scenarioType === 'BLOCK_UNAVAILABLE' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono block">
                Curtailed Block Possession
              </label>
              <select
                value={affectedBlock}
                onChange={(e) => setAffectedBlock(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-sm focus:border-[#EF4444]/50 focus:outline-none text-white transition-colors"
              >
                <option value="blk_55a1">BLK-NDLS-01 (NDLS-AGC Main Track)</option>
                <option value="blk_shifted_01">BLK-AGC-02 (Palwal Yard Siding)</option>
              </select>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center font-mono">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Window Reduction
                </span>
                <span className="text-[#EF4444] font-bold text-sm bg-[#EF4444]/10 rounded px-2 py-0.5 border border-[#EF4444]/40">
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
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#EF4444]"
              />
            </div>
          </>
        )}

        {scenarioType === 'RESOURCE_UNAVAILABLE' && (
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono block">
              Failed Asset / Crew Resource
            </label>
            <select
              value={unavailableResource}
              onChange={(e) => setUnavailableResource(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-sm focus:border-[#F59E0B]/50 focus:outline-none text-white transition-colors"
            >
              <option value="track_machine">Track Machine (CSM/Tamping Machine 01)</option>
              <option value="tower_wagon">OHE Tower Wagon (TRD Depot NDLS)</option>
              <option value="USFD_VEHICLE">USFD Ultrasonic Flaw Tester Rake</option>
            </select>
            <p className="text-[10px] font-mono text-gray-500 mt-1">
              Simulates immediate unavailability requiring asset substitution or reschedule.
            </p>
          </div>
        )}

        {scenarioType === 'TASK_DURATION_CHANGED' && (
          <>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono block">
                Target Maintenance Work Order
              </label>
              <select
                value={affectedTask}
                onChange={(e) => setAffectedTask(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 font-mono text-sm focus:border-[#F59E0B]/50 focus:outline-none text-white transition-colors"
              >
                <option value="TSK-ENG-NDLS-045-01">TSK-ENG-045-01: Rail Grinding & Deep Screening</option>
                <option value="TSK-TRD-NDLS-046-02">TSK-TRD-046-02: OHE Tensioning & Insulator Wash</option>
              </select>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex justify-between items-center font-mono">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Overrun Duration
                </span>
                <span className="text-[#F59E0B] font-bold text-sm bg-[#F59E0B]/10 rounded px-2 py-0.5 border border-[#F59E0B]/40">
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
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#F59E0B]"
              />
            </div>
          </>
        )}

        <div className="border-t border-white/10 pt-4 mt-auto">
          <div className="text-[10px] font-mono text-gray-500 mb-3 flex items-center justify-between">
            <label htmlFor="baseScheduleId" className="font-bold uppercase tracking-widest">
              Base Schedule
            </label>
            <input
              id="baseScheduleId"
              value={baseScheduleId}
              onChange={(e) => setBaseScheduleId(e.target.value)}
              className="w-40 bg-black/50 border border-white/10 rounded px-2 py-1 text-white font-bold focus:border-white/30 focus:outline-none transition-colors"
            />
          </div>
          <Button
            type="submit"
            disabled={isSimulating}
            className="w-full py-3.5 text-white bg-[#F97316] border border-[#F97316] hover:bg-[#EA580C] font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {isSimulating ? 'Simulating AI Solver...' : 'Execute What-If Re-Optimization'}
          </Button>
        </div>
      </form>
    </Card>
  );
};
