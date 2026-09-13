import React from 'react';
import { Drawer } from '../../components/common/Drawer';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Card } from '../../components/common/Card';

export const BlockDetailDrawer: React.FC<{ block: any, isOpen: boolean, onClose: () => void }> = ({ block, isOpen, onClose }) => {
  if (!block) return <Drawer isOpen={isOpen} onClose={onClose} title="Block Details"><></></Drawer>;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title={`Block: ${block.blockCode}`}>
      <div className="space-y-6">
        
        <div className="flex gap-2 flex-wrap mb-4">
           <Badge variant={block.status.toLowerCase() as any}>{block.status}</Badge>
           {block.departments.map((d: any) => (
             <Badge key={d} variant={d as any}>{d}</Badge>
           ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-3 shadow-none">
             <span className="text-[10px] text-text-muted font-mono block">START KM</span>
             <span className="font-bold font-mono text-lg text-text-primary">{block.locationStartKm}</span>
          </Card>
          <Card className="p-3 shadow-none">
             <span className="text-[10px] text-text-muted font-mono block">END KM</span>
             <span className="font-bold font-mono text-lg text-text-primary">{block.locationEndKm}</span>
          </Card>
        </div>
        
        <Card className="shadow-none">
          <div className="flex justify-between items-center mb-4">
            <span className="font-mono text-sm text-text-muted">DURATION</span>
            <span className="font-bold font-mono text-xl text-text-primary">{block.durationMinutes} mins</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-surface-border">
            <span className="font-mono text-sm text-text-muted">TIME SAVED</span>
            <span className="font-bold font-mono text-status-shadow">+{block.savedMinutes} mins</span>
          </div>
        </Card>

        <div>
          <h3 className="font-mono font-bold text-sm mb-3 border-b-2 border-surface-border pb-2 text-text-primary">SCHEDULED TASKS</h3>
          <div className="space-y-3">
            {block.blockTasks.map((bt: any) => (
              <div key={bt.id} className="bg-surface-card border-2 border-surface-border p-3 flex justify-between items-center">
                <div className="flex flex-col">
                   <span className="font-mono text-xs font-bold text-text-primary">{bt.maintenanceTaskId}</span>
                   <span className="text-[10px] text-text-muted uppercase mt-1 tracking-widest">{bt.status}</span>
                </div>
                <Badge variant={bt.departmentId as any}>{bt.departmentId}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 flex flex-col gap-3">
           <Button variant="primary" className="w-full py-3">Approve Block</Button>
           <Button variant="secondary" className="w-full">View AI Explanation</Button>
           <Button variant="danger" className="w-full">Reject / Infeasible</Button>
        </div>
      </div>
    </Drawer>
  );
};
