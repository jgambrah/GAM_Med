
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Patient } from '@/lib/types';
import { cn } from '@/lib/utils';
import { BedDouble } from 'lucide-react';
import { allAdmissions } from '@/lib/data';

interface NurseWorklistProps {
  patients: Patient[];
  onPatientSelect: (patient: Patient) => void;
  selectedPatientId?: string | null;
  wardName: string;
}

/**
 * @deprecated This component is deprecated in favor of the new task-oriented dashboard.
 */
export function NurseWorklist({ patients, onPatientSelect, selectedPatientId, wardName }: NurseWorklistProps) {
  
  const getAdmissionDetails = (patientId: string) => {
    const patient = patients.find(p => p.patient_id === patientId);
    if (!patient || !patient.current_admission_id) return null;
    return allAdmissions.find(a => a.admission_id === patient.current_admission_id);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>My Ward: {wardName}</CardTitle>
        <CardDescription>Select a patient to manage their record.</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow p-0">
        <ScrollArea className="h-full">
          <div className="p-6 pt-0 space-y-2">
            {patients.length > 0 ? (
              patients.map((patient) => {
                const admission = getAdmissionDetails(patient.patient_id);
                return (
                  <button
                    key={patient.patient_id}
                    onClick={() => onPatientSelect(patient)}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition-colors',
                      selectedPatientId === patient.patient_id
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-accent'
                    )}
                  >
                    <p className="font-semibold">{patient.full_name}</p>
                    <div className="flex items-center text-sm mt-1">
                      <BedDouble className="h-4 w-4 mr-2" />
                      <span>{admission?.bed_id}</span>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="text-center text-muted-foreground p-8">
                There are no patients currently admitted to your assigned ward.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
