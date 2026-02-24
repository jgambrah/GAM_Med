'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { BedStatusGrid } from './components/bed-status-grid';
import { AllocateBedDialog } from './components/allocate-bed-dialog';
import { AddBedDialog } from './components/add-bed-dialog';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Bed, Ward } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { BedDouble, Loader2, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * == Core Hospital Engine: Real-Time Bed Management ==
 * 
 * Provides a live, logically isolated overview of ward occupancy.
 * Facilitates the triage and admission workflow for inpatient care.
 */
export default function BedManagementPage() {
  const { user } = useAuth();
  const firestore = useFirestore();

  // 1. LIVE QUERY: Wards belonging to this hospital
  const wardsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'wards'),
        where('hospitalId', '==', user.hospitalId),
        orderBy('name', 'asc')
    );
  }, [firestore, user?.hospitalId]);

  const { data: wards, isLoading: isWardsLoading } = useCollection<Ward>(wardsQuery);

  // 2. LIVE QUERY: All beds belonging to this hospital
  const bedsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.hospitalId) return null;
    return query(
        collection(firestore, 'beds'),
        where('hospitalId', '==', user.hospitalId),
        orderBy('bedNumber', 'asc')
    );
  }, [firestore, user?.hospitalId]);

  const { data: beds, isLoading: isBedsLoading } = useCollection<Bed>(bedsQuery);

  const stats = React.useMemo(() => {
    if (!beds) return { total: 0, occupied: 0, cleaning: 0 };
    return beds.reduce((acc, bed) => {
        acc.total++;
        if (bed.status === 'Occupied') acc.occupied++;
        if (bed.status === 'Cleaning') acc.cleaning++;
        return acc;
    }, { total: 0, occupied: 0, cleaning: 0 });
  }, [beds]);

  if (isWardsLoading || isBedsLoading) {
    return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <BedDouble className="h-8 w-8 text-blue-600" />
                Bed Management & Census
            </h1>
            <p className="text-muted-foreground">
                Real-time bed tracking for <strong>{user?.hospitalId}</strong>.
            </p>
        </div>
        <div className="flex gap-2">
            <AddBedDialog />
            <AllocateBedDialog />
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="pt-6">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest">Total Bed Capacity</p>
                  <p className="text-3xl font-black text-blue-900">{stats.total}</p>
              </CardContent>
          </Card>
          <Card className="bg-green-50/50 border-green-100">
              <CardContent className="pt-6">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-widest">Current Occupancy</p>
                  <p className="text-3xl font-black text-green-900">
                    {stats.occupied} 
                    <span className="text-sm font-medium ml-2 text-green-700/70">
                        ({stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0}%)
                    </span>
                  </p>
              </CardContent>
          </Card>
          <Card className="bg-orange-50/50 border-orange-100">
              <CardContent className="pt-6">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-widest">In Housekeeping</p>
                  <p className="text-3xl font-black text-orange-900">{stats.cleaning}</p>
              </CardContent>
          </Card>
      </div>

      <Card className="shadow-md">
        <CardHeader className="border-b bg-muted/10">
          <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Ward Overview</CardTitle>
                <CardDescription>Live census of all facility wards.</CardDescription>
              </div>
              <Badge variant="outline" className="animate-pulse">Live Tracking Enabled</Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {beds && beds.length > 0 ? (
              <BedStatusGrid beds={beds} wards={wards || []} />
          ) : (
              <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/10">
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="font-semibold text-muted-foreground">No beds provisioned.</p>
                  <p className="text-xs text-muted-foreground/70">Use the 'Add New Bed' button to initialize your facility inventory.</p>
              </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
