
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
import { collection } from 'firebase/firestore';

interface OrderTestDialogProps {
    patientId: string;
    patientName: string;
    disabled?: boolean;
    onOrderCreated: (newOrder: any) => void;
}

/**
 * == EHR Integration: Order Lab Test ==
 * 
 * Clinical tool for doctors to request diagnostic tests.
 * Atomically pushes a request to the Laboratory module's live queue.
 */
export function OrderTestDialog({ patientId, patientName, disabled, onOrderCreated }: OrderTestDialogProps) {
    const { user } = useAuth();
    const firestore = useFirestore();
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof NewLabOrderSchema>>({
        resolver: zodResolver(NewLabOrderSchema),
        defaultValues: {
            testName: '',
            notes: '',
        }
    });

    const onSubmit = async (values: z.infer<typeof NewLabOrderSchema>) => {
        if (!user || !firestore) {
            toast.error("Session context missing. Please log in.");
            return;
        }
        
        // DATA PREPARATION: Create order for the Lab Worklist
        const labOrder = {
            hospitalId: user.hospitalId,
            patientId: patientId,
            patientName: patientName,
            patientMrn: patientId.split('_MRN')[1] || 'N/A',
            testName: values.testName,
            status: 'Requested',
            doctorName: user.name,
            doctorId: user.uid,
            priority: 'Routine',
            notes: values.notes || '',
            createdAt: new Date().toISOString(),
        };
        
        // PUSH TO LIVE QUEUE: Triggers instant update on Lab Technician dashboard
        addDocumentNonBlocking(collection(firestore, 'lab_orders'), labOrder);
        
        toast.success(`Lab request for ${values.testName} sent to diagnostics.`);
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
                        Submit a new laboratory request for {patientName}.
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
                         <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Clinical Notes (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="e.g. Patient is fasting. Please check for specific markers..." 
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
