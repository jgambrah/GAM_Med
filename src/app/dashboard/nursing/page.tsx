
'use client';

import *s React from 'react';
import { NurseWorklist } from './components/nurse-worklist';
import { PatientVitalsPane } from './components/patient-vitals-pane';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Patient } from '@/lib/types';
import { allPatients } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';

export default function NursingPage() {
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);
  const { user } = useAuth();

  // In a real app, this would be a real-time query for the nurse's assigned ward.
  // For this prototype, we'll assume the nurse is assigned to a ward where patients are admitted.
  // We will filter for patients in the 'Cardiology' ward as an example.
  const wardPatients = allPatients.filter(p => p.is_admitted && p.current_admission_id && p.current_admission_id.startsWith('A-001'));

  React.useEffect(() => {
    if (wardPatients.length > 0 && !selectedPatient) {
        setSelectedPatient(wardPatients[0]);
    }
  }, [wardPatients, selectedPatient]);
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nursing Station</h1>
        <p className="text-muted-foreground">
          Welcome, {user?.name}. Manage your assigned patients and record clinical data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
        <div className="lg:col-span-1 h-full">
            <NurseWorklist 
                patients={wardPatients} 
                onPatientSelect={setSelectedPatient}
                selectedPatientId={selectedPatient?.patient_id}
            />
        </div>
        <div className="lg:col-span-2 h-full">
            {selectedPatient ? (
                <PatientVitalsPane patient={selectedPatient} />
            ) : (
                <Card className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <CardHeader>
                            <CardTitle>No Patient Selected</CardTitle>
                            <CardDescription>Please select a patient from the worklist to view their details.</CardDescription>
                        </CardHeader>
                    </div>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
