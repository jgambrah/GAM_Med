
'use client';

import * as React from 'react';
import { useParams, notFound } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus, LogOut, ArrowRightLeft } from 'lucide-react';
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
import { admitPatient, dischargePatient } from '@/lib/actions';
import { TransferPatientDialog } from './components/transfer-patient-dialog';

/**
 * PatientRecordDashboard (Conceptual Component)
 *
 * This component is the main dashboard for viewing a single patient's record.
 *
 * Structure:
 * - It's a dynamic Next.js page that uses the `patientId` from the URL.
 * - A header displays the patient's name, admission status (via a <Badge>), and key action buttons.
 * - Core actions (Admit, Transfer, Discharge) are available as buttons, which call server actions.
 * - It uses ShadCN's <Tabs> component to organize a large amount of information into
 *   digestible sections: Demographics, Admissions, Clinical Notes, and Billing.
 * - Each tab's content is delegated to a separate, dedicated component.
 *
 * Firestore Integration:
 * - This component would fetch all data for a specific patient.
 * - Example Firestore Query (in a server component or data-fetching hook):
 *   const patientRef = db.collection('patients').doc(patientId);
 *   const patientDoc = await patientRef.get();
 *   const patientData = patientDoc.data();
 *
 *   const admissionsRef = patientRef.collection('admissions').orderBy('admission_date', 'desc');
 *   const admissionsSnapshot = await admissionsRef.get();
 *   const admissionsData = admissionsSnapshot.docs.map(doc => doc.data());
 *
 *   // These datasets would then be passed as props to this component and its children.
 */
export default function PatientDetailPage() {
  const params = useParams();
  const patientId = params.patientId as string;
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // In a real app, this data would be fetched from Firestore.
  const patient = allPatients.find((p) => p.patient_id === patientId);
  const admissions = allAdmissions.filter((a) => a.patient_id === patientId);

  if (!patient) {
    notFound();
  }

  const handleAdmit = async () => {
    setIsSubmitting(true);
    await admitPatient(patient.patient_id);
    alert('Patient has been admitted (simulated). The page will now refresh.');
    setIsSubmitting(false);
  };

  const handleDischarge = async () => {
    if (!patient.current_admission_id) {
        alert("Error: Patient has no current admission record to discharge.");
        return;
    }
    setIsSubmitting(true);
    await dischargePatient(patient.patient_id, patient.current_admission_id);
    alert('Patient has been discharged (simulated). The page will now refresh.');
    setIsSubmitting(false);
  };

  const currentAdmission = admissions.find(a => a.admission_id === patient.current_admission_id);

  return (
    <div className="space-y-6">
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
         <div className="flex items-center gap-2 ml-auto">
            <Button onClick={handleAdmit} variant="outline" size="sm" disabled={isSubmitting || patient.is_admitted}>
                <Plus className="h-4 w-4 mr-2" />
                {isSubmitting ? 'Admitting...' : 'Admit Patient'}
            </Button>
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
       </div>

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
