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
      ? '9999px'
      : variant === 'text'
      ? '2px'
      : '4px';

  return (
    <div
      className={`animate-pulse bg-white/5 ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
      aria-hidden="true"
    />
  );
};

