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
import { toast } from '@/hooks/use-toast';
import { RadiologyOrder } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { submitRadiologyReport } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';

const ReportSchema = z.object({
  impression: z.string().min(10, 'Impression must be at least 10 characters.'),
  findings: z.string().min(10, 'Findings must be at least 10 characters.'),
});

interface CreateReportDialogProps {
  order: RadiologyOrder;
  onReportSubmitted: () => void;
}

export function CreateReportDialog({ order, onReportSubmitted }: CreateReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  
  const form = useForm<z.infer<typeof ReportSchema>>({
    resolver: zodResolver(ReportSchema),
    defaultValues: { impression: '', findings: '' },
  });

  const onSubmit = async (values: z.infer<typeof ReportSchema>) => {
    // In a real app, this would call the `processRadReport` Cloud Function.
    const result = await submitRadiologyReport(order.orderId, values);
    if (result.success) {
      toast.success('Report Submitted', {
        description: `The report for order ${order.orderId} has been submitted.`,
      });
      onReportSubmitted();
      setOpen(false);
      form.reset();
    } else {
      toast.error('Failed to submit report.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          Create Report
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Radiology Report</DialogTitle>
          <DialogDescription>
            Enter the findings and impression for order {order.orderId}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="findings"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Detailed Findings</FormLabel>
                  <FormControl>
                    <Textarea rows={8} placeholder="Describe the detailed findings from the imaging study..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="impression"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impression</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Provide a concluding impression..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Submitting...' : 'Submit Final Report'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
