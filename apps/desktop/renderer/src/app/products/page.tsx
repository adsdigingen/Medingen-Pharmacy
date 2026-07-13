'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProductsPage() {
  const router = useRouter();

  useEffect(() => {
    const cached = localStorage.getItem('medingen_session');
    if (!cached) {
      router.replace('/login');
    } else {
      try {
        const user = JSON.parse(cached);
        if (['ADMIN', 'STORE_MANAGER', 'PHARMACIST'].includes(user.role)) {
          router.replace('/?tab=products');
        } else {
          router.replace('/unauthorized');
        }
      } catch (e) {
        router.replace('/login');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center text-slate-400 font-sans text-xs">
      <span>Redirecting...</span>
    </div>
  );
}
