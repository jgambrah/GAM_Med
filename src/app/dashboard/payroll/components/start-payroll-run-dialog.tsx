
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
import { PayrollRun, PayrollRecord } from '@/lib/types';
import { mockStaffProfiles } from '@/lib/data';

const StartPayrollRunSchema = z.object({
  payPeriod: z.string().min(1, { message: 'Pay period is required.' }),
  payDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'A valid pay date is required.' }),
});

interface StartPayrollRunDialogProps {
    onPayrollStarted: (newRun: PayrollRun, newRecords: PayrollRecord[]) => void;
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
    // This is where the `startPayrollRun` Cloud Function would be called.
    // It would then trigger the `processStaffPayroll` background function.
    // For this prototype, we'll simulate the entire calculation process here.

    const newRunId = `PAY-${Date.now()}`;
    const newRun: PayrollRun = {
        runId: newRunId,
        payPeriod: values.payPeriod,
        payDate: values.payDate,
        status: 'Processing',
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalEmployees: 0,
        initiatedByUserId: 'admin1',
        createdAt: new Date().toISOString(),
    };

    // Simulate starting the process
    onPayrollStarted(newRun, []);

    // Simulate background processing delay
    setTimeout(() => {
        // --- This block simulates the `processStaffPayroll` background function ---
        const activeStaff = mockStaffProfiles.filter(s => s.employmentStatus === 'Active');
        let totalGross = 0;
        let totalDeductionsAgg = 0;
        let totalNet = 0;
        
        const calculatedRecords: PayrollRecord[] = activeStaff.map(staff => {
            const baseSalary = staff.annualSalary / 12;
            const totalAllowances = (staff.recurringAllowances || []).reduce((sum, alw) => sum + alw.amount, 0);
            const monthlyGrossPay = baseSalary + totalAllowances;

            // Simplified statutory deductions for simulation
            const ssnitDeduction = monthlyGrossPay * 0.055;
            const taxAmount = (monthlyGrossPay - ssnitDeduction) * 0.15; // Simplified tax
            
            const totalRecurringDeductions = (staff.recurringDeductions || []).reduce((sum, ded) => sum + ded.amount, 0);

            const totalDeductions = ssnitDeduction + taxAmount + totalRecurringDeductions;
            const netPay = monthlyGrossPay - totalDeductions;
            
            totalGross += monthlyGrossPay;
            totalDeductionsAgg += totalDeductions;
            totalNet += netPay;
            
            const record: PayrollRecord = {
                recordId: `pr-${newRunId}-${staff.staffId}`,
                staffId: staff.staffId,
                staffName: `${staff.firstName} ${staff.lastName}`,
                grossPay: monthlyGrossPay,
                netPay: netPay,
                taxAmount: taxAmount,
                deductions: { 'SSNIT': ssnitDeduction, ...Object.fromEntries((staff.recurringDeductions || []).map(d => [d.name, d.amount])) },
                allowances: Object.fromEntries((staff.recurringAllowances || []).map(a => [a.name, a.amount])),
                payslipUrl: '/mock-payslip.pdf'
            };
            return record;
        });

        const finishedRun: PayrollRun = {
            ...newRun,
            status: 'Review', // Move to 'Review' state after processing
            totalGrossPay: totalGross,
            totalDeductions: totalDeductionsAgg,
            totalNetPay: totalNet,
            totalEmployees: activeStaff.length,
        };

        // Pass the calculated run and records back to the parent page
        onPayrollStarted(finishedRun, calculatedRecords);
        // --- End of simulation ---

    }, 3000); // 3-second delay

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
