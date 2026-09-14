import React, { useEffect, useState } from 'react';
import { Plus, Download } from 'lucide-react';
import { getTasks } from '../../api/client';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { TaskDataTable } from './TaskDataTable';
import { TaskDetailSheet } from './TaskDetailSheet';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import type { MaintenanceTask } from '../../types/api';

export const MaintenanceTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTasks()
      .then((res) => {
        if (res.success) setTasks(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Maintenance Tasks & Defects"
        description="Unified task backlog across Civil Engineering (P-Way), Overhead Traction (TRD), and Signal & Telecommunication (S&T)."
        badge={
          <span className="text-micro font-mono px-2 py-0.5 rounded-sm bg-surface-sunken border border-border-hairline text-content-tertiary">
            {tasks.length} REGISTERED DEFECTS
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<Download size={14} />}
              onClick={() => {}}
            >
              Export CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => {}}
            >
              Log Work Order
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton height={48} />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} height={52} />
          ))}
        </div>
      ) : (
        <TaskDataTable tasks={tasks} onRowClick={setSelectedTask} />
      )}

      <TaskDetailSheet
        task={selectedTask}
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
      />
    </div>
  );
};

export default MaintenanceTasksPage;
