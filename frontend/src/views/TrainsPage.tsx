import React from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { Card } from '@/components/common/Card';
import { TrainImpactIndicator } from '@/components/domain/TrainImpactIndicator';
import { SAMPLE_TRAIN_IMPACT } from '@/mocks/sampleData';

export const TrainsPage: React.FC = () => {
  return (
    <div>
      <SectionHeader
        title="Trains & Movement Timetable"
        description="Scheduled passenger and freight train paths, speed classes, and estimated maintenance disruption penalties."
        badge={
          <span className="badge badge-opt-feasible">
            3 SERVICES TRACKED
          </span>
        }
      />

      <Card
        title="Train Impact & Delay Analysis"
        subtitle="Simulated passage delays resulting from active maintenance block proposals"
        style={{ marginBottom: 'var(--space-5)' }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {SAMPLE_TRAIN_IMPACT.map((train) => (
            <div
              key={train.trainNumber}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--bg-surface-raised)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <TrainImpactIndicator
                trainNumber={train.trainNumber}
                trainName={train.trainName}
                trainType={train.trainType}
                speedClass={train.speedClass}
                delayMinutes={train.delayMinutes}
              />
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                SECTION: {train.affectedSection}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
