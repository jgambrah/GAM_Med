
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

export default function WaitingListsPage() {
  const [waitingList, setWaitingList] = useLocalStorage<WaitingListEntry[]>('waitingList', mockWaitingList);
  const [allPatients, setAllPatients] = useLocalStorage<Patient[]>('patients', initialPatients);

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
            A central hub for managing patient queues for services and procedures.
          </p>
        </div>
        <AddToWaitlistDialog onPatientAdded={handlePatientAdded} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Master Waiting List</CardTitle>
          <CardDescription>
            A prioritized list of all patients awaiting appointments or procedures.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WaitingListsTable waitingList={waitingList} allPatients={allPatients} />
        </CardContent>
      </Card>
    </div>
  );
}
