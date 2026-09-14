import React from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Sun, Moon, Search, User, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';

const routeNameMap: Record<string, string> = {
  '': 'Dashboard',
  planning: 'Schedule Gantt',
  tasks: 'Maintenance Tasks',
  'shadow-blocks': 'Shadow Blocks',
  trains: 'Train Operations',
  conflicts: 'Conflicts & Alerts',
  'what-if': 'What-If Scenarios',
  emergency: 'Emergency Block',
  explain: 'Decision Audit',
  system: 'Engine Health',
};

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const currentTitle = pathSegments.length > 0 ? routeNameMap[pathSegments[0]] || pathSegments[0] : 'Dashboard';

  return (
    <header className="h-14 bg-canvas/85 backdrop-blur-md border-b border-border-hairline sticky top-0 z-20 flex items-center justify-between px-6 select-none">
      {/* Left: Breadcrumb */}
      <div className="flex items-center gap-2 text-small">
        <span className="text-content-tertiary font-mono uppercase text-micro tracking-wider">
          IR_NORTHERN // AGRA
        </span>
        <ChevronRight size={14} className="text-content-disabled" />
        <span className="font-semibold text-content-primary">
          {currentTitle}
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Search / Command palette pill */}
        <button
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-sm bg-surface border border-border-hairline text-content-tertiary hover:border-border-strong hover:text-content-secondary transition-colors text-small"
          onClick={() => {}}
        >
          <Search size={14} />
          <span>Quick search corridor...</span>
          <kbd className="font-mono text-micro bg-surface-sunken px-1.5 py-0.5 rounded border border-border-hairline text-content-tertiary">
            ⌘K
          </kbd>
        </button>

        {/* Solver status indicator */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-status-feasible-bg text-status-feasible border border-status-feasible/30 text-micro font-mono">
          <CheckCircle2 size={12} />
          <span>SOLVER ONLINE</span>
        </div>

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-sm text-content-secondary hover:text-content-primary hover:bg-surface-raised transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          <motion.div
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </motion.div>
        </button>

        {/* Notifications Bell */}
        <button
          className="relative p-2 rounded-sm text-content-secondary hover:text-content-primary hover:bg-surface-raised transition-colors cursor-pointer"
          title="Operational alerts"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-crit-p1 animate-pulse" />
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2 pl-2 border-l border-border-hairline">
          <div className="w-8 h-8 rounded-sm bg-surface-raised border border-border-hairline flex items-center justify-center text-content-secondary font-mono text-micro font-semibold">
            <User size={15} className="text-content-primary" />
          </div>
          <div className="hidden lg:flex flex-col text-left">
            <span className="text-micro font-semibold text-content-primary leading-tight">
              A. SHARMA
            </span>
            <span className="text-[10px] font-mono text-content-tertiary leading-tight">
              SR_DOM / CONTROLLER
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
