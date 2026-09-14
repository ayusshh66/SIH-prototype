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
          <Card className="p-3 shadow-none !bg-black/30">
             <span className="text-[10px] text-gray-500 font-mono block tracking-widest uppercase">Start KM</span>
             <span className="font-bold font-mono text-lg text-white">{block.locationStartKm}</span>
          </Card>
          <Card className="p-3 shadow-none !bg-black/30">
             <span className="text-[10px] text-gray-500 font-mono block tracking-widest uppercase">End KM</span>
             <span className="font-bold font-mono text-lg text-white">{block.locationEndKm}</span>
          </Card>
        </div>
        
        <Card className="shadow-none !bg-black/30">
          <div className="flex justify-between items-center mb-4">
            <span className="font-mono text-sm text-gray-500 tracking-wider">DURATION</span>
            <span className="font-bold font-mono text-xl text-white">{block.durationMinutes} mins</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-white/10">
            <span className="font-mono text-sm text-gray-500 tracking-wider">TIME SAVED</span>
            <span className="font-bold font-mono text-[#8B5CF6]">+{block.savedMinutes} mins</span>
          </div>
        </Card>

        <div>
          <h3 className="font-mono font-bold text-sm mb-3 border-b border-white/10 pb-2 text-white uppercase tracking-widest">Scheduled Tasks</h3>
          <div className="space-y-3">
            {block.blockTasks.map((bt: any) => (
              <div key={bt.id} className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-lg flex justify-between items-center hover:bg-white/5 transition-colors">
                <div className="flex flex-col">
                   <span className="font-mono text-xs font-bold text-white">{bt.maintenanceTaskId}</span>
                   <span className="text-[10px] text-gray-500 uppercase mt-1 tracking-widest">{bt.status}</span>
                </div>
                <Badge variant={bt.departmentId as any}>{bt.departmentId}</Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-6 flex flex-col gap-3">
           <Button variant="primary" className="w-full">Approve Block</Button>
           <Button variant="secondary" className="w-full">View AI Explanation</Button>
           <Button variant="danger" className="w-full">Reject / Infeasible</Button>
        </div>
      </div>
    </Drawer>
  );
};
