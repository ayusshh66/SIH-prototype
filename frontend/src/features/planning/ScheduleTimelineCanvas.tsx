import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Move } from 'lucide-react';
import { BlockGanttBar } from './BlockGanttBar';

export const ScheduleTimelineCanvas: React.FC<{
  blocks: any[];
  onBlockClick: (id: string) => void;
}> = ({ blocks, onBlockClick }) => {
  const [zoom, setZoom] = useState(1);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const minWidth = Math.max(1200 * zoom, 1200);

  return (
    <div className="flex flex-col bg-surface border border-border-hairline rounded-md overflow-hidden font-mono select-none">
      {/* Canvas Controls Top Bar */}
      <div className="px-4 py-2 bg-surface-sunken border-b border-border-hairline flex items-center justify-between text-micro text-content-tertiary">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-content-primary">
            TIME-DISTANCE (STRING-LINE) GANTT
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-safety-restricted/50" />
            NIGHT WINDOW (23:00–05:00)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.75))}
            className="p-1 rounded-sm bg-surface border border-border-hairline hover:bg-surface-raised text-content-secondary hover:text-content-primary"
            title="Zoom out"
          >
            <ZoomOut size={13} />
          </button>
          <span className="tabular-nums px-1">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 2))}
            className="p-1 rounded-sm bg-surface border border-border-hairline hover:bg-surface-raised text-content-secondary hover:text-content-primary"
            title="Zoom in"
          >
            <ZoomIn size={13} />
          </button>
        </div>
      </div>

      {/* Main Canvas Scroll Area */}
      <div className="relative overflow-auto custom-scrollbar h-[680px]">
        {/* Header: Time X-Axis */}
        <div className="sticky top-0 z-20 flex border-b border-border-hairline bg-surface/95 backdrop-blur-md min-w-max">
          <div className="w-24 shrink-0 bg-surface-sunken border-r border-border-hairline flex items-center justify-center text-micro font-semibold text-content-tertiary uppercase">
            KM
          </div>
          <div className="flex-1 flex" style={{ minWidth }}>
            {hours.map((h) => {
              const isNight = h >= 23 || h <= 4;
              return (
                <div
                  key={h}
                  className={`flex-1 text-center py-2 text-micro border-r border-border-subtle relative font-semibold ${
                    isNight ? 'text-accent-400 bg-accent-500/[0.03]' : 'text-content-secondary'
                  }`}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              );
            })}
          </div>
        </div>

        {/* Grid Body */}
        <div className="flex min-w-max relative bg-surface-sunken/20">
          {/* Y-Axis KM Labels */}
          <div className="w-24 shrink-0 bg-surface/95 border-r border-border-hairline sticky left-0 z-20 flex flex-col relative h-[600px] backdrop-blur-md">
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-full text-right pr-2.5 text-micro font-medium text-content-tertiary tabular-nums"
                style={{ top: `${(i / 10) * 100}%`, transform: 'translateY(-50%)' }}
              >
                Km {Math.round((i / 10) * 195)}
              </div>
            ))}
          </div>

          {/* Grid Area with Blocks */}
          <div className="flex-1 relative h-[600px]" style={{ minWidth }}>
            {/* Vertical hour lines */}
            <div className="absolute inset-0 flex pointer-events-none">
              {hours.map((h) => {
                const isNight = h >= 23 || h <= 4;
                return (
                  <div
                    key={h}
                    className={`flex-1 border-r border-border-subtle/50 h-full ${
                      isNight ? 'bg-accent-500/[0.02]' : ''
                    }`}
                  />
                );
              })}
            </div>

            {/* Horizontal km lines */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="w-full border-b border-border-subtle/50 absolute"
                  style={{ top: `${(i / 10) * 100}%` }}
                />
              ))}
            </div>

            {/* Gantt Bars */}
            {blocks.map((block) => (
              <BlockGanttBar
                key={block.id}
                block={block}
                onClick={() => onBlockClick(block.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTimelineCanvas;
