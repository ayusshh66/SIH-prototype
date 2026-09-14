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
    'inline-flex items-center justify-center font-semibold tracking-wide border transition-all focus:outline-none cursor-pointer disabled:opacity-50 disabled:pointer-events-none rounded-lg';

  const sizeStyles = {
    sm: 'px-2.5 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-2.5 text-base gap-2.5',
  };

  const variants = {
    primary:
      'bg-[#F97316] text-white border-[#F97316] hover:bg-[#EA580C] hover:border-[#EA580C] shadow-[0_0_15px_rgba(249,115,22,0.3)]',
    secondary:
      'bg-black/50 text-gray-300 border-white/10 hover:text-white hover:bg-white/5 hover:border-white/20',
    danger:
      'bg-[#EF4444]/20 text-[#EF4444] border-[#EF4444]/50 hover:bg-[#EF4444]/30 hover:border-[#EF4444]',
    outline:
      'bg-transparent text-gray-300 border-white/10 hover:text-white hover:bg-white/5 hover:border-white/20',
    ghost:
      'bg-transparent text-gray-500 border-transparent hover:text-white hover:bg-white/5 hover:border-white/10',
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
