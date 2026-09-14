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
          <h2 className="text-2xl font-bold uppercase tracking-widest text-white drop-shadow-md">Maintenance Tasks</h2>
          <p className="text-gray-400 font-mono text-xs mt-1 tracking-wider">BACKLOG & PENDING WORK ORDERS</p>
        </div>
      </div>
      
      <div className="flex-1 bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
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
