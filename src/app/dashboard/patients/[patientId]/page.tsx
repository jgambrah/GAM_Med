
'use client';

import * as React from 'react';
import { useParams, notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';

// EHR Sub-Components
import { PatientEHR } from '../../my-practice/components/patient-ehr';

// Data & Types
import { allPatients as initialAllPatientsData } from '@/lib/data';
import { Patient } from '@/lib/types';

/**
 * == Patient Electronic Medical Record (EMR) Root ==
 * 
 * This is the canonical entry point for a patient's full record.
 * It leverages the PatientEHR workbench component to provide a consistent
 * clinical view across the entire application.
 */
export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const { user } = useAuth();
  
  const [allPatients, , isLoading] = useLocalStorage<Patient[]>('patients', initialAllPatientsData);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-12 w-1/3" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const patient = allPatients.find((p) => p.patient_id === patientId);

  // SAAS SECURITY WALL: Prevent cross-tenant data access
  if (!patient || (user && patient.hospitalId !== user.hospitalId)) {
    notFound();
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
            <Link href="/dashboard/patients">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to Directory
            </Link>
        </Button>
      </div>

      <div className="flex-grow overflow-hidden">
        <PatientEHR patientId={patientId} />
      </div>
    </div>
  );
}
