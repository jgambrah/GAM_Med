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
import { PayrollRun, PayrollRecord, StaffProfile, PayrollConfiguration, Position } from '@/lib/types';
import { mockStaffProfiles, mockPayrollConfig, mockPositions } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';

const StartPayrollRunSchema = z.object({
  payPeriod: z.string().min(1, { message: 'Pay period is required.' }),
  payDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'A valid pay date is required.' }),
});

interface StartPayrollRunDialogProps {
    onPayrollStarted: (newRun: PayrollRun, newRecords: PayrollRecord[]) => void;
}

// Helper functions for Ghanaian payroll calculations, adapted for client-side simulation.
const calculateSSNIT = (monthlyGross: number, config: PayrollConfiguration) => {
    const employeeContribution = monthlyGross * config.ssnitEmployeeContribution;
    const employerContribution = monthlyGross * config.ssnitEmployerContribution;
    const tier2Contribution = monthlyGross * config.tier2EmployerContribution;
    
    // In Ghana, the ceiling is on the pensionable income.
    const pensionableIncome = Math.min(monthlyGross, config.ssnitCeiling / 12);
    
    const finalEmployeeSSNIT = pensionableIncome * config.ssnitEmployeeContribution;
    const finalEmployerSSNIT = pensionableIncome * config.ssnitEmployerContribution;

    return {
        employee: finalEmployeeSSNIT,
        employer: finalEmployerSSNIT,
        tier2: pensionableIncome * config.tier2EmployerContribution,
    };
};

const calculateGHRATax = (monthlyGross: number, ssnitContribution: number, config: PayrollConfiguration): number => {
  const taxableIncome = monthlyGross - ssnitContribution;
  const annualTaxableIncome = taxableIncome * 12;
  let annualTax = 0;

  const taxBands = config.taxBands;

  let incomeRemaining = annualTaxableIncome;
  let previousLimit = 0;

  for (const band of taxBands) {
    if (incomeRemaining <= 0) break;
    
    const bandLimit = band.limit === Infinity ? Infinity : band.limit;
    const taxableInThisBand = Math.min(incomeRemaining, bandLimit - previousLimit);
    
    annualTax += taxableInThisBand * band.rate;
    incomeRemaining -= taxableInThisBand;
    previousLimit = bandLimit;
  }

  return annualTax / 12;
};


export function StartPayrollRunDialog({ onPayrollStarted }: StartPayrollRunDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);

  const form = useForm<z.infer<typeof StartPayrollRunSchema>>({
    resolver: zodResolver(StartPayrollRunSchema),
    defaultValues: {
      payPeriod: '',
      payDate: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof StartPayrollRunSchema>) => {
    const currentHospitalId = user?.hospitalId || '';
    const newRunId = `PAY-${Date.now()}`;
    const newRun: PayrollRun = {
        runId: newRunId,
        hospitalId: currentHospitalId,
        payPeriod: values.payPeriod,
        payDate: values.payDate,
        status: 'Processing',
        totalGrossPay: 0,
        totalDeductions: 0,
        totalNetPay: 0,
        totalTaxes: 0,
        totalEmployees: 0,
        deductionTotals: {},
        initiatedByUserId: user?.uid || '',
        createdAt: new Date().toISOString(),
    };

    // Simulate starting the process
    onPayrollStarted(newRun, []);

    // Simulate background processing delay
    setTimeout(() => {
        const activeStaff = mockStaffProfiles.filter(s => s.employmentStatus === 'Active' && s.hospitalId === currentHospitalId);
        let totalGross = 0;
        let totalDeductionsAgg = 0;
        let totalNet = 0;
        let totalTaxesAgg = 0;
        const remittanceTotals: Record<string, number> = {};

        const calculatedRecords: PayrollRecord[] = activeStaff.map(staff => {
            const position = mockPositions.find(p => p.positionId === staff.positionId);
            const baseSalary = (position?.baseAnnualSalary || 0) / 12;
            const totalAllowances = (staff.recurringAllowances || []).reduce((sum, alw) => sum + alw.amount, 0);
            const monthlyGrossPay = baseSalary + totalAllowances;

            const ssnitContributions = calculateSSNIT(monthlyGrossPay, mockPayrollConfig);
            const ssnitDeduction = ssnitContributions.employee;
            const taxAmount = calculateGHRATax(monthlyGrossPay, ssnitDeduction, mockPayrollConfig);
            
            const totalRecurringDeductions = (staff.recurringDeductions || []).reduce((sum, ded) => sum + ded.amount, 0);
            const totalDeductions = ssnitDeduction + taxAmount + totalRecurringDeductions;
            const netPay = monthlyGrossPay - totalDeductions;
            
            totalGross += monthlyGrossPay;
            totalDeductionsAgg += totalDeductions;
            totalNet += netPay;
            totalTaxesAgg += taxAmount;

            remittanceTotals['PAYE Tax'] = (remittanceTotals['PAYE Tax'] || 0) + taxAmount;
            remittanceTotals['SSNIT - Employee'] = (remittanceTotals['SSNIT - Employee'] || 0) + ssnitContributions.employee;
            remittanceTotals['SSNIT - Employer'] = (remittanceTotals['SSNIT - Employer'] || 0) + ssnitContributions.employer;
            remittanceTotals['Tier 2 - Employer'] = (remittanceTotals['Tier 2 - Employer'] || 0) + ssnitContributions.tier2;
            (staff.recurringDeductions || []).forEach(ded => {
                remittanceTotals[ded.name] = (remittanceTotals[ded.name] || 0) + ded.amount;
            });
            
            const allDeductions: Record<string, number> = { 'SSNIT': ssnitDeduction, 'PAYE': taxAmount };
            (staff.recurringDeductions || []).forEach(d => { allDeductions[d.name] = d.amount });


            const record: PayrollRecord = {
                recordId: `pr-${newRunId}-${staff.staffId}`,
                hospitalId: currentHospitalId,
                staffId: staff.staffId,
                staffName: `${staff.firstName} ${staff.lastName}`,
                grossPay: monthlyGrossPay,
                netPay: netPay,
                taxAmount: taxAmount,
                deductions: allDeductions,
                allowances: (staff.recurringAllowances || []).reduce((acc, alw) => ({ ...acc, [alw.name]: alw.amount }), {}),
                payslipUrl: '/mock-payslip.pdf'
            };
            return record;
        });

        const finishedRun: PayrollRun = {
            ...newRun,
            status: 'Review',
            totalGrossPay: totalGross,
            totalDeductions: totalDeductionsAgg,
            totalNetPay: totalNet,
            totalTaxes: totalTaxesAgg,
            deductionTotals: remittanceTotals,
            totalEmployees: activeStaff.length,
        };

        onPayrollStarted(finishedRun, calculatedRecords);
    }, 3000);

    setOpen(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" /> Start New Payroll Run
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Payroll Run</DialogTitle>
          <DialogDescription>
            This will begin the automated process of calculating payroll for all active staff at <strong>{user?.hospitalId}</strong>.
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
