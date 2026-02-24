
'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { TestTube, Loader2 } from 'lucide-react';
import { NewLabOrderSchema } from '@/lib/schemas';
import { Combobox } from '@/components/ui/combobox';
import { mockLabTestCatalog } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import { Patient } from '@/lib/types';

interface OrderTestDialogProps {
    patient: Patient;
    disabled?: boolean;
    onOrderCreated?: (newOrder: any) => void;
}

/**
 * == EHR Integration: Order Lab Test ==
 * 
 * Clinical tool for doctors to request diagnostic tests.
 * Atomically pushes a request to the Laboratory module's live queue with SaaS tags.
 */
export function OrderTestDialog({ patient, disabled, onOrderCreated }: OrderTestDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof NewLabOrderSchema>>({
        resolver: zodResolver(NewLabOrderSchema),
        defaultValues: {
            hospitalId: user?.hospitalId || '',
            testName: '',
            indication: '',
            priority: 'Routine',
            notes: '',
        }
    });

    // Auto-fill tenant ID from context
    React.useEffect(() => {
        if (open && user) {
            form.setValue('hospitalId', user.hospitalId);
        }
    }, [open, user, form]);

    const onSubmit = async (values: z.infer<typeof NewLabOrderSchema>) => {
        if (!user || !firestore) {
            toast.error("Session context missing. Please log in.");
            return;
        }
        
        // DATA PREPARATION: Create order for the Lab Worklist (Step 3: Closing the Loop)
        const labOrder = {
            patientId: patient.patient_id,
            patientName: patient.full_name,
            patientMrn: patient.mrn,
            hospitalId: user.hospitalId, // Mandatory SaaS Stamp
            testName: values.testName,
            indication: values.indication,
            priority: values.priority, // Urgent vs Routine
            doctorName: user.name,
            doctorId: user.uid,
            status: "Requested",
            createdAt: serverTimestamp(),
            notes: values.notes || '',
        };
        
        // PUSH TO LIVE QUEUE: Triggers instant update on Lab Technician dashboard
        addDocumentNonBlocking(collection(firestore, 'lab_orders'), labOrder);
        
        toast.success(`Lab request for ${values.testName} sent to diagnostics.`);
        
        if (onOrderCreated) {
            onOrderCreated(labOrder);
        }

        setOpen(false);
        form.reset();
    }
    
    const labTestOptions = mockLabTestCatalog.map(test => ({
        label: `${test.name} (${test.testId})`,
        value: test.name
    }));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" size="sm" disabled={disabled} className="gap-2">
                    <TestTube className="h-4 w-4" /> 
                    Order Lab Test
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Diagnostic Request</DialogTitle>
                    <DialogDescription>
                        Submit a new laboratory request for {patient.full_name}.
                    </DialogDescription>
                </DialogHeader>
                 <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="testName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Test Name</FormLabel>
                                    <Combobox
                                        options={labTestOptions}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Search for a lab test..."
                                        searchPlaceholder="Search catalog..."
                                        notFoundText="No test found."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 gap-4">
                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority Level</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Routine">Routine</SelectItem>
                                                <SelectItem value="Urgent">Urgent (STAT)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name="indication"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Clinical Indication</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Reason for test (e.g. Rule out anemia, pre-op screening)..." 
                                            {...field} 
                                            className="bg-muted/30"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                Submit Order
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}
