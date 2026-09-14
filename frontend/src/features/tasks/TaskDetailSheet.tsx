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

        <Card className="shadow-none !bg-black/30">
          <p className="font-mono text-sm leading-relaxed text-gray-300">{task.description}</p>
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-2 gap-4 font-mono text-xs text-gray-500">
            <div>
               <span className="block uppercase text-[10px] tracking-widest">Asset</span>
               <span className="text-white font-bold text-sm">{task.assetId}</span>
            </div>
            <div>
               <span className="block uppercase text-[10px] tracking-widest">Location</span>
               <span className="text-white font-bold text-sm">Km {task.locationStartKm} - {task.locationEndKm}</span>
            </div>
            <div>
               <span className="block uppercase text-[10px] tracking-widest">Est. Duration</span>
               <span className="text-white font-bold text-sm">{task.estimatedDurationMinutes}m</span>
            </div>
          </div>
        </Card>

        <Card className="shadow-none !bg-black/40 border border-white/5">
          <CriticalityFactorBars score={task.criticalityScore} factors={mockFactors} />
          
          <div className="mt-6 p-4 border-l border-[#EF4444] bg-black/50 font-mono text-xs leading-relaxed text-gray-400">
            <span className="font-bold text-white mb-2 block uppercase tracking-widest text-[10px]">Deterministic Explanation:</span>
            "High severity, critical safety risk, and extreme urgency dominate the score. Immediate track possession required prior to {task.dueAt?.split('T')[0]}."
            <div className="mt-3 text-[10px] uppercase text-gray-500 tracking-wider">Model: criticality_v1_rule_2026Q4 | Mode: RULE_BASED</div>
          </div>
        </Card>

        <div className="pt-6 flex flex-col gap-3">
           <Button variant="secondary" className="w-full">Recalculate Priority</Button>
           <Button variant="primary" className="w-full">Schedule in Block</Button>
        </div>
      </div>
    </Drawer>
  );
};
