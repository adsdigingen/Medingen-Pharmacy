import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 focus:ring-offset-white disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] cursor-pointer';
  
  const variants = {
    primary: 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/10',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200',
    outline: 'border border-gray-300 hover:bg-gray-50 text-gray-600',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/10',
    ghost: 'hover:bg-gray-100 text-gray-500 hover:text-gray-700',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-5 py-2.5 text-base',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
