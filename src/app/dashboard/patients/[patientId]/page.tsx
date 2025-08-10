
'use client';

import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { allPatients, allAdmissions } from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { DemographicsTab } from './components/demographics-tab';
import { AdmissionsHistoryTab } from './components/admissions-history-tab';
import { ClinicalNotesTab, ClinicalNote } from './components/clinical-notes-tab';
import { BillingTab } from './components/billing-tab';
import { Badge } from '@/components/ui/badge';
import { TransferPatientDialog } from './components/transfer-patient-dialog';
import { AllocateBedDialog } from '../../beds/components/allocate-bed-dialog';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { DischargePatientDialog } from './components/discharge-patient-dialog';
import { mockNotes } from './components/clinical-notes-tab';
import { VitalsTab } from './components/vitals-tab';
import { DiagnosesTab } from './components/diagnoses-tab';
import { MedicationsTab } from './components/medications-tab';
import { LabResultsTab } from './components/lab-results-tab';
import { Patient, Admission } from '@/lib/types';

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

  /**
   * == DATA FETCHING: Real-time Listeners (Conceptual) ==
   *
   * In a production application, each tab's data would be fetched using a real-time
   * listener from its corresponding Firestore sub-collection. This ensures the EHR is
   * always up-to-date.
   *
   * This would be implemented using React's `useEffect` hook for each data type.
   *
   * Example for Clinical Notes:
   *
   *   const [clinicalNotes, setClinicalNotes] = React.useState<ClinicalNote[]>([]);
   *   const [loadingNotes, setLoadingNotes] = React.useState(true);
   *
   *   React.useEffect(() => {
   *     if (!patientId) return;
   *
   *     // Path to the sub-collection in Firestore
   *     const notesQuery = query(
   *       collection(db, `patients/${patientId}/clinical_notes`),
   *       orderBy('recordedAt', 'desc')
   *     );
   *
   *     // onSnapshot establishes a real-time connection.
   *     const unsubscribe = onSnapshot(notesQuery, (querySnapshot) => {
   *       const notesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ClinicalNote));
   *       setClinicalNotes(notesData);
   *       setLoadingNotes(false);
   *     });
   *
   *     // Clean up the listener when the component unmounts
   *     return () => unsubscribe();
   *
   *   }, [patientId]);
   *
   * This pattern would be repeated for Vitals, Diagnoses, Medications, and Lab Results,
   * passing the live data down to each respective tab component.
   */

  if (!patient) {
    notFound();
  }

  const currentAdmission = admissions.find(a => a.admission_id === patient.current_admission_id);
  
  // Determine if the user has clinical privileges for certain actions
  // This is a stand-in for a more robust role-checking utility like the conceptual `getUserRole()`.
  const hasClinicalPrivileges = user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'nurse');

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/dashboard/patients">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
            {patient.full_name}
            </h1>
            <Badge variant={patient.is_admitted ? 'destructive' : 'secondary'} className="ml-auto sm:ml-0">
            {patient.is_admitted ? 'Admitted' : 'Outpatient'}
            </Badge>
            {/*
              == ROLE-BASED UI: CLINICAL ACTIONS ==
              This block demonstrates conditional rendering. The main patient management actions
              (Admit, Transfer, Discharge) are only rendered if the `hasClinicalPrivileges` check
              passes. This prevents unauthorized actions and declutters the UI for other staff like
              billing clerks or pharmacists, directly reflecting the logic in `firestore.rules`.
            */}
            {hasClinicalPrivileges && (
                <div className="hidden items-center gap-2 md:ml-auto md:flex">
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
                        clinicalNotes={mockNotes}
                        disabled={isSubmitting || !patient.is_admitted}
                    />
                </div>
            )}
        </div>
        <div className="mt-2 text-sm text-muted-foreground">
            {patient.is_admitted && currentAdmission ? (
                <span>
                    Currently admitted as <strong>Inpatient</strong> in <strong>{currentAdmission.ward}</strong>, Bed <strong>{currentAdmission.bed_id}</strong>.
                </span>
            ) : (
                <span>
                    {patient.lastVisitDate 
                        ? `Last Visit: ${format(new Date(patient.lastVisitDate), 'PPP')} (Outpatient)`
                        : 'No recent outpatient visit history.'}
                </span>
            )}
        </div>
      </div>
      
       {hasClinicalPrivileges && (
          <div className="flex items-center gap-2 md:hidden">
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
                  clinicalNotes={mockNotes}
                  disabled={isSubmitting || !patient.is_admitted}
              />
          </div>
       )}

      <Tabs defaultValue="demographics">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          {/* == EHR TABS ==
              These tabs are the core of the EHR view, separating clinical data into logical sections.
              In a full implementation, you could add role-based logic here to hide certain tabs
              from non-clinical staff, further enhancing security and usability.
           */}
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
        </TabsList>
        <TabsContent value="demographics" className="mt-4">
          <DemographicsTab patient={patient} />
        </TabsContent>
        <TabsContent value="admissions" className="mt-4">
           <AdmissionsHistoryTab admissions={admissions} />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <ClinicalNotesTab patientId={patient.patient_id} />
        </TabsContent>
         <TabsContent value="vitals" className="mt-4">
          <VitalsTab />
        </TabsContent>
         <TabsContent value="diagnoses" className="mt-4">
          <DiagnosesTab />
        </TabsContent>
         <TabsContent value="medications" className="mt-4">
          <MedicationsTab />
        </TabsContent>
        <TabsContent value="labs" className="mt-4">
          <LabResultsTab />
        </TabsContent>
         <TabsContent value="billing" className="mt-4">
           <BillingTab patientId={patient.patient_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
