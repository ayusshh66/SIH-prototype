import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  loading?: boolean;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'relative inline-flex items-center justify-center font-medium transition-colors border select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/50 cursor-pointer disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed';

  const sizeStyles = {
    sm: 'h-7 px-2.5 text-small gap-1.5 rounded-sm',
    md: 'h-9 px-3.5 text-body gap-2 rounded-md',
    lg: 'h-11 px-5 text-mono-lg gap-2.5 rounded-md',
  };

  const variants = {
    primary:
      'bg-accent-500 text-white border-accent-600 hover:bg-accent-600 active:bg-accent-600 shadow-sm',
    secondary:
      'bg-surface text-content-primary border-border-hairline hover:bg-surface-raised hover:border-border-strong active:bg-surface-sunken',
    outline:
      'bg-transparent text-content-primary border-border-hairline hover:bg-surface-raised hover:border-border-strong',
    danger:
      'bg-crit-p1-bg text-crit-p1 border-crit-p1-border hover:bg-crit-p1 hover:text-white',
    ghost:
      'bg-transparent text-content-secondary border-transparent hover:text-content-primary hover:bg-surface-sunken',
  };

  return (
    <motion.button
      whileHover={disabled || loading ? undefined : { y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={`${base} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin shrink-0" size={size === 'sm' ? 12 : size === 'lg' ? 18 : 15} />
      ) : (
        icon && <span className="inline-flex shrink-0 items-center">{icon}</span>
      )}
      {children}
      {!loading && iconRight && (
        <span className="inline-flex shrink-0 items-center">{iconRight}</span>
      )}
    </motion.button>
  );
};

export default Button;
