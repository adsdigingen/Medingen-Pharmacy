'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function BillingPage() {
  const router = useRouter();

  useEffect(() => {
    const cached = localStorage.getItem('medingen_session');
    if (!cached) {
      router.replace('/login');
    } else {
      router.replace('/?tab=pos');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans text-xs">
      <span>Redirecting...</span>
    </div>
  );
}
