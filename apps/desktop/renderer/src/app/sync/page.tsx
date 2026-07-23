'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SyncPage() {
  const router = useRouter();

  useEffect(() => {
    const cached = localStorage.getItem('medingen_session');
    if (!cached) {
      router.replace('/login');
    } else {
      router.replace('/?tab=sync');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-slate-400 font-sans text-xs gap-3">
      <div className="w-10 h-10 border-[3px] border-teal-500/10 border-t-teal-500 rounded-full animate-spin"></div>
      <span>Loading Data Synchronizer...</span>
    </div>
  );
}
