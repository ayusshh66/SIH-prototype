import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  icon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label htmlFor={inputId} className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {icon && (
          <span className="absolute left-3 text-gray-500 flex items-center pointer-events-none">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-black/50 border border-white/10 rounded-lg py-2 ${icon ? 'pl-9' : 'pl-3'} pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#F97316]/50 transition-colors ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <span className="text-[10px] text-red-500">
          {error}
        </span>
      ) : helperText ? (
        <span className="text-[10px] text-gray-500">
          {helperText}
        </span>
      ) : null}
    </div>
  );
};

export default Input;
