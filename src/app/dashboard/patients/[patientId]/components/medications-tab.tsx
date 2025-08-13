
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { MedicationRecord } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { logMedicationAdministration } from '@/lib/actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { NewPrescriptionDialog } from '../page';
import { useParams } from 'next/navigation';

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

function AdministerMedicationDialog({ patientId, medication }: { patientId: string, medication: MedicationRecord }) {
    const [open, setOpen] = React.useState(false);
    const [notes, setNotes] = React.useState('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        // This server action encapsulates the logic to log the administration event.
        const result = await logMedicationAdministration(patientId, medication.prescriptionId, notes);
        if (result.success) {
            alert('Medication administration logged successfully (simulated).');
            setNotes('');
            setOpen(false);
        } else {
            alert(`Error: ${result.message}`);
        }
        setIsSubmitting(false);
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={medication.status !== 'Active'}>
                    Administer
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Administer Medication</DialogTitle>
                    <DialogDescription>
                        Confirm administration of {medication.medicationName} ({medication.dosage}).
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <p><strong>Frequency:</strong> {medication.frequency}</p>
                    <p><strong>Instructions:</strong> {medication.instructions || 'N/A'}</p>
                    <div>
                        <Label htmlFor="admin-notes">Administration Notes (Optional)</Label>
                        <Textarea 
                            id="admin-notes"
                            placeholder="e.g., Patient took with water, no issues."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Logging...' : 'Confirm & Log'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export function MedicationsTab({ patientId }: { patientId: string }) {
    const { user } = useAuth();
    const canAdminister = user?.role === 'nurse';
    const isDoctor = user?.role === 'doctor';

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Medications</CardTitle>
                    <CardDescription>A history of all prescribed medications.</CardDescription>
                </div>
                {isDoctor && <NewPrescriptionDialog patientId={patientId} />}
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
                                {canAdminister && <TableHead>Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {mockMedications.length > 0 ? (
                                mockMedications.map((med) => (
                                    <TableRow key={med.prescriptionId}>
                                        <TableCell className="font-medium">{med.medicationName}</TableCell>
                                        <TableCell>{med.dosage}</TableCell>
                                        <TableCell>{med.frequency}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(med.status)}>{med.status}</Badge></TableCell>
                                        {canAdminister && (
                                            <TableCell>
                                                <AdministerMedicationDialog patientId={patientId} medication={med} />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={canAdminister ? 5 : 4} className="h-24 text-center">
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
