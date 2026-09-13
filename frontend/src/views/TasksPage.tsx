import React, { useState } from 'react';
import { SectionHeader } from '@/components/domain/SectionHeader';
import { PriorityBadge } from '@/components/domain/PriorityBadge';
import { DepartmentBadge } from '@/components/domain/DepartmentBadge';
import { Card } from '@/components/common/Card';
import { Table, type Column } from '@/components/common/Table';
import { Button } from '@/components/common/Button';
import { DetailDrawer } from '@/components/domain/DetailDrawer';
import { Input } from '@/components/common/Input';
import { Search, Plus, Filter } from 'lucide-react';

interface TaskRow {
  taskCode: string;
  department: 'ENG' | 'TRD' | 'SNT';
  description: string;
  locationKm: string;
  durationMinutes: number;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  score: number;
  status: 'PENDING' | 'SCHEDULED';
}

const SAMPLE_TASKS: TaskRow[] = [
  {
    taskCode: 'TSK-ENG-NDLS-045-01',
    department: 'ENG',
    description: 'Rail head split testing and fishplate joint replacement',
    locationKm: '45.500',
    durationMinutes: 150,
    priority: 'CRITICAL',
    score: 94,
    status: 'SCHEDULED',
  },
  {
    taskCode: 'TSK-TRD-NDLS-046-02',
    department: 'TRD',
    description: '25kV Catenary contact wire tensioning and cantilever inspection',
    locationKm: '46.100',
    durationMinutes: 120,
    priority: 'HIGH',
    score: 82,
    status: 'SCHEDULED',
  },
  {
    taskCode: 'TSK-SNT-NDLS-045-03',
    department: 'SNT',
    description: 'Point machine 102A ground interlocking recalibration',
    locationKm: '45.200',
    durationMinutes: 90,
    priority: 'HIGH',
    score: 88,
    status: 'SCHEDULED',
  },
  {
    taskCode: 'TSK-ENG-NDLS-112-04',
    department: 'ENG',
    description: 'Routine USFD ultrasonic scanning across switch expansion joint',
    locationKm: '112.400',
    durationMinutes: 180,
    priority: 'MEDIUM',
    score: 62,
    status: 'PENDING',
  },
];

export const TasksPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedTask, setSelectedTask] = useState<TaskRow | null>(null);

  const filtered = SAMPLE_TASKS.filter((t) =>
    t.taskCode.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const columns: Column<TaskRow>[] = [
    {
      key: 'taskCode',
      header: 'Task Code',
      render: (t) => (
        <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
          {t.taskCode}
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Dept',
      render: (t) => <DepartmentBadge department={t.department} />,
    },
    {
      key: 'description',
      header: 'Description',
      render: (t) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {t.description}
        </span>
      ),
    },
    {
      key: 'locationKm',
      header: 'Location',
      render: (t) => (
        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-cyan)' }}>
          Km {t.locationKm}
        </span>
      ),
    },
    {
      key: 'durationMinutes',
      header: 'Duration',
      render: (t) => (
        <span style={{ fontFamily: 'var(--font-mono)' }}>
          {t.durationMinutes}m
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'score',
      header: 'Score',
      render: (t) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
          {t.score}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => (
        <span
          style={{
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            padding: '2px 6px',
            borderRadius: 'var(--radius-xs)',
            background: t.status === 'SCHEDULED' ? 'var(--status-optimal-bg)' : 'var(--bg-surface-raised)',
            color: t.status === 'SCHEDULED' ? 'var(--status-optimal)' : 'var(--text-muted)',
          }}
        >
          {t.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <SectionHeader
        title="Maintenance Tasks Inventory"
        description="Comprehensive repository of Civil Engineering (P-Way), Traction (TRD), and Signal & Telecommunication (S&T) work items."
        badge={<PriorityBadge priority="CRITICAL" />}
        actions={
          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <Button variant="outline" size="sm" icon={<Filter size={14} />}>
              Filter Dept
            </Button>
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              New Work Item
            </Button>
          </div>
        }
      />

      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <Input
              placeholder="Search by Task Code, Asset, or Description..."
              icon={<Search size={16} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            COUNT: {filtered.length} / {SAMPLE_TASKS.length}
          </div>
        </div>
      </Card>

      <Table
        columns={columns}
        data={filtered}
        keyExtractor={(item) => item.taskCode}
        onRowClick={(task) => setSelectedTask(task)}
      />

      {/* Task Detail Sheet */}
      <DetailDrawer
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTask(null)}
        title={selectedTask?.taskCode || 'Task Detail'}
        subtitle={selectedTask?.description}
        badge={selectedTask ? <PriorityBadge priority={selectedTask.priority} /> : undefined}
        actions={
          <Button variant="secondary" size="sm" onClick={() => setSelectedTask(null)}>
            Close
          </Button>
        }
      >
        {selectedTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ padding: '12px', background: 'var(--bg-surface-raised)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-default)' }}>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                Deterministic Criticality Score
              </div>
              <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--priority-critical)' }}>
                {selectedTask.score} / 100
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Model: criticality_v1_rule_2026Q4 · Mode: RULE_BASED
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
                FACTOR CONTRIBUTIONS (WEIGHTED)
              </span>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Severity Factor: 0.28</span>
                <span>Urgency Factor: 0.22</span>
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>Safety Risk: 0.20</span>
                <span>Traffic Density: 0.09</span>
              </div>
            </div>

            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', background: 'var(--bg-surface-raised)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              Ready for Developer B to implement full XGBoost/ML extensibility hooks as defined in FRONTEND_ARCHITECTURE.md §24.
            </div>
          </div>
        )}
      </DetailDrawer>
    </div>
  );
};
