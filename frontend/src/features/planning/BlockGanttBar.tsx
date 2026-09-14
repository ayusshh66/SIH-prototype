import React from 'react';
import { motion } from 'framer-motion';

export const BlockGanttBar: React.FC<{ block: any; onClick: () => void }> = ({ block, onClick }) => {
  const startDate = new Date(block.startAt);
  const startHour = startDate.getUTCHours() + (startDate.getUTCMinutes() / 60);

  const leftPct = (startHour / 24) * 100;
  const widthPct = Math.max((block.durationMinutes / 1440) * 100, 1.8);

  const topPct = (block.locationStartKm / 195) * 100;
  const heightPct = Math.max(((block.locationEndKm - block.locationStartKm) / 195) * 100, 3.5);

  const dept = (block.departments && block.departments[0]) || 'ENG';
  const hasConflict = Boolean(block.conflict || block.hasConflict || block.status === 'CONFLICT');
  const isShadow = block.isShadowBlock || (block.departments && block.departments.length > 1);

  // Department color styles
  let deptBg = 'bg-dept-engineering-bg text-dept-engineering border-dept-engineering/40';
  if (dept === 'TRD') deptBg = 'bg-dept-trd-bg text-dept-trd border-dept-trd/40';
  if (dept === 'SNT') deptBg = 'bg-dept-snt-bg text-dept-snt border-dept-snt/40';
  if (isShadow) deptBg = 'bg-safety-restricted-bg text-safety-restricted border-safety-restricted/40';

  // Criticality left stripe color
  const criticality = block.priority || block.criticality || 'P2';
  const critStripe =
    criticality === 'P1' || criticality === 'CRITICAL'
      ? 'border-l-crit-p1'
      : criticality === 'P2' || criticality === 'HIGH'
      ? 'border-l-crit-p2'
      : criticality === 'P3' || criticality === 'MEDIUM'
      ? 'border-l-crit-p3'
      : 'border-l-crit-p4';

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 260, damping: 25 }}
      whileHover={{ scale: 1.02, zIndex: 30 }}
      whileTap={{ scale: 0.98 }}
      className={`absolute ${deptBg} border-l-4 ${critStripe} border rounded-sm cursor-pointer z-10 flex items-center justify-between px-2 overflow-hidden shadow-sm select-none ${
        hasConflict ? 'hazard-stripes ring-1 ring-crit-p1' : ''
      }`}
      style={{
        left: `${leftPct}%`,
        width: `${widthPct}%`,
        top: `${topPct}%`,
        height: `${heightPct}%`,
        minHeight: '1.75rem',
      }}
      onClick={onClick}
      title={`${block.blockCode} (${dept}) | ${block.durationMinutes}m | ${block.locationStartKm}-${block.locationEndKm}km`}
    >
      <div className="flex items-center gap-1.5 truncate">
        <span className="font-mono text-micro font-semibold text-content-primary truncate">
          {block.blockCode}
        </span>
        {isShadow && (
          <span className="text-[9px] font-mono px-1 py-0.2 rounded-sm bg-safety-restricted text-white uppercase">
            SHADOW
          </span>
        )}
      </div>

      <span className="font-mono text-micro text-content-tertiary tabular-nums hidden sm:inline">
        {block.durationMinutes}m
      </span>
    </motion.div>
  );
};

export default BlockGanttBar;
