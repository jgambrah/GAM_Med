
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffManagementDashboard } from './components/staff-management-dashboard';
import { PositionsDashboard } from './components/positions-dashboard';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function HumanResourcesPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect non-admins who land here to their own profile page.
  React.useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace(`/dashboard/hr/staff/${user.uid}`);
    }
  }, [user, router]);

  // Render content only for admins
  if (user?.role !== 'admin') {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Loading your profile...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Human Resources</h1>
        <p className="text-muted-foreground">
          Manage staff profiles, positions, and other HR-related configurations.
        </p>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
            <TabsTrigger value="staff">Staff Management</TabsTrigger>
            <TabsTrigger value="positions">Positions & Salaries</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4">
            <StaffManagementDashboard />
        </TabsContent>
        <TabsContent value="positions" className="mt-4">
            <PositionsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
