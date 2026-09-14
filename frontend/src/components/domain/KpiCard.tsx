import React from 'react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: 'critical' | 'high' | 'optimal' | 'blue' | 'none';
  trend?: string;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  accent = 'blue',
  trend,
  className = '',
}) => {
  // Map accent to glowing colors
  let accentStyles = '';
  switch (accent) {
    case 'critical':
      accentStyles = 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]';
      break;
    case 'high':
      accentStyles = 'text-[#f97316] drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]'; // Neon Orange
      break;
    case 'optimal':
      accentStyles = 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]';
      break;
    case 'blue':
      accentStyles = 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]';
      break;
    default:
      accentStyles = 'text-white';
  }

  return (
    <div className={`bg-[#131316]/90 backdrop-blur-xl border border-white/5 shadow-2xl rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden group ${className}`}>
      {/* Accent Glow Line */}
      <div className={`absolute top-0 left-0 w-full h-[2px] opacity-50 group-hover:opacity-100 transition-opacity ${accent === 'high' ? 'bg-[#f97316]' : accent === 'critical' ? 'bg-red-500' : accent === 'optimal' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

      <div className="flex justify-between items-center w-full">
        <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">{label}</span>
        {icon && <span className="text-gray-500 group-hover:text-gray-300 transition-colors">{icon}</span>}
      </div>
      
      <div className={`text-2xl font-mono font-bold tracking-tight ${accentStyles}`}>
        {value}
      </div>
      
      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-auto text-[10px] font-mono text-gray-400">
          {trend && (
            <span className="text-[#f97316] font-bold bg-[#f97316]/10 px-1.5 py-0.5 rounded-sm">
              {trend}
            </span>
          )}
          {subtext && <span className="truncate">{subtext}</span>}
        </div>
      )}
    </div>
  );
};
