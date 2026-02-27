'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { PatientEHR } from '../../my-practice/components/patient-ehr';
import { Skeleton } from '@/components/ui/skeleton';
import { Patient } from '@/lib/types';
import { ShieldAlert, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * == SaaS Patient Detail Page ==
 * 
 * Secure EHR entry point. Resolves race conditions between route parameters
 * and Firestore data synchronization.
 */
export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // 1. STABILIZE ID: Safely resolve the patientId from the URL
  const rawId = params?.patientId;
  const patientId = React.useMemo(() => 
    typeof rawId === 'string' ? decodeURIComponent(rawId) : null, 
  [rawId]);

  const { user, loading: isAuthLoading } = useAuth();
  const firestore = useFirestore();

  // 2. DATA SYNC: Fetch the patient document with a memoized reference
  const patientRef = useMemoFirebase(() => {
    if (!patientId || !firestore) return null;
    return doc(firestore, 'patients', patientId);
  }, [firestore, patientId]);

  const { data: patient, isLoading: isDocLoading, error } = useDoc<Patient>(patientRef);

  // 3. SAAS SECURITY: Verify multi-tenant authorization
  const isAuthorized = React.useMemo(() => {
    if (isAuthLoading || isDocLoading) return true; // Wait for data
    if (!patient || !user) return true; // Let the not-found or auth guard handle it
    if (user.role === 'super_admin') return true;
    return patient.hospitalId === user.hospitalId;
  }, [user, patient, isAuthLoading, isDocLoading]);

  // 4. LOADING STATE: High-fidelity skeletons for clinical data synchronization
  if (isAuthLoading || isDocLoading || !firestore || !patientId) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary opacity-20" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Syncing Clinical Record...</p>
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  // 5. PERMISSION GUARD: Prevent cross-tenant data leakage
  if (error || !isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8 bg-destructive/5 border-2 border-dashed border-destructive/20 m-6 rounded-3xl">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-black text-destructive uppercase tracking-tighter">Tenant Access Violation</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md font-medium">
                Identity mismatch. This medical chart belongs to a different facility or your session has expired.
            </p>
            <Button variant="outline" className="mt-6 font-bold uppercase text-xs" onClick={() => router.push('/dashboard/patients')}>
                Return to Directory
            </Button>
        </div>
    );
  }

  // 6. NOT FOUND GUARD: Handle non-existent records after loading is complete
  if (!patient) {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
            <Search className="h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-black text-slate-900 uppercase">Chart Not Located</h2>
            <p className="text-slate-500 mt-2 font-medium">The record "{patientId}" could not be found in your facility registry.</p>
            <Button variant="link" className="font-bold" onClick={() => router.push('/dashboard/patients')}>Return to Directory</Button>
        </div>
    );
  }

  // 7. SUCCESS: Render the EHR with guaranteed non-null patient data
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex-grow overflow-hidden">
        <PatientEHR patient={patient} />
      </div>
    </div>
  );
}
