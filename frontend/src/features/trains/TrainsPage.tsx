import React from 'react';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { Card } from '../../components/common/Card';
import { TrainImpactIndicator } from '../../components/domain/TrainImpactIndicator';
import { SAMPLE_TRAIN_IMPACT } from '../../mocks/sampleData';

export const TrainsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Trains & Movement Timetable"
        description="Scheduled passenger and freight train paths, speed classes, and estimated maintenance disruption penalties."
        badge={
          <span className="badge badge-optimal font-mono text-xs">
            {SAMPLE_TRAIN_IMPACT.length} SERVICES TRACKED
          </span>
        }
      />

      <Card
        title="Train Impact & Delay Analysis"
        subtitle="Simulated passage delays resulting from active maintenance block proposals"
      >
        <div className="space-y-3">
          {SAMPLE_TRAIN_IMPACT.map((train) => (
            <div
              key={train.trainNumber}
              className="flex items-center justify-between p-4 bg-background-main border-2 border-surface-border"
            >
              <TrainImpactIndicator
                trainNumber={train.trainNumber}
                trainName={train.trainName}
                trainType={train.trainType}
                speedClass={train.speedClass}
                delayMinutes={train.delayMinutes}
              />
              <div className="text-xs font-mono text-text-muted">
                SECTION: {train.affectedSection}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default TrainsPage;
