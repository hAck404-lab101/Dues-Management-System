'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Loader from '@/components/Loader';

export default function DashboardDispatcher() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/admin/login');
      } else if (user.role === 'admin') {
        router.push('/dashboard/admin');
      } else if (user.role === 'treasurer') {
        router.push('/dashboard/treasurer');
      } else if (user.role === 'financial_secretary') {
        router.push('/dashboard/financial-secretary');
      } else if (user.role === 'president') {
        router.push('/dashboard/president');
      } else {
        router.push('/admin/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral">
      <Loader />
    </div>
  );
}
