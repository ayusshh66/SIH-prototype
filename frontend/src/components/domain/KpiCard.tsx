import React, { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: 'critical' | 'high' | 'optimal' | 'blue' | 'none';
  trend?: string;
  trendDirection?: 'up' | 'down';
  trendGood?: boolean;
  sparklineData?: number[];
  className?: string;
}

// Component to smoothly count up numeric values
const AnimatedNumber: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 750; // ms
    const startTime = performance.now();

    const update = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCurrent(Math.round(start + (value - start) * ease));

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  return <span>{current.toLocaleString()}{suffix}</span>;
};

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  icon,
  accent = 'blue',
  trend,
  trendDirection,
  trendGood = true,
  sparklineData,
  className = '',
}) => {
  // Extract number and suffix if value is formatted string like "94%" or 42
  let numericValue: number | null = null;
  let suffix = '';

  if (typeof value === 'number') {
    numericValue = value;
  } else if (typeof value === 'string') {
    const match = value.match(/^([\d.]+)(.*)$/);
    if (match && !isNaN(parseFloat(match[1]))) {
      numericValue = parseFloat(match[1]);
      suffix = match[2];
    }
  }

  // Accent color mapping
  const accentColorMap = {
    critical: { text: 'text-crit-p1', line: '#FF4757', border: 'border-l-crit-p1' },
    high: { text: 'text-crit-p2', line: '#FF9F43', border: 'border-l-crit-p2' },
    optimal: { text: 'text-status-feasible', line: '#4ADE80', border: 'border-l-status-feasible' },
    blue: { text: 'text-accent-400', line: '#2F6FEE', border: 'border-l-accent-500' },
    none: { text: 'text-content-primary', line: '#4F8DFF', border: 'border-l-border-hairline' },
  };

  const currentAccent = accentColorMap[accent] || accentColorMap.blue;

  const chartData = sparklineData?.map((v, i) => ({ i, v })) || [
    { i: 0, v: 30 },
    { i: 1, v: 45 },
    { i: 2, v: 40 },
    { i: 3, v: 65 },
    { i: 4, v: 80 },
    { i: 5, v: 72 },
    { i: 6, v: 90 },
  ];

  return (
    <div
      className={`bg-surface border border-border-hairline rounded-md p-5 flex flex-col justify-between relative overflow-hidden transition-colors hover:border-border-strong border-l-2 ${currentAccent.border} ${className}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-micro font-medium uppercase font-mono tracking-wider text-content-tertiary">
          {label}
        </span>
        {icon && <span className="text-content-tertiary">{icon}</span>}
      </div>

      <div className="flex items-baseline justify-between gap-2 my-1">
        <div className={`text-display font-mono tracking-tight ${currentAccent.text}`}>
          {numericValue !== null ? (
            <AnimatedNumber value={numericValue} suffix={suffix} />
          ) : (
            value
          )}
        </div>

        {/* Inline mini sparkline */}
        <div className="w-20 h-8 opacity-70">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`grad-${label.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={currentAccent.line} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={currentAccent.line} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke={currentAccent.line}
                strokeWidth={1.5}
                fill={`url(#grad-${label.replace(/\s+/g, '')})`}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {(subtext || trend) && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border-subtle text-small font-mono text-content-secondary">
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-micro font-medium ${
                trendGood
                  ? 'bg-status-feasible-bg text-status-feasible'
                  : 'bg-crit-p1-bg text-crit-p1'
              }`}
            >
              {trendDirection === 'down' ? (
                <ArrowDownRight size={12} />
              ) : (
                <ArrowUpRight size={12} />
              )}
              {trend}
            </span>
          )}
          {subtext && <span className="truncate text-content-tertiary">{subtext}</span>}
        </div>
      )}
    </div>
  );
};

export default KpiCard;
