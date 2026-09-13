import React from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { Card } from '@/components/common/Card';
import { DepartmentBadge } from '@/components/domain/DepartmentBadge';
import { Button } from '@/components/common/Button';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export const ShadowBlocksPage: React.FC = () => {
  return (
    <div>
      <SectionHeader
        title="Shadow Block Opportunities"
        description="Integrated, multi-department track possessions where secondary tasks piggyback on primary blocks to eliminate duplicate corridor closures."
        badge={
          <span className="badge badge-opt-optimal">
            2 CANDIDATES DISCOVERED
          </span>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 'var(--space-5)' }}>
        {/* Candidate 1: Feasible */}
        <Card
          title="Candidate SB-NDLS-301 (NDLS - AGC Km 45.2 - 46.1)"
          subtitle="Status: FEASIBLE · Benefit Score: 0.81"
          actions={
            <div style={{ display: 'flex', gap: '4px' }}>
              <DepartmentBadge department="ENG" />
              <DepartmentBadge department="TRD" />
              <DepartmentBadge department="SNT" />
            </div>
          }
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-optimal)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={13} />
                <span>Zero Safety Rule Conflicts</span>
              </span>
              <Button variant="primary" size="sm">
                Approve Shadow Block
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Proposed Window</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>2026-11-03 23:00 - 01:30 (150m)</span>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Corridor Possession Saved</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-optimal)', fontSize: 'var(--text-base)' }}>
                95 Minutes (37.5% Compression)
              </span>
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Primary: TSK-001 (USFD Scan) · Piggybacked: TSK-010 (OHE Cantilever), TSK-021 (Point Sensor Overhaul).
            </div>
          </div>
        </Card>

        {/* Candidate 2: Rejected Unsafe Candidate */}
        <Card
          title="Candidate SB-NDLS-302 (Agra Cantt Km 88.4)"
          subtitle="Status: REJECTED (SAFETY_CONFLICT)"
          actions={
            <div style={{ display: 'flex', gap: '4px' }}>
              <DepartmentBadge department="ENG" />
              <DepartmentBadge department="SNT" />
            </div>
          }
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--priority-critical)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldAlert size={13} />
                <span>Interlocking IR-SIG-402 Breach</span>
              </span>
              <Button variant="outline" size="sm">
                Inspect Rejection Evidence
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ padding: '8px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Proposed Window</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>2026-11-04 02:00 - 04:30 (150m)</span>
            </div>

            <div style={{ padding: '8px 12px', background: 'var(--priority-critical-bg)', border: '1px solid var(--priority-critical-border)', borderRadius: 'var(--radius-sm)', color: 'var(--priority-critical)', fontSize: 'var(--text-xs)' }}>
              Deterministic Rejection: Concurrent point motor overhaul and heavy track tamping on Section 14 violates safety clearance rule.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
