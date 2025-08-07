'use client';

import { useAuth } from '@/hooks/use-auth';

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome back, {user?.displayName || 'User'}. You are logged in as a{' '}
        <strong>{user?.role}</strong>.
      </p>
    </div>
  );
}
