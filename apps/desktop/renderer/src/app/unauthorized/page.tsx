'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 font-sans text-xs text-slate-400">
      {/* Background radial highlight */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.03)_0%,transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-6 shadow-2xl relative z-10 animate-fadeIn">
        <div className="mx-auto w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-white uppercase tracking-wider">Access Denied</h2>
          <p className="text-slate-400">You do not have the required permissions to access this workspace module.</p>
        </div>
        <div className="flex justify-center gap-3">
          <button 
            onClick={() => {
              const cached = localStorage.getItem('medingen_session');
              if (cached) {
                router.replace('/dashboard');
              } else {
                router.replace('/login');
              }
            }} 
            className="px-4 py-2 bg-teal-500 text-slate-955 hover:bg-teal-400 font-bold rounded-lg cursor-pointer transition-all active:scale-95 shadow-lg shadow-teal-500/10"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
