import React, { useState, useEffect } from 'react';
import { Train, Bell, Activity } from 'lucide-react';

export const Header: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-background-main border-b-2 border-surface-border flex items-center justify-between px-4 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center justify-center w-8 h-8 bg-surface-card border-2 border-surface-border shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
          <Train size={18} className="text-text-primary" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-widest text-text-primary uppercase leading-tight">
            IR Operations Command
          </h1>
          <p className="text-[10px] text-text-muted font-mono uppercase tracking-wider">
            AI Block Planning System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-surface-card border-2 border-surface-border">
          <Activity size={14} className="text-status-optimal" />
          <span className="text-xs font-mono font-bold text-status-optimal">SYSTEM ACTIVE</span>
        </div>

        <div className="text-xs font-mono text-text-muted bg-surface-card px-3 py-1 border-2 border-surface-border shadow-[2px_2px_0px_0px_rgba(31,41,55,1)]">
          {time.toISOString().replace('T', ' ').slice(0, 19)} UTC
        </div>

        <button className="relative p-1.5 hover:bg-surface-card border-2 border-transparent hover:border-surface-border transition-colors">
          <Bell size={18} className="text-text-muted" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-status-critical rounded-none border border-background-main"></span>
        </button>
      </div>
    </header>
  );
};

export default Header;
