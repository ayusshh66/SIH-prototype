import React from 'react';
import { Card } from '../../components/common/Card';

export const KpiGrid: React.FC<{ summary: any }> = ({ summary }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
      <Card className="flex flex-col">
        <span className="text-xs font-mono font-bold text-status-critical uppercase">Critical Tasks (P1)</span>
        <span className="text-4xl font-bold mt-2">{summary.p1Tasks}</span>
        <span className="text-xs text-text-muted mt-2 border-t-2 border-surface-border pt-2">+1 Overdue Rail Defect</span>
      </Card>
      
      <Card className="flex flex-col">
        <span className="text-xs font-mono font-bold text-status-warning uppercase">High Tasks (P2)</span>
        <span className="text-4xl font-bold mt-2">{summary.p2Tasks}</span>
        <span className="text-xs text-text-muted mt-2 border-t-2 border-surface-border pt-2">5 TRD / 6 S&T</span>
      </Card>
      
      <Card className="flex flex-col">
        <span className="text-xs font-mono font-bold text-department-eng uppercase">Active Blocks</span>
        <span className="text-4xl font-bold mt-2">{summary.activeCorridors * 3}</span>
        <span className="text-xs text-text-muted mt-2 border-t-2 border-surface-border pt-2">3 Executing, 3 Appr.</span>
      </Card>

      <Card className="flex flex-col">
        <span className="text-xs font-mono font-bold text-status-shadow uppercase">Shadow Savings</span>
        <span className="text-4xl font-bold mt-2">210</span>
        <span className="text-xs text-text-muted mt-2 border-t-2 border-surface-border pt-2">Mins (3.5h) saved</span>
      </Card>
    </div>
  );
};
