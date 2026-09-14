import React, { useState, useMemo } from 'react';
import type { MaintenanceTask } from '../../types/api';
import { Table, Column } from '../../components/common/Table';
import { DepartmentBadge } from '../../components/domain/DepartmentBadge';
import { PriorityBadge } from '../../components/domain/PriorityBadge';
import { Badge } from '../../components/common/Badge';

interface Props {
  tasks: MaintenanceTask[];
  onRowClick: (task: MaintenanceTask) => void;
}

export const TaskDataTable: React.FC<Props> = ({ tasks, onRowClick }) => {
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'ENG' | 'TRD' | 'SNT'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'NORMAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Department counts
  const counts = useMemo(() => {
    return {
      ALL: tasks.length,
      ENG: tasks.filter((t) => t.departmentId === 'ENG').length,
      TRD: tasks.filter((t) => t.departmentId === 'TRD').length,
      SNT: tasks.filter((t) => t.departmentId === 'SNT').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (deptFilter !== 'ALL' && t.departmentId !== deptFilter) return false;
      if (priorityFilter === 'CRITICAL' && t.criticalityScore < 80) return false;
      if (priorityFilter === 'HIGH' && (t.criticalityScore < 60 || t.criticalityScore >= 80)) return false;
      if (priorityFilter === 'NORMAL' && t.criticalityScore >= 60) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          t.taskCode.toLowerCase().includes(q) ||
          t.assetId.toLowerCase().includes(q) ||
          t.taskType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tasks, deptFilter, priorityFilter, searchQuery]);

  const columns: Column<MaintenanceTask>[] = [
    {
      key: 'taskCode',
      header: 'Task ID',
      width: '130px',
      render: (task) => (
        <span className="font-mono font-semibold text-content-primary">
          {task.taskCode}
        </span>
      ),
    },
    {
      key: 'departmentId',
      header: 'Dept',
      width: '100px',
      render: (task) => <DepartmentBadge department={task.departmentId} />,
    },
    {
      key: 'assetId',
      header: 'Asset & Location',
      render: (task) => (
        <div className="flex flex-col">
          <span className="font-mono font-medium text-content-primary">{task.assetId}</span>
          <span className="text-micro font-mono text-content-tertiary">
            Km {Number(task.locationStartKm).toFixed(1)} – {Number(task.locationEndKm).toFixed(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'taskType',
      header: 'Activity Type',
      render: (task) => (
        <span className="text-small text-content-secondary font-mono">
          {task.taskType}
        </span>
      ),
    },
    {
      key: 'criticalityScore',
      header: 'Criticality',
      isNumeric: true,
      width: '140px',
      render: (task) => (
        <PriorityBadge
          priority={task.criticalityScore >= 80 ? 'P1' : task.criticalityScore >= 60 ? 'P2' : 'P3'}
          score={task.criticalityScore}
        />
      ),
    },
    {
      key: 'dueAt',
      header: 'Deadline',
      isNumeric: true,
      width: '140px',
      render: (task) => {
        const isOverdue = task.overdueDays > 0;
        return (
          <div className="flex flex-col items-end">
            {isOverdue ? (
              <span className="text-micro font-mono font-semibold text-crit-p1 bg-crit-p1-bg px-1.5 py-0.5 rounded-sm">
                OVERDUE +{task.overdueDays}d
              </span>
            ) : (
              <span className="font-mono text-small text-content-secondary tabular-nums">
                {task.dueAt?.split('T')[0] || 'Horizon'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      width: '120px',
      render: (task) => (
        <Badge
          tone={task.status === 'SCHEDULED' ? 'status-feasible' : 'neutral'}
          showDot={task.status === 'SCHEDULED'}
        >
          {task.status}
        </Badge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Sticky Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-surface border border-border-hairline rounded-md">
        {/* Department Chips with count badges */}
        <div className="flex items-center gap-1.5">
          {(['ALL', 'ENG', 'TRD', 'SNT'] as const).map((dept) => {
            const active = deptFilter === dept;
            return (
              <button
                key={dept}
                onClick={() => setDeptFilter(dept)}
                className={`inline-flex items-center gap-2 px-3 py-1 rounded-sm text-small font-mono transition-colors cursor-pointer select-none ${
                  active
                    ? 'bg-accent-500 text-white font-semibold'
                    : 'bg-surface-sunken text-content-secondary hover:text-content-primary hover:bg-surface-raised border border-border-hairline'
                }`}
              >
                <span>{dept}</span>
                <span
                  className={`text-micro px-1 rounded-sm ${
                    active ? 'bg-white/20 text-white' : 'bg-surface text-content-tertiary'
                  }`}
                >
                  {counts[dept]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search input & Priority filter */}
        <div className="flex items-center gap-2.5">
          <input
            type="text"
            placeholder="Search task, asset, code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 px-3 rounded-sm bg-surface-sunken border border-border-hairline text-small font-mono text-content-primary placeholder-content-disabled focus:outline-none focus:border-border-strong w-48 sm:w-64"
          />

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="h-8 px-2 rounded-sm bg-surface-sunken border border-border-hairline text-micro font-mono text-content-secondary focus:outline-none focus:border-border-strong cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">P1 Only (&gt;=80)</option>
            <option value="HIGH">P2 (60–79)</option>
            <option value="NORMAL">P3/P4 (&lt;60)</option>
          </select>
        </div>
      </div>

      {/* Main Data Table */}
      <Table<MaintenanceTask>
        columns={columns}
        data={filteredTasks}
        keyExtractor={(task) => task.id}
        onRowClick={onRowClick}
        emptyText="No maintenance tasks match the active filters"
      />
    </div>
  );
};

export default TaskDataTable;
