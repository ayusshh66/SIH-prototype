import React from 'react';
import { Drawer } from '../../components/common/Drawer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';
import { MaintenanceTask } from '../../types/api';
import { CriticalityFactorBars } from './CriticalityFactorBars';

interface Props {
  task: MaintenanceTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailSheet: React.FC<Props> = ({ task, isOpen, onClose }) => {
  if (!task) return <Drawer isOpen={isOpen} onClose={onClose} title="Task Detail"><></></Drawer>;

  const mockFactors = {
    severity: 0.28,
    urgency: 0.22,
    safety_risk: 0.20,
    traffic_density: 0.09,
    speed_class: 0.07,
    deadline_proximity: 0.08
  };

  const priorityBadge = task.criticalityScore >= 85 ? 'p1' : task.criticalityScore >= 70 ? 'p2' : 'p3';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Task: ${task.taskCode}`}>
      <div className="space-y-6">
        <div className="flex gap-2 flex-wrap">
           <Badge variant={priorityBadge as any}>P{priorityBadge === 'p1' ? 1 : priorityBadge === 'p2' ? 2 : 3}</Badge>
           <Badge variant={task.departmentId as any}>{task.departmentId}</Badge>
           <Badge>{task.taskType}</Badge>
        </div>

        <Card className="shadow-none">
          <p className="font-mono text-sm leading-relaxed">{task.description}</p>
          <div className="mt-4 pt-4 border-t border-surface-border grid grid-cols-2 gap-4 font-mono text-xs text-text-muted">
            <div>
               <span className="block uppercase">Asset</span>
               <span className="text-text-primary font-bold text-sm">{task.assetId}</span>
            </div>
            <div>
               <span className="block uppercase">Location</span>
               <span className="text-text-primary font-bold text-sm">Km {task.locationStartKm} - {task.locationEndKm}</span>
            </div>
            <div>
               <span className="block uppercase">Est. Duration</span>
               <span className="text-text-primary font-bold text-sm">{task.estimatedDurationMinutes}m</span>
            </div>
          </div>
        </Card>

        <Card className="shadow-none bg-background-main border-surface-border">
          <CriticalityFactorBars score={task.criticalityScore} factors={mockFactors} />
          
          <div className="mt-6 p-3 border-l-2 border-status-critical bg-surface-card font-mono text-xs leading-relaxed text-text-muted">
            <span className="font-bold text-text-primary mb-1 block uppercase tracking-widest">Deterministic Explanation:</span>
            "High severity, critical safety risk, and extreme urgency dominate the score. Immediate track possession required prior to {task.dueAt?.split('T')[0]}."
            <div className="mt-2 text-[10px] uppercase">Model: criticality_v1_rule_2026Q4 | Mode: RULE_BASED</div>
          </div>
        </Card>

        <div className="pt-6 flex flex-col gap-3">
           <Button variant="secondary" className="w-full py-3">Recalculate Priority</Button>
           <Button variant="primary" className="w-full">Schedule in Block</Button>
        </div>
      </div>
    </Drawer>
  );
};
