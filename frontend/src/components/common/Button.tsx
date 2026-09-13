import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', ...props }) => {
  const base = "px-4 py-2 font-bold text-sm uppercase tracking-wide border-2 transition-transform active:translate-y-1 active:translate-x-1 active:shadow-none focus:outline-none";
  const variants = {
    primary: "bg-text-primary text-background-main border-text-primary shadow-[4px_4px_0px_0px_rgba(156,163,175,0.5)] hover:bg-gray-200",
    secondary: "bg-surface-card text-text-primary border-surface-border shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:bg-surface-border",
    danger: "bg-status-critical text-white border-status-critical shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] hover:bg-red-600",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};
