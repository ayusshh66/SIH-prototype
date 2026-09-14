import React, { useState, useEffect } from 'react';
import { Bell, SunMoon, User, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

export const Header: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.header 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-4 right-4 h-12 bg-[#18181B]/90 backdrop-blur-xl border border-white/10 rounded-full flex items-center justify-end px-2 z-50 shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center gap-1">
        <div className="flex items-center gap-2 px-3 py-1 text-gray-300 font-mono text-xs">
          <Calendar size={14} className="text-gray-500" />
          <span>Mon | {time.toLocaleDateString('en-GB')}</span>
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <div className="flex items-center gap-2 px-3 py-1 text-gray-300 font-mono text-xs w-24 justify-center">
          {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
        </div>

        <div className="w-px h-5 bg-white/10 mx-1" />

        <button className="p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <SunMoon size={16} />
        </button>

        <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
          <Bell size={16} />
          <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#F97316] rounded-full shadow-[0_0_8px_#F97316]"></span>
        </button>

        <div className="ml-1 w-8 h-8 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 border border-white/20 overflow-hidden flex items-center justify-center">
          <User size={16} className="text-white" />
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
