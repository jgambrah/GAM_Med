'use client';

import * as React from 'react';
import { 
    Tabs, 
    TabsContent, 
    TabsList, 
    TabsTrigger 
} from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Badge } from '@/components/ui/badge';

// EHR Components
import { DemographicsTab } from '../../patients/[patientId]/components/demographics-tab';
import { AdmissionsHistoryTab } from '../../patients/[patientId]/components/admissions-history-tab';
import { ClinicalNotesTab, AddNoteDialog } from '../../patients/[patientId]/components/clinical-notes-tab';
import { BillingTab } from '../../patients/[patientId]/components/billing-tab';
import { DiagnosesTab } from '../../patients/[patientId]/components/diagnoses-tab';
import { MedicationsTab } from '../../patients/[patientId]/components/medications-tab';
import { LabResultsTab } from '../../patients/[patientId]/components/lab-results-tab';
import { VitalsTab } from '../../patients/[patientId]/components/vitals-tab';
import { PatientAlerts } from '../../patients/[patientId]/components/patient-alerts';
import { OrderTestDialog } from '../../patients/[patientId]/components/order-test-dialog';
import { OrderStudyDialog } from '../../patients/[patientId]/components/order-study-dialog';

// Types
import { Patient } from '@/lib/types';

interface PatientEHRProps {
    patient: Patient;
}

/**
 * == Electronic Health Record (EHR) Workbench ==
 * 
 * This is the primary clinical interface. It aggregates real-time data from 
 * multiple Firestore collections (notes, vitals, labs) into a single workspace.
 * Every query is tenant-locked using the user's hospitalId.
 */
export function PatientEHR({ patient }: PatientEHRProps) {
  const { user } = useAuth();

  return (
    <Card className="h-full flex flex-col shadow-md overflow-hidden border-t-4 border-t-primary">
       <div className="p-6 bg-muted/30 border-b">
             <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{patient.full_name}</h2>
                    <p className="text-sm text-muted-foreground font-mono">
                        MRN: {patient.mrn} | {patient.gender} | {patient.dob}
                    </p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                    <Badge variant={patient.is_admitted ? "destructive" : "secondary"}>
                        {patient.is_admitted ? "INPATIENT" : "OUTPATIENT"}
                    </Badge>
                    <p className="text-[10px] font-bold text-primary uppercase">{user?.hospitalId}</p>
                </div>
            </div>
        </div>
        
        <CardContent className="flex-grow overflow-hidden pt-4 bg-background">
          <ScrollArea className="h-full pr-4">
             <div className="space-y-6">
                
                {/* Clinical Safety Alerts Section */}
                <PatientAlerts patientId={patient.patient_id} />

                {/* Direct Clinical Action Workbench */}
                 <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg border border-accent/20 flex-wrap">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2">Clinical Toolkit:</div>
                    <AddNoteDialog patientId={patient.patient_id} onNoteAdded={() => {}} />
                    <OrderTestDialog 
                        patientId={patient.patient_id} 
                        patientName={patient.full_name}
                        onOrderCreated={() => {}}
                    />
                     <OrderStudyDialog 
                        patientId={patient.patient_id}
                        patientName={patient.full_name}
                        onOrderCreated={() => {}}
                     />
                </div>

                {/* Longitudinal Medical Record Sections */}
                <Tabs defaultValue="notes" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 h-auto bg-muted/50 p-1">
                        <TabsTrigger value="notes">Notes</TabsTrigger>
                        <TabsTrigger value="diagnoses">Diagnoses</TabsTrigger>
                        <TabsTrigger value="medications">Meds</TabsTrigger>
                        <TabsTrigger value="labs">Labs</TabsTrigger>
                        <TabsTrigger value="vitals">Vitals</TabsTrigger>
                        <TabsTrigger value="admissions">Visits</TabsTrigger>
                        <TabsTrigger value="demographics">Profile</TabsTrigger>
                        <TabsTrigger value="billing">Finance</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="notes" className="mt-4 ring-offset-background">
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
                    
                    <TabsContent value="vitals" className="mt-4">
                        <VitalsTab patientId={patient.patient_id} />
                    </TabsContent>
                    
                     <TabsContent value="admissions" className="mt-4">
                        <AdmissionsHistoryTab patientId={patient.patient_id} />
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
       </CardContent>
    </Card>
  );
}
