
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
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Bed } from '@/lib/types';
import { allBeds } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';

export default function BedManagementPage() {
  const { user } = useAuth();
  const [storedBeds, setStoredBeds] = useLocalStorage<Bed[]>('beds', allBeds);

  const handleBedCreated = (newBed: Bed) => {
    setStoredBeds(prev => [...prev, newBed]);
  }

  // SaaS LOGIC: Filter by hospitalId
  const hospitalBeds = storedBeds.filter(b => b.hospitalId === user?.hospitalId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold">Bed Management</h1>
            <p className="text-muted-foreground">
            Real-time overview of hospital bed availability and status.
            </p>
        </div>
        <div className="flex gap-2">
            <AddBedDialog onBedCreated={handleBedCreated} />
            <AllocateBedDialog />
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Bed Status Dashboard</CardTitle>
          <CardDescription>
            A visual grid of all beds for your hospital, organized by ward.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BedStatusGrid beds={hospitalBeds} />
        </CardContent>
      </Card>
    </div>
  );
}
