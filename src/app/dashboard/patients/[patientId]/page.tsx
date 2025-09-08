

'use client';

import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, Pill, TestTube, FileText, HeartPulse, AlertTriangle, Shield, Scan } from 'lucide-react';
import { allPatients, allAdmissions, mockNotes } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

import { DemographicsTab } from './components/demographics-tab';
import { AdmissionsHistoryTab } from './components/admissions-history-tab';
import { ClinicalNotesTab } from './components/clinical-notes-tab';
import { BillingTab } from './components/billing-tab';
import { Badge } from '@/components/ui/badge';
import { TransferPatientDialog } from './components/transfer-patient-dialog';
import { AllocateBedDialog } from '../../beds/components/allocate-bed-dialog';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { DischargePatientDialog } from './components/discharge-patient-dialog';
import { DiagnosesTab } from './components/diagnoses-tab';
import { MedicationsTab } from './components/medications-tab';
import { LabResultsTab } from './components/lab-results-tab';
import { VitalsTab } from './components/vitals-tab';
import { PatientAlerts } from './components/patient-alerts';
import { ImmunizationsTab } from './components/immunizations-tab';
import { OrderTestDialog } from './components/order-test-dialog';
import { OrderStudyDialog } from './components/order-study-dialog';


/**
 * == Conceptual UI: Patient-Centric EHR Dashboard ==
 *
 * This component acts as the central hub for a patient's Electronic Health Record (EHR).
 * It's designed as a patient-centric dashboard with multiple tabs, each dedicated to a
 * specific domain of the patient's record (e.g., Demographics, Clinical Notes, Billing).
 *
 * It heavily uses conditional rendering based on the logged-in user's role and the
 * patient's current status (admitted vs. outpatient) to create a tailored and intuitive
 * experience for different clinical and administrative staff.
 */
export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const { user } = useAuth(); // Get the current user to tailor the UI
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // In a real app, this data would be fetched from Firestore, including all EHR sub-collections.
  const patient = allPatients.find((p) => p.patient_id === patientId);
  const admissions = allAdmissions.filter((a) => a.patient_id === patientId);

  if (!patient) {
    notFound();
  }

  const currentAdmission = admissions.find(a => a.admission_id === patient.current_admission_id);
  
  const hasClinicalPrivileges = user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'nurse');
  const isDoctor = user && user.role === 'doctor';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/dashboard/patients">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Link>
            </Button>
            <div className="flex-1">
                <h1 className="shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                {patient.full_name}
                </h1>
                <div className="mt-1 text-sm text-muted-foreground">
                    {patient.is_admitted && currentAdmission ? (
                        <span>
                            Admitted in <strong>{currentAdmission.ward}</strong>, Bed <strong>{currentAdmission.bed_id}</strong>
                        </span>
                    ) : (
                        <span>
                            {patient.lastVisitDate 
                                ? `Last Visit: ${format(new Date(patient.lastVisitDate), 'PPP')} (Outpatient)`
                                : 'No recent visit history.'}
                        </span>
                    )}
                </div>
            </div>
        </div>

        <div className="sm:ml-auto flex items-center gap-2 w-full sm:w-auto">
            <Badge variant={patient.is_admitted ? 'destructive' : 'secondary'} className="ml-auto sm:ml-0">
                {patient.is_admitted ? 'Admitted' : 'Outpatient'}
            </Badge>
        </div>
      </div>
      
       {hasClinicalPrivileges && (
        <>
            <PatientAlerts patientId={patient.patient_id} />
            <div className="flex items-center gap-2 border-t border-b py-2 flex-wrap">
                    <h3 className="text-sm font-semibold mr-4">Management</h3>
                    <AllocateBedDialog 
                        patientId={patient.patient_id}
                        disabled={patient.is_admitted || isSubmitting} 
                    />
                    <TransferPatientDialog 
                        patient={patient} 
                        currentBedId={currentAdmission?.bed_id}
                        disabled={isSubmitting || !patient.is_admitted} 
                    />
                    <DischargePatientDialog 
                        patient={patient}
                        clinicalNotes={mockNotes.filter(note => note.patientId === patientId)}
                        disabled={isSubmitting || !patient.is_admitted}
                    />
            </div>
        </>
       )}

       {isDoctor && (
        <div className="flex items-center gap-2 border-b pb-2 flex-wrap">
            <h3 className="text-sm font-semibold mr-4">Clinical Actions</h3>
            <OrderTestDialog patientId={patient.patient_id} />
            <OrderStudyDialog patientId={patient.patient_id} />
        </div>
       )}

      <Tabs defaultValue="vitals">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="vitals" className="mt-4">
            <VitalsTab patientId={patient.patient_id} />
        </TabsContent>
        <TabsContent value="demographics" className="mt-4">
          <DemographicsTab patient={patient} />
        </TabsContent>
        <TabsContent value="admissions" className="mt-4">
           <AdmissionsHistoryTab admissions={admissions} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <ClinicalNotesTab patientId={patient.patient_id} />
        </TabsContent>
         <TabsContent value="diagnoses" className="mt-4">
          <DiagnosesTab />
        </TabsContent>
         <TabsContent value="medications" className="mt-4">
          <MedicationsTab patientId={patient.patient_id}/>
        </TabsContent>
        <TabsContent value="labs" className="mt-4">
          <LabResultsTab />
        </TabsContent>
        <TabsContent value="immunizations" className="mt-4">
          <ImmunizationsTab patientId={patient.patient_id} />
        </TabsContent>
         <TabsContent value="billing" className="mt-4">
           <BillingTab patientId={patient.patient_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
