import React, { useState } from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { KpiCard } from '@/components/domain/KpiCard';
import { OptimizationBadge } from '@/components/domain/OptimizationBadge';
import { ConflictIndicator } from '@/components/domain/ConflictIndicator';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { DetailDrawer } from '@/components/domain/DetailDrawer';
import { PriorityBadge } from '@/components/domain/PriorityBadge';
import { DepartmentBadge } from '@/components/domain/DepartmentBadge';
import { SAMPLE_KPIS, SAMPLE_CONFLICTS } from '@/mocks/sampleData';
import { Calendar, Play, Eye } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  return (
    <div>
      <SectionHeader
        title="Operations Control Dashboard"
        description="High-density overview of corridor health, scheduled maintenance possessions, and active operational conflicts."
        badge={<OptimizationBadge status="OPTIMAL" />}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<Calendar size={14} />}
              onClick={() => {
                setSelectedItem('Inspection Schedule Overview');
                setDrawerOpen(true);
              }}
            >
              Cycle Overview
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Play size={14} />}
              onClick={() => alert('Schedule Optimizer solver hook — Reserved for Developer A implementation.')}
            >
              Run Optimizer
            </Button>
          </>
        }
      />

      {/* KPI Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        {SAMPLE_KPIS.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            subtext={kpi.subtext}
            accent={
              kpi.status === 'critical'
                ? 'critical'
                : kpi.status === 'warning'
                ? 'high'
                : 'optimal'
            }
          />
        ))}
      </div>

      {/* Two Column Operational Layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))',
          gap: 'var(--space-5)',
        }}
      >
        {/* Left: Active Optimization Run Summary */}
        <Card
          title="Active Optimization Run (RUN-20261103-01)"
          subtitle="Generated via Multi-Objective Constraint Solver"
          actions={<OptimizationBadge status="OPTIMAL" />}
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>Solver Runtime: 1,840 ms · 1,450 iterations</span>
              <Button
                variant="ghost"
                size="sm"
                icon={<Eye size={12} />}
                onClick={() => {
                  setSelectedItem('Run RUN-20261103-01 Audit Proof');
                  setDrawerOpen(true);
                }}
              >
                Inspect Proof
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Tasks Considered / Scheduled</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>25 / 18 Tasks (72%)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Total Block Duration</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>720 Mins (12.0h)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Baseline Disruption Reduction</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--status-optimal)' }}>-20.8% Train Delay</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Objective Score</span>
              <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-cyan)' }}>0.82 / 1.00</span>
            </div>
          </div>
        </Card>

        {/* Right: Operational Conflicts Ticker */}
        <Card
          title="Active Operational Conflicts"
          subtitle="Violations requiring operator review or slot shifting"
          actions={
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--priority-critical)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              3 UNRESOLVED
            </span>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {SAMPLE_CONFLICTS.map((conf) => (
              <div
                key={conf.id}
                onClick={() => {
                  setSelectedItem(`Conflict: ${conf.id} (${conf.type})`);
                  setDrawerOpen(true);
                }}
                style={{ cursor: 'pointer' }}
              >
                <ConflictIndicator
                  type={conf.type}
                  severity={conf.severity}
                  affectedEntityId={conf.affectedEntityId}
                  description={conf.description}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Inspection Drawer */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedItem || 'Operational Inspection'}
        subtitle="Deterministic evidence trace"
        badge={<PriorityBadge priority="P1" />}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
            Close Drawer
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            This detail drawer is the reusable inspection component pre-wired for Developer A and Developer B to display task breakdowns, conflict proofs, and deterministic solver outputs.
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <DepartmentBadge department="ENG" />
            <DepartmentBadge department="TRD" />
            <DepartmentBadge department="SNT" />
          </div>
          <div style={{ padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
            ENTITY_ID: {selectedItem || 'TSK-ENG-NDLS-045-01'}<br />
            STATUS: ACTIVE_VERIFIED<br />
            EVIDENCE: DETERMINISTIC_SOLVER_OK
          </div>
        </div>
      </DetailDrawer>
    </div>
  );
};
