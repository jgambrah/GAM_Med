
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Patient } from '@/lib/types';
import { RecordVitalsForm } from './record-vitals-form';

interface RecordVitalsPaneProps {
    patient: Patient;
}

export function RecordVitalsPane({ patient }: RecordVitalsPaneProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Record Vitals for {patient.full_name}</CardTitle>
                <CardDescription>Enter the patient's latest vital signs. The form will reset upon successful submission.</CardDescription>
            </CardHeader>
            <CardContent>
                 <RecordVitalsForm patient={patient} />
            </CardContent>
        </Card>
    );
}
