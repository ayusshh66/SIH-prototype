import React from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'rect' | 'circle';
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  variant = 'rect',
  className = '',
  style,
}) => {
  const borderRadius =
    variant === 'circle'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded-sm'
      : 'rounded-md';

  return (
    <div
      className={`relative overflow-hidden bg-surface-raised border border-border-hairline/40 ${borderRadius} ${className}`}
      style={{
        width,
        height,
        ...style,
      }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.8s_infinite] bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
    </div>
  );
};

export default Skeleton;
