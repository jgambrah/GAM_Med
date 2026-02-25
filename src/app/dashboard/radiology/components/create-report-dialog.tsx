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
import { RadiologyOrder, RadiologyReport } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { submitRadiologyReport } from '@/lib/actions';
import { useAuth } from '@/hooks/use-auth';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { mockRadiologyReports } from '@/lib/data';
import { Input } from '@/components/ui/input';

const ReportSchema = z.object({
  impression: z.string().min(10, 'Impression must be at least 10 characters.'),
  findings: z.string().min(10, 'Findings must be at least 10 characters.'),
  reportPdf: z.any().optional(),
});

interface CreateReportDialogProps {
  order: RadiologyOrder;
  onReportSubmitted: () => void;
}

export function CreateReportDialog({ order, onReportSubmitted }: CreateReportDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [reports, setReports] = useLocalStorage<RadiologyReport[]>('radiologyReports', mockRadiologyReports);
  
  const form = useForm<z.infer<typeof ReportSchema>>({
    resolver: zodResolver(ReportSchema),
    defaultValues: { impression: '', findings: '' },
  });

  const onSubmit = async (values: z.infer<typeof ReportSchema>) => {
    // In a real app, this would call the `processRadReport` Cloud Function.
    // The function would also handle the PDF upload to a secure storage bucket.
    console.log("Uploaded file (conceptual):", values.reportPdf);
    
    // SAAS INTEGRITY: Inject the mandatory hospitalId into the report submission
    const result = await submitRadiologyReport(order.orderId, {
      hospitalId: user?.hospitalId || '',
      impression: values.impression,
      findings: values.findings,
    });

    if (result.success) {
      toast.success('Report Submitted', {
        description: `The report for order ${order.orderId} has been submitted.`,
      });
      
      const newReport: RadiologyReport = {
        reportId: order.orderId,
        hospitalId: user?.hospitalId || '',
        orderId: order.orderId,
        patientId: order.patientId,
        radiologistId: user?.uid || 'rad1',
        dateReported: new Date().toISOString(),
        reportDetails: {
          impression: values.impression,
          findings: values.findings,
        },
        reportPdfUrl: '/mock-report.pdf', // Link to the mock PDF for demonstration
        pacsLink: '/mock-pacs-viewer.html', // Link to the mock PACS viewer
        isFinal: true,
      };

      setReports(prev => [newReport, ...prev]);
      
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
             <FormField
                control={form.control}
                name="reportPdf"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Upload Report PDF</FormLabel>
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
                {form.formState.isSubmitting ? 'Submitting...' : 'Finalize & Send Report'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
