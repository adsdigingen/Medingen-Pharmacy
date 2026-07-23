import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'max-w-lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-black/40 backdrop-blur-sm" 
          onClick={onClose}
        />

        {/* Modal content box */}
        <div className={`relative inline-block w-full align-middle transition-all transform bg-white border border-gray-200 rounded-2xl shadow-2xl text-left my-8 ${maxWidth} animate-fadeIn`}>
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center rounded-t-2xl">
            <h3 className="text-base font-bold text-gray-800 uppercase tracking-wider">{title}</h3>
            <button 
              type="button" 
              className="text-gray-400 hover:text-gray-700 text-2xl font-semibold focus:outline-none transition-colors cursor-pointer"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
          <div className="px-6 py-5 text-sm text-gray-700">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-row-reverse gap-3 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
