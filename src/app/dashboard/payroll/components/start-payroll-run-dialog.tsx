
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
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { PayrollRun } from '@/lib/types';
import { allPatients } from '@/lib/data';

const StartPayrollRunSchema = z.object({
  payPeriod: z.string().min(1, { message: 'Pay period is required.' }),
  payDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'A valid pay date is required.' }),
});

interface StartPayrollRunDialogProps {
    onPayrollStarted: (newRun: PayrollRun) => void;
}

export function StartPayrollRunDialog({ onPayrollStarted }: StartPayrollRunDialogProps) {
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof StartPayrollRunSchema>>({
    resolver: zodResolver(StartPayrollRunSchema),
    defaultValues: {
      payPeriod: '',
      payDate: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof StartPayrollRunSchema>) => {
    // In a real app, this would call a Cloud Function `startPayrollRun`.
    // The function would create the PayrollRun document and start the background processing.
    const newRun: PayrollRun = {
        runId: `PAY-${Date.now()}`,
        payPeriod: values.payPeriod,
        payDate: values.payDate,
        status: 'Processing', // Simulates the background process starting
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalEmployees: 0,
        initiatedByUserId: 'admin1',
        createdAt: new Date().toISOString(),
    };
    
    // Simulate background processing delay then move to 'Review'
    setTimeout(() => {
        // Here, a Cloud Function would update the run document with calculated totals
        // and set the status to 'Review'.
        // For now, we just update the local state.
        const finishedRun = {
            ...newRun,
            status: 'Review',
            totalGrossPay: 85000,
            totalNetPay: 73000,
            totalDeductions: 12000,
            totalEmployees: 15, // Example number
        }
        onPayrollStarted(finishedRun);
    }, 5000); // 5-second delay to simulate processing

    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Start New Payroll Run
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Payroll Run</DialogTitle>
          <DialogDescription>
            This will begin the automated process of calculating payroll for all active staff for the specified period.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="payPeriod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pay Period</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., August 2024" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Starting...' : 'Start Processing'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
