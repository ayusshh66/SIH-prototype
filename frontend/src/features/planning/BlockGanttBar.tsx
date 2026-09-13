import React from 'react';

export const BlockGanttBar: React.FC<{ block: any, onClick: () => void }> = ({ block, onClick }) => {
  const startDate = new Date(block.startAt);
  const startHour = startDate.getUTCHours() + (startDate.getUTCMinutes() / 60);
  
  const leftPct = (startHour / 24) * 100;
  const widthPct = (block.durationMinutes / 1440) * 100; 
  
  const topPct = (block.locationStartKm / 195) * 100;
  const heightPct = Math.max(((block.locationEndKm - block.locationStartKm) / 195) * 100, 3); 

  const dept = block.departments[0];
  let colorClass = "bg-department-eng border-department-eng";
  if (dept === "TRD") colorClass = "bg-department-trd border-department-trd text-background-main";
  if (dept === "SNT") colorClass = "bg-department-snt border-department-snt text-background-main";
  if (block.departments.length > 1) colorClass = "bg-status-shadow border-status-shadow text-white";
  if (dept === "ENG") colorClass += " text-white";

  return (
    <div 
      className={`absolute ${colorClass} opacity-90 hover:opacity-100 cursor-pointer border-2 shadow-[2px_2px_0px_0px_rgba(31,41,55,1)] transition-transform hover:-translate-y-0.5 hover:-translate-x-0.5 z-10 flex items-center justify-center overflow-hidden`}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        top: `${topPct}%`,
        height: `${heightPct}%`,
        minHeight: '1.5rem'
      }}
      onClick={onClick}
    >
      <div className="text-[10px] font-bold truncate px-1 uppercase tracking-wide">
        {block.blockCode}
      </div>
    </div>
  );
};
