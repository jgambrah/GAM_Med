

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
import { addPrescription, logMedicationAdministration, requestPrescriptionRefill } from '@/lib/actions';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useParams } from 'next/navigation';
import { NewPrescriptionSchema } from '@/lib/schemas';
import { AlertTriangle, Pill, RefreshCw } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Combobox } from '@/components/ui/combobox';
import { useDebouncedCallback } from 'use-debounce';
import { mockMedicationRecords } from '@/lib/data';
import { toast } from '@/hooks/use-toast';


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

function NewPrescriptionDialog({ patientId, disabled }: { patientId: string, disabled?: boolean }) {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    const [isChecking, setIsChecking] = React.useState(false);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [warnings, setWarnings] = React.useState<string[]>([]);
    
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

    const selectedMedication = form.watch('medicationName');

    const performChecks = useDebouncedCallback(async (medicationName: string) => {
        if (!medicationName) {
            setWarnings([]);
            return;
        };

        setIsChecking(true);
        setWarnings([]);
        
        // Simulate a call to the performPrescriptionChecks Cloud Function
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mocked response from the safety check
        const newWarnings: string[] = [];
        if (medicationName.toLowerCase().includes('penicillin')) {
            newWarnings.push('Potential Allergy: Patient has a known allergy to Penicillin.');
        }
        if (medicationName.toLowerCase().includes('aspirin')) {
            newWarnings.push('Drug-Drug Interaction: May interact with existing medication (e.g., Warfarin).');
        }

        setIsChecking(false);
        setWarnings(newWarnings);
    }, 750); // 750ms debounce delay

    React.useEffect(() => {
        performChecks(selectedMedication);
    }, [selectedMedication, performChecks]);

    // Reset state when dialog closes
    React.useEffect(() => {
        if (!open) {
            form.reset();
            setWarnings([]);
            setIsChecking(false);
            setIsSubmitting(false);
        }
    }, [open, form]);

    const onSubmit = async (values: z.infer<typeof NewPrescriptionSchema>) => {
        setIsSubmitting(true);
        const result = await addPrescription(patientId, values);
        if (result.success) {
            alert('Prescription submitted successfully (simulated).');
            setOpen(false);
        } else {
            alert(`Error: ${result.message}`);
        }
        setIsSubmitting(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" disabled={disabled}>
                    <Pill className="h-4 w-4 mr-2" />
                    Prescribe Medication
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>New e-Prescription</DialogTitle>
                    <DialogDescription>
                        Fill out the form to create and send a new prescription to the pharmacy.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="medicationName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Drug Name</FormLabel>
                                    <FormControl>
                                       <Combobox
                                            options={mockFormulary}
                                            value={field.value}
                                            onChange={field.onChange}
                                            placeholder="Search for a medication..."
                                            searchPlaceholder='Search formulary...'
                                            notFoundText='No medication found.'
                                       />
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
                                        <FormControl><Input placeholder="e.g., 5mg" {...field} /></FormControl>
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
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="frequency"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Frequency</FormLabel>
                                        <FormControl><Input placeholder="e.g., Once daily" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="route"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Route</FormLabel>
                                        <FormControl><Input placeholder="e.g., Oral" {...field} /></FormControl>
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
                                    <FormLabel>Patient Instructions (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., Take with food" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isChecking && (
                            <div className="text-sm text-muted-foreground flex items-center justify-center p-4">
                                Checking for interactions...
                            </div>
                        )}

                        {warnings.length > 0 && (
                            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm font-medium text-yellow-800">Safety Check Warnings</p>
                                        <div className="mt-2 text-sm text-yellow-700">
                                            <ul role="list" className="list-disc pl-5 space-y-1">
                                                {warnings.map((warning, index) => (
                                                    <li key={index}>{warning}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            
                            {warnings.length > 0 ? (
                                <Button type="submit" variant="destructive" disabled={isSubmitting || isChecking}>
                                    {isSubmitting ? 'Submitting...' : 'Acknowledge and Prescribe Anyway'}
                                </Button>
                            ) : (
                                <Button type="submit" disabled={isChecking || isSubmitting || !selectedMedication}>
                                    {isSubmitting ? 'Submitting...' : 'Submit Prescription'}
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
    const isPatient = user?.role === 'patient';

    const params = useParams();
    const resolvedPatientId = patientId || params.patientId as string;


    // In a real application, this data would come from a real-time listener
    // on the /patients/{patientId}/medication_history sub-collection.
    const patientMedications = mockMedicationRecords.filter(med => med.patientId === resolvedPatientId);

    const handleRequestRefill = async (prescriptionId: string) => {
        toast.info("Submitting refill request...");
        const result = await requestPrescriptionRefill(resolvedPatientId, prescriptionId);
        if (result.success) {
            toast.success("Your refill request has been sent to the pharmacy.");
        } else {
            toast.error(result.message || "Failed to submit refill request.");
        }
    }

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Medications</CardTitle>
                    <CardDescription>A history of all prescribed medications for the patient.</CardDescription>
                </div>
                {isDoctor && <NewPrescriptionDialog patientId={resolvedPatientId} />}
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Prescribed At</TableHead>
                                <TableHead>Medication</TableHead>
                                <TableHead>Dosage</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Status</TableHead>
                                {(canAdminister || isPatient) && <TableHead className="text-right">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {patientMedications.length > 0 ? (
                                patientMedications.map((med) => (
                                    <TableRow key={med.prescriptionId}>
                                        <TableCell>{format(new Date(med.prescribedAt), 'PPP')}</TableCell>
                                        <TableCell className="font-medium">{med.medicationName}</TableCell>
                                        <TableCell>{med.dosage}</TableCell>
                                        <TableCell>{med.frequency}</TableCell>
                                        <TableCell><Badge variant={getStatusVariant(med.status)}>{med.status}</Badge></TableCell>
                                        {(canAdminister || isPatient) && (
                                            <TableCell className="text-right">
                                                {canAdminister && <AdministerMedicationDialog patientId={resolvedPatientId} medication={med} />}
                                                {isPatient && med.status === 'Active' && (
                                                    <Button variant="outline" size="sm" onClick={() => handleRequestRefill(med.prescriptionId)}>
                                                        <RefreshCw className="h-4 w-4 mr-2" />
                                                        Request Refill
                                                    </Button>
                                                )}
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={canAdminister || isPatient ? 6 : 5} className="h-24 text-center">
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
