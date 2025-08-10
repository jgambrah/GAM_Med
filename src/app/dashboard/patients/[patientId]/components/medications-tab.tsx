
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { MedicationRecord } from '@/lib/types';
import { NewPrescriptionSchema } from '@/lib/schemas';
import { addPrescription } from '@/lib/actions';
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

/**
 * == Conceptual Component: Medication Prescription Form ==
 *
 * This component is the UI for a doctor's core workflow: prescribing medication.
 * It demonstrates how the front-end securely interacts with the back-end to
 * create a new clinical record and trigger automated cross-module communication.
 */
function NewPrescriptionDialog() {
    const params = useParams();
    const patientId = params.patientId as string;
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof NewPrescriptionSchema>>({
        resolver: zodResolver(NewPrescriptionSchema),
        defaultValues: {
            medicationName: '',
            dosage: '',
            frequency: '',
            instructions: '',
        }
    });

    /**
     * == Integration with Backend Logic ==
     *
     * This `onSubmit` function is the critical link between the doctor's action
     * and the hospital's automated backend system.
     *
     * Workflow:
     * 1. The doctor fills out the form.
     * 2. The form data is validated client-side by Zod (`NewPrescriptionSchema`).
     * 3. Upon successful validation, the data is passed to the `addPrescription`
     *    Server Action. This is a secure API call to the Next.js backend.
     * 4. **(Conceptual)** The `addPrescription` Server Action would then call a
     *    Cloud Function (e.g., `writeMedicationRecord`) which performs the write
     *    to the `/patients/{patientId}/medication_history` sub-collection.
     * 5. This `onCreate` event in Firestore then triggers the
     *    `onNewMedicationPrescribed` Cloud Function.
     * 6. The `onNewMedicationPrescribed` function creates a new record in the
     *    pharmacy's work queue, effectively decoupling the EHR from the Pharmacy
     *    module while ensuring seamless communication.
     *
     * This entire process is initiated by a single button click from the doctor,
     * demonstrating an efficient and secure workflow.
     */
    const onSubmit = async (values: z.infer<typeof NewPrescriptionSchema>) => {
        const result = await addPrescription(patientId, values);
        if(result.success) {
            alert('Prescription added successfully (simulated).');
            setOpen(false);
            form.reset();
        } else {
            alert(`Error: ${result.message}`);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Prescription
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Prescription</DialogTitle>
                    <DialogDescription>
                        Fill out the form to add a new medication for this patient.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="medicationName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Medication Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Amlodipine" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dosage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Dosage</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., 5mg" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="frequency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Frequency</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Once daily" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="instructions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Instructions (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Take with food" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save Prescription'}
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
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
                {canPrescribe && <NewPrescriptionDialog />}
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
