import React, { useEffect, useState } from 'react';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { PriorityBadge } from '../../components/domain/PriorityBadge';
import { OptimizationBadge } from '../../components/domain/OptimizationBadge';
import { DepartmentBadge } from '../../components/domain/DepartmentBadge';
import { ConflictIndicator } from '../../components/domain/ConflictIndicator';
import { TrainImpactIndicator } from '../../components/domain/TrainImpactIndicator';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Card } from '../../components/common/Card';
import { Tabs } from '../../components/common/Tabs';
import { Skeleton } from '../../components/common/Skeleton';
import { EmptyState } from '../../components/common/EmptyState';
import { ErrorState } from '../../components/common/ErrorState';
import { Modal } from '../../components/common/Modal';
import { DetailDrawer } from '../../components/domain/DetailDrawer';
import { getSystemHealth, type SystemHealth } from '../../api/client';

export const SystemPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('status');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);

  useEffect(() => {
    getSystemHealth()
      .then((res) => setHealth(res.data))
      .catch((err: unknown) => setHealthError(err instanceof Error ? err.message : String(err)));
  }, []);

  const tabs = [
    { id: 'status', label: 'Domain Status System' },
    { id: 'primitives', label: 'Design Primitives' },
    { id: 'states', label: 'Loading & State Tokens' },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Design System & Operations Foundation"
        description="Living specification of reusable UI primitives, domain status tokens, and accessibility standards."
        badge={
          <span className="bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30 px-2 py-1 rounded font-mono text-[10px] uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            FOUNDATION V1.0.0
          </span>
        }
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}>
              Open Test Modal
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(true)}>
              Open Test Drawer
            </Button>
          </div>
        }
      />

      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab 1: Domain Status System */}
      {activeTab === 'status' && (
        <div className="space-y-6 mt-4">
          <Card title="Runtime Health" subtitle="Live backend integration status">
            {healthError && <ErrorState title="Health Check Failed" message={healthError} />}
            {health && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 font-mono text-xs">
                {[
                  ['Backend', health.backend.status],
                  ['Database', health.database.status],
                  ['Python Bridge', health.python_bridge.status],
                  ['AI Engines', health.ai_engines.status],
                  ['Mode', health.mode.source.toUpperCase()],
                ].map(([label, status]) => (
                  <div key={label} className="p-4 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-t from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <span className="block text-gray-500 text-[10px] uppercase tracking-widest mb-1 relative z-10">{label}</span>
                    <span
                      className={`relative z-10 ${
                        status === 'HEALTHY' || status === 'LIVE'
                          ? 'text-[#10B981] font-bold shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                          : status === 'MOCK' || status === 'NOT_CONFIGURED'
                            ? 'text-[#F59E0B] font-bold shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                            : 'text-[#EF4444] font-bold shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                      }`}
                    >
                      {status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {health?.ai_engines.engines.length ? (
              <div className="mt-4 text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                Engines: <span className="text-white">{health.ai_engines.engines.join(', ')}</span>
              </div>
            ) : null}
          </Card>

          <Card title="1. Task & Defect Priority Scale (P1 - P4)">
            <div className="flex gap-3 flex-wrap items-center">
              <PriorityBadge priority="CRITICAL" />
              <PriorityBadge priority="HIGH" />
              <PriorityBadge priority="MEDIUM" />
              <PriorityBadge priority="LOW" />
              <span className="text-gray-600">|</span>
              <PriorityBadge priority="P1" />
              <PriorityBadge priority="P2" />
              <PriorityBadge priority="P3" />
              <PriorityBadge priority="P4" />
            </div>
          </Card>

          <Card title="2. Solver Optimization Outcome Statuses">
            <div className="flex gap-3 flex-wrap items-center">
              <OptimizationBadge status="OPTIMAL" />
              <OptimizationBadge status="FEASIBLE" />
              <OptimizationBadge status="PARTIAL" />
              <OptimizationBadge status="INFEASIBLE" />
              <OptimizationBadge status="FAILED" />
            </div>
          </Card>

          <Card title="3. Railway Maintenance Departments">
            <div className="flex gap-3 flex-wrap items-center">
              <DepartmentBadge department="ENG" />
              <DepartmentBadge department="TRD" />
              <DepartmentBadge department="SNT" />
            </div>
          </Card>

          <Card title="4. Operational Conflict Classifications">
            <div className="space-y-3">
              <ConflictIndicator
                type="TRAIN_CONFLICT"
                severity="HIGH"
                affectedEntityId="TSK-001 / TRN-12002"
                description="Overlaps high-priority passenger timetable slot."
              />
              <ConflictIndicator
                type="RESOURCE_CONFLICT"
                severity="CRITICAL"
                affectedEntityId="RES-VEH-12"
                description="Machinery double-allocated across 2 concurrent sections."
              />
              <ConflictIndicator
                type="SAFETY_CONFLICT"
                severity="CRITICAL"
                affectedEntityId="TSK-088"
                description="Interlocking clearance rule IR-SIG-402 breach."
              />
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Design Primitives */}
      {activeTab === 'primitives' && (
        <div className="space-y-6 mt-4">
          <Card title="Interactive Buttons">
            <div className="flex gap-3 flex-wrap items-center p-4 bg-black/20 rounded-xl border border-white/5">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="outline">Outline Action</Button>
              <Button variant="danger">Critical Danger</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary" size="lg">Large</Button>
            </div>
          </Card>

          <Card title="Form Inputs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input label="Corridor Section Code" defaultValue="NDLS-AGC-SEC12" />
              <Input label="Search Filter" placeholder="Search tasks..." />
              <Input label="Kilometer Marker" defaultValue="45.500" helperText="Precision within 3 decimal places" />
            </div>
          </Card>

          <Card title="Train Impact Indicators">
            <div className="flex gap-3 flex-wrap">
              <TrainImpactIndicator trainNumber="22436" trainName="Vande Bharat" trainType="EXPRESS" delayMinutes={0} />
              <TrainImpactIndicator trainNumber="12002" trainName="Bhopal Shatabdi" trainType="EXPRESS" delayMinutes={25} />
            </div>
          </Card>
        </div>
      )}

      {/* Tab 3: Loading & State Tokens */}
      {activeTab === 'states' && (
        <div className="space-y-6 mt-4">
          <Card title="Shimmer Loading Skeletons">
            <div className="space-y-3 p-4 bg-black/20 rounded-xl border border-white/5">
              <Skeleton height="24px" width="60%" />
              <Skeleton height="16px" width="90%" />
              <Skeleton height="16px" width="75%" />
              <div className="flex gap-2 pt-2">
                <Skeleton height="32px" width="120px" />
                <Skeleton height="32px" width="120px" />
              </div>
            </div>
          </Card>

          <Card title="Empty State Pattern">
            <EmptyState
              title="No Active Corridor Possession Blocks"
              description="Click 'Run Optimizer' to evaluate pending maintenance tasks against the train timetable."
              actionLabel="Run Optimizer Now"
              onAction={() => alert('Optimization triggered')}
            />
          </Card>

          <Card title="Error State Pattern">
            <ErrorState
              title="Constraint Solver Boundary Violation"
              message="Failed to compute conflict-free schedule: No feasible window without disrupting P1 critical services."
              onRetry={() => alert('Retrying solver')}
            />
          </Card>
        </div>
      )}

      {/* Test Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Operations Dialog Test"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
              Confirm Decision
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-400">
          This dialog verifies keyboard accessibility (Tab focus trap, Enter submit, Escape dismiss) for operational confirmations.
        </p>
      </Modal>

      {/* Test Drawer */}
      <DetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Slide-out Inspection Drawer"
        subtitle="Used for inspecting blocks, tasks, and conflicts"
        actions={
          <Button variant="secondary" size="sm" onClick={() => setDrawerOpen(false)}>
            Close Drawer
          </Button>
        }
      >
        <p className="text-sm text-gray-400">
          Standard drawer used for inspecting blocks, tasks, and conflicts without leaving the main operational canvas.
        </p>
      </DetailDrawer>
    </div>
  );
};

export default SystemPage;
