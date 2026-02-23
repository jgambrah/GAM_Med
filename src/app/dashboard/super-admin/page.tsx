
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HospitalList } from './components/hospital-list';
import { CreateHospitalDialog } from './components/create-hospital-dialog';
import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Hospital } from '@/lib/types';
import { Building2, CreditCard, Activity } from 'lucide-react';

export default function SuperAdminPage() {
  const { user } = useAuth();
  const db = useFirestore();

  // Security: Only allow platform owners
  if (user?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  // Fetch metrics
  const hospitalsQuery = useMemoFirebase(() => {
    return query(collection(db, 'hospitals'));
  }, [db]);

  const { data: hospitals } = useCollection<Hospital>(hospitalsQuery);

  const totalHospitals = hospitals?.length || 0;
  const activeHospitals = hospitals?.filter(h => h.status === 'active').length || 0;
  
  // Conceptual Monthly Revenue calculation (Mocked for prototype)
  // In a real app, this would query a 'subscriptions' collection or link to Paystack/Stripe
  const monthlyRevenue = activeHospitals * 2500; 

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Control Center</h1>
          <p className="text-muted-foreground">
            Global management of GamMed hospital tenants and system-wide configurations.
          </p>
        </div>
        <CreateHospitalDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHospitals}</div>
            <p className="text-xs text-muted-foreground">
              {activeHospitals} active tenants
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Monthly Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Based on active premium/basic tiers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global System Status</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All regions operational
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Directory</CardTitle>
            <CardDescription>
              Manage active healthcare facilities and their subscription statuses.
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
