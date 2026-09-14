import React, { useState } from 'react';
import { Search, Filter, Train, Clock, MapPin, MoreHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';

const trackingData = [
  {
    id: '12002',
    name: 'Shatabdi Exp',
    type: 'passenger',
    status: 'IN TRANSIT',
    statusColor: 'bg-[#3B82F6]',
    origin: 'NDLS',
    originFull: 'New Delhi',
    originTime: '06:00 AM',
    dest: 'BPL',
    destFull: 'Bhopal Jn',
    destTime: '14:15 PM',
    duration: '8.2H',
    progress: 75
  },
  {
    id: '12951',
    name: 'Rajdhani Exp',
    type: 'passenger',
    status: 'DELAYED',
    statusColor: 'bg-[#EF4444]',
    origin: 'MMCT',
    originFull: 'Mumbai Central',
    originTime: '17:00 PM [YEST]',
    dest: 'NDLS',
    destFull: 'New Delhi',
    destTime: 'ETA 09:30 AM',
    duration: '16.5H',
    progress: 90
  },
  {
    id: '22436',
    name: 'Vande Bharat',
    type: 'passenger',
    status: 'ARRIVED',
    statusColor: 'bg-[#10B981]',
    origin: 'NDLS',
    originFull: 'New Delhi',
    originTime: '06:00 AM',
    dest: 'BSB',
    destFull: 'Varanasi Jn',
    destTime: 'ETA 14:00 PM',
    duration: '8H',
    progress: 100
  },
  {
    id: '12229',
    name: 'Lucknow Mail',
    type: 'passenger',
    status: 'BOARDING',
    statusColor: 'bg-[#10B981]',
    origin: 'LJN',
    originFull: 'Lucknow Jn',
    originTime: '22:00 PM',
    dest: 'NDLS',
    destFull: 'New Delhi',
    destTime: 'EST 06:55 AM',
    duration: '-',
    progress: 0
  },
  {
    id: 'BCNHL',
    name: 'Coal Freight',
    type: 'freight',
    status: 'IN TRANSIT',
    statusColor: 'bg-[#3B82F6]',
    origin: 'DHN',
    originFull: 'Dhanbad Jn',
    originTime: '04:00 AM',
    dest: 'DDU',
    destFull: 'Pt DD Upadhyaya',
    destTime: 'ETA 12:20 PM',
    duration: '8H',
    progress: 60
  }
];

export const SidebarList: React.FC = () => {
  const [search, setSearch] = useState('');

  return (
    <motion.div 
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="w-80 flex-shrink-0 bg-[#18181B]/95 backdrop-blur-xl border-r border-white/10 h-full flex flex-col z-20 shadow-[4px_0_24px_rgba(0,0,0,0.8)]"
    >
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="text-white font-semibold tracking-wide text-lg">Tracking List</h2>
        <button className="text-gray-400 hover:text-white transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
      
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search Headcode or UID..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-lg py-2 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F97316]/50 transition-colors"
            />
          </div>
          <button className="p-2 bg-black/50 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-[#F97316]/50 transition-all">
            <Filter size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {trackingData.map((train, i) => (
          <motion.div 
            key={train.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-black/40 border border-white/5 rounded-xl p-4 hover:border-white/20 transition-all cursor-pointer group hover:shadow-lg"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <Train size={14} className="text-gray-400" />
                {train.name}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-xs font-mono">{train.id}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white tracking-wider ${train.statusColor}`}>
                  {train.status}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-2">
              <div className="w-8 text-center">{train.origin}</div>
              <div className="flex-1 flex items-center justify-center px-2">
                <div className="h-px bg-white/20 flex-1 relative">
                  <div 
                    className="absolute left-0 top-0 bottom-0 bg-[#F97316] transition-all duration-1000"
                    style={{ width: `${train.progress}%` }}
                  />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 px-1 border border-white/10 rounded text-[9px]">
                    {train.duration}
                  </div>
                </div>
              </div>
              <div className="w-8 text-center">{train.dest}</div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="text-gray-300">{train.originFull}</span>
                <span className="text-gray-500 font-mono text-[10px] flex items-center gap-1">
                  <Clock size={10} /> {train.originTime}
                </span>
              </div>
              
              <div className="text-gray-600">→</div>

              <div className="flex flex-col gap-0.5 items-end">
                <span className="text-gray-300">{train.destFull}</span>
                <span className="text-gray-500 font-mono text-[10px] flex items-center gap-1">
                  <MapPin size={10} /> {train.destTime}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
