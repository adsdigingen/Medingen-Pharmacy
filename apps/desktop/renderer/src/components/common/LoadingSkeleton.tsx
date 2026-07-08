import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  rows = 4,
  className = '',
}) => {
  return (
    <div className={`animate-pulse space-y-3.5 w-full ${className}`}>
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-8 bg-slate-900/60 border border-slate-850/40 rounded-lg w-full"></div>
      ))}
    </div>
  );
};
export default LoadingSkeleton;
