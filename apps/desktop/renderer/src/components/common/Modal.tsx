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
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 text-center">
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-black/70 backdrop-blur-sm" 
          onClick={onClose}
        />

        {/* Modal content box */}
        <div className={`relative inline-block w-full align-middle transition-all transform bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-left my-8 ${maxWidth} animate-fadeIn`}>
          <div className="px-6 py-4 bg-slate-900/60 border-b border-slate-800/80 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-100 uppercase tracking-wider">{title}</h3>
            <button 
              type="button" 
              className="text-slate-400 hover:text-slate-100 text-2xl font-semibold focus:outline-none transition-colors cursor-pointer"
              onClick={onClose}
            >
              &times;
            </button>
          </div>
          <div className="px-6 py-5 text-sm text-slate-350">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 bg-slate-950/40 border-t border-slate-800/60 flex flex-row-reverse gap-3 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
