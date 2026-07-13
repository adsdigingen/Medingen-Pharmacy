import React from 'react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onActionClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = "No data available",
  description = "There are no records to display at the moment.",
  icon,
  actionLabel,
  onActionClick,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
      {icon ? (
        <div className="text-gray-400 mb-3">{icon}</div>
      ) : (
        <svg
          className="mx-auto h-10 w-10 text-gray-300 mb-3"
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
      <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider">{title}</h3>
      <p className="mt-1 text-xs text-gray-450 max-w-xs mb-3.5">{description}</p>
      {actionLabel && onActionClick && (
        <button
          type="button"
          onClick={onActionClick}
          className="px-4 py-2 bg-primary text-white hover:bg-primary-hover font-bold rounded-lg text-xs transition-transform active:scale-95 shadow-md shadow-primary/10 cursor-pointer"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
export default EmptyState;
