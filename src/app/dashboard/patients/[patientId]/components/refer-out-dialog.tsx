
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
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
import { useTenant } from '@/hooks/use-tenant';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, serverTimestamp } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { Send, Hospital, Loader2 } from 'lucide-react';
import { Patient, Hospital as HospitalType } from '@/lib/types';
import { Combobox } from '@/components/ui/combobox';

const ReferOutSchema = z.object({
  toHospitalId: z.string().min(1, "Target facility is required"),
  clinicalSummary: z.string().min(10, "Summary must be at least 10 chars"),
  priority: z.enum(['Routine', 'Urgent', 'Emergency']),
});

interface ReferOutDialogProps {
    patient: Patient;
    disabled?: boolean;
}

export function ReferOutDialog({ patient, disabled }: ReferOutDialogProps) {
    const { user } = useAuth();
    const { hospitalName } = useTenant();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);

    // 1. Fetch other active hospitals on the platform
    const hospitalQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'hospitals'),
            where('status', '==', 'active')
        );
    }, [firestore]);

    const { data: hospitals, isLoading: isHospitalsLoading } = useCollection<HospitalType>(hospitalQuery);

    const form = useForm<z.infer<typeof ReferOutSchema>>({
        resolver: zodResolver(ReferOutSchema),
        defaultValues: {
            toHospitalId: '',
            clinicalSummary: '',
            priority: 'Routine',
        },
    });

    const onSubmit = async (values: z.infer<typeof ReferOutSchema>) => {
        if (!user || !firestore) return;

        try {
            const targetHosp = hospitals?.find(h => h.hospitalId === values.toHospitalId);

            const referralData = {
                fromHospitalId: user.hospitalId,
                fromHospitalName: hospitalName || "Source Facility",
                toHospitalId: values.toHospitalId,
                toHospitalName: targetHosp?.name || "Target Facility",
                patientId: patient.patient_id,
                patientName: patient.full_name,
                clinicalSummary: values.clinicalSummary,
                status: 'Pending',
                priority: values.priority,
                doctorId: user.uid,
                doctorName: user.name,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            addDocumentNonBlocking(collection(firestore, 'referrals'), referralData);
            
            toast.success("Referral Sent Successfully", {
                description: `Patient ${patient.full_name} referred to ${referralData.toHospitalName}.`
            });
            
            setOpen(false);
            form.reset();
        } catch (error) {
            toast.error("Failed to send referral.");
        }
    };

    const hospOptions = hospitals
        ?.filter(h => h.hospitalId !== user?.hospitalId)
        .map(h => ({ label: h.name, value: h.hospitalId })) || [];

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
                    <Send className="h-4 w-4" />
                    Refer Out
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2 text-primary">
                        <Hospital className="h-5 w-5" />
                        <DialogTitle>External Referral</DialogTitle>
                    </div>
                    <DialogDescription>
                        Refer <strong>{patient.full_name}</strong> to another facility in the network.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField
                            control={form.control}
                            name="toHospitalId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Destination Hospital</FormLabel>
                                    <Combobox
                                        options={hospOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Select facility..."
                                        searchPlaceholder="Search hospitals..."
                                        notFoundText="No hospitals found."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="priority"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Priority</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="bg-muted/30"><SelectValue /></SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="Routine">Routine</SelectItem>
                                            <SelectItem value="Urgent">Urgent</SelectItem>
                                            <SelectItem value="Emergency">Emergency</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="clinicalSummary"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs">Clinical Reason for Referral</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Provide clinical context..." 
                                            className="bg-muted/30 h-32"
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting || isHospitalsLoading}>
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Send Referral
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
