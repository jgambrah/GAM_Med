

'use client';

import * as React from 'react';
import { allPatients, allAdmissions, mockNotes } from '@/lib/data';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { DemographicsTab } from '../../patients/[patientId]/components/demographics-tab';
import { AdmissionsHistoryTab } from '../../patients/[patientId]/components/admissions-history-tab';
import { ClinicalNotesTab } from '../../patients/[patientId]/components/clinical-notes-tab';
import { BillingTab } from '../../patients/[patientId]/components/billing-tab';
import { DiagnosesTab } from '../../patients/[patientId]/components/diagnoses-tab';
import { MedicationsTab } from '../../patients/[patientId]/components/medications-tab';
import { LabResultsTab } from '../../patients/[patientId]/components/lab-results-tab';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { OrderTestDialog } from '../../patients/[patientId]/page';
import { AddNoteDialog } from '../../patients/[patientId]/components/clinical-notes-tab';
import { PatientAlerts } from '../../patients/[patientId]/components/patient-alerts';


interface PatientEHRProps {
    patientId: string;
}

export function PatientEHR({ patientId }: PatientEHRProps) {
  
  // In a real app, this data would be fetched from Firestore, including all EHR sub-collections.
  const patient = allPatients.find((p) => p.patient_id === patientId);
  const admissions = allAdmissions.filter((a) => a.patient_id === patientId);
  
  if (!patient) {
    return (
        <Card className="h-full flex items-center justify-center">
            <p className="text-muted-foreground">Patient record not found.</p>
        </Card>
    );
  }

  const currentAdmission = admissions.find(a => a.admission_id === patient.current_admission_id);

  return (
    <Card className="h-full">
        <ScrollArea className="h-full p-6">
             <div className="space-y-4">
                <div>
                    <h2 className="text-2xl font-semibold">{patient.full_name}</h2>
                    <p className="text-muted-foreground">Patient ID: {patient.patient_id}</p>
                </div>
                
                <PatientAlerts patientId={patient.patient_id} />

                 <div className="flex items-center gap-2 border-b pb-2 flex-wrap">
                    <h3 className="text-sm font-semibold mr-4">Clinical Actions</h3>
                    <AddNoteDialog patientId={patient.patient_id} />
                    <OrderTestDialog patientId={patient.patient_id} />
                </div>


                <Tabs defaultValue="notes" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 md:grid-cols-4 lg:grid-cols-8 h-auto">
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                        <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
                        <TabsTrigger value="medications">Medications</TabsTrigger>
                        <TabsTrigger value="labs">Lab Results</TabsTrigger>
                        <TabsTrigger value="admissions">Admissions</TabsTrigger>
                        <TabsTrigger value="demographics">Demographics</TabsTrigger>
                        <TabsTrigger value="billing">Billing</TabsTrigger>
                    </TabsList>
                    <TabsContent value="notes" className="mt-4">
                        <ClinicalNotesTab patientId={patient.patient_id} />
                    </TabsContent>
                    <TabsContent value="diagnoses" className="mt-4">
                        <DiagnosesTab />
                    </TabsContent>
                    <TabsContent value="medications" className="mt-4">
                        <MedicationsTab patientId={patient.patient_id} />
                    </TabsContent>
                    <TabsContent value="labs" className="mt-4">
                        <LabResultsTab />
                    </TabsContent>
                     <TabsContent value="admissions" className="mt-4">
                        <AdmissionsHistoryTab admissions={admissions} />
                    </TabsContent>
                     <TabsContent value="demographics" className="mt-4">
                        <DemographicsTab patient={patient} />
                    </TabsContent>
                    <TabsContent value="billing" className="mt-4">
                        <BillingTab patientId={patient.patient_id} />
                    </TabsContent>
                </Tabs>
             </div>
        </ScrollArea>
    </Card>
  );
}
