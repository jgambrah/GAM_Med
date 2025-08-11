
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { allPatients, allAdmissions } from '@/lib/data';
import { Patient } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface NurseWorklistProps {
  onPatientSelect: (patient: Patient) => void;
}

export function NurseWorklist({ onPatientSelect }: NurseWorklistProps) {
  const [selectedPatientId, setSelectedPatientId] = React.useState<string | null>(null);
  const { user } = useAuth();

  /**
   * == DATA QUERY (CONCEPTUAL) ==
   * This component's primary function is to provide the nurse with a list of all patients on their assigned ward.
   * This would be a real-time Firestore query that joins data or, more efficiently, queries based on denormalized data.
   *
   *   // Assumes the nurse user object has an 'assignedWard' field.
   *   const nurseWard = user.assignedWard; // e.g., 'Cardiology'
   *
   *   // This query would need a composite index on `ward` and `is_admitted`.
   *   const q = query(
   *     collectionGroup(db, 'admissions'),
   *     where('ward', '==', nurseWard),
   *     where('status', '==', 'Admitted')
   *   );
   *
   *   // The result gives you a list of admission documents, from which you can get patient IDs.
   *   const [admissions, loading, error] = useCollection(q);
   *
   * This query gives the nurse an always-up-to-date list of their responsibilities for their specific ward.
   */
  const nurseAssignedWard = 'Cardiology'; // Simulating the logged-in nurse's ward.
  const inpatients = allPatients.filter(p => {
      if (!p.is_admitted || !p.current_admission_id) return false;
      const admission = allAdmissions.find(a => a.admission_id === p.current_admission_id);
      return admission && admission.ward === nurseAssignedWard;
  });

  const handleSelect = (patient: Patient) => {
    setSelectedPatientId(patient.patient_id);
    onPatientSelect(patient);
  };
  
  React.useEffect(() => {
    if(inpatients.length > 0 && !selectedPatientId) {
        handleSelect(inpatients[0]);
    } else if (inpatients.length === 0 && selectedPatientId) {
        // If the last patient is removed, clear selection
        onPatientSelect(null as any);
        setSelectedPatientId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients, selectedPatientId]);


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Inpatient Worklist</CardTitle>
        <CardDescription>Patients in the {nurseAssignedWard} ward.</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[65vh]">
          <div className="space-y-2">
            {inpatients.length > 0 ? (
              inpatients.map((patient) => {
                const admission = allAdmissions.find(a => a.admission_id === patient.current_admission_id);
                return (
                    <button
                        key={patient.patient_id}
                        onClick={() => handleSelect(patient)}
                        className={cn(
                            "w-full text-left p-3 rounded-lg border transition-colors",
                            selectedPatientId === patient.patient_id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "hover:bg-accent"
                        )}
                    >
                        <p className="font-semibold">{patient.full_name}</p>
                        <p className={cn(
                            "text-sm",
                            selectedPatientId === patient.patient_id ? "text-primary-foreground/80" : "text-muted-foreground"
                        )}>
                            Bed: {admission?.bed_id || 'N/A'}
                        </p>
                    </button>
                )
            })
            ) : (
              <div className="text-center text-muted-foreground p-8">
                There are no admitted patients in this ward.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
