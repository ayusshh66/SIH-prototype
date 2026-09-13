import React from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { Card } from '@/components/common/Card';
import { ConflictIndicator } from '@/components/domain/ConflictIndicator';
import { SAMPLE_CONFLICTS } from '@/mocks/sampleData';

export const ConflictsPage: React.FC = () => {
  return (
    <div>
      <SectionHeader
        title="Unified Operational Conflicts & Alerts"
        description="Active operational rule breaches across train passages, resource allocations, possession windows, and safety interlocking."
        badge={
          <span className="badge badge-priority-critical">
            3 ACTIVE CONFLICTS
          </span>
        }
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {SAMPLE_CONFLICTS.map((conf) => (
          <Card
            key={conf.id}
            title={conf.title}
            subtitle={`Conflict ID: ${conf.id} · Timestamp: ${conf.timestamp}`}
          >
            <ConflictIndicator
              type={conf.type}
              severity={conf.severity}
              affectedEntityId={conf.affectedEntityId}
              description={conf.description}
            />
            <div
              style={{
                marginTop: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--bg-surface-raised)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Affected Section: {conf.sectionId}</span>
              <span style={{ color: 'var(--text-cyan)', fontFamily: 'var(--font-mono)' }}>
                DETERMINISTIC_PROOF_ATTACHED
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
