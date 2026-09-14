import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  Wrench,
  Combine,
  Activity,
  AlertTriangle,
  GitBranch,
  BellElectric,
  ShieldAlert,
  Server,
  ChevronLeft,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface NavGroup {
  group: string;
  items: {
    path: string;
    label: string;
    icon: React.ElementType;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    group: 'Planning',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
      { path: '/planning', label: 'Schedule Gantt', icon: Calendar },
      { path: '/tasks', label: 'Maintenance Tasks', icon: Wrench },
      { path: '/shadow-blocks', label: 'Shadow Blocks', icon: Combine, badge: 'AI' },
      { path: '/what-if', label: 'What-If Scenarios', icon: GitBranch },
    ],
  },
  {
    group: 'Monitoring',
    items: [
      { path: '/trains', label: 'Train Operations', icon: Activity },
      { path: '/conflicts', label: 'Conflicts & Alerts', icon: AlertTriangle },
      { path: '/emergency', label: 'Emergency Block', icon: BellElectric },
    ],
  },
  {
    group: 'System',
    items: [
      { path: '/explain', label: 'Decision Audit', icon: ShieldAlert },
      { path: '/system', label: 'Engine Health', icon: Server },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <motion.aside
      animate={{ width: collapsed ? 68 : 240 }}
      transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      className="shrink-0 bg-surface border-r border-border-hairline h-full flex flex-col relative z-30 select-none overflow-hidden"
    >
      {/* Product Mark / Brand */}
      <div className="h-14 border-b border-border-hairline flex items-center px-4 gap-3 shrink-0">
        <div className="w-8 h-8 rounded-sm bg-accent-500/15 border border-accent-500/30 flex items-center justify-center text-accent-400 shrink-0">
          <Radio size={18} className="animate-pulse" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col truncate"
            >
              <span className="font-semibold text-small text-content-primary tracking-tight truncate">
                RAIL-CONSOLE
              </span>
              <span className="text-micro font-mono text-content-tertiary uppercase tracking-wider">
                AUTO-BLOCK v2.4
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav List Grouped */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 custom-scrollbar space-y-4">
        {navGroups.map((group) => (
          <div key={group.group} className="space-y-1">
            <AnimatePresence>
              {!collapsed ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-2.5 py-1 text-micro font-mono uppercase tracking-widest text-content-tertiary"
                >
                  {group.group}
                </motion.div>
              ) : (
                <div className="h-2" />
              )}
            </AnimatePresence>

            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  item.path === '/'
                    ? location.pathname === '/'
                    : location.pathname.startsWith(item.path);

                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      title={collapsed ? item.label : undefined}
                      className={`relative flex items-center gap-3 px-2.5 py-2 rounded-sm text-small transition-colors ${
                        isActive
                          ? 'text-content-primary font-medium'
                          : 'text-content-secondary hover:text-content-primary hover:bg-surface-sunken/60'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-active-pill"
                          className="absolute inset-0 bg-accent-500/12 rounded-sm border-l-2 border-accent-500"
                          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                        />
                      )}

                      <item.icon
                        size={18}
                        strokeWidth={isActive ? 2 : 1.5}
                        className={`relative z-10 shrink-0 ${
                          isActive ? 'text-accent-400' : 'text-content-tertiary'
                        }`}
                      />

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className="relative z-10 truncate flex-1 flex items-center justify-between"
                          >
                            <span>{item.label}</span>
                            {item.badge && (
                              <span className="text-[10px] font-mono px-1 py-0.2 rounded-sm bg-accent-500/20 text-accent-400">
                                {item.badge}
                              </span>
                            )}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Collapse Toggle Footer */}
      <div className="p-2 border-t border-border-hairline bg-surface-sunken/40 flex items-center justify-between shrink-0">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-sm hover:bg-surface-raised transition-colors text-content-tertiary hover:text-content-primary text-small"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label="Toggle sidebar collapse"
        >
          {collapsed ? (
            <ChevronRight size={16} />
          ) : (
            <>
              <ChevronLeft size={16} />
              <span className="text-micro font-mono uppercase tracking-wider">Collapse Rail</span>
            </>
          )}
        </button>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
