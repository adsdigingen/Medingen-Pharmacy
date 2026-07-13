import React from 'react';
import { Button } from './Button';

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border border-gray-200 rounded-xl sm:px-6">
      <div className="flex justify-between flex-1 sm:hidden gap-2">
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
        >
          Next
        </Button>
      </div>
      <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between text-xs">
        <div>
          <p className="text-gray-500">
            Showing <span className="font-semibold text-gray-800">{Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}</span> to{' '}
            <span className="font-semibold text-gray-800">{Math.min(totalItems, currentPage * itemsPerPage)}</span> of{' '}
            <span className="font-semibold text-gray-800">{totalItems}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-lg shadow-sm -space-x-px gap-1.5" aria-label="Pagination">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
            >
              &laquo; First
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <span className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 font-bold font-mono rounded-lg flex items-center">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              Last &raquo;
            </Button>
          </nav>
        </div>
      </div>
    </div>
  );
};
