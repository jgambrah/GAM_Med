
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, ShieldAlert, Loader2 } from 'lucide-react';
import { 
    Dialog, 
    DialogContent, 
    DialogDescription, 
    DialogFooter, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CertifyDeathSchema } from '@/lib/schemas';
import { recordMortality } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore } from '@/firebase';
import { doc, writeBatch, serverTimestamp, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Patient } from '@/lib/types';

interface CertifyDeathDialogProps {
    patient: Patient;
    disabled?: boolean;
}

export function CertifyDeathDialog({ patient, disabled }: CertifyDeathDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof CertifyDeathSchema>>({
        resolver: zodResolver(CertifyDeathSchema),
        defaultValues: {
            hospitalId: user?.hospitalId || '',
            cause: '',
            code: '',
            remarks: '',
        }
    });

    const onSubmit = async (values: z.infer<typeof CertifyDeathSchema>) => {
        if (!user || !firestore) return;

        try {
            const batch = writeBatch(firestore);
            
            // 1. ATOMIC UPDATE: Mark Patient as Deceased
            const patientRef = doc(firestore, 'patients', patient.patient_id);
            batch.update(patientRef, {
                status: 'deceased',
                is_active: false,
                updatedAt: serverTimestamp()
            });

            // 2. ATOMIC UPDATE: Create Statutory Mortality Record
            const mortalityRef = doc(collection(firestore, 'mortality_records'));
            batch.set(mortalityRef, {
                id: mortalityRef.id,
                hospitalId: user.hospitalId,
                patientId: patient.patient_id,
                patientName: patient.full_name,
                dateOfDeath: serverTimestamp(),
                cause: values.cause,
                icd10: values.code,
                certifiedBy: user.name,
                certifiedByUserId: user.uid,
                remarks: values.remarks || '',
                createdAt: serverTimestamp()
            });

            // Trigger server-side logic for revalidation
            await recordMortality(patient.patient_id, values);
            
            await batch.commit();
            
            toast.success("Statutory Record Finalized", {
                description: "Death certificate data has been logged in the mortality register."
            });
            
            setOpen(false);
        } catch (error: any) {
            console.error("Mortality certification failed:", error);
            toast.error("Certification Failed", { description: "Insufficient permissions to certify legal status change." });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" disabled={disabled || patient.status === 'deceased'} className="text-destructive hover:bg-destructive/10">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Certify Death
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-destructive">
                        <ShieldAlert className="h-5 w-5" />
                        <DialogTitle>Certify Death (MoH Standards)</DialogTitle>
                    </div>
                    <DialogDescription>
                        Finalize the medical certification for <strong>{patient.full_name}</strong>. This is a legal, non-reversible action.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="cause"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Primary Cause of Death</FormLabel>
                                    <FormControl><Input placeholder="e.g., Cardiac Arrest" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>ICD-10 Disease Code</FormLabel>
                                    <FormControl><Input placeholder="e.g., I46.9" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="remarks"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Clinical Remarks (Optional)</FormLabel>
                                    <FormControl><Textarea rows={3} placeholder="Circumstances of death..." {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting} variant="destructive">
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Finalize Certification
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
