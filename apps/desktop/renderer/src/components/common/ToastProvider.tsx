"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number, action?: { label: string; onClick: () => void }) => void;
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration = 4000,
    action?: { label: string; onClick: () => void }
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration, action }]);
    
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-xl shadow-2xl flex items-center justify-between border text-xs leading-normal animate-slide-up bg-white ${
              t.type === 'success' ? 'border-success/20 text-gray-800' :
              t.type === 'error' ? 'border-danger/20 text-gray-800' :
              t.type === 'warning' ? 'border-warning/20 text-gray-800' :
              'border-gray-200 text-gray-800'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {t.type === 'success' && (
                <span className="w-2 h-2 rounded-full bg-success"></span>
              )}
              {t.type === 'error' && (
                <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>
              )}
              {t.type === 'warning' && (
                <span className="w-2 h-2 rounded-full bg-warning"></span>
              )}
              {t.type === 'info' && (
                <span className="w-2 h-2 rounded-full bg-primary"></span>
              )}
              <span className="font-semibold text-gray-700">{t.message}</span>
            </div>
            
            <div className="flex items-center gap-3">
              {t.action && (
                <button
                  type="button"
                  onClick={() => {
                    t.action?.onClick();
                    removeToast(t.id);
                  }}
                  className="px-2 py-1 rounded bg-primary text-white hover:bg-primary-hover font-bold text-[10px] cursor-pointer transition-transform active:scale-95"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
