
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { MedicationRecord } from '@/lib/types';

// In a real application, this data would come from a real-time listener
// on the /patients/{patientId}/medication_history sub-collection.
const mockMedications: MedicationRecord[] = [
    {
        prescriptionId: 'med-1',
        medicationName: 'Amlodipine',
        dosage: '5mg',
        frequency: 'Once daily',
        instructions: 'Take in the morning with food.',
        prescribedByDoctorId: 'doc1',
        prescribedAt: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Active'
    },
    {
        prescriptionId: 'med-2',
        medicationName: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        instructions: '',
        prescribedByDoctorId: 'doc1',
        prescribedAt: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Active'
    }
];

const getStatusVariant = (status: MedicationRecord['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Active': return 'default';
        case 'Discontinued': return 'destructive';
        case 'Filled': return 'secondary';
        default: return 'secondary';
    }
}

export function MedicationsTab() {
    const { user } = useAuth();
    const canPrescribe = user?.role === 'doctor';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Medications</CardTitle>
                    <CardDescription>A history of all prescribed medications.</CardDescription>
                </div>
                {canPrescribe && (
                    <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        New Prescription
                    </Button>
                )}
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medication</TableHead>
                                <TableHead>Dosage</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Prescribed</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockMedications.length > 0 ? (
                                mockMedications.map((med) => (
                                    <TableRow key={med.prescriptionId}>
                                        <TableCell className="font-medium">{med.medicationName}</TableCell>
                                        <TableCell>{med.dosage}</TableCell>
                                        <TableCell>{med.frequency}</TableCell>
                                        <TableCell>{format(new Date(med.prescribedAt), 'PPP')}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(med.status)}>{med.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No medications prescribed.
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
