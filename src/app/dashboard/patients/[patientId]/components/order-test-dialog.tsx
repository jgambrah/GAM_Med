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
import { TestTube } from 'lucide-react';
import { NewLabOrderSchema } from '@/lib/schemas';
import { Combobox } from '@/components/ui/combobox';
import { mockLabTestCatalog } from '@/lib/data';
import { toast } from '@/hooks/use-toast';
import { orderLabTest } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

interface OrderTestDialogProps {
    patientId: string;
    disabled?: boolean;
}

export function OrderTestDialog({ patientId, disabled }: OrderTestDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof NewLabOrderSchema>>({
        resolver: zodResolver(NewLabOrderSchema),
        defaultValues: {
            testName: '',
            notes: '',
        }
    });

    const onSubmit = async (values: z.infer<typeof NewLabOrderSchema>) => {
        if (!user) {
            toast.error("You must be logged in to order a test.");
            return;
        }
        
        // This is where the call to the server action would be.
        // For now, we'll just log it.
        const result = await orderLabTest(patientId, values);
        if (result.success) {
            toast.success('Lab test ordered successfully (simulated).');
        } else {
            toast.error('Failed to order lab test.');
        }
        setOpen(false);
        form.reset();
    }
    
    const labTestOptions = mockLabTestCatalog.map(test => ({
        label: `${test.name} (${test.testId})`,
        value: test.name // Submitting the full name
    }));

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 <Button variant="outline" size="sm" disabled={disabled}>
                    <TestTube className="h-4 w-4 mr-2" /> Order Lab Test
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Order New Lab Test</DialogTitle>
                    <DialogDescription>
                        Submit a new request to the laboratory.
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
                                        searchPlaceholder="Search tests..."
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
                                    <FormLabel>Notes for Lab (Optional)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., STAT, fasting required" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Order'}
                            </Button>
                        </DialogFooter>
                    </form>
                 </Form>
            </DialogContent>
        </Dialog>
    )
}
