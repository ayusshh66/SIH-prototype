"use client";
import React, { useState } from 'react';
import { ConflictAlertCard } from './ConflictAlertCard';
import { ConflictCategoryTabs } from './ConflictCategoryTabs';
import { Conflict } from '../../types/api';

const mockConflicts: Conflict[] = [
  {
    conflict_id: "CONF-20261103-01",
    conflict_type: "TRAIN_CONFLICT",
    entity_ids: ["TSK-ENG-NDLS-045-01", "trn_02_12002"],
    section_id: "NDLS-AGC-SEC12",
    start: "2026-11-03T23:45:00Z",
    end: "2026-11-04T00:15:00Z",
    severity: "HIGH",
    description: "Proposed block overlaps passage slot for Train 12002 Shatabdi Express at Km 45.2. Recommend shifting start to 00:30."
  },
  {
    conflict_id: "CONF-20261103-02",
    conflict_type: "RESOURCE_CONFLICT",
    entity_ids: ["TSK-ENG-NDLS-045-01", "TSK-ENG-NDLS-092"],
    section_id: "NDLS-AGC-SEC12",
    start: "2026-11-03T23:00:00Z",
    end: "2026-11-04T01:30:00Z",
    severity: "CRITICAL",
    description: "USFD Testing Vehicle USFD-V-12 allocated simultaneously to two separate rail scans."
  },
  {
    conflict_id: "CONF-20261103-03",
    conflict_type: "SAFETY_CONFLICT",
    entity_ids: ["TSK-ENG-NDLS-088", "TSK-SNT-NDLS-089"],
    section_id: "NDLS-AGC-SEC14",
    start: "2026-11-04T02:00:00Z",
    end: "2026-11-04T04:30:00Z",
    severity: "CRITICAL",
    description: "Interlocking safety constraint: S&T point sensor calibration cannot co-occur with heavy mechanical ballast tamping."
  }
];

export const ConflictsAlertsPage: React.FC = () => {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredConflicts = mockConflicts.filter(c => filter === 'ALL' || c.conflict_type === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-widest text-text-primary">Conflicts & Alerts</h2>
          <p className="text-text-muted font-mono text-sm mt-1">UNIFIED OPERATIONAL VIOLATIONS</p>
        </div>
      </div>
      
      <ConflictCategoryTabs activeTab={filter} onTabChange={setFilter} />
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {filteredConflicts.map(conflict => (
           <ConflictAlertCard key={conflict.conflict_id} conflict={conflict} />
        ))}
        {filteredConflicts.length === 0 && (
          <div className="col-span-full p-8 border-2 border-surface-border text-center font-mono text-status-optimal bg-surface-card">
             CLEAR SECTION: ZERO ACTIVE CONFLICTS OR SAFETY VIOLATIONS DETECTED.
          </div>
        )}
      </div>
    </div>
  );
};
