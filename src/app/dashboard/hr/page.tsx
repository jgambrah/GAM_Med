
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
import { HrAnalyticsDashboard } from './components/hr-analytics-dashboard';

export default function HumanResourcesPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect users who land here but don't have management privileges.
  // Both 'admin' and 'director' are allowed.
  React.useEffect(() => {
    if (user && user.role !== 'admin' && user.role !== 'director') {
      router.replace(`/dashboard/hr/staff/${user.uid}`);
    }
  }, [user, router]);

  if (!user || (user.role !== 'admin' && user.role !== 'director')) {
    return (
        <div className="flex items-center justify-center h-full">
            <p>Loading management workbench...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Human Resources</h1>
          <p className="text-muted-foreground">
            Manage staff profiles, roles, and facility headcounts for <strong>{user.hospitalId}</strong>.
          </p>
        </div>
      </div>

      <Tabs defaultValue="staff">
        <TabsList>
            <TabsTrigger value="staff">Staff Directory</TabsTrigger>
            <TabsTrigger value="positions">Positions & Salaries</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-4">
            <StaffManagementDashboard />
        </TabsContent>
        <TabsContent value="positions" className="mt-4">
            <PositionsDashboard />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
            <HrAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
