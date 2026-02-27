'use client';

import * as React from 'react';
import { useParams, notFound, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { PatientEHR } from '../../my-practice/components/patient-ehr';
import { Skeleton } from '@/components/ui/skeleton';
import { Patient } from '@/lib/types';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * == Live SaaS Patient Electronic Medical Record ==
 * 
 * This page is the secure entry point for a specific patient's chart.
 * It uses a live Firestore listener and enforces the "SaaS Wall" to 
 * prevent cross-tenant data access.
 */
export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.patientId as string;
  const { user, loading: isAuthLoading } = useAuth();
  const firestore = useFirestore();

  // STABILIZE REFERENCE
  const patientRef = useMemoFirebase(() => {
    if (!patientId || !firestore) return null;
    return doc(firestore, 'patients', patientId);
  }, [firestore, patientId]);

  const { data: patient, isLoading: isDocLoading, error } = useDoc<Patient>(patientRef);

  // SAAS SECURITY WALL
  const isAuthorized = React.useMemo(() => {
    if (isAuthLoading || isDocLoading) return true; // Assume true while loading
    if (!user || !patient) return false;
    if (user.role === 'super_admin') return true;
    return patient.hospitalId === user.hospitalId;
  }, [user, patient, isAuthLoading, isDocLoading]);

  // 1. Loading State (Auth or Doc)
  if (isAuthLoading || isDocLoading || !firestore) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary opacity-20" />
            <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  // 2. If document definitely doesn't exist (Only check after loading is false)
  if (!patient && !error) {
    return notFound();
  }

  // 3. If access is denied by rules or SaaS logic
  if (!isAuthorized || error) {
    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center p-8 bg-destructive/5 rounded-3xl border-2 border-dashed border-destructive/20 m-6">
            <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-xl font-black text-destructive uppercase tracking-tighter">Access Denied</h2>
            <p className="text-sm text-muted-foreground mt-2 max-w-md">
                You do not have permission to view this clinical chart. 
                Access is restricted to authorized personnel at <strong>{user?.hospitalId || 'this facility'}</strong>.
            </p>
            <Button variant="outline" className="mt-6 font-bold" onClick={() => router.back()}>
                Return to Directory
            </Button>
        </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex-grow overflow-hidden">
        {/* Pass the live patient object to the workbench */}
        <PatientEHR patient={patient} />
      </div>
    </div>
  );
}
