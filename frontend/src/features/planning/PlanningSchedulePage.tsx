import React, { useEffect, useState } from 'react';
import { getBlocks } from '../../api/client';
import { ScheduleTimelineCanvas } from './ScheduleTimelineCanvas';
import { BlockDetailDrawer } from './BlockDetailDrawer';
import { Button } from '../../components/common/Button';
import { Railway3DViewPlaceholder } from '../../components/domain/Railway3DViewPlaceholder';

export const PlanningSchedulePage: React.FC = () => {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  useEffect(() => {
    getBlocks().then((res) => {
      if (res.success) setBlocks(res.data);
    });
  }, []);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  return (
    <div className="space-y-6 flex flex-col">
      {/* ── 1. Planning Controls ─────────────────────────────────── */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">
            Planning Schedule
          </h2>
          <p className="text-text-muted font-mono text-sm mt-1">
            MULTI-DEPARTMENT POSSESSION TIMELINE & 3D DIGITAL TWIN
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="secondary">Filters</Button>
          <Button variant="primary">Run Optimizer</Button>
        </div>
      </div>

      {/* ── 2. Schedule Timeline Canvas ──────────────────────────── */}
      <div className="bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col">
        <div className="px-4 py-2 border-b-2 border-surface-border bg-background-main font-mono text-xs uppercase font-bold text-text-muted">
          Corridor Possession Timeline
        </div>
        <div className="p-4">
          <ScheduleTimelineCanvas
            blocks={blocks}
            onBlockClick={setSelectedBlockId}
          />
        </div>
      </div>

      {/* ── 3. Railway3DView ─────────────────────────────────────── */}
      <div className="bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] flex flex-col">
        <div className="px-4 py-2 border-b-2 border-surface-border bg-background-main font-mono text-xs uppercase font-bold text-text-muted">
          Corridor Digital Twin // Spatial Viewport
        </div>
        <div className="p-2">
          <Railway3DViewPlaceholder
            corridorId="NDLS-AGC"
            selectedBlockId={selectedBlockId}
          />
        </div>
      </div>

      {/* ── Block Detail Inspection Drawer ───────────────────────── */}
      <BlockDetailDrawer
        block={selectedBlock}
        isOpen={!!selectedBlock}
        onClose={() => setSelectedBlockId(null)}
      />
    </div>
  );
};

export default PlanningSchedulePage;
