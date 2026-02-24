'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { HospitalList } from './components/hospital-list';
import { CreateHospitalDialog } from './components/create-hospital-dialog';
import { useAuth } from '@/hooks/use-auth';
import { redirect } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import { Hospital, Patient } from '@/lib/types';
import { Building2, CreditCard, Activity, ShieldCheck, Users } from 'lucide-react';

/**
 * == Super Admin: Platform Control Center ==
 * 
 * This is your primary dashboard as the Platform Owner.
 * Use this to monitor global metrics and onboard new hospital tenants.
 */
export default function SuperAdminPage() {
  const { user } = useAuth();
  const db = useFirestore();

  // Security: Immediate redirect for non-owners
  if (user?.role !== 'super_admin') {
    redirect('/dashboard');
  }

  // 1. Fetch all tenants for global metrics - Scoped by 'God Mode' security rules
  const hospitalsQuery = useMemoFirebase(() => {
    if (!user || user.role !== 'super_admin') return null;
    return query(collection(db, 'hospitals'));
  }, [db, user]);

  // 2. Fetch global patient count - This query is only possible for super_admin
  const globalPatientsQuery = useMemoFirebase(() => {
    if (!user || user.role !== 'super_admin') return null;
    return query(collection(db, 'patients'));
  }, [db, user]);

  const { data: hospitals, isLoading: isLoadingHospitals } = useCollection<Hospital>(hospitalsQuery);
  const { data: patients, isLoading: isLoadingPatients } = useCollection<Patient>(globalPatientsQuery);

  const totalHospitals = hospitals?.length || 0;
  const activeHospitals = hospitals?.filter(h => h.status === 'active').length || 0;
  const totalPatients = patients?.length || 0;
  
  // Prototype Revenue Calculation: Basic (₵1,500) | Premium (₵3,500)
  const estimatedRevenue = hospitals?.reduce((total, h) => {
    return total + (h.subscriptionTier === 'premium' ? 3500 : 1500);
  }, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Platform Control Center</h1>
          <p className="text-muted-foreground">
            Manage global hospital tenants and platform-wide security.
          </p>
        </div>
        <CreateHospitalDialog />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-t-4 border-t-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Hospitals</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHospitals}</div>
            <p className="text-xs text-muted-foreground">
              {activeHospitals} active | {totalHospitals - activeHospitals} suspended
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Global Patients</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPatients.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Across all hospital tenants
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{estimatedRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Projected Monthly MRR (GHS)
            </p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Security</CardTitle>
            <ShieldCheck className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Hardened</div>
            <p className="text-xs text-muted-foreground">
              SaaS Wall rules enforced
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Global Tenant Directory</CardTitle>
          <CardDescription>
            A real-time overview of all healthcare facilities registered on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HospitalList />
        </CardContent>
      </Card>
    </div>
  );
}
