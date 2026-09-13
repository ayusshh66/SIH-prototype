import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-bold font-mono uppercase tracking-wide border-2 transition-transform active:translate-y-0.5 active:translate-x-0.5 focus:outline-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2.5',
  };

  const variants = {
    primary:
      'bg-text-primary text-background-main border-text-primary shadow-[4px_4px_0px_0px_rgba(156,163,175,0.5)] hover:bg-gray-200',
    secondary:
      'bg-surface-card text-text-primary border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:bg-surface-border',
    danger:
      'bg-status-critical text-white border-status-critical shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] hover:bg-red-600',
    outline:
      'bg-transparent text-text-primary border-surface-border hover:bg-surface-card',
    ghost:
      'bg-transparent text-text-muted border-transparent hover:text-text-primary hover:bg-surface-card hover:border-surface-border',
  };

  return (
    <button
      className={`${base} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon && <span className="inline-flex shrink-0 items-center">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
