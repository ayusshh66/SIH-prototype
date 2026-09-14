import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
}) => {
  return (
    <div className={`flex gap-1 border-b border-white/10 px-2 ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-all cursor-pointer ${
              isActive
                ? 'text-[#F97316] border-[#F97316] font-semibold'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="inline-flex items-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-[11px] font-mono px-1.5 py-px rounded-full ${
                  isActive
                    ? 'bg-[#F97316]/15 text-[#F97316]'
                    : 'bg-white/5 text-gray-500'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

