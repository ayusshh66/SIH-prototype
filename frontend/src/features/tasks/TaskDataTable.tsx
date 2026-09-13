import React, { useState } from 'react';
import { MaintenanceTask } from '../../types/api';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';

interface Props {
  tasks: MaintenanceTask[];
  onRowClick: (task: MaintenanceTask) => void;
}

export const TaskDataTable: React.FC<Props> = ({ tasks, onRowClick }) => {
  const [filter, setFilter] = useState<'ALL' | 'ENG' | 'TRD' | 'SNT'>('ALL');

  const filteredTasks = tasks.filter(t => filter === 'ALL' || t.departmentId === filter);

  return (
    <div className="flex flex-col h-full font-mono">
      <div className="flex gap-2 p-4 border-b-2 border-surface-border bg-background-main shrink-0">
        {['ALL', 'ENG', 'TRD', 'SNT'].map(dept => (
          <Button 
            key={dept} 
            variant={filter === dept ? 'primary' : 'secondary'}
            onClick={() => setFilter(dept as any)}
            className="text-xs py-1 px-3"
          >
            {dept}
          </Button>
        ))}
      </div>
      
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="sticky top-0 bg-surface-card border-b-2 border-surface-border uppercase text-text-muted z-10">
            <tr>
              <th className="p-4 font-bold tracking-wider">Task Code</th>
              <th className="p-4 font-bold tracking-wider">Dept</th>
              <th className="p-4 font-bold tracking-wider">Asset / Location</th>
              <th className="p-4 font-bold tracking-wider">Type</th>
              <th className="p-4 font-bold tracking-wider">Score</th>
              <th className="p-4 font-bold tracking-wider">Due</th>
              <th className="p-4 font-bold tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {filteredTasks.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-text-muted">No tasks found.</td>
              </tr>
            )}
            {filteredTasks.map(task => (
              <tr 
                key={task.id} 
                className="hover:bg-background-main cursor-pointer transition-colors"
                onClick={() => onRowClick(task)}
              >
                <td className="p-4 font-bold text-text-primary">{task.taskCode}</td>
                <td className="p-4"><Badge variant={task.departmentId as any}>{task.departmentId}</Badge></td>
                <td className="p-4">{task.assetId} @ Km {task.locationStartKm}</td>
                <td className="p-4">{task.taskType}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${task.criticalityScore >= 85 ? 'text-status-critical' : 'text-text-primary'}`}>{task.criticalityScore}</span>
                  </div>
                </td>
                <td className="p-4">
                  {task.overdueDays > 0 ? (
                     <span className="text-status-critical font-bold">OVERDUE ({task.overdueDays}d)</span>
                  ) : (
                     <span className="text-text-muted">{task.dueAt?.split('T')[0]}</span>
                  )}
                </td>
                <td className="p-4"><Badge variant={task.status === 'SCHEDULED' ? 'optimal' : 'default'}>{task.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
