import React from 'react';
import { motion } from 'framer-motion';

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
  layoutId?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  layoutId = 'tab-active-indicator',
}) => {
  return (
    <div
      className={`flex items-center gap-2 border-b border-border-hairline px-2 ${className}`}
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`relative inline-flex items-center gap-2 px-3.5 py-2.5 text-small font-medium transition-colors cursor-pointer select-none ${
              isActive ? 'text-content-primary' : 'text-content-tertiary hover:text-content-secondary'
            }`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span className="inline-flex items-center">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`text-micro font-mono px-1.5 py-0.5 rounded-sm tabular-nums ${
                  isActive
                    ? 'bg-accent-500/15 text-accent-400'
                    : 'bg-surface-sunken text-content-tertiary'
                }`}
              >
                {tab.badge}
              </span>
            )}
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-500 shadow-sm"
                transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
