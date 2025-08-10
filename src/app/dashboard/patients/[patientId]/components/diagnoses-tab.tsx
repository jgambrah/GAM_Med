
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { Diagnosis } from '@/lib/types';

// In a real application, this data would come from a real-time listener
// on the /patients/{patientId}/diagnoses sub-collection.
const mockDiagnoses: Diagnosis[] = [
    {
        diagnosisId: 'diag-1',
        icd10Code: 'I10',
        diagnosisText: 'Essential (primary) hypertension',
        isPrimary: true,
        diagnosedByDoctorId: 'doc1',
        diagnosedAt: new Date('2024-07-28T11:00:00Z').toISOString(),
    },
    {
        diagnosisId: 'diag-2',
        icd10Code: 'E78.5',
        diagnosisText: 'Hyperlipidemia, unspecified',
        isPrimary: false,
        diagnosedByDoctorId: 'doc1',
        diagnosedAt: new Date('2024-07-28T11:00:00Z').toISOString(),
    }
];

// NOTE: This is a conceptual component to demonstrate the workflow.
// In a real app, you would have a more robust dialog with form validation.
function AddDiagnosisDialog() {
    return (
        <Button size="sm" onClick={() => alert('Opening diagnosis form...')}>
            <Plus className="h-4 w-4 mr-2" />
            Add Diagnosis
        </Button>
    )
}

export function DiagnosesTab() {
    const { user } = useAuth();
    const canAddDiagnosis = user?.role === 'doctor';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Diagnoses</CardTitle>
                    <CardDescription>A record of all medical diagnoses for the patient.</CardDescription>
                </div>
                {canAddDiagnosis && <AddDiagnosisDialog />}
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Diagnosis (ICD-10)</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Diagnosing Doctor</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockDiagnoses.length > 0 ? (
                                mockDiagnoses.map((diagnosis) => (
                                    <TableRow key={diagnosis.diagnosisId}>
                                        <TableCell>{format(new Date(diagnosis.diagnosedAt), 'PPP')}</TableCell>
                                        <TableCell>
                                            <div className="font-medium">{diagnosis.diagnosisText}</div>
                                            <div className="text-sm text-muted-foreground">{diagnosis.icd10Code}</div>
                                        </TableCell>
                                        <TableCell>
                                            {diagnosis.isPrimary && <Badge>Primary</Badge>}
                                        </TableCell>
                                        <TableCell>Dr. Evelyn Mensah</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No diagnoses recorded.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
