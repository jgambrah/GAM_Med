
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { allPatients, allAdmissions } from '@/lib/data';
import { Patient } from '@/lib/types';
import { cn } from '@/lib/utils';

interface NurseWorklistProps {
  onPatientSelect: (patient: Patient) => void;
}

export function NurseWorklist({ onPatientSelect }: NurseWorklistProps) {
  const [selectedPatientId, setSelectedPatientId] = React.useState<string | null>(null);

  /**
   * == DATA QUERY (PSEUDOCODE) ==
   * This component's primary function is to provide the nurse with a list of all currently admitted patients.
   * This would be a simple, efficient, real-time Firestore query.
   *
   *   const q = query(
   *     collection(db, 'patients'),
   *     where('is_admitted', '==', true)
   *   );
   *
   *   const [inpatients, loading, error] = useCollection(q);
   *
   * This query gives the nurse an always-up-to-date list of their responsibilities.
   */
  const inpatients = allPatients.filter(p => p.is_admitted);

  const handleSelect = (patient: Patient) => {
    setSelectedPatientId(patient.patient_id);
    onPatientSelect(patient);
  };
  
  React.useEffect(() => {
    if(inpatients.length > 0 && !selectedPatientId) {
        handleSelect(inpatients[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inpatients, selectedPatientId]);


  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Inpatient Worklist</CardTitle>
        <CardDescription>All currently admitted patients.</CardDescription>
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
                            Bed: {admission?.bed_id || 'N/A'} ({admission?.ward || 'N/A'})
                        </p>
                    </button>
                )
            })
            ) : (
              <div className="text-center text-muted-foreground p-8">
                There are no admitted patients.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
