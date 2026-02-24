
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
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';

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

// Data & Types
import { allPatients, allAdmissions, mockNotes, mockLabResults as initialLabResults, mockRadiologyOrders as initialRadiologyOrders } from '@/lib/data';
import { ClinicalNote, LabResult, RadiologyOrder, Patient } from '@/lib/types';

interface PatientEHRProps {
    patientId: string;
}

/**
 * == Electronic Health Record (EHR) Workbench ==
 * 
 * This is the primary clinical interface for doctors and nurses. 
 * It aggregates the patient's entire medical history into a tabbed "Single Source of Truth".
 */
export function PatientEHR({ patientId }: PatientEHRProps) {
  const { user } = useAuth();
  
  // In a real app, these are live Firestore sub-collection listeners.
  // We use LocalStorage here to simulate persistence in the prototype.
  const [storedPatients] = useLocalStorage<Patient[]>('patients', allPatients);
  const [clinicalNotes, setClinicalNotes] = useLocalStorage<ClinicalNote[]>('clinicalNotes', mockNotes);
  const [labResults, setLabResults] = useLocalStorage<LabResult[]>('labResults', initialLabResults);
  const [radiologyOrders, setRadiologyOrders] = useLocalStorage<RadiologyOrder[]>('radiologyOrders', initialRadiologyOrders);
  
  const patient = storedPatients.find((p) => p.patient_id === patientId);
  const admissions = allAdmissions.filter((a) => a.patient_id === patientId);
  
  if (!patient) {
    return (
        <Card className="h-full flex items-center justify-center border-dashed">
            <p className="text-muted-foreground">Select a patient from your worklist to view their EHR.</p>
        </Card>
    );
  }

  const handleNoteAdded = (newNote: ClinicalNote) => {
    setClinicalNotes(prev => [newNote, ...prev]);
  };
  
  const handleLabOrderCreated = (newOrder: LabResult) => {
    setLabResults(prev => [newOrder, ...prev]);
  };
  
  const handleRadiologyOrderCreated = (newOrder: RadiologyOrder) => {
    setRadiologyOrders(prev => [newOrder, ...prev]);
  };

  return (
    <Card className="h-full flex flex-col shadow-md overflow-hidden border-t-4 border-t-primary">
       <div className="p-6 bg-muted/30 border-b">
             <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{patient.full_name}</h2>
                    <p className="text-sm text-muted-foreground font-mono">MRN: {patient.mrn} | {patient.gender} | {patient.dob}</p>
                </div>
                <Badge variant={patient.is_admitted ? "destructive" : "secondary"}>
                    {patient.is_admitted ? "INPATIENT" : "OUTPATIENT"}
                </Badge>
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

                {/* longitudinal Medical Record Sections */}
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
       </CardContent>
    </Card>
  );
}

function Badge({ children, variant = "default", className = "" }: { children: React.ReactNode, variant?: "default" | "secondary" | "destructive" | "outline", className?: string }) {
    const variants = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground animate-pulse",
        outline: "border border-input"
    };
    return (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
}
