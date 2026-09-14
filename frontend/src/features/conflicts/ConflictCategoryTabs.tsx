import React from 'react';
import { Button } from '../../components/common/Button';

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const ConflictCategoryTabs: React.FC<Props> = ({ activeTab, onTabChange }) => {
  const tabs = ['ALL', 'TRAIN_CONFLICT', 'RESOURCE_CONFLICT', 'WINDOW_CONFLICT', 'SAFETY_CONFLICT', 'DEADLINE_CONFLICT'];

  return (
    <div className="flex gap-2 flex-wrap bg-black/20 backdrop-blur-md p-4 border border-white/5 rounded-2xl shadow-xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      {tabs.map(tab => (
        <Button 
          key={tab} 
          variant={activeTab === tab ? 'primary' : 'secondary'} 
          onClick={() => onTabChange(tab)}
          className="text-[10px] uppercase tracking-wider py-1.5 px-3"
        >
          {tab.replace('_', ' ')}
        </Button>
      ))}
    </div>
  );
};
