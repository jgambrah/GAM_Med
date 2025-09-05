
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
import { ValidateLabResultSchema } from '@/lib/schemas';
import { validateLabResult } from '@/lib/actions';
import { toast } from '@/hooks/use-toast';

interface ValidateResultDialogProps {
    labRequest: LabResult;
    onValidated: () => void;
}

export function ValidateResultDialog({ labRequest, onValidated }: ValidateResultDialogProps) {
    const [open, setOpen] = React.useState(false);
    
    const form = useForm<z.infer<typeof ValidateLabResultSchema>>({
        resolver: zodResolver(ValidateLabResultSchema),
        defaultValues: {
            validationNotes: ''
        }
    });
    
    const onSubmit = async (values: z.infer<typeof ValidateLabResultSchema>) => {
        const result = await validateLabResult(labRequest.testId, values);
        if (result.success) {
            toast.success('Lab result has been validated and finalized.');
            setOpen(false);
            onValidated(); 
            form.reset();
        } else {
            toast.error(result.message || 'Failed to validate result.');
        }
    }
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm">
                    Validate
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Validate Test Result: {labRequest.testName}</DialogTitle>
                    <DialogDescription>
                        Review the draft results and add any validation notes before finalizing.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="p-4 border rounded-md bg-muted/50">
                        <h4 className="font-semibold mb-2">Draft Results</h4>
                        <pre className="text-sm font-mono whitespace-pre-wrap">
                            {JSON.stringify(labRequest.resultDetails, null, 2)}
                        </pre>
                    </div>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="validationNotes"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Validation Notes (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="e.g., Confirmed abnormal result with secondary test..."
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={form.formState.isSubmitting}>
                                    {form.formState.isSubmitting ? 'Finalizing...' : 'Validate & Finalize'}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
