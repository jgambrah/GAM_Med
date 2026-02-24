
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, useDoc, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, doc, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Utensils, Loader2, AlertCircle } from 'lucide-react';
import { Patient, Admission } from '@/lib/types';
import { DietaryOrderSchema } from '@/lib/schemas';
import { orderDiet } from '@/lib/actions';

interface OrderDietDialogProps {
    patient: Patient;
    disabled?: boolean;
}

/**
 * == Clinical Integration: Prescribe Patient Diet ==
 * 
 * Tool for doctors/nurses to order nutritional plans directly from the EHR.
 * Atomically creates a 'dietary_order' document stamped with the SaaS hospitalId.
 */
export function OrderDietDialog({ patient, disabled }: OrderDietDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);
    const [activeAdmission, setActiveAdmission] = React.useState<Admission | null>(null);
    const [isFetchingAdmission, setIsFetchingAdmission] = React.useState(false);

    const form = useForm<z.infer<typeof DietaryOrderSchema>>({
        resolver: zodResolver(DietaryOrderSchema),
        defaultValues: {
            hospitalId: user?.hospitalId || '',
            dietType: 'Standard',
            specialInstructions: '',
        },
    });

    // 1. Fetch current admission to get Ward/Bed details
    const fetchAdmission = React.useCallback(async () => {
        if (!firestore || !patient.patient_id || !user?.hospitalId) return;
        setIsFetchingAdmission(true);
        try {
            const q = query(
                collection(firestore, 'admissions'),
                where('hospitalId', '==', user.hospitalId),
                where('patient_id', '==', patient.patient_id),
                where('status', '==', 'Admitted'),
                limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                setActiveAdmission(snap.docs[0].data() as Admission);
            }
        } catch (e) {
            console.error("Failed to fetch admission for dietary order", e);
        } finally {
            setIsFetchingAdmission(false);
        }
    }, [firestore, patient.patient_id, user?.hospitalId]);

    React.useEffect(() => {
        if (open) {
            fetchAdmission();
            if (user) form.setValue('hospitalId', user.hospitalId);
        }
    }, [open, fetchAdmission, user, form]);

    const onSubmit = async (values: z.infer<typeof DietaryOrderSchema>) => {
        if (!user || !firestore) return;

        // DATA PREPARATION: Consolidate clinical and operational data
        const orderData = {
            hospitalId: user.hospitalId,
            patientId: patient.patient_id,
            patientName: patient.full_name,
            wardName: activeAdmission?.ward || 'OPD/Pending',
            bedId: activeAdmission?.bed_id || 'Waiting Area',
            dietType: values.dietType,
            allergies: patient.allergies?.join(', ') || 'None Reported',
            specialInstructions: values.specialInstructions || '',
            status: 'Requested',
            createdAt: new Date().toISOString()
        };

        try {
            // Trigger server-side logic
            await orderDiet(patient.patient_id, values);

            // Commit to Firestore (SaaS Wall Enforced)
            addDocumentNonBlocking(collection(firestore, 'dietary_orders'), orderData);
            
            toast.success("Dietary Order Sent", {
                description: `${values.dietType} prescribed for ${patient.full_name}.`
            });
            
            setOpen(false);
            form.reset();
        } catch (error) {
            toast.error("Process Failed");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
                    <Utensils className="h-4 w-4" />
                    Order Diet
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-orange-600">
                        <Utensils className="h-5 w-5" />
                        <DialogTitle>Clinical Nutrition Order</DialogTitle>
                    </div>
                    <DialogDescription>
                        Prescribe a nutritional plan for <strong>{patient.full_name}</strong>.
                    </DialogDescription>
                </DialogHeader>
                
                {patient.allergies && patient.allergies.length > 0 && (
                    <div className="bg-red-50 border border-red-100 p-3 rounded-md flex gap-3 items-center mb-2 animate-pulse">
                        <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                        <p className="text-[11px] font-bold text-red-700 leading-tight">
                            ALLERGY ALERT: {patient.allergies.join(', ')}
                        </p>
                    </div>
                )}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="dietType"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase">Diet Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Standard">Standard (Full Diet)</SelectItem>
                                            <SelectItem value="Diabetic">Diabetic (Sugar Restricted)</SelectItem>
                                            <SelectItem value="Low Salt">Low Salt (Hypertensive)</SelectItem>
                                            <SelectItem value="Renal">Renal (Protein Managed)</SelectItem>
                                            <SelectItem value="Soft">Soft / Easy Chew</SelectItem>
                                            <SelectItem value="NPO">NPO (Nothing by Mouth)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="specialInstructions"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold uppercase">Kitchen Instructions</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="e.g., Fluid restriction 1.5L, avoid citrus, extra portions..." 
                                            className="bg-muted/30 h-24"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting || isFetchingAdmission} className="bg-orange-600 hover:bg-orange-700 font-bold">
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Send to Kitchen
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
