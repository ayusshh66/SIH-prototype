import React, { useState } from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { GitFork, Play } from 'lucide-react';

export const WhatIfPage: React.FC = () => {
  const [scenarioType, setScenarioType] = useState('TRAIN_DELAY');
  const [delayMinutes, setDelayMinutes] = useState(45);

  return (
    <div>
      <SectionHeader
        title="What-If Disruption Sandbox"
        description="Simulate operational incidents (train delays, block window closures, duration surges) and preview AI re-optimized schedule diffs."
        badge={
          <span className="badge badge-opt-feasible">
            SANDBOX MODE
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-5)' }}>
        {/* Scenario Config Form */}
        <Card title="1. Configure Disruption Scenario">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className="input-group">
              <label className="input-label">Scenario Type</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value)}
                className="input-control"
              >
                <option value="TRAIN_DELAY">TRAIN_DELAY (Schedule Shift)</option>
                <option value="BLOCK_UNAVAILABLE">BLOCK_UNAVAILABLE (Window Cancelled)</option>
                <option value="RESOURCE_UNAVAILABLE">RESOURCE_UNAVAILABLE (Machine Breakdown)</option>
                <option value="EMERGENCY_TASK_INSERTED">EMERGENCY_TASK_INSERTED (Urgent Defect)</option>
                <option value="TASK_DURATION_CHANGED">TASK_DURATION_CHANGED (Duration Surge)</option>
                <option value="TASK_ADDED">TASK_ADDED (New Ad-Hoc Task)</option>
              </select>
            </div>

            {scenarioType === 'TRAIN_DELAY' && (
              <div className="input-group">
                <label className="input-label">Delay Magnitude (Minutes)</label>
                <input
                  type="number"
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(Number(e.target.value))}
                  className="input-control font-mono"
                  min={5}
                  max={180}
                  step={5}
                />
              </div>
            )}

            <Button
              variant="primary"
              icon={<Play size={14} />}
              onClick={() => alert('Simulate re-optimization — Ready for Developer B WhatIfEngine connection.')}
            >
              Run Re-Optimization
            </Button>
          </div>
        </Card>

        {/* Schedule Diff Preview Placeholder */}
        <Card title="2. Simulated Schedule Diff" subtitle="Original vs. Simulated Re-optimization Comparison">
          <div
            style={{
              padding: 'var(--space-6)',
              background: 'var(--bg-canvas)',
              borderRadius: 'var(--radius-md)',
              border: '1px dashed var(--border-default)',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <GitFork size={32} style={{ margin: '0 auto var(--space-2)', color: 'var(--text-cyan)' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
              Awaiting Simulation Trigger
            </div>
            <div style={{ fontSize: 'var(--text-xs)', marginTop: '4px' }}>
              Select parameters on the left and click "Run Re-Optimization" to render shifted blocks and delta metrics.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
