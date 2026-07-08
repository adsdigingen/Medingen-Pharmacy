import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  headerActions?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  headerActions,
  className = '',
  ...props
}) => {
  return (
    <div className={`bg-slate-900/35 backdrop-blur-md border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden ${className}`} {...props}>
      {(title || headerActions) && (
        <div className="px-5 py-4 border-b border-slate-800/70 flex items-center justify-between">
          {title && <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">{title}</h3>}
          {headerActions && <div>{headerActions}</div>}
        </div>
      )}
      <div className="px-5 py-5 sm:p-6">{children}</div>
    </div>
  );
};
