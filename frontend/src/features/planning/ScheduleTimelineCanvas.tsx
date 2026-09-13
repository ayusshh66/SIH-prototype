import React from 'react';
import { BlockGanttBar } from './BlockGanttBar';

export const ScheduleTimelineCanvas: React.FC<{ blocks: any[], onBlockClick: (id: string) => void }> = ({ blocks, onBlockClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className="h-full w-full flex flex-col font-mono relative overflow-auto">
      {/* Header (Time X-Axis) */}
      <div className="sticky top-0 z-10 flex border-b-2 border-surface-border bg-background-main min-w-max">
        <div className="w-24 shrink-0 bg-surface-card border-r-2 border-surface-border flex items-center justify-center text-xs font-bold text-text-muted">
          KM MARKER
        </div>
        <div className="flex-1 flex min-w-[1200px]">
          {hours.map(h => (
            <div key={h} className="flex-1 text-center py-2 text-xs border-r border-surface-border/50 text-text-muted relative">
              {String(h).padStart(2, '0')}:00
              {(h >= 23 || h <= 4) && (
                <div className="absolute inset-0 bg-status-shadow/10 pointer-events-none" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Body (Grid Y-Axis) */}
      <div className="flex-1 flex min-w-max relative bg-background-main">
        {/* Y-Axis Labels */}
        <div className="w-24 shrink-0 bg-surface-card border-r-2 border-surface-border sticky left-0 z-20 flex flex-col relative h-[800px]">
           {Array.from({ length: 11 }).map((_, i) => (
             <div key={i} className="absolute w-full text-right pr-2 text-xs text-text-muted" style={{ top: `${(i / 10) * 100}%`, transform: 'translateY(-50%)' }}>
               Km {Math.round((i / 10) * 195)}
             </div>
           ))}
        </div>

        {/* Grid Area */}
        <div className="flex-1 min-w-[1200px] relative h-[800px]">
          <div className="absolute inset-0 flex pointer-events-none">
            {hours.map(h => (
              <div key={h} className="flex-1 border-r border-surface-border/20 h-full relative">
                {(h >= 23 || h <= 4) && (
                  <div className="absolute inset-0 bg-status-shadow/10" />
                )}
              </div>
            ))}
          </div>
          
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-full border-b border-surface-border/20 absolute" style={{ top: `${(i / 10) * 100}%` }} />
            ))}
          </div>
          
          {blocks.map(block => (
             <BlockGanttBar key={block.id} block={block} onClick={() => onBlockClick(block.id)} />
          ))}
        </div>
      </div>
    </div>
  );
};
