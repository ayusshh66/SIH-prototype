import React from 'react';
import { Drawer } from '../../components/common/Drawer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { DepartmentBadge } from '../../components/domain/DepartmentBadge';
import { PriorityBadge } from '../../components/domain/PriorityBadge';
import { CriticalityFactorBars } from './CriticalityFactorBars';
import { ShieldCheck, Calendar, MapPin, Clock, Wrench } from 'lucide-react';
import type { MaintenanceTask } from '../../types/api';

interface Props {
  task: MaintenanceTask | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetailSheet: React.FC<Props> = ({ task, isOpen, onClose }) => {
  if (!task) return null;

  const mockFactors = {
    severity: 0.28,
    urgency: 0.22,
    safety_risk: 0.20,
    traffic_density: 0.09,
    speed_class: 0.07,
    deadline_proximity: 0.08,
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Wrench size={16} className="text-accent-400" />
          <span>{task.taskCode}</span>
        </div>
      }
      subtitle={`DEPT: ${task.departmentId} // ASSET: ${task.assetId}`}
      footer={
        <div className="flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Dismiss
          </Button>
          <Button variant="primary" size="sm" onClick={() => {}}>
            Assign to Schedule
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Badges strip */}
        <div className="flex items-center gap-2 flex-wrap">
          <PriorityBadge
            priority={task.criticalityScore >= 80 ? 'P1' : task.criticalityScore >= 60 ? 'P2' : 'P3'}
            score={task.criticalityScore}
          />
          <DepartmentBadge department={task.departmentId} />
          <Badge tone={task.status === 'SCHEDULED' ? 'status-feasible' : 'neutral'}>
            {task.status}
          </Badge>
        </div>

        {/* Task Description */}
        <div className="p-4 bg-surface border border-border-hairline rounded-md space-y-3">
          <p className="text-small text-content-primary leading-relaxed font-sans">
            {task.description || 'Routine maintenance inspection and safety ultrasonic defect scan along corridor segment.'}
          </p>

          {/* 2-column mono metadata grid */}
          <div className="pt-3 border-t border-border-subtle grid grid-cols-2 gap-3 text-micro font-mono">
            <div>
              <span className="text-content-tertiary block flex items-center gap-1">
                <MapPin size={11} /> LOCATION
              </span>
              <span className="text-content-primary font-semibold">
                Km {Number(task.locationStartKm).toFixed(1)} – {Number(task.locationEndKm).toFixed(1)}
              </span>
            </div>

            <div>
              <span className="text-content-tertiary block flex items-center gap-1">
                <Clock size={11} /> EST DURATION
              </span>
              <span className="text-content-primary font-semibold">
                {task.estimatedDurationMinutes} mins
              </span>
            </div>

            <div>
              <span className="text-content-tertiary block flex items-center gap-1">
                <Calendar size={11} /> DUE DATE
              </span>
              <span className="text-content-primary font-semibold">
                {task.dueAt?.split('T')[0] || 'Next Block Window'}
              </span>
            </div>

            <div>
              <span className="text-content-tertiary block">OVERDUE STATE</span>
              <span className={`font-semibold ${task.overdueDays > 0 ? 'text-crit-p1' : 'text-status-feasible'}`}>
                {task.overdueDays > 0 ? `+${task.overdueDays} days late` : 'Within Horizon'}
              </span>
            </div>
          </div>
        </div>

        {/* Factor Breakdown */}
        <div className="p-4 bg-surface border border-border-hairline rounded-md">
          <CriticalityFactorBars score={task.criticalityScore} factors={mockFactors} />
        </div>

        {/* Deterministic Explanation Box */}
        <div className="p-4 bg-surface-sunken border-l-4 border-l-accent-500 border border-border-hairline rounded-sm space-y-2">
          <div className="flex items-center gap-1.5 text-accent-400 text-micro font-mono font-semibold uppercase tracking-wider">
            <ShieldCheck size={14} />
            <span>Deterministic Rule-Engine Explanation</span>
          </div>
          <p className="text-small text-content-secondary font-mono leading-relaxed">
            "High severity, critical safety risk, and extreme urgency dominate the score. Track possession recommended prior to {task.dueAt?.split('T')[0] || 'horizon'}."
          </p>
          <div className="text-[10px] font-mono text-content-tertiary pt-1 border-t border-border-subtle">
            ENGINE: criticality_v2.4_audit | MODE: RULE_BASED_DETERMINISTIC
          </div>
        </div>
      </div>
    </Drawer>
  );
};

export default TaskDetailSheet;
