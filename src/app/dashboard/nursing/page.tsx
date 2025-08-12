
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { allPatients } from '@/lib/data';
import { Patient } from '@/lib/types';
import { NurseWorklist } from './components/nurse-worklist';
import { PatientVitalsPane } from './components/patient-vitals-pane';

/**
 * == Conceptual UI: Nursing Station Workbench ==
 * This page serves as the central hub for a nurse's daily workflow. It's designed to provide
 * immediate, context-rich access to the patients under their direct care.
 *
 * Structure & Workflow:
 * 1.  `NurseWorklist`: On the left, this component displays a list of all patients currently
 *     admitted to the nurse's assigned ward. In this prototype, it shows all admitted patients.
 *     In a real app, this would be filtered by the logged-in nurse's ward assignment.
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
  const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

  // In a real app, this would be a real-time Firestore query filtered by the nurse's ward.
  // e.g., query(collection(db, 'patients'), where('is_admitted', '==', true), where('ward', '==', user.ward))
  const wardPatients = allPatients.filter(p => p.is_admitted);

  React.useEffect(() => {
    // Select the first patient by default
    if (wardPatients.length > 0 && !selectedPatient) {
      setSelectedPatient(wardPatients[0]);
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
            />
        </div>
        <div className="lg:col-span-2 h-full">
            {selectedPatient ? (
                <PatientVitalsPane patient={selectedPatient} />
            ) : (
                <Card className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                        <p>No patients in this ward.</p>
                    </div>
                </Card>
            )}
        </div>
      </div>
    </div>
  );
}
