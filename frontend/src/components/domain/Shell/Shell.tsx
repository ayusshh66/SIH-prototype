import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SidebarList } from './SidebarList';
import { motion } from 'framer-motion';

export const Shell: React.FC = () => {
  return (
    <div className="h-screen w-screen overflow-hidden text-white flex font-sans bg-transparent relative z-0">
      
      {/* Slim Left Nav (Fixed) */}
      <Sidebar />
      
      {/* Secondary Left Panel - Tracking List */}
      <SidebarList />

      {/* Main Content Area (Floating Bottom & Right Panels will be rendered by the Page via Outlet) */}
      <main className="flex-1 relative w-full h-full p-4 pointer-events-none z-10 overflow-hidden">
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 p-4 pointer-events-auto h-full overflow-y-auto custom-scrollbar pb-24"
        >
          <Outlet />
        </motion.div>
      </main>

      {/* Floating Pill Header at Top Right */}
      <Header />
    </div>
  );
};
