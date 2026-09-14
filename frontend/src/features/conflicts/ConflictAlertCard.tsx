import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, TrainTrack, ShieldAlert } from 'lucide-react';
import { criticalConflictPulse, collapseHeight } from '../../lib/motion';
import type { Conflict } from '../../types/api';

export const ConflictAlertCard: React.FC<{ conflict: Conflict }> = ({ conflict }) => {
  const [expanded, setExpanded] = useState(true);
  const isCritical = conflict.severity === 'CRITICAL';
  const isHigh = (conflict.severity as string) === 'MEDIUM' || (conflict.severity as string) === 'HIGH';

  const borderClass = isCritical
    ? 'border-l-4 border-l-crit-p1'
    : isHigh
    ? 'border-l-4 border-l-crit-p2'
    : 'border-l-4 border-l-status-partial';

  return (
    <Card className={`flex flex-col h-full ${borderClass} transition-colors`}>
      <div className="p-5 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={isCritical ? criticalConflictPulse.animate : undefined}
              transition={isCritical ? criticalConflictPulse.transition : undefined}
              className={isCritical ? 'text-crit-p1' : isHigh ? 'text-crit-p2' : 'text-status-partial'}
            >
              <AlertTriangle size={18} strokeWidth={2} />
            </motion.div>
            <div>
              <span className="text-h3 font-mono font-semibold text-content-primary">
                {conflict.conflict_id}
              </span>
              <span className="text-micro font-mono text-content-tertiary block">
                SECTION: {conflict.section_id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              tone={isCritical ? 'crit-p1' : isHigh ? 'crit-p2' : 'status-partial'}
              showDot
            >
              {conflict.severity}
            </Badge>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-sm text-content-tertiary hover:text-content-primary hover:bg-surface-sunken transition-colors"
              aria-label="Toggle details"
            >
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Description */}
        <p className="text-small text-content-secondary leading-relaxed font-sans">
          {conflict.description}
        </p>

        {/* Expandable Entity Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              variants={collapseHeight}
              initial="initial"
              animate="animate"
              exit="exit"
              className="space-y-3 pt-2 overflow-hidden"
            >
              <div>
                <h4 className="text-micro font-mono uppercase tracking-wider text-content-tertiary mb-1.5">
                  Affected Entities ({conflict.entity_ids?.length || 0})
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {conflict.entity_ids?.map((id) => (
                    <span
                      key={id}
                      className="px-2 py-0.5 rounded-sm bg-surface-sunken border border-border-hairline font-mono text-micro text-content-primary"
                    >
                      {id}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle flex items-center justify-between text-micro font-mono text-content-tertiary">
                <span className="flex items-center gap-1">
                  <Clock size={11} /> Detected: {conflict.start ? conflict.start.replace('T', ' ') : 'Live Telemetry'}
                </span>
                <span className="text-accent-400 font-semibold cursor-pointer hover:underline">
                  Auto-Resolve via Solver →
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Card>
  );
};

export default ConflictAlertCard;
