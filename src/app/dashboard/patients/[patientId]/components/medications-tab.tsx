
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { MedicationRecord } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { addPrescription, logMedicationAdministration } from '@/lib/actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useParams } from 'next/navigation';
import { NewPrescriptionSchema } from '@/lib/schemas';
import { AlertTriangle, Pill } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';

// In a real application, this data would come from a real-time listener
// on the /patients/{patientId}/medication_history sub-collection.
const mockMedications: MedicationRecord[] = [
    {
        prescriptionId: 'med-1',
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
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
        patientId: 'P-123456',
        patientName: 'Kwame Owusu',
        medicationName: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily at bedtime',
        instructions: '',
        prescribedByDoctorId: 'doc1',
        prescribedAt: new Date('2024-07-28T11:05:00Z').toISOString(),
        status: 'Active'
    }
];

// This would come from our central 'medications' formulary collection.
const mockFormulary = [
    { value: 'amlodipine', label: 'Amlodipine' },
    { value: 'atorvastatin', label: 'Atorvastatin' },
    { value: 'lisinopril', label: 'Lisinopril' },
    { value: 'metformin', label: 'Metformin' },
    { value: 'penicillin', label: 'Penicillin (Allergy Risk)' },
    { value: 'aspirin', label: 'Aspirin (Interaction Risk)' },
]

const getStatusVariant = (status: MedicationRecord['status']): "default" | "secondary" | "destructive" => {
    switch (status) {
        case 'Active': return 'default';
        case 'Discontinued': return 'destructive';
        case 'Filled': return 'secondary';
        default: return 'secondary';
    }
}

/**
 * == Conceptual Component: e-Prescribing Form with Safety Checks ==
 *
 * This component demonstrates an enhanced prescription workflow. It's a modal dialog
 * that provides a structured form for entering prescription details and incorporates
 * real-time safety feedback.
 */
function NewPrescriptionDialog({ patientId, disabled }: { patientId: string, disabled?: boolean }) {
    const [open, setOpen] = React.useState(false);
    const [warnings, setWarnings] = React.useState<string[]>([]);
    const [isChecking, setIsChecking] = React.useState(false);

    const form = useForm<z.infer<typeof NewPrescriptionSchema>>({
        resolver: zodResolver(NewPrescriptionSchema),
        defaultValues: {
            medicationName: '',
            dosage: '',
            frequency: '',
            route: '',
            quantity: 0,
            instructions: '',
        }
    });
    
    /**
     * == FUNCTION TO HANDLE e-PRESCRIPTION with SAFETY CHECKS ==
     * This `onSubmit` function orchestrates the modern e-Prescribing workflow.
     * It simulates calling the `performPrescriptionChecks` cloud function.
     */
    const onSubmit = async (values: z.infer<typeof NewPrescriptionSchema>) => {
        setIsChecking(true);
        setWarnings([]);
        // In a real app, this server action would call the `performPrescriptionChecks` Cloud Function.
        console.log("Performing safety checks for:", values);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
        
        // --- SIMULATED SAFETY CHECK LOGIC ---
        const simulatedWarnings = [];
        // Check for drug-drug interaction with existing meds
        if (values.medicationName.toLowerCase().includes('aspirin') && mockMedications.some(m => m.medicationName.toLowerCase().includes('atorvastatin'))) {
            simulatedWarnings.push("Minor drug-drug interaction with Atorvastatin: monitor patient for muscle pain.");
        }
        // Check for allergy
        if (values.medicationName.toLowerCase().includes('penicillin')) {
            simulatedWarnings.push("CRITICAL ALLERGY WARNING: Patient has a known allergy to Penicillin.");
        }
        // --- END SIMULATION ---
        
        if (simulatedWarnings.length > 0) {
            setWarnings(simulatedWarnings);
        } else {
            // If no warnings, proceed directly to final submission.
            await handleFinalSubmit();
        }
        setIsChecking(false);
    }
    
    // This function is called either after checks pass, or when a doctor overrides warnings.
    const handleFinalSubmit = async () => {
        const values = form.getValues();
        // In a real app, this would call the `submitPrescriptionToPharmacy` Cloud Function.
        const result = await addPrescription(patientId, values);
        if(result.success) {
            alert('Prescription submitted successfully (simulated).');
            handleClose();
        } else {
            alert(`Error: ${result.message}`);
        }
    }

    const handleClose = () => {
        setOpen(false);
        form.reset();
        setWarnings([]);
        setIsChecking(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled}>
                    <Pill className="h-4 w-4 mr-2" /> New Prescription
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Create New e-Prescription</DialogTitle>
                    <DialogDescription>
                        Fill out the form to add a new medication. The system will automatically check for safety issues.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="medicationName"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Medication Name (Search Formulary)</FormLabel>
                                    <Combobox
                                        options={mockFormulary}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Search formulary..."
                                        searchPlaceholder="Search medications..."
                                        notFoundText="No medication found."
                                    />
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
                         <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="route"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Route</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Oral" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="e.g., 30" {...field} />
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
                        
                        {warnings.length > 0 && (
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <h3 className="text-sm font-medium text-yellow-800">Safety Warnings</h3>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <ul className="list-disc pl-5 space-y-1">
                                                {warnings.map((warning, i) => <li key={i}>{warning}</li>)}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
                            {warnings.length > 0 ? (
                                <Button type="button" variant="destructive" onClick={handleFinalSubmit}>
                                    Acknowledge and Prescribe Anyway
                                </Button>
                            ) : (
                                <Button type="submit" disabled={form.formState.isSubmitting || isChecking}>
                                    {isChecking ? 'Checking Safety...' : 'Check and Proceed'}
                                </Button>
                            )}
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
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

export function MedicationsTab({ patientId }: { patientId?: string }) {
    const { user } = useAuth();
    const canAdminister = user?.role === 'nurse';
    const isDoctor = user?.role === 'doctor';

    const params = useParams();
    const resolvedPatientId = patientId || params.patientId as string;


    // In a real application, this data would come from a real-time listener
    // on the /patients/{patientId}/medication_history sub-collection.
    const patientMedications = mockMedications.filter(med => med.patientId === resolvedPatientId);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Medications</CardTitle>
                    <CardDescription>A history of all prescribed medications.</CardDescription>
                </div>
                {isDoctor && <NewPrescriptionDialog patientId={resolvedPatientId} />}
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
                            {patientMedications.length > 0 ? (
                                patientMedications.map((med) => (
                                    <TableRow key={med.prescriptionId}>
                                        <TableCell className="font-medium">{med.medicationName}</TableCell>
                                        <TableCell>{med.dosage}</TableCell>
                                        <TableCell>{med.frequency}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(med.status)}>{med.status}</Badge></TableCell>
                                        {canAdminister && (
                                            <TableCell>
                                                <AdministerMedicationDialog patientId={resolvedPatientId} medication={med} />
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

    