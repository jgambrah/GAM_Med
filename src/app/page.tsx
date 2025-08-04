
'use client'

import AuthProvider from '@/components/auth-provider';
import Dashboard from '@/components/dashboard';
import { useAuth } from '@/components/auth-provider';
import { AdminOverview } from '@/components/dashboard/admin-overview';
import { allPatients } from '@/lib/data';

function DashboardContent() {
  const { user } = useAuth();

  if (!user) {
    return null; // or a loading skeleton
  }

  // This is a simplified router. 
  // In a real app, you might have more complex logic 
  // or a dedicated routing component.
  switch (user.role) {
    case 'Admin':
      return <AdminOverview patients={allPatients} />;
    // Add cases for other roles to show their default dashboard
    default:
      return <AdminOverview patients={allPatients} />;
  }
}

export default function Home() {
  return (
    <AuthProvider>
      <Dashboard>
         <DashboardContent />
      </Dashboard>
    </AuthProvider>
  );
}
