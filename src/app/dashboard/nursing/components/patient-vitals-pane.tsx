
'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Patient, ClinicalNote } from '@/lib/types';
import { VitalsTab } from '../../patients/[patientId]/components/vitals-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClinicalNotesTab } from '../../patients/[patientId]/components/clinical-notes-tab';
import { MedicationsTab } from '../../patients/[patientId]/components/medications-tab';
import { mockNotes, mockCarePlans } from '@/lib/data';
import { AddNoteDialog } from '../../patients/[patientId]/components/clinical-notes-tab';
import { CarePlanTab } from '../../patients/[patientId]/components/care-plan-tab';
import { useLocalStorage } from '@/hooks/use-local-storage';

interface PatientVitalsPaneProps {
  patient: Patient;
}

/**
 * @deprecated This component is deprecated in favor of the new task-oriented dashboard.
 */
export function PatientVitalsPane({ patient }: PatientVitalsPaneProps) {
  const carePlan = mockCarePlans.find(cp => cp.patientId === patient.patient_id);
  const [clinicalNotes, setClinicalNotes] = useLocalStorage<ClinicalNote[]>('clinicalNotes', mockNotes);

  const handleNoteAdded = (newNote: ClinicalNote) => {
    setClinicalNotes(prev => [newNote, ...prev]);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>{patient.full_name}</CardTitle>
                <CardDescription>Patient ID: {patient.patient_id}</CardDescription>
            </div>
            <AddNoteDialog patientId={patient.patient_id} onNoteAdded={handleNoteAdded} />
        </div>
      </CardHeader>
      <CardContent className="flex-grow overflow-hidden">
        <Tabs defaultValue="vitals" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="vitals">Vitals</TabsTrigger>
            <TabsTrigger value="medications">Medications</TabsTrigger>
            <TabsTrigger value="care-plan">Care Plan</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
          </TabsList>
          <ScrollArea className="flex-grow mt-4 p-1">
            <TabsContent value="vitals">
              <VitalsTab patientId={patient.patient_id} />
            </TabsContent>
            <TabsContent value="medications">
              <MedicationsTab patientId={patient.patient_id} />
            </TabsContent>
            <TabsContent value="care-plan">
              <CarePlanTab carePlan={carePlan} />
            </TabsContent>
            <TabsContent value="notes">
              <ClinicalNotesTab patientId={patient.patient_id} />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
}
