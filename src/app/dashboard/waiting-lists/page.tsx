
'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { AddToWaitlistDialog } from './components/add-to-waitlist-dialog';
import { WaitingListsTable } from './components/waiting-lists-table';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockWaitingList, allPatients as initialPatients } from '@/lib/data';
import { WaitingListEntry, Patient } from '@/lib/types';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function WaitingListsPage() {
  const { user } = useAuth();
  const [allWaitlist, setWaitingList] = useLocalStorage<WaitingListEntry[]>('waitingList', mockWaitingList);
  const [allPatients, setAllPatients] = useLocalStorage<Patient[]>('patients', initialPatients);

  // SaaS LOGIC: Only show waiting list entries for the current hospital
  const hospitalWaitlist = React.useMemo(() => {
    if (!user) return [];
    return allWaitlist.filter(item => item.hospitalId === user.hospitalId);
  }, [allWaitlist, user]);

  const handlePatientAdded = (newEntry: Omit<WaitingListEntry, 'waitinglistId' | 'dateAdded' | 'status'>) => {
    const finalEntry: WaitingListEntry = {
        ...newEntry,
        waitinglistId: `wl-${Date.now()}`,
        dateAdded: new Date().toISOString(),
        status: 'Active',
    };
    
    setWaitingList(prev => [finalEntry, ...prev]);
    toast.success("Patient has been successfully added to the waiting list.");
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Waiting List Management</h1>
          <p className="text-muted-foreground">
            A central hub for managing patient queues for <strong>{user?.hospitalId}</strong>.
          </p>
        </div>
        <AddToWaitlistDialog onPatientAdded={handlePatientAdded} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Master Waiting List</CardTitle>
          <CardDescription>
            A prioritized list of all patients awaiting appointments or procedures in your facility.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WaitingListsTable waitingList={hospitalWaitlist} allPatients={allPatients} />
        </CardContent>
      </Card>
    </div>
  );
}
