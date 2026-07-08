import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data available",
  description = "There are no records to display at the moment.",
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/10 border border-dashed border-slate-800 rounded-xl">
      {icon ? (
        <div className="text-slate-500 mb-3">{icon}</div>
      ) : (
        <svg
          className="mx-auto h-10 w-10 text-slate-550 mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
          />
        </svg>
      )}
      <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">{title}</h3>
      <p className="mt-1 text-xs text-slate-500 max-w-xs">{description}</p>
    </div>
  );
};
export default EmptyState;
