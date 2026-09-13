"use client";
import React, { useEffect, useState } from 'react';
import { getDashboardData } from '../../api/client';
import { KpiGrid } from './KpiGrid';
import { CorridorStatusBar } from './CorridorStatusBar';
import { RecentRunsCard } from './RecentRunsCard';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getDashboardData().then(res => {
      if (res.success) setData(res.data);
    });
  }, []);

  if (!data) return <div className="font-mono text-text-muted p-4 animate-pulse">LOADING DASHBOARD DATA...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">Dashboard Cockpit</h2>
          <p className="text-text-muted font-mono text-sm mt-1">REAL-TIME OPERATIONAL OVERVIEW</p>
        </div>
        <div className="flex items-center gap-4 font-mono text-sm hidden md:flex">
          <span className="text-text-muted">HORIZON:</span>
          <span className="px-2 py-1 bg-surface-card border-2 border-surface-border font-bold">7D (WEEKLY)</span>
        </div>
      </div>
      
      <CorridorStatusBar />
      
      <KpiGrid summary={data.summary} />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentRunsCard runs={data.recentRuns} />
        <div className="bg-surface-card border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] p-4 flex flex-col">
          <div className="font-mono text-sm font-bold text-text-muted uppercase border-b-2 border-surface-border pb-2 mb-4">Active Operational Alerts</div>
          <div className="space-y-3 flex-1">
             <div className="border-l-4 border-status-critical bg-background-main p-3">
                <span className="text-status-critical font-bold text-xs uppercase tracking-wider">TRAIN_CONFLICT</span>
                <p className="text-sm mt-1 font-mono text-text-primary">Block BLK-04 overlaps 12002 Shatabdi Exp at Km 45.2 (HIGH)</p>
             </div>
             <div className="border-l-4 border-status-warning bg-background-main p-3">
                <span className="text-status-warning font-bold text-xs uppercase tracking-wider">RESOURCE_CONFLICT</span>
                <p className="text-sm mt-1 font-mono text-text-primary">USFD Vehicle V-12 double-allocated between Task 01 and Task 04</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
