'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HospitalList } from './components/hospital-list';
import { CreateHospitalDialog } from './components/create-hospital-dialog';
import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';

export default function SuperAdminPage() {
  const { user } = useAuth();

  // Security: Only allow platform owners
  if (user?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Platform Operations</h1>
          <p className="text-muted-foreground">
            Onboard new hospital tenants and manage global system configurations.
          </p>
        </div>
        <CreateHospitalDialog />
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Active Hospital Tenants</CardTitle>
            <CardDescription>
              All healthcare facilities currently operating on the GamMed SaaS platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HospitalList />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}