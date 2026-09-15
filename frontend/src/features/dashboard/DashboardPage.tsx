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

const buildConflictCards = (dashboardData: any) => {
  const latestRun = Array.isArray(dashboardData?.recentRuns) ? dashboardData.recentRuns[0] : null;
  const summary = dashboardData?.summary || {};

  const trainConflicts = Array.isArray(latestRun?.train_conflicts) ? latestRun.train_conflicts.length : 0;
  const resourceUtilization = latestRun?.resource_utilization || {};
  const peakResourceUtilization = Object.values(resourceUtilization).length
    ? Math.max(...Object.values(resourceUtilization).map((value: any) => Number(value) || 0))
    : 0;
  const pendingTasks = Number(summary.pendingTasks || 0);
  const unscheduledTasks = Array.isArray(latestRun?.unscheduled_task_ids)
    ? latestRun.unscheduled_task_ids.length
    : 0;

  return [
    {
      type: 'TRAIN_CONFLICT',
      severity: trainConflicts > 0 ? 'CRITICAL' : 'MEDIUM',
      affectedEntityId: trainConflicts > 0 ? `RUN-${latestRun?.runCode || 'latest'}` : 'LATEST-RUN',
      description:
        trainConflicts > 0
          ? `${trainConflicts} train conflict(s) remain in the latest optimization run.`
          : 'No train conflicts detected in the latest optimization run.',
    },
    {
      type: 'RESOURCE_CONFLICT',
      severity: peakResourceUtilization > 0.85 ? 'HIGH' : 'MEDIUM',
      affectedEntityId: Object.keys(resourceUtilization).length ? 'UTILIZATION' : 'NO-CONFLICT',
      description:
        peakResourceUtilization > 0
          ? `Peak tracked resource utilization is ${peakResourceUtilization.toFixed(2)} across the latest run.`
          : 'No tracked resource contention was reported in the latest optimization run.',
    },
    {
      type: 'WINDOW_CONFLICT',
      severity: pendingTasks > 0 || unscheduledTasks > 0 ? 'MEDIUM' : 'LOW',
      affectedEntityId: 'WINDOW-PRESSURE',
      description:
        pendingTasks > 0 || unscheduledTasks > 0
          ? `${pendingTasks} pending task(s) and ${unscheduledTasks} unscheduled task(s) indicate current window pressure.`
          : 'No immediate window pressure was reported in the latest dashboard snapshot.',
    },
  ];
};

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

  const conflictCards = buildConflictCards(data);

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Page Header */}
      <SectionHeader
        title="Rail Operations Dashboard"
        description="See the current rail operations status, priorities, and conflicts in one place."
        badge={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-status-feasible-bg text-status-feasible border border-status-feasible/30 text-micro font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-status-feasible animate-pulse" />
            Live Corridor Data
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
            {conflictCards.map((conflict) => (
              <ConflictIndicator
                key={conflict.type}
                type={conflict.type}
                severity={conflict.severity}
                affectedEntityId={conflict.affectedEntityId}
                description={conflict.description}
              />
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPage;
