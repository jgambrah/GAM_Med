
'use client';

import * as React from 'react';
import { useParams, notFound, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { 
    mockCarePlans, 
    mockOtSessions, 
    mockNotes as initialClinicalNotes,
    mockRadiologyOrders as initialRadiologyOrders, 
    mockLabResults as initialLabResults, 
    allPatients as initialAllPatientsData, 
    allAdmissions as initialAllAdmissionsData, 
    allBeds as initialAllBedsData 
} from '@/lib/data';
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { DemographicsTab } from './components/demographics-tab';
import { AdmissionsHistoryTab } from './components/admissions-history-tab';
import { ClinicalNotesTab, AddNoteDialog } from './components/clinical-notes-tab';
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
import { RadiologyTab } from './components/radiology-tab';
import { CarePlanTab } from './components/care-plan-tab';
import { PreOpChecklistTab } from './components/pre-op-checklist-tab';
import { PostOpCareTab } from './components/post-op-care-tab';
import { toast } from '@/hooks/use-toast';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Patient, Admission, Bed, CarePlan, ClinicalNote, RadiologyOrder, LabResult } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function PatientDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params.patientId as string;
  const { user } = useAuth();
  
  const [allPatients, setAllPatients, isLoadingPatients] = useLocalStorage<Patient[]>('patients', initialAllPatientsData);
  const [allAdmissions, setAllAdmissions, isLoadingAdmissions] = useLocalStorage<Admission[]>('admissions', initialAllAdmissionsData);
  const [allBeds, setAllBeds, isLoadingBeds] = useLocalStorage<Bed[]>('beds', initialAllBedsData);
  const [clinicalNotes, setClinicalNotes, isLoadingNotes] = useLocalStorage<ClinicalNote[]>('clinicalNotes', initialClinicalNotes);
  const [carePlans, setCarePlans, isLoadingCarePlans] = useLocalStorage<CarePlan[]>('carePlans', mockCarePlans);
  const [radiologyOrders, setRadiologyOrders, isLoadingRadOrders] = useLocalStorage<RadiologyOrder[]>('radiologyOrders', initialRadiologyOrders);
  const [labResults, setLabResults, isLoadingLabResults] = useLocalStorage<LabResult[]>('labResults', initialLabResults);

  const isLoading = isLoadingPatients || isLoadingAdmissions || isLoadingBeds || isLoadingNotes || isLoadingCarePlans || isLoadingRadOrders || isLoadingLabResults;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-8 w-1/4" />
        <div className="flex gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const patient = allPatients.find((p) => p.patient_id === patientId);

  // SaaS LOGIC: Prevent cross-tenant access
  if (!patient || (user && patient.hospitalId !== user.hospitalId)) {
    notFound();
  }

  const admissions = allAdmissions.filter((a) => a.patient_id === patientId);
  const carePlan = carePlans.find(cp => cp.patientId === patientId);
  const upcomingSurgery = mockOtSessions.find(s => s.patientId === patientId && (s.status === 'Scheduled' || s.status === 'Completed'));
  
  const defaultTab = searchParams.get('tab') || 'vitals';

  const currentAdmission = admissions.find(a => a.admission_id === patient.current_admission_id);
  
  const hasClinicalPrivileges = user && (user.role === 'admin' || user.role === 'doctor' || user.role === 'nurse');
  const isDoctor = user && user.role === 'doctor';

  const handleDischargeComplete = () => {
    toast.info("Simulating patient discharge...");
  };
  
  const handlePlanSaved = (newPlan: CarePlan) => {
    setCarePlans(prev => {
        const existingIndex = prev.findIndex(p => p.planId === newPlan.planId);
        if (existingIndex > -1) {
            const updatedPlans = [...prev];
            updatedPlans[existingIndex] = newPlan;
            return updatedPlans;
        }
        return [...prev, newPlan];
    });
  }

  const handleNoteAdded = (newNote: ClinicalNote) => {
    setClinicalNotes(prev => [newNote, ...prev]);
  };

  const handleRadiologyOrderCreated = (newOrder: RadiologyOrder) => {
    setRadiologyOrders(prev => [newOrder, ...prev]);
  };
  
  const handleLabOrderCreated = (newOrder: LabResult) => {
    setLabResults(prev => [newOrder, ...prev]);
  };
  
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

      {patient.isTemporary && (
          <Card className="bg-yellow-50 border-yellow-200">
              <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                      <div>
                          <CardTitle className="text-base text-yellow-800">Temporary Medical Record</CardTitle>
                          <CardDescription className="text-yellow-700">
                              This patient was registered without an MRN (Emergency). Please reconcile with a permanent identifier as soon as possible.
                          </CardDescription>
                      </div>
                  </div>
              </CardHeader>
          </Card>
      )}
      
       {hasClinicalPrivileges && (
        <>
            <PatientAlerts patientId={patient.patient_id} />
            <div className="flex items-center gap-2 border-t border-b py-2 flex-wrap">
                    <h3 className="text-sm font-semibold mr-4">Management</h3>
                    <AllocateBedDialog 
                        patientId={patient.patient_id}
                        disabled={patient.is_admitted} 
                    />
                    <TransferPatientDialog 
                        patient={patient} 
                        currentBedId={currentAdmission?.bed_id}
                        disabled={!patient.is_admitted} 
                    />
                    <DischargePatientDialog 
                        patient={patient}
                        clinicalNotes={clinicalNotes.filter(note => note.patientId === patientId)}
                        disabled={!patient.is_admitted}
                        onDischargeComplete={handleDischargeComplete}
                    />
            </div>
        </>
       )}

       {isDoctor && (
        <div className="flex items-center gap-2 border-b pb-2 flex-wrap">
            <h3 className="text-sm font-semibold mr-4">Clinical Actions</h3>
            <AddNoteDialog patientId={patient.patient_id} onNoteAdded={handleNoteAdded} />
            <OrderTestDialog 
                patientId={patient.patient_id} 
                patientName={patient.full_name} 
                onOrderCreated={handleLabOrderCreated} 
            />
            <OrderStudyDialog 
                patientId={patient.patient_id} 
                patientName={patient.full_name} 
                onOrderCreated={handleRadiologyOrderCreated} 
            />
        </div>
       )}

      <Tabs defaultValue={defaultTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="notes">Clinical Notes</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          {upcomingSurgery && <TabsTrigger value="pre-op">Pre-Op</TabsTrigger>}
          {upcomingSurgery && <TabsTrigger value="post-op">Post-Op</TabsTrigger>}
          <TabsTrigger value="care-plan">Care Plan</TabsTrigger>
          <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
          <TabsTrigger value="labs">Lab Results</TabsTrigger>
          <TabsTrigger value="radiology">Radiology</TabsTrigger>
          <TabsTrigger value="immunizations">Immunizations</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="demographics">Demographics</TabsTrigger>
        </TabsList>
        <TabsContent value="vitals" className="mt-4">
            <VitalsTab patientId={patient.patient_id} />
        </TabsContent>
         <TabsContent value="pre-op" className="mt-4">
            <PreOpChecklistTab surgery={upcomingSurgery} />
        </TabsContent>
        <TabsContent value="post-op" className="mt-4">
            <PostOpCareTab surgery={upcomingSurgery} />
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
        <TabsContent value="care-plan" className="mt-4">
            <CarePlanTab carePlan={carePlan} onPlanSaved={handlePlanSaved} patientId={patient.patient_id}/>
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
        <TabsContent value="radiology" className="mt-4">
          <RadiologyTab patientId={patient.patient_id} />
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
