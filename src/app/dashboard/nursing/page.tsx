
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { allPatients, allAdmissions } from '@/lib/data';
import { Patient } from '@/lib/types';
import { NurseWorklist } from './components/nurse-worklist';
import { PatientVitalsPane } from './components/patient-vitals-pane';
import { useAuth } from '@/hooks/use-auth';

/**
 * == Conceptual UI: Nursing Station Workbench ==
 * This page serves as the central hub for a nurse's daily workflow. It's designed to provide
 * immediate, context-rich access to the patients under their direct care.
 *
 * Structure & Workflow:
 * 1.  `NurseWorklist`: On the left, this component displays a list of all patients currently
 *     admitted to the nurse's assigned ward. In this prototype, we simulate this by filtering
 *     for a specific ward ('Cardiology').
 *     This list-based navigation is efficient, allowing the nurse to quickly switch between patients.
 *
 * 2.  `PatientVitalsPane`: On the right, this component displays the detailed EHR for the
 *     patient selected from the worklist. It is a specialized view focused on nursing tasks,
 *     prominently featuring the ability to log vitals and administer medication.
 *
 * 3.  State Management: A `selectedPatient` state variable in this parent component orchestrates
 *     the interaction between the worklist and the detail pane.
 *
 * This design minimizes navigation and keeps essential information readily available, which is
 * critical in a fast-paced clinical environment.
 */
export default function NursingPage() {
  const { user } = useAuth(); // Assume the nurse user object has their assigned ward.
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

  // In a real app, this would be a real-time Firestore query.
  // We simulate the nurse being assigned to the 'Cardiology' ward.
  const nurseWard = 'Cardiology'; 
  const wardAdmissions = allAdmissions.filter(a => a.ward === nurseWard && a.status === 'Admitted');
  const wardPatientIds = new Set(wardAdmissions.map(a => a.patient_id));
  const wardPatients = allPatients.filter(p => wardPatientIds.has(p.patient_id));

  React.useEffect(() => {
    // Select the first patient by default if the list is not empty
    if (wardPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(wardPatients[0]);
    } else if (wardPatients.length === 0) {
      setSelectedPatient(null);
    }
  }, [wardPatients, selectedPatient]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nursing Station</h1>
        <p className="text-muted-foreground">
          Your central hub for patient care and vitals monitoring.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[75vh]">
        <div className="lg:col-span-1 h-full">
            <NurseWorklist 
                patients={wardPatients}
                onPatientSelect={setSelectedPatient}
                selectedPatientId={selectedPatient?.patient_id}
                wardName={nurseWard}
            />
        </div>
        <div className="lg:col-span-2 h-full">
            {selectedPatient ? (
                <PatientVitalsPane patient={selectedPatient} />
            ) : (
                <Card className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <p>No patients in your ward.</p>
                        <p className="text-sm">Select a patient from the list to view details.</p>
                    </div>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
