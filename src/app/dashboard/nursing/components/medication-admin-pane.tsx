
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Patient, MedicationRecord } from '@/lib/types';
import { Check, Clock } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MedicationAdminPaneProps {
    patient: Patient;
}

// In a real application, this would come from a query on the patient's medication_history sub-collection
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

export function MedicationAdminPane({ patient }: MedicationAdminPaneProps) {
    const [medicationLog, setMedicationLog] = React.useState<Record<string, boolean>>({});

    const handleLogAdministration = (prescriptionId: string) => {
        /**
         * == WORKFLOW: LOG MEDICATION ADMINISTRATION ==
         * This function would call the `logMedicationAdministration` server action, which in turn
         * would invoke the secure Cloud Function. This creates an immutable log entry.
         */
        alert(`Simulating medication administration log for prescription ${prescriptionId}`);
        setMedicationLog(prev => ({ ...prev, [prescriptionId]: true }));
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Medication Administration Record</CardTitle>
                <CardDescription>Log medications as they are administered to {patient.full_name}.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Medication</TableHead>
                                <TableHead>Dosage</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockMedications.length > 0 ? (
                                mockMedications.map((med) => (
                                    <TableRow key={med.prescriptionId}>
                                        <TableCell className="font-medium">{med.medicationName}</TableCell>
                                        <TableCell>{med.dosage}</TableCell>
                                        <TableCell>{med.frequency}</TableCell>
                                        <TableCell>
                                             {medicationLog[med.prescriptionId] ? (
                                                <span className="flex items-center text-green-600">
                                                    <Check className="h-4 w-4 mr-2"/> Administered
                                                </span>
                                            ) : (
                                                <span className="flex items-center text-yellow-600">
                                                    <Clock className="h-4 w-4 mr-2"/> Due
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                size="sm" 
                                                onClick={() => handleLogAdministration(med.prescriptionId)}
                                                disabled={medicationLog[med.prescriptionId]}
                                            >
                                                Log as Administered
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No active medication orders for this patient.
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
