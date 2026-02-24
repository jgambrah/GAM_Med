'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from "@/hooks/use-toast";
import { VitalsSchema } from '@/lib/schemas';
import { Activity, Loader2 } from 'lucide-react';

interface RecordVitalsDialogProps {
    patientId: string;
    patientName: string;
}

/**
 * == Clinical Execution: Record Vitals ==
 * 
 * This component allows nurses to save clinical measurements directly into the 
 * patient's EHR from the Nursing Station. Every record is "stamped" with the 
 * hospitalId to enforce the SaaS Wall.
 */
export function RecordVitalsDialog({ patientId, patientName }: RecordVitalsDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);

    const form = useForm<z.infer<typeof VitalsSchema>>({
        resolver: zodResolver(VitalsSchema),
        defaultValues: {
            hospitalId: user?.hospitalId || '',
            bloodPressure: '',
            heartRate: '',
            temperature: '',
            respiratoryRate: '',
            oxygenSaturation: '',
            painScore: '0',
            notes: '',
        }
    });

    // Auto-fill tenant ID from session context
    React.useEffect(() => {
        if (open && user) {
            form.setValue('hospitalId', user.hospitalId);
        }
    }, [open, user, form]);

    const onSubmit = async (values: z.infer<typeof VitalsSchema>) => {
        if (!user || !firestore) return;

        // DATA PREPARATION: Tie record to patient and hospital
        const newVitalsEntry = {
            ...values,
            patientId,
            recordedByUserId: user.uid,
            recordedByUserName: user.name,
            createdAt: new Date().toISOString(),
        };

        // NON-BLOCKING WRITE: Speed up nursing workflow
        addDocumentNonBlocking(collection(firestore, 'vitals'), newVitalsEntry);
        
        toast.success(`Vitals recorded for ${patientName}. Data synced to EHR.`);
        setOpen(false);
        form.reset();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
                    <Activity className="h-4 w-4" />
                    Record Vitals
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Record Vitals: {patientName}</DialogTitle>
                    <DialogDescription>
                        Enter measurements for this clinical round.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="bloodPressure"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold">BP (S/D)</FormLabel>
                                        <FormControl><Input placeholder="120/80" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="heartRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold">Pulse (BPM)</FormLabel>
                                        <FormControl><Input type="number" placeholder="72" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="temperature"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold">Temp (°C)</FormLabel>
                                        <FormControl><Input type="number" step="0.1" placeholder="36.5" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="oxygenSaturation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold">SpO2 (%)</FormLabel>
                                        <FormControl><Input type="number" placeholder="98" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="respiratoryRate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold">Resp. Rate</FormLabel>
                                        <FormControl><Input type="number" placeholder="16" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="painScore"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-bold">Pain (0-10)</FormLabel>
                                        <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save to EHR
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
