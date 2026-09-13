import React from 'react';
import { Button } from '../../components/common/Button';

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ConflictCategoryTabs: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const tabs = ['ALL', 'TRAIN_CONFLICT', 'RESOURCE_CONFLICT', 'WINDOW_CONFLICT', 'SAFETY_CONFLICT', 'DEADLINE_CONFLICT'];

  return (
    <div className="flex gap-2 flex-wrap bg-surface-card p-4 border-2 border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)]">
      {tabs.map(tab => (
        <Button 
          key={tab} 
          variant={activeTab === tab ? 'primary' : 'secondary'} 
          onClick={() => onTabChange(tab)}
          className="text-xs py-1"
        >
          {tab.replace('_', ' ')}
        </Button>
      ))}
    </div>
  );
};
