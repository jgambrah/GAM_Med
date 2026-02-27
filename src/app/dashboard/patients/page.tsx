'use client';

import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { PatientTable } from './components/patient-table';
import { AddPatientDialog } from './components/add-patient-dialog';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Patient } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { Loader2, Users } from 'lucide-react';

/**
 * == Clinical Workbench: Patient Management ==
 * 
 * Browse, register, and manage patient records.
 * Enforces logical isolation via the hospitalId filter (The SaaS Wall).
 */
export default function PatientsPage() {
  const { user } = useAuth();
  const db = useFirestore();
  const [searchQuery, setSearchQuery] = React.useState('');

  // 1. THE SAAS WALL: Filter all patients by the current hospitalId
  const patientsQuery = useMemoFirebase(() => {
    if (!db || !user?.hospitalId) return null;
    return query(
        collection(db, "patients"),
        where("hospitalId", "==", user.hospitalId),
        orderBy("created_at", "desc"),
        limit(100)
    );
  }, [db, user?.hospitalId]);

  const { data: allPatients, isLoading } = useCollection<Patient>(patientsQuery);

  // 2. Local Search Filtering
  const filteredPatients = React.useMemo(() => {
    if (!allPatients) return [];
    if (!searchQuery) return allPatients;

    const lowerQuery = searchQuery.toLowerCase().trim();
    return allPatients.filter(p => 
        p.full_name?.toLowerCase().includes(lowerQuery) ||
        p.mrn?.toLowerCase().includes(lowerQuery) ||
        p.patient_id?.toLowerCase().includes(lowerQuery) ||
        p.phone_search?.includes(lowerQuery.replace(/\D/g, ''))
    );
  }, [allPatients, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8 text-blue-600" />
            Patient Management
          </h1>
          <p className="text-muted-foreground font-medium italic">
            Clinical registry for <strong>{user?.hospitalId}</strong>
          </p>
        </div>
        <AddPatientDialog />
      </div>

      <Card className="shadow-md border-none ring-1 ring-slate-200">
        <CardHeader className="bg-muted/20 border-b">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
             <div>
                <CardTitle className="text-lg">Facility Registry</CardTitle>
                <CardDescription>A centralized view of all patients belonging to your hospital.</CardDescription>
             </div>
             <div className="w-full sm:w-80">
                <Input
                    placeholder="Search by name, MRN, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background shadow-sm"
                />
             </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
           {isLoading ? (
             <div className="h-40 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <Loader2 className="h-8 w-8 animate-spin opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Syncing EHR Data...</p>
             </div>
           ) : (
             <PatientTable 
                data={filteredPatients} 
                onPatientUpdated={() => {}} 
                onPatientDeleted={() => {}}
             />
           )}
        </CardContent>
      </Card>
    </div>
  );
}