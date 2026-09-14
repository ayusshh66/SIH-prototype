import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RotateCcw } from 'lucide-react';
import { getDashboardData } from '../../api/client';
import { SectionHeader } from '../../components/domain/SectionHeader';
import { KpiGrid } from './KpiGrid';
import { CorridorStatusBar } from './CorridorStatusBar';
import { RecentRunsCard } from './RecentRunsCard';
import { Railway3DViewPlaceholder } from '../../components/domain/Railway3DViewPlaceholder';
import { ConflictIndicator } from '../../components/domain/ConflictIndicator';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Skeleton } from '../../components/common/Skeleton';
import { fadeInUp, staggerContainer } from '../../lib/motion';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardData()
      .then((res) => {
        if (res.success) setData(res.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton height={42} width={340} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} height={120} />
          ))}
        </div>
        <Skeleton height={260} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton height={240} />
          <Skeleton height={240} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Page Header */}
      <SectionHeader
        title="Operations Control Console"
        description="Real-time corridor telemetry, AI auto-block scheduling horizon, and active safety conflicts across Northern Railway."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-status-feasible-bg text-status-feasible border border-status-feasible/30 text-micro font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-status-feasible animate-pulse" />
            TELEMETRY STREAM LIVE
          </span>
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<RotateCcw size={14} />}
              onClick={() => window.location.reload()}
            >
              Refresh Stream
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Play size={14} />}
              onClick={() => window.location.href = '/planning'}
            >
              Run Solver
            </Button>
          </>
        }
      />

      {/* 6-KPI Top Grid */}
      <motion.div variants={fadeInUp}>
        <KpiGrid summary={data?.summary || {}} />
      </motion.div>

      {/* Corridor Diagram Visual Schematic */}
      <motion.div variants={fadeInUp}>
        <Railway3DViewPlaceholder corridorId="NDLS-AGC" />
      </motion.div>

      {/* Multi-section Segment Strip */}
      <motion.div variants={fadeInUp}>
        <CorridorStatusBar />
      </motion.div>

      {/* Bottom Row: Recent Runs & Active Conflicts */}
      <motion.div variants={fadeInUp} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentRunsCard runs={data?.recentRuns} />

        <Card
          title="Active System Conflicts"
          eyebrow="Safety & Timetable Alerts"
          className="h-full"
        >
          <div className="space-y-3">
            <ConflictIndicator
              type="TRAIN_CONFLICT"
              severity="CRITICAL"
              affectedEntityId="BLK-04 / 12002"
              description="Block BLK-04 overlaps 12002 Shatabdi Exp at Km 45.2. Safety clearance violated."
            />
            <ConflictIndicator
              type="RESOURCE_CONFLICT"
              severity="HIGH"
              affectedEntityId="USFD-V12"
              description="USFD vehicle double-allocated between Task 01 (Track Renewal) and Task 04."
            />
            <ConflictIndicator
              type="WINDOW_CONFLICT"
              severity="MEDIUM"
              affectedEntityId="OHE-L1"
              description="Traction isolation window ends 15 mins prior to catenary tower wagon arrival."
            />
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
