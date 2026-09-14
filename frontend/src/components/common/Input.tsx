import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  mono?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  icon,
  iconRight,
  mono = false,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-micro font-medium text-content-tertiary uppercase font-mono tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="absolute left-3 text-content-tertiary flex items-center pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-surface-sunken border border-border-hairline rounded-sm py-2 ${
            icon ? 'pl-9' : 'pl-3'
          } ${iconRight ? 'pr-9' : 'pr-3'} text-body text-content-primary placeholder-content-disabled focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent-500/50 transition-colors ${
            mono ? 'font-mono tabular-nums' : ''
          } ${error ? 'border-crit-p1 focus:ring-crit-p1/40' : ''} ${className}`}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 text-content-tertiary flex items-center pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>
      {error ? (
        <span className="text-micro text-crit-p1 font-mono">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-micro text-content-tertiary font-mono">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};

export default Input;
