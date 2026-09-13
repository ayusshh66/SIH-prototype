"use client";
import React, { useEffect, useState } from 'react';
import { getBlocks } from '../../api/client';
import { ScheduleTimelineCanvas } from './ScheduleTimelineCanvas';
import { BlockDetailDrawer } from './BlockDetailDrawer';
import { Button } from '../../components/common/Button';

export const PlanningSchedulePage: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    getBlocks().then(res => {
      if (res.success) setBlocks(res.data);
    });
  }, []);

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">Planning Schedule</h2>
          <p className="text-text-muted font-mono text-sm mt-1">MULTI-DEPARTMENT POSSESSION TIMELINE</p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary">Filters</Button>
          <Button variant="primary">Run Optimizer</Button>
        </div>
      </div>
      
      <div className="bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex-1 overflow-hidden relative flex flex-col">
         <ScheduleTimelineCanvas blocks={blocks} onBlockClick={setSelectedBlockId} />
      </div>

      <BlockDetailDrawer 
        block={selectedBlock} 
        isOpen={!!selectedBlock} 
        onClose={() => setSelectedBlockId(null)} 
      />
    </div>
  );
};
