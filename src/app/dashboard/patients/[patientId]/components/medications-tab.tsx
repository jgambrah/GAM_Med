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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useParams } from 'next/navigation';
import { NewPrescriptionSchema } from '@/lib/schemas';
import { Pill, Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

function NewPrescriptionDialog({ patientId, onPrescriptionAdded }: { patientId: string, onPrescriptionAdded: () => void }) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);
    
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

    const onSubmit = async (values: z.infer<typeof NewPrescriptionSchema>) => {
        if (!user || !firestore) return;

        const newMedData = {
            ...values,
            hospitalId: user.hospitalId,
            patientId: patientId,
            prescribedByDoctorId: user.uid,
            prescribedByDoctorName: user.name,
            prescribedAt: new Date().toISOString(),
            status: 'Active'
        };

        addDocumentNonBlocking(collection(firestore, 'medication_records'), newMedData);
        toast.success('Prescription sent.');
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    <Pill className="h-4 w-4 mr-2" />
                    Prescribe
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New e-Prescription</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                         <FormField
                            control={form.control}
                            name="medicationName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Medication</FormLabel>
                                    <FormControl><Input placeholder="Drug name" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="dosage"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Dosage</FormLabel><FormControl><Input placeholder="5mg" {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="frequency"
                                render={({ field }) => (
                                    <FormItem><FormLabel>Frequency</FormLabel><FormControl><Input placeholder="Daily" {...field} /></FormControl><FormMessage /></FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit">Send Prescription</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function MedicationsTab({ patientId }: { patientId: string }) {
    const { user } = useAuth();
    const firestore = useFirestore();

    const medQuery = useMemoFirebase(() => {
        if (!firestore || !patientId || !user?.hospitalId) return null;
        return query(
            collection(firestore, 'medication_records'),
            where('hospitalId', '==', user.hospitalId),
            where('patientId', '==', patientId),
            orderBy('prescribedAt', 'desc')
        );
    }, [firestore, patientId, user?.hospitalId]);

    const { data: medications, isLoading } = useCollection<MedicationRecord>(medQuery);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Medications</CardTitle>
                    <CardDescription>Current and historical prescriptions.</CardDescription>
                </div>
                {user?.role === 'doctor' && <NewPrescriptionDialog patientId={patientId} onPrescriptionAdded={() => {}} />}
            </CardHeader>
            <CardContent>
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Drug</TableHead>
                                <TableHead>Dosage</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={3} className="text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : medications && medications.length > 0 ? (
                                medications.map((med) => (
                                    <TableRow key={med.id}>
                                        <TableCell className="font-medium text-sm">{med.medicationName}</TableCell>
                                        <TableCell className="text-xs">{med.dosage} ({med.frequency})</TableCell>
                                        <TableCell><Badge variant="secondary" className="text-[10px]">{med.status}</Badge></TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={3} className="h-24 text-center text-muted-foreground">None.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
