'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';

export default function Home() {
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (token && user) {
      if (user.role === 'ADMIN') {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/timesheets';
      }
    } else {
      window.location.href = '/login';
    }
  }, [token, user]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
}
