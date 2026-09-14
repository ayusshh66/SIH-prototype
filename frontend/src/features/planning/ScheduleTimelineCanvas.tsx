import React from 'react';
import { BlockGanttBar } from './BlockGanttBar';

export const ScheduleTimelineCanvas: React.FC<{ blocks: any[], onBlockClick: (id: string) => void }> = ({ blocks, onBlockClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className="h-full w-full flex flex-col font-mono relative overflow-auto custom-scrollbar">
      {/* Header (Time X-Axis) */}
      <div className="sticky top-0 z-10 flex border-b border-white/10 bg-black/60 backdrop-blur-md min-w-max shadow-md">
        <div className="w-24 shrink-0 bg-black/40 border-r border-white/10 flex items-center justify-center text-[10px] tracking-widest font-bold text-gray-500 uppercase">
          KM MARKER
        </div>
        <div className="flex-1 flex min-w-[1200px]">
          {hours.map(h => (
            <div key={h} className="flex-1 text-center py-2 text-xs border-r border-white/5 text-gray-400 relative font-bold">
              {String(h).padStart(2, '0')}:00
              {(h >= 23 || h <= 4) && (
                <div className="absolute inset-0 bg-[#8B5CF6]/5 pointer-events-none" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Body (Grid Y-Axis) */}
      <div className="flex-1 flex min-w-max relative bg-transparent">
        {/* Y-Axis Labels */}
        <div className="w-24 shrink-0 bg-black/40 border-r border-white/10 sticky left-0 z-20 flex flex-col relative h-[800px] backdrop-blur-md">
           {Array.from({ length: 11 }).map((_, i) => (
             <div key={i} className="absolute w-full text-right pr-2 text-[10px] tracking-wider text-gray-500 font-bold" style={{ top: `${(i / 10) * 100}%`, transform: 'translateY(-50%)' }}>
               Km {Math.round((i / 10) * 195)}
             </div>
           ))}
        </div>

        {/* Grid Area */}
        <div className="flex-1 min-w-[1200px] relative h-[800px]">
          <div className="absolute inset-0 flex pointer-events-none">
            {hours.map(h => (
              <div key={h} className="flex-1 border-r border-white/5 h-full relative">
                {(h >= 23 || h <= 4) && (
                  <div className="absolute inset-0 bg-[#8B5CF6]/5" />
                )}
              </div>
            ))}
          </div>
          
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="w-full border-b border-white/5 absolute" style={{ top: `${(i / 10) * 100}%` }} />
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
