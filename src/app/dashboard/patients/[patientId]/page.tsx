
'use client';

import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, LogOut } from 'lucide-react';
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
import { ClinicalNotesTab } from './components/clinical-notes-tab';
import { BillingTab } from './components/billing-tab';
import { Badge } from '@/components/ui/badge';
import { dischargePatient } from '@/lib/actions';
import { TransferPatientDialog } from './components/transfer-patient-dialog';
import { AllocateBedDialog } from '../../beds/components/allocate-bed-dialog';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

/**
 * == Conceptual UI: Conditional Rendering ==
 *
 * This component serves as the central dashboard for viewing and managing a single
 * patient's complete record. It heavily uses conditional logic to tailor the
 * displayed information and available actions based on the patient's current status.
 */
export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const { user } = useAuth(); // Get the current user
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // In a real app, this data would be fetched from Firestore.
  const patient = allPatients.find((p) => p.patient_id === patientId);
  const admissions = allAdmissions.filter((a) => a.patient_id === patientId);

  if (!patient) {
    notFound();
  }

  const handleDischarge = async () => {
    if (!patient.current_admission_id) {
        alert("Error: Patient has no current admission record to discharge.");
        return;
    }
    setIsSubmitting(true);
    // This function calls the `handlePatientDischarge` Cloud Function via a server action.
    await dischargePatient(patient.patient_id, patient.current_admission_id);
    alert('Patient has been discharged (simulated). The page will now refresh.');
    setIsSubmitting(false);
  };

  const currentAdmission = admissions.find(a => a.admission_id === patient.current_admission_id);
  
  // Determine if the user has clinical privileges for certain actions
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
            {/*
              == CONDITIONAL UI: BADGE ==
              This badge's appearance and text change based on the `is_admitted` flag,
              providing an immediate visual cue about the patient's status.
            */}
            <Badge variant={patient.is_admitted ? 'destructive' : 'secondary'} className="ml-auto sm:ml-0">
            {patient.is_admitted ? 'Admitted' : 'Outpatient'}
            </Badge>
            {hasClinicalPrivileges && (
                <div className="hidden items-center gap-2 md:ml-auto md:flex">
                    {/*
                      == CONDITIONAL UI: ACTIONS ==
                      The "Admit", "Transfer", and "Discharge" buttons are conditionally disabled
                      based on the `patient.is_admitted` boolean. This prevents staff from
                      performing invalid actions, like trying to discharge an outpatient.
                    */}
                    <AllocateBedDialog 
                    patientId={patient.patient_id}
                    disabled={patient.is_admitted || isSubmitting} 
                    />
                    <TransferPatientDialog 
                        patient={patient} 
                        currentBedId={currentAdmission?.bed_id}
                        disabled={isSubmitting || !patient.is_admitted} 
                    />
                    <Button onClick={handleDischarge} variant="destructive" size="sm" disabled={isSubmitting || !patient.is_admitted}>
                        <LogOut className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Discharging...' : 'Discharge Patient'}
                    </Button>
                </div>
            )}
        </div>
        {/*
          == CONDITIONAL UI: CONTEXTUAL MESSAGE ==
          This block provides a clear, human-readable summary of the patient's status.
          If they are an inpatient, it shows their ward and bed.
          If they are an outpatient, it shows their last visit date.
          This logic is driven entirely by the `is_admitted` flag.
        */}
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
              <Button onClick={handleDischarge} variant="destructive" size="sm" disabled={isSubmitting || !patient.is_admitted}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Discharging...' : 'Discharge'}
              </Button>
          </div>
       )}

      <Tabs defaultValue="demographics">
        <TabsList>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
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
         <TabsContent value="billing" className="mt-4">
           <BillingTab patientId={patient.patient_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
