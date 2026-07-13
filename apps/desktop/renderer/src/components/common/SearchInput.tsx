import React from 'react';

interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearchChange?: (val: string) => void;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onSearchChange, className = '', ...props }, ref) => {
    return (
      <div className="relative rounded-lg shadow-sm w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          ref={ref}
          type="text"
          onChange={(e) => onSearchChange?.(e.target.value)}
          className={`block w-full pl-9 pr-3.5 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 text-gray-800 text-xs focus:outline-none focus:border-primary transition-colors ${className}`}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
