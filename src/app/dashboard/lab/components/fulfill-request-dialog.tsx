
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { LabResult } from '@/lib/types';
import { FulfillLabRequestSchema } from '@/lib/schemas';
import { fulfillLabRequest } from '@/lib/actions';
import { Input } from '@/components/ui/input';

interface FulfillRequestDialogProps {
    labRequest: LabResult;
}

export function FulfillRequestDialog({ labRequest }: FulfillRequestDialogProps) {
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof FulfillLabRequestSchema>>({
        resolver: zodResolver(FulfillLabRequestSchema),
        defaultValues: {
            result: ''
        }
    });
    
    const onSubmit = async (values: z.infer<typeof FulfillLabRequestSchema>) => {
        // In a real app, you'd handle file upload here before calling the action.
        // For example, upload to Firebase Storage and get a URL.
        const result = await fulfillLabRequest(labRequest.patientId, labRequest.testId, values);
        if (result.success) {
            alert('Lab request fulfilled successfully (simulated).');
            setOpen(false);
            form.reset();
        } else {
            alert(`Error: ${result.message}`);
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                    Fulfill Request
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Fulfill Lab Request: {labRequest.testName}</DialogTitle>
                    <DialogDescription>
                        Enter the results for the test ordered for {labRequest.patientName}.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div>
                            <FormLabel>Patient</FormLabel>
                            <Input value={`${labRequest.patientName} (${labRequest.patientId})`} readOnly disabled />
                        </div>
                        <FormField
                            control={form.control}
                            name="result"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Test Results Summary</FormLabel>
                                    <FormControl>
                                        <Textarea 
                                            placeholder="Enter the lab results here. Use structured data if possible (e.g., 'Hemoglobin: 14.5 g/dL')."
                                            rows={6}
                                            {...field} 
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="attachment"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Attach Result PDF (Optional)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            type="file" 
                                            accept="application/pdf"
                                            onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? 'Saving...' : 'Save and Complete'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
