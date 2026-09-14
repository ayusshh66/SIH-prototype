import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  LogOut
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/planning', label: 'Schedule', icon: Calendar },
  { path: '/tasks', label: 'Tasks', icon: Wrench },
  { path: '/shadow-blocks', label: 'Shadow Blocks', icon: Combine },
  { path: '/trains', label: 'Trains', icon: Activity },
  { path: '/conflicts', label: 'Alerts', icon: AlertTriangle },
  { path: '/what-if', label: 'What-If', icon: GitBranch },
  { path: '/emergency', label: 'Emergency', icon: BellElectric },
  { path: '/explain', label: 'Decisions', icon: ShieldAlert },
  { path: '/system', label: 'System', icon: Server },
];

export const Sidebar: React.FC = () => {
  const location = useLocation();

  return (
    <aside className="w-16 flex-shrink-0 bg-[#18181B] border-r border-white/10 h-full flex flex-col relative z-30">
      <div className="flex items-center justify-center h-16 border-b border-white/10">
        <div className="w-8 h-8 rounded bg-gradient-to-br from-[#F97316] to-[#F59E0B] flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.4)]">
          <Combine size={18} className="text-white" />
        </div>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
        <ul className="space-y-3">
          {navItems.map((item, index) => {
            const isActive =
              item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

            return (
              <motion.li 
                key={item.path}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <NavLink
                  to={item.path}
                  title={item.label}
                  className={`flex items-center justify-center w-12 h-12 rounded-xl transition-all relative group ${
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-gray-500 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#F97316] rounded-r-full shadow-[0_0_8px_#F97316]"
                      initial={false}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <item.icon size={22} strokeWidth={isActive ? 2 : 1.5} className="relative z-10" />
                </NavLink>
              </motion.li>
            );
          })}
        </ul>
      </nav>
      
      <div className="p-2 border-t border-white/10 z-10 flex justify-center pb-4">
        <button className="w-12 h-12 flex items-center justify-center rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors group relative">
          <LogOut size={22} strokeWidth={1.5} />
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
