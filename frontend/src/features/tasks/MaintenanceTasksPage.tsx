import React, { useEffect, useState } from 'react';
import { getTasks } from '../../api/client';
import { TaskDataTable } from './TaskDataTable';
import { TaskDetailSheet } from './TaskDetailSheet';
import { MaintenanceTask } from '../../types/api';

export const MaintenanceTasksPage: React.FC = () => {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(null);

  useEffect(() => {
    getTasks().then(res => {
      if (res.success) setTasks(res.data);
    });
  }, []);

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">Maintenance Tasks</h2>
          <p className="text-text-muted font-mono text-sm mt-1">BACKLOG & PENDING WORK ORDERS</p>
        </div>
      </div>
      
      <div className="flex-1 bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-0 overflow-hidden flex flex-col">
        <TaskDataTable tasks={tasks} onRowClick={setSelectedTask} />
      </div>

      <TaskDetailSheet 
        task={selectedTask} 
        isOpen={!!selectedTask} 
        onClose={() => setSelectedTask(null)} 
      />
    </div>
  );
};
