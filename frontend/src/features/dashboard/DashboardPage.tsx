import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { getDashboardData } from '../../api/client';
import { KpiGrid } from './KpiGrid';
import { CorridorStatusBar } from './CorridorStatusBar';
import { RecentRunsCard } from './RecentRunsCard';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    getDashboardData().then(res => {
      if (res.success) setData(res.data);
    });
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/10 border-t-[#F97316] rounded-full animate-spin shadow-[0_0_15px_#F97316]"></div>
          <div className="font-mono text-[#F97316] text-sm tracking-[0.2em] animate-pulse">INITIALIZING TELEMETRY...</div>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <h2 className="text-3xl font-extrabold uppercase tracking-tight text-white drop-shadow-md">Operations Control</h2>
          <p className="text-gray-400 font-mono text-xs mt-2 tracking-[0.2em]">REAL-TIME TELEMETRY STREAM</p>
        </div>
        <div className="flex items-center gap-4 font-mono text-sm hidden md:flex">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-lg border border-white/10 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#10B981] shadow-[0_0_8px_#10B981] animate-pulse" />
            <span className="text-gray-300 text-xs">LIVE</span>
          </div>
          <span className="px-3 py-1.5 bg-white/5 text-gray-300 border border-white/10 rounded-lg font-bold">
            HORIZON: 7D
          </span>
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <div className="bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CorridorStatusBar />
        </div>
      </motion.div>
      
      <motion.div variants={itemVariants}>
        <KpiGrid summary={data.summary} />
      </motion.div>
      
      <motion.div variants={itemVariants} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <motion.div whileHover={{ scale: 1.01 }} transition={{ type: 'spring', stiffness: 400 }}>
          <RecentRunsCard runs={data.recentRuns} />
        </motion.div>
        
        <motion.div 
          whileHover={{ scale: 1.01 }} 
          transition={{ type: 'spring', stiffness: 400 }}
          className="bg-[#111827] backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl p-6 flex flex-col relative overflow-hidden"
        >
          {/* Subtle glowing orb in background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#F97316]/5 rounded-full blur-[80px] pointer-events-none transform translate-x-1/2 -translate-y-1/2" />
          
          <div className="font-mono text-sm font-bold text-gray-400 uppercase border-b border-white/10 pb-3 mb-5 flex items-center gap-2 relative z-10">
            <span className="w-1.5 h-1.5 bg-[#F97316] rounded-full shadow-[0_0_8px_#F97316]"></span>
            Active System Alerts
          </div>
          
          <div className="space-y-4 flex-1 relative z-10">
             <motion.div 
               whileHover={{ x: 4 }}
               className="relative overflow-hidden bg-black/40 border border-[#F97316]/20 rounded-xl p-4 shadow-lg backdrop-blur-sm group cursor-pointer"
             >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F97316] shadow-[0_0_10px_#F97316]" />
                <span className="text-[#F97316] font-bold text-xs uppercase tracking-widest drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">TRAIN_CONFLICT</span>
                <p className="text-sm mt-2 text-gray-200">Block BLK-04 overlaps 12002 Shatabdi Exp at Km 45.2 <span className="text-white bg-[#F97316]/20 px-1.5 py-0.5 rounded text-[10px] font-bold ml-2 border border-[#F97316]/30 shadow-[0_0_5px_rgba(249,115,22,0.3)]">HIGH PRIORITY</span></p>
             </motion.div>
             <motion.div 
               whileHover={{ x: 4 }}
               className="relative overflow-hidden bg-black/40 border border-[#F59E0B]/20 rounded-xl p-4 shadow-lg backdrop-blur-sm group cursor-pointer"
             >
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#F59E0B]/60" />
                <span className="text-[#F59E0B] font-bold text-xs uppercase tracking-widest">RESOURCE_CONFLICT</span>
                <p className="text-sm mt-2 text-gray-300">USFD Vehicle V-12 double-allocated between Task 01 and Task 04</p>
             </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
