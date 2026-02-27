
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

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  
  // 1. Decode the ID just in case there are URL-encoded characters
  const rawPatientId = params?.patientId as string;
  const patientId = React.useMemo(() => 
    rawPatientId ? decodeURIComponent(rawPatientId) : null, 
  [rawPatientId]);

  const { user, loading: isAuthLoading } = useAuth();
  const firestore = useFirestore();

  // 2. STABILIZE REFERENCE: Only create the ref if we have a valid ID and Firestore
  const patientRef = useMemoFirebase(() => {
    if (!patientId || !firestore) return null;
    return doc(firestore, 'patients', patientId);
  }, [firestore, patientId]);

  const { data: patient, isLoading: isDocLoading, error } = useDoc<Patient>(patientRef);

  // 3. SAAS SECURITY WALL (Memoized for stability)
  const isAuthorized = React.useMemo(() => {
    // If we're still loading, we haven't failed authorization yet
    if (isAuthLoading || isDocLoading) return true; 
    // If loading is finished and we have data, verify the hospitalId
    if (!patient || !user) return true; 
    if (user.role === 'super_admin') return true;
    return patient.hospitalId === user.hospitalId;
  }, [user, patient, isAuthLoading, isDocLoading]);

  // 4. LOADING STATE: Keep showing skeletons while ANY part of the system is syncing
  if (isAuthLoading || isDocLoading || !firestore || !patientId) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Clinical Record...</p>
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  // 5. ERROR STATE: If Firebase actually returns an error or authorization fails
  if (error || !isAuthorized) {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-black text-destructive uppercase">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Identity mismatch or permission error. This chart belongs to a different facility or your session is invalid.
            </p>
            <Button variant="outline" className="mt-6 font-bold" onClick={() => router.push('/dashboard/patients')}>
                Back to Directory
            </Button>
        </div>
    );
  }

  // 6. NOT FOUND STATE: Explicitly narrow the patient type to resolve build error
  if (!patient) {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8">
            <Search className="h-16 w-16 text-slate-300 mb-4" />
            <h2 className="text-xl font-bold">Patient Not Found</h2>
            <p className="text-slate-500 mt-2">The record "{patientId}" could not be located in your facility.</p>
            <Button variant="link" onClick={() => router.push('/dashboard/patients')}>Return to Directory</Button>
        </div>
    );
  }

  // 7. SUCCESS: Finally render the EHR with guaranteed patient data
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4 animate-in fade-in duration-500">
      <div className="flex-grow overflow-hidden">
        <PatientEHR patient={patient} />
      </div>
    </div>
  );
}
