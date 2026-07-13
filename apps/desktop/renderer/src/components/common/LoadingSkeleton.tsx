import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
  variant?: 'line' | 'card' | 'table' | 'chart' | 'form' | 'pos' | 'dashboard';
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 4,
  className = '',
  variant = 'line',
}) => {
  if (variant === 'card') {
    return (
      <div className={`animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full ${className}`}>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="p-5 border border-gray-200 rounded-2xl bg-white space-y-3">
            <div className="h-4 bg-gray-100 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="h-3 bg-gray-150 rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={`animate-pulse w-full border border-gray-200 rounded-2xl bg-white divide-y divide-gray-100 overflow-hidden ${className}`}>
        <div className="bg-gray-50 h-10 px-6 flex items-center gap-4">
          <div className="h-3.5 bg-gray-200 rounded w-8"></div>
          <div className="h-3.5 bg-gray-200 rounded w-1/4"></div>
          <div className="h-3.5 bg-gray-200 rounded w-1/6"></div>
          <div className="h-3.5 bg-gray-200 rounded w-1/5"></div>
        </div>
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="h-12 px-6 flex items-center gap-4 bg-white">
            <div className="h-3 bg-gray-100 rounded w-8"></div>
            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
            <div className="h-3 bg-gray-100 rounded w-1/6"></div>
            <div className="h-3 bg-gray-100 rounded w-1/5"></div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'chart') {
    return (
      <div className={`animate-pulse p-6 border border-gray-200 rounded-2xl bg-white space-y-4 w-full ${className}`}>
        <div className="h-4 bg-gray-150 rounded w-1/4"></div>
        <div className="flex items-end justify-between gap-2 h-48 pt-6">
          <div className="bg-gray-100 rounded-t-lg w-full h-1/3"></div>
          <div className="bg-gray-200 rounded-t-lg w-full h-2/3"></div>
          <div className="bg-gray-100 rounded-t-lg w-full h-1/2"></div>
          <div className="bg-gray-250 rounded-t-lg w-full h-5/6"></div>
          <div className="bg-gray-100 rounded-t-lg w-full h-3/4"></div>
        </div>
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={`animate-pulse p-6 border border-gray-200 rounded-2xl bg-white space-y-5 w-full ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-150 rounded w-1/4"></div>
            <div className="h-9 bg-gray-100 rounded-lg w-full"></div>
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-150 rounded w-1/4"></div>
            <div className="h-9 bg-gray-100 rounded-lg w-full"></div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-150 rounded w-1/4"></div>
          <div className="h-16 bg-gray-100 rounded-lg w-full"></div>
        </div>
        <div className="h-9 bg-gray-200 rounded-lg w-28 ml-auto"></div>
      </div>
    );
  }

  if (variant === 'pos') {
    return (
      <div className={`animate-pulse grid grid-cols-12 gap-5 w-full ${className}`}>
        <div className="col-span-12 lg:col-span-8 space-y-4">
          <div className="h-14 bg-gray-100 rounded-2xl w-full"></div>
          <div className="h-72 border border-gray-200 rounded-2xl bg-white"></div>
        </div>
        <div className="col-span-12 lg:col-span-4 space-y-4">
          <div className="h-32 bg-gray-100 rounded-2xl w-full"></div>
          <div className="h-56 bg-gray-150 rounded-2xl w-full"></div>
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={`animate-pulse space-y-6 w-full ${className}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="p-4 border border-gray-200 rounded-2xl bg-white flex items-center justify-between">
              <div className="space-y-2 w-2/3">
                <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                <div className="h-6 bg-gray-200 rounded w-full"></div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gray-100"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-72 border border-gray-200 rounded-2xl bg-white"></div>
          <div className="h-72 border border-gray-200 rounded-2xl bg-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`animate-pulse space-y-3.5 w-full ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-8 bg-gray-100 border border-gray-100 rounded-lg w-full"></div>
      ))}
    </div>
  );
};
export default LoadingSkeleton;
