import React from 'react';

export type BadgeTone =
  | 'crit-p1'
  | 'crit-p2'
  | 'crit-p3'
  | 'crit-p4'
  | 'status-feasible'
  | 'status-partial'
  | 'status-conflict'
  | 'status-rejected'
  | 'status-neutral'
  | 'safety-normal'
  | 'safety-restricted'
  | 'safety-interlocking'
  | 'safety-high'
  | 'dept-engineering'
  | 'dept-pway'
  | 'dept-trd'
  | 'dept-snt'
  | 'dept-signaling'
  | 'dept-traction'
  | 'dept-other'
  | 'accent'
  | 'neutral';

// Backward compatibility alias variants
export type LegacyBadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'critical'
  | 'info'
  | 'optimal'
  | 'p1'
  | 'p2'
  | 'p3'
  | 'p4'
  | 'ENG'
  | 'TRD'
  | 'SNT'
  | 'shadow';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  tone?: BadgeTone;
  variant?: LegacyBadgeVariant;
  icon?: React.ReactNode;
  showDot?: boolean;
  className?: string;
}

const toneMap: Record<BadgeTone, { bg: string; text: string; dot: string; border: string }> = {
  'crit-p1': { bg: 'bg-crit-p1-bg', text: 'text-crit-p1', dot: 'bg-crit-p1', border: 'border-crit-p1/30' },
  'crit-p2': { bg: 'bg-crit-p2-bg', text: 'text-crit-p2', dot: 'bg-crit-p2', border: 'border-crit-p2/30' },
  'crit-p3': { bg: 'bg-crit-p3-bg', text: 'text-crit-p3', dot: 'bg-crit-p3', border: 'border-crit-p3/30' },
  'crit-p4': { bg: 'bg-crit-p4-bg', text: 'text-crit-p4', dot: 'bg-crit-p4', border: 'border-crit-p4/30' },

  'status-feasible': { bg: 'bg-status-feasible-bg', text: 'text-status-feasible', dot: 'bg-status-feasible', border: 'border-status-feasible/30' },
  'status-partial': { bg: 'bg-status-partial-bg', text: 'text-status-partial', dot: 'bg-status-partial', border: 'border-status-partial/30' },
  'status-conflict': { bg: 'bg-status-conflict-bg', text: 'text-status-conflict', dot: 'bg-status-conflict', border: 'border-status-conflict/30' },
  'status-rejected': { bg: 'bg-status-rejected-bg', text: 'text-status-rejected', dot: 'bg-status-rejected', border: 'border-status-rejected/30' },
  'status-neutral': { bg: 'bg-status-neutral-bg', text: 'text-status-neutral', dot: 'bg-status-neutral', border: 'border-status-neutral/30' },

  'safety-normal': { bg: 'bg-safety-normal-bg', text: 'text-safety-normal', dot: 'bg-safety-normal', border: 'border-safety-normal/30' },
  'safety-restricted': { bg: 'bg-safety-restricted-bg', text: 'text-safety-restricted', dot: 'bg-safety-restricted', border: 'border-safety-restricted/30' },
  'safety-interlocking': { bg: 'bg-safety-interlocking-bg', text: 'text-safety-interlocking', dot: 'bg-safety-interlocking', border: 'border-safety-interlocking/30' },
  'safety-high': { bg: 'bg-safety-high-bg', text: 'text-safety-high', dot: 'bg-safety-high', border: 'border-safety-high/30' },

  'dept-engineering': { bg: 'bg-dept-engineering-bg', text: 'text-dept-engineering', dot: 'bg-dept-engineering', border: 'border-dept-engineering/30' },
  'dept-pway': { bg: 'bg-dept-pway-bg', text: 'text-dept-pway', dot: 'bg-dept-pway', border: 'border-dept-pway/30' },
  'dept-trd': { bg: 'bg-dept-trd-bg', text: 'text-dept-trd', dot: 'bg-dept-trd', border: 'border-dept-trd/30' },
  'dept-snt': { bg: 'bg-dept-snt-bg', text: 'text-dept-snt', dot: 'bg-dept-snt', border: 'border-dept-snt/30' },
  'dept-signaling': { bg: 'bg-dept-signaling-bg', text: 'text-dept-signaling', dot: 'bg-dept-signaling', border: 'border-dept-signaling/30' },
  'dept-traction': { bg: 'bg-dept-traction-bg', text: 'text-dept-traction', dot: 'bg-dept-traction', border: 'border-dept-traction/30' },
  'dept-other': { bg: 'bg-dept-other-bg', text: 'text-dept-other', dot: 'bg-dept-other', border: 'border-dept-other/30' },

  accent: { bg: 'bg-accent-500/15', text: 'text-accent-400', dot: 'bg-accent-400', border: 'border-accent-500/30' },
  neutral: { bg: 'bg-surface-sunken', text: 'text-content-secondary', dot: 'bg-content-tertiary', border: 'border-border-hairline' },
};

const legacyVariantMap: Record<LegacyBadgeVariant, BadgeTone> = {
  default: 'neutral',
  primary: 'accent',
  success: 'status-feasible',
  optimal: 'status-feasible',
  warning: 'status-partial',
  danger: 'crit-p1',
  critical: 'crit-p1',
  info: 'safety-normal',
  p1: 'crit-p1',
  p2: 'crit-p2',
  p3: 'crit-p3',
  p4: 'crit-p4',
  ENG: 'dept-engineering',
  TRD: 'dept-trd',
  SNT: 'dept-snt',
  shadow: 'safety-restricted',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone,
  variant,
  icon,
  showDot,
  className = '',
  ...props
}) => {
  const resolvedTone: BadgeTone = tone || (variant ? legacyVariantMap[variant] : 'neutral');
  const styles = toneMap[resolvedTone] || toneMap.neutral;

  // By default, show a dot for status tones unless overridden
  const isStatusTone = resolvedTone.startsWith('status-');
  const displayDot = showDot ?? isStatusTone;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-micro font-medium rounded-sm border uppercase tracking-wider shrink-0 select-none ${styles.bg} ${styles.text} ${styles.border} ${className}`}
      {...props}
    >
      {displayDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`} />
      )}
      {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
