import React from 'react';
import { Tabs, TabItem } from '../../components/common/Tabs';

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
  counts?: Record<string, number>;
}

export const ConflictCategoryTabs: React.FC<Props> = ({ activeTab, onTabChange, counts = {} }) => {
  const tabs: TabItem[] = [
    { id: 'ALL', label: 'All Conflicts', badge: counts['ALL'] },
    { id: 'TRAIN_CONFLICT', label: 'Train Overlaps', badge: counts['TRAIN_CONFLICT'] },
    { id: 'RESOURCE_CONFLICT', label: 'Resource Contention', badge: counts['RESOURCE_CONFLICT'] },
    { id: 'WINDOW_CONFLICT', label: 'Time Window', badge: counts['WINDOW_CONFLICT'] },
    { id: 'SAFETY_CONFLICT', label: 'Safety Violations', badge: counts['SAFETY_CONFLICT'] },
    { id: 'DEADLINE_CONFLICT', label: 'Overdue Work', badge: counts['DEADLINE_CONFLICT'] },
  ];

  return (
    <div className="bg-surface border border-border-hairline rounded-md overflow-x-auto custom-scrollbar">
      <Tabs
        tabs={tabs}
        activeTab={activeTab}
        onChange={onTabChange}
        layoutId="conflict-active-tab"
      />
    </div>
  );
};

export default ConflictCategoryTabs;
