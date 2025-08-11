
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NurseWorklist } from './components/nurse-worklist';
import { Patient } from '@/lib/types';
import { RecordVitalsPane } from './components/record-vitals-pane';
import { MedicationAdminPane } from './components/medication-admin-pane';

export default function NursingPage() {
    const [selectedPatient, setSelectedPatient] = React.useState<Patient | null>(null);

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold">Nurse's Station</h1>
                <p className="text-muted-foreground">
                    Your central dashboard for managing inpatient care.
                </p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-1">
                    <NurseWorklist onPatientSelect={setSelectedPatient} />
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {selectedPatient ? (
                        <>
                           <RecordVitalsPane patient={selectedPatient} />
                           <MedicationAdminPane patient={selectedPatient} />
                        </>
                    ) : (
                        <Card className="h-full flex items-center justify-center">
                             <div className="text-center p-8">
                                <h3 className="text-lg font-semibold">No Patient Selected</h3>
                                <p className="text-muted-foreground mt-1">
                                    Please select a patient from the worklist to view their details and record actions.
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
