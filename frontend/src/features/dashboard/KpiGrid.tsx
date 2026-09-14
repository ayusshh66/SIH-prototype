import React from 'react';
import { Flame, AlertTriangle, Combine, Clock, Gauge, Activity } from 'lucide-react';
import { KpiCard } from '../../components/domain/KpiCard';

export const KpiGrid: React.FC<{ summary: any }> = ({ summary }) => {
  const p1 = summary?.p1Tasks ?? 4;
  const p2 = summary?.p2Tasks ?? 11;
  const activeCorridors = summary?.activeCorridors ?? 1;
  const activeBlocks = activeCorridors * 4;
  const shadowSavings = summary?.shadowSavingsMinutes ?? 210;
  const disruptionReduction = summary?.disruptionReductionPct ?? 28;
  const objectiveScore = summary?.objectiveScore ?? 94.2;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <KpiCard
        label="Critical Tasks"
        value={p1}
        accent="critical"
        icon={<Flame size={16} className="text-crit-p1" />}
        subtext="+1 Overdue Rail Defect"
        trend="+1"
        trendGood={false}
        sparklineData={[2, 3, 3, 5, 4, p1]}
      />

      <KpiCard
        label="High Priority"
        value={p2}
        accent="high"
        icon={<AlertTriangle size={16} className="text-crit-p2" />}
        subtext="5 TRD / 6 S&T queued"
        trend="stable"
        trendGood={true}
        sparklineData={[14, 13, 12, 12, 11, p2]}
      />

      <KpiCard
        label="Scheduled Blocks"
        value={activeBlocks}
        accent="blue"
        icon={<Activity size={16} className="text-accent-400" />}
        subtext="3 Active / 1 Pending"
        trend="+2 today"
        trendGood={true}
        sparklineData={[2, 3, 3, 4, 4, activeBlocks]}
      />

      <KpiCard
        label="Shadow Time Saved"
        value={`${shadowSavings}m`}
        accent="optimal"
        icon={<Combine size={16} className="text-status-feasible" />}
        subtext="3.5h corridor relief"
        trend="▲ 14%"
        trendGood={true}
        sparklineData={[120, 140, 160, 180, 200, shadowSavings]}
      />

      <KpiCard
        label="Disruption Reduced"
        value={`${disruptionReduction}%`}
        accent="optimal"
        icon={<Clock size={16} className="text-status-feasible" />}
        subtext="vs sequential baseline"
        trend="▲ 6%"
        trendGood={true}
        sparklineData={[18, 20, 22, 24, 26, disruptionReduction]}
      />

      <KpiCard
        label="Objective Score"
        value={objectiveScore}
        accent="blue"
        icon={<Gauge size={16} className="text-accent-400" />}
        subtext="OR-Tools MILP optimal"
        trend="P1 weighted"
        trendGood={true}
        sparklineData={[88, 90, 91, 93, 94, objectiveScore]}
      />
    </div>
  );
};

export default KpiGrid;
