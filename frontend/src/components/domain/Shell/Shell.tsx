import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { fadeInUp } from '../../../lib/motion';

export const Shell: React.FC = () => {
  const location = useLocation();

  return (
    <div className="h-screen w-screen overflow-hidden text-content-primary flex font-sans bg-canvas relative z-0">
      {/* Persistent Left Nav Rail (240px collapsible to 68px) */}
      <Sidebar />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Sticky Top Header Bar */}
        <Header />

        {/* Scrollable Route Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
          <div className="max-w-[1600px] mx-auto px-6 py-6 pb-20">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                variants={fadeInUp}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Shell;
