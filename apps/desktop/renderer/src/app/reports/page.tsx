'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    const cached = localStorage.getItem('medingen_session');
    if (!cached) {
      router.replace('/login');
    } else {
      try {
        const user = JSON.parse(cached);
        if (['ADMIN', 'STORE_MANAGER'].includes(user.role)) {
          router.replace('/?tab=reports');
        } else {
          router.replace('/unauthorized');
        }
      } catch (e) {
        router.replace('/login');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-sans text-xs">
      <span>Redirecting...</span>
    </div>
  );
}
