'use client';

import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { PatientEHR } from '../../my-practice/components/patient-ehr';
import { Skeleton } from '@/components/ui/skeleton';
import { Patient } from '@/lib/types';

/**
 * == Live SaaS Patient Electronic Medical Record ==
 * 
 * This page is the secure entry point for a specific patient's chart.
 * It uses a live Firestore listener and enforces the "SaaS Wall" to 
 * prevent cross-tenant data access.
 */
export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const { user } = useAuth();
  const firestore = useFirestore();

  // STABILIZE REFERENCE: Use useMemoFirebase to prevent infinite loops with the useDoc hook.
  const patientRef = useMemoFirebase(() => {
    if (!patientId || !firestore) return null;
    return doc(firestore, 'patients', patientId);
  }, [firestore, patientId]);

  const { data: patient, isLoading } = useDoc<Patient>(patientRef);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  // SAAS SECURITY WALL: 
  // Even if the URL is correct, if the patient doesn't belong to the user's hospital, block access.
  if (!patient || (user && patient.hospitalId !== user.hospitalId)) {
    notFound();
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
