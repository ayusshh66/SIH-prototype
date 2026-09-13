"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Calendar, Wrench, Combine, Activity, AlertTriangle, GitBranch, BellElectric, ShieldAlert, Server } from 'lucide-react';

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
  const pathname = usePathname();
  
  return (
    <aside className="w-16 md:w-64 bg-background-main border-r-2 border-surface-border h-[calc(100vh-3.5rem)] flex flex-col fixed left-0 top-14 z-20">
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
            <li key={item.path}>
              <Link
                href={item.path}
                className={`flex items-center gap-3 px-3 py-2 font-mono text-sm tracking-wide transition-all border-2 ${
                  isActive
                    ? 'bg-surface-card text-text-primary border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] translate-x-1'
                    : 'text-text-muted border-transparent hover:text-text-primary hover:bg-surface-card hover:border-surface-border'
                }`}
              >
                <item.icon size={18} />
                <span className="hidden md:inline-block uppercase font-bold">{item.label}</span>
              </Link>
            </li>
          )})}
        </ul>
      </nav>
      <div className="p-4 border-t-2 border-surface-border">
        <div className="text-[10px] text-text-muted font-mono uppercase tracking-widest text-center hidden md:block">
          Division: Delhi<br/>
          Zone: NR
        </div>
      </div>
    </aside>
  );
};
